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

  constructor(private readonly messageService: MessageService) {}

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
}
