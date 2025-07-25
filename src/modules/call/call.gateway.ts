import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { CallService } from './call.service';
import { StartCallDto } from './dto/start-call.dto';
import { EndCallDto } from './dto/end-call.dto';

export const CALL_NAMESPACE = '/call';

@WebSocketGateway({
  namespace: CALL_NAMESPACE,
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private onlineUsers = new Map<number, Socket>();

  constructor(private readonly callService: CallService) { }

  handleConnection(socket: Socket) {
    const userId = Number(socket.handshake.query.userId);
    if (!userId) {
      console.warn('⚠️ [CallGateway] Missing userId in handshake query');
      return;
    }

    this.onlineUsers.set(userId, socket);
    console.log(`✅ [CallGateway] User ${userId} connected (socket.id: ${socket.id})`);
  }

  handleDisconnect(socket: Socket) {
    const userId = Number(socket.handshake.query.userId);
    if (this.onlineUsers.has(userId)) {
      this.onlineUsers.delete(userId);
      console.log(`❌ [CallGateway] User ${userId} disconnected`);
    }
  }

  private getSocket(userId: number): Socket | undefined {
    return this.onlineUsers.get(userId);
  }

  @SubscribeMessage('start-call')
  async handleStartCall(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: StartCallDto,
  ) {
    console.log('📞 [start-call] Request received:', data);

    const call = await this.callService.startCall(data);
    console.log(`✅ [start-call] Call created:`, call);

    const eventPayload = {
      callId: call.id,            // ✅ Sử dụng callId thống nhất
      callerId: data.callerId,
      receiverId: data.receiverId,
      callType: data.callType,
    };

    const receiverSocket = this.getSocket(data.receiverId);
    if (receiverSocket) {
      receiverSocket.emit('incoming-call', eventPayload);
      console.log(`📨 [start-call] Sent incoming-call to user ${data.receiverId}`);

      // Sau khi gửi thành công thì gửi cho caller rằng call đã bắt đầu
      socket.emit('call-started', eventPayload);
    } else {
      console.warn(`⚠️ [start-call] Receiver ${data.receiverId} not online`);

      // Gửi event "user-not-online" về cho caller
      socket.emit('user-not-online', {
        callId: call.id,
        receiverId: data.receiverId,
        callerId: data.callerId,
        reason: 'Receiver not online',
      });

      // Optionally: cũng end call trong DB nếu muốn
      await this.callService.endCall(call.id, 'cancelled');
    }


    socket.emit('call-started', eventPayload);
  }

  @SubscribeMessage('accept-call')
  handleAcceptCall(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { callId: number; callerId: number; receiverId: number; callType: 'audio' | 'video' },
  ) {
    const callerSocket = this.getSocket(data.callerId);
    const receiverSocket = this.getSocket(data.receiverId);

    const eventPayload = {
      callId: data.callId,            // ✅ Thống nhất callId
      receiverId: data.receiverId,
      callerId: data.callerId,
      callType: data.callType
    };
    console.log('eventPayload', eventPayload)

    if (receiverSocket) {
      receiverSocket.emit('call-started', eventPayload);
    }

    if (callerSocket) {
      callerSocket.emit('receiver-accepted', eventPayload);
    }
  }



  @SubscribeMessage('end-call')
  async handleEndCall(@MessageBody() data: EndCallDto) {
    console.log('🛑 [end-call] Request:', data);

    await this.callService.endCall(data.callId, data.status);
    console.log(`✅ [end-call] Call ${data.callId} ended with status ${data.status}`);

    for (const userId of [data.callerId, data.receiverId]) {
      const userSocket = this.getSocket(userId);

      if (userSocket) {
        const role = userId === data.callerId ? 'caller' : 'receiver';

        console.log(`📤 Emitting 'call-ended' to userId=${userId}, role=${role}`);

        userSocket.emit('call-ended', {
          callId: data.callId,
          status: data.status,
          callerId: data.callerId,
          receiverId: data.receiverId,
          role,   // ✅ thêm role
        });
      } else {
        console.log(`⚠️ UserId=${userId} không có socket kết nối`);
      }
    }
  }



  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { targetUserId, offer, callId }: { targetUserId: number; offer: any; callId: number },
  ) {
    const fromUserId = Number(socket.handshake.query.userId);
    const targetSocket = this.getSocket(targetUserId);

    console.log(`📡 [offer] Server received from ${fromUserId} to ${targetUserId}. callId=${callId}`);

    if (targetSocket) {
      targetSocket.emit('offer', { from: fromUserId, offer, callId });
      console.log(`📡 [offer] Server emitted offer to ${targetUserId}`);
    } else {
      console.warn(`⚠️ [offer] User ${targetUserId} not online`);
    }
  }


  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { targetUserId, answer }: { targetUserId: number; answer: any },
  ) {
    const fromUserId = Number(socket.handshake.query.userId);
    const targetSocket = this.getSocket(targetUserId);
    if (targetSocket) {
      targetSocket.emit('answer', { from: fromUserId, answer });
      console.log(`📡 [answer] ${fromUserId} ➡️ ${targetUserId}`);
    } else {
      console.warn(`⚠️ [answer] User ${targetUserId} not online`);
    }
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { targetUserId, candidate }: { targetUserId: number; candidate: any },
  ) {
    const fromUserId = Number(socket.handshake.query.userId);
    const targetSocket = this.getSocket(targetUserId);
    if (targetSocket) {
      targetSocket.emit('ice-candidate', { from: fromUserId, candidate });
      console.log(`❄️ [ice-candidate] ${fromUserId} ➡️ ${targetUserId}`);
    } else {
      console.warn(`⚠️ [ice-candidate] User ${targetUserId} not online`);
    }
  }
}
