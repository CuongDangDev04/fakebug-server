import {
  SubscribeMessage,
  WebSocketGateway,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { MessageService } from './message.service';

export const MESSAGE_NAMESPACE = '/chat';

@WebSocketGateway({
  namespace: MESSAGE_NAMESPACE,
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  }
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Danh sách user đang online
  private onlineUsers: Map<number, Set<string>> = new Map();

  // lưu thời điểm offline gần nhất
  private lastSeenMap: Map<number, Date> = new Map();

  constructor(private readonly messageService: MessageService) { }

  handleConnection(client: Socket) {
    const userId = Number(client.handshake.query.userId);
    if (!userId) return;

    client.join(`user_${userId}`);

    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId)!.add(client.id);

    // Nếu online lại, xóa lastSeen
    this.lastSeenMap.delete(userId);

    // Gửi socket status online
    this.server.emit('userStatusChanged', {
      userId,
      isOnline: true,
    });

    this.broadcastOnlineUsers();
  }

  handleDisconnect(client: Socket) {
    for (const [userId, sockets] of this.onlineUsers.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);

        if (sockets.size === 0) {
          this.onlineUsers.delete(userId);

          // Ghi lại thời điểm offline
          const now = new Date();
          this.lastSeenMap.set(userId, now);

          // gửi event offline kèm lastSeen
          this.server.emit('userStatusChanged', {
            userId,
            isOnline: false,
            lastSeen: now.toISOString(),
          });
        }
        break;
      }
    }

    this.broadcastOnlineUsers();
  }

  private broadcastOnlineUsers() {
    const onlineUserIds = Array.from(this.onlineUsers.keys());
    this.server.emit('onlineUsers', onlineUserIds);
  }

  getOnlineUsers(): number[] {
    return Array.from(this.onlineUsers.keys());
  }

  getLastSeen(userId: number): string | null {
    const lastSeen = this.lastSeenMap.get(userId);
    return lastSeen ? lastSeen.toISOString() : null;
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: number; receiverId: number; content: string }
  ) {
    const message = await this.messageService.sendMessage(data.senderId, data.receiverId, data.content);

    client.emit('messageSent', message);

    this.server.to(`user_${data.receiverId}`).emit('newMessage', message);

    if (data.senderId !== data.receiverId) {
      this.server.to(`user_${data.senderId}`).emit('newMessage', message);
    }

    return message;
  }
  // Đánh dấu đã đọc: gửi event cho người gửi (fromUserId) biết rằng người nhận (toUserId) đã đọc
  handleMarkAsRead(fromUserId: number, toUserId: number) {
    // fromUserId: người gửi tin nhắn
    // toUserId: người nhận đã đọc
    this.server.to(`user_${fromUserId}`).emit('message-read', {
      from: toUserId,
      to: fromUserId
    });
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsReadSocket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { fromUserId: number; toUserId: number }
  ) {
    // Cập nhật DB: đánh dấu các tin nhắn từ fromUserId gửi tới toUserId là đã đọc
    await this.messageService.markMessagesAsRead(data.fromUserId, data.toUserId);
    // Gửi event cho người gửi biết đã được đọc
    this.handleMarkAsRead(data.fromUserId, data.toUserId);
  }
  async broadcastRevokeMessage(messageId: number, senderId: number, receiverId: number) {
    this.server.to(`user_${senderId}`).emit('messageRevoked', { messageId });
    this.server.to(`user_${receiverId}`).emit('messageRevoked', { messageId });
  }

  @SubscribeMessage('revokeMessage')
  async handleRevokeMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number }
  ) {
    // Lấy userId từ socket query thay vì từ client gửi lên
    const userId = Number(client.handshake.query.userId);
    const revokedMessage = await this.messageService.revokeMessage(data.messageId, userId);

    // Gửi tới cả người gửi và người nhận
    const { sender, receiver } = revokedMessage;

    this.server.to(`user_${sender.id}`).emit('messageRevoked', { messageId: revokedMessage.id });
    this.server.to(`user_${receiver.id}`).emit('messageRevoked', { messageId: revokedMessage.id });

    return revokedMessage;
  }
  @SubscribeMessage('reactToMessage')
  async handleReactToMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number; emoji: string }
  ) {
    const userId = Number(client.handshake.query.userId);
    await this.messageService.reactToMessage(data.messageId, userId, data.emoji);

    // Sử dụng method công khai để lấy message đã có reactions và user
    const updatedMessage = await this.messageService.getMessageWithRelations(data.messageId);

    if (!updatedMessage) return;

    const { sender, receiver } = updatedMessage;
    this.server.to(`user_${sender.id}`).emit('reactionUpdated', updatedMessage);
    this.server.to(`user_${receiver.id}`).emit('reactionUpdated', updatedMessage);
  }

  @SubscribeMessage('removeReaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number }
  ) {
    const userId = Number(client.handshake.query.userId);
    await this.messageService.removeReaction(data.messageId, userId);

    const updatedMessage = await this.messageService.getMessageWithRelations(data.messageId);

    if (!updatedMessage) return;

    const { sender, receiver } = updatedMessage;
    this.server.to(`user_${sender.id}`).emit('reactionUpdated', updatedMessage);
    this.server.to(`user_${receiver.id}`).emit('reactionUpdated', updatedMessage);
  }


}
