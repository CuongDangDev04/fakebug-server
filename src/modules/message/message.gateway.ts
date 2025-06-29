import {
  SubscribeMessage,
  WebSocketGateway,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { MessageService } from './message.service';
import { Socket, Server } from 'socket.io';

export const MESSAGE_NAMESPACE = '/chat';

@WebSocketGateway({
  namespace: MESSAGE_NAMESPACE,
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  }
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map userId -> Set<socketId>
  private onlineUsers: Map<number, Set<string>> = new Map();

  constructor(private readonly messageService: MessageService) { }

  // Khi user kết nối
  handleConnection(client: Socket) {
    const userId = Number(client.handshake.query.userId);
    if (userId) {
      client.join(`user_${userId}`);
      // Thêm socketId vào Map
      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)!.add(client.id);

      // Gửi danh sách user online cho tất cả client
      this.broadcastOnlineUsers();
    }
  }

  // Khi user disconnect
  handleDisconnect(client: Socket) {
    // Tìm userId theo socketId
    for (const [userId, sockets] of this.onlineUsers.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(userId);
        }
        break;
      }
    }
    // Gửi lại danh sách user online
    this.broadcastOnlineUsers();
  }

  // Gửi danh sách user online cho tất cả client
  private broadcastOnlineUsers() {
    const onlineUserIds = Array.from(this.onlineUsers.keys());
    this.server.emit('onlineUsers', onlineUserIds);
  }

  // API lấy danh sách user online (nếu cần)
  getOnlineUsers(): number[] {
    return Array.from(this.onlineUsers.keys());
  }

  // Xử lý gửi tin nhắn
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: number; receiverId: number; content: string }
  ) {
    const message = await this.messageService.sendMessage(data.senderId, data.receiverId, data.content);

    // Gửi lại cho người gửi (tab hiện tại)
    client.emit('messageSent', message);

    // Gửi cho tất cả socket trong room user_{receiverId}
    this.server.to(`user_${data.receiverId}`).emit('newMessage', message);

    // Nếu sender khác receiver, gửi cho cả sender (phòng trường hợp sender mở tab khác)
    if (data.senderId !== data.receiverId) {
      this.server.to(`user_${data.senderId}`).emit('newMessage', message);
    }

    return message;
  }

}

