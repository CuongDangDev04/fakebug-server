import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../../entities/message.entity';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { AnyARecord } from 'dns';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

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
  async getLastMessageWithFriends(userId: number) {
    // Lấy tất cả các tin nhắn mà user này là sender hoặc receiver, chỉ lấy id, content, sent_at, senderId, receiverId
    const messages = await this.messageRepository.find({
      select: ['id', 'content', 'sent_at', 'sender', 'receiver'],
      where: [
        { sender: { id: userId } },
        { receiver: { id: userId } },
      ],
      relations: ['sender', 'receiver'],
      order: { sent_at: 'DESC' },
    });

    const friendLastMessageMap = new Map<number, Partial<any>>();

    messages.forEach(msg => {
      const isSenderMe = msg.sender.id === userId;
      const friend = isSenderMe ? msg.receiver : msg.sender;
      const friendId = friend.id;
      if (!friendLastMessageMap.has(friendId)) {
        friendLastMessageMap.set(friendId, {
          id: msg.id,
          content: msg.content,
          sent_at: msg.sent_at,
          senderId: msg.sender.id,
          receiverId: msg.receiver.id,
          friendId: friend.id,
          friendName: friend.first_name + ' ' + friend.last_name,
          avatar_url: friend.avatar_url,
        });
      }
    });

    return Array.from(friendLastMessageMap.values());
  }
  async markMessagesAsRead(senderId: number, receiverId: number) {
    await this.messageRepository.update(
      {
        sender: { id: senderId },
        receiver: { id: receiverId },
        is_read: false
      },
      {
        is_read: true
      }
    )
  }
}
