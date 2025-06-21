import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification } from 'src/entities/notification.entity';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('subscribeToUserNotifications')
  handleSubscribe(@MessageBody() userId: number, @ConnectedSocket() client: Socket) {
    const room = `user_${userId}`;
    client.join(room);
    console.log(`[SOCKET] Client ${client.id} joined room ${room}`);
  }

  sendToUserSocket(userId: number, notification: Notification) {
    const room = `user_${userId}`;
    console.log(`[SOCKET] Sending notification to ${room}:`, notification);
    this.server.to(room).emit('newNotification', notification);
  }

  sendToAllSocket(notification: Notification) {
    console.log(`[SOCKET] Broadcasting notification to all clients:`, notification);
    this.server.emit('newNotification', notification);
  }
}
