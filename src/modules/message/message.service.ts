import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../../entities/message.entity';
import { Brackets, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

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

  // async getMessagesBetweenUsers(userId1: number, userId2: number, limit = 10, offset = 0) {
  //   return this.messageRepository.find({
  //     where: [
  //       { sender: { id: userId1 }, receiver: { id: userId2 } },
  //       { sender: { id: userId2 }, receiver: { id: userId1 } },
  //     ],
  //     order: { sent_at: 'DESC' }, // lấy mới nhất trước
  //     skip: offset,
  //     take: limit,
  //     relations: ['sender', 'receiver'],
  //     select: ['id', 'content', 'sent_at', 'is_read', 'sender', 'receiver', 'is_revoked'],
  //   });
  // }
  async getMessagesBetweenUsers(userId1: number, userId2: number, limit= 15, offset = 0) {
    return this.messageRepository.createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .where(
        new Brackets(qb => {
          qb.where('sender.id = :userId1 AND receiver.id = :userId2', { userId1, userId2 })
            .orWhere('sender.id = :userId2 AND receiver.id = :userId1', { userId1, userId2 })

        }),
      )
      .orderBy('message.sent_at', 'DESC')
      .skip(offset)
      .take(limit)
      .select([
        'message.id',
        'message.content',
        'message.sent_at',
        'message.is_read',
        'message.is_revoked',
        'sender.id',
        'sender.first_name',
        'sender.last_name',
        'sender.avatar_url',
        'receiver.id',
        'receiver.first_name',
        'receiver.last_name',
        'receiver.avatar_url',
      ])
      .getMany();
  }
  async getLastMessageWithFriends(userId: number) {
    // Lấy tất cả các tin nhắn mà user này là sender hoặc receiver, chỉ lấy id, content, sent_at, senderId, receiverId
    const messages = await this.messageRepository.find({
      select: ['id', 'content', 'sent_at', 'sender', 'receiver', 'is_read'],
      where: [
        { sender: { id: userId } },
        { receiver: { id: userId } },
      ],
      relations: ['sender', 'receiver'],
      order: { sent_at: 'DESC' },
    });

    const friendLastMessageMap = new Map<number, Partial<any>>();
    const unreadCountMap = new Map<number, number>();
    let totalUnreadCount = 0;

    messages.forEach(msg => {
      const isSenderMe = msg.sender.id === userId;
      const friend = isSenderMe ? msg.receiver : msg.sender;
      const friendId = friend.id;

      // Đếm tổng số tin nhắn chưa đọc gửi tới userId từ từng bạn bè
      if (!isSenderMe && !msg.is_read) {
        totalUnreadCount += 1;
        unreadCountMap.set(friendId, (unreadCountMap.get(friendId) || 0) + 1);
      }

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
          is_read: isSenderMe ? true : msg.is_read, // Nếu là mình gửi thì luôn là đã đọc, còn lại lấy trạng thái thực
          unreadCount: 0, // sẽ cập nhật bên dưới
        });
      }
    });

    // Gán unreadCount cho từng bạn bè
    friendLastMessageMap.forEach((value, friendId) => {
      value.unreadCount = unreadCountMap.get(friendId) || 0;
    });

    return {
      friends: Array.from(friendLastMessageMap.values()),
      totalUnreadCount,
    };
  }

  async getTotalUnreadCount(userId: number) {
    // Đếm tổng số tin nhắn chưa đọc gửi tới userId từ tất cả bạn bè
    const count = await this.messageRepository.count({
      where: {
        receiver: { id: userId },
        is_read: false,
      },
    });
    return { totalUnreadCount: count };
  }

  async markMessagesAsRead(senderId: number, receiverId: number) {
    // Đánh dấu tất cả tin nhắn từ senderId gửi tới receiverId là đã đọc
    await this.messageRepository.update(
      {
        sender: { id: senderId },
        receiver: { id: receiverId },
        is_read: false
      },
      {
        is_read: true
      }
    );
  }

  async revokeMessage(messageId: number, userId: number) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Chỉ cho phép người gửi thu hồi
    if (message.sender.id !== userId) {
      throw new Error('Unauthorized to revoke this message');
    }

    // Thu hồi
    message.is_revoked = true;
    return this.messageRepository.save(message);
  }

}
