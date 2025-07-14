import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Call } from 'src/entities/call.entity';
import { Message } from 'src/entities/message.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CallService {
  constructor(
    @InjectRepository(Call) private callRepo: Repository<Call>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async startCall(data: {
    callerId: number;
    receiverId: number;
    callType: 'audio' | 'video';
  }): Promise<Call> {
    const caller = await this.userRepo.findOneBy({ id: data.callerId });
    const receiver = await this.userRepo.findOneBy({ id: data.receiverId });

    if (!caller || !receiver) {
      throw new BadRequestException('Caller hoặc receiver không tồn tại');
    }

    const call = this.callRepo.create({
      caller,
      receiver,
      call_type: data.callType,
      status: 'ongoing', // đúng logic hơn
      start_time: new Date(),
    });

    return await this.callRepo.save(call);
  }

  async endCall(callId: number, status: Call['status']): Promise<void> {
    const call = await this.callRepo.findOne({
      where: { id: callId },
      relations: ['caller', 'receiver'],
    });

    if (!call) return;

    call.end_time = new Date();
    call.status = status;

    let durationStr = 'không xác định';

    if (call.start_time) {
      const durationMs = call.end_time.getTime() - call.start_time.getTime();
      durationStr = this.formatDuration(durationMs);
    }

    const message = this.messageRepo.create({
      sender: call.caller,
      receiver: call.receiver,
      type: 'call',
      content:
        status === 'missed'
          ? `Cuộc gọi ${call.call_type} bị nhỡ.`
          : `Cuộc gọi ${call.call_type} đã kết thúc. Thời lượng: ${durationStr}`,
    });

    const savedMessage = await this.messageRepo.save(message);
    call.message = savedMessage;

    await this.callRepo.save(call);
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} phút ${seconds} giây`;
  }
}
