import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../../entities/message.entity';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async sendMessage(senderId: number, receiverId: number, content: string) {
    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    const receiver = await this.userRepository.findOne({ where: { id: receiverId } });
    if (!sender || !receiver) throw new Error('Sender or receiver not found');
    const message = this.messageRepository.create({ sender, receiver, content });
    return this.messageRepository.save(message);
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number) {
    return this.messageRepository.find({
      where: [
        { sender: { id: userId1 }, receiver: { id: userId2 } },
        { sender: { id: userId2 }, receiver: { id: userId1 } },
      ],
      order: { sent_at: 'ASC' },
      relations: ['sender', 'receiver'],
    });
  }
}
