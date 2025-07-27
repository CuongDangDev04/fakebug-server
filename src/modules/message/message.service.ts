import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../../entities/message.entity';
import { Brackets, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { MessageReaction } from 'src/entities/message-reaction.entity';
import { MessageBlock } from 'src/entities/message-block.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MessageReaction)
    private readonly reactionRepository: Repository<MessageReaction>,
    @InjectRepository(MessageBlock)
    private readonly messageBlockRepo: Repository<MessageBlock>,

  ) { }

  async sendMessage(senderId: number, receiverId: number, content: string) {
    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    const receiver = await this.userRepository.findOne({ where: { id: receiverId } });
    if (!sender || !receiver) throw new Error('Sender or receiver not found');

    const isBlocked = await this.messageBlockRepo.findOne({
      where: [
        { blocker: { id: senderId }, blocked: { id: receiverId } },
        { blocker: { id: receiverId }, blocked: { id: senderId } },
      ],
    });

    if (isBlocked) {
      throw new BadRequestException('Cannot send message due to message block.');
    }

    const message = this.messageRepository.create({ sender, receiver, content });
    return this.messageRepository.save(message);
  }


  async getMessagesBetweenUsers(userId1: number, userId2: number, limit = 15, offset = 0) {
    return this.messageRepository.createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .leftJoinAndSelect('message.reactions', 'reaction')
      .leftJoinAndSelect('reaction.user', 'reactionUser')
      .where(
        new Brackets(qb => {
          qb.where(
            new Brackets(qb1 => {
              qb1.where('sender.id = :userId1 AND receiver.id = :userId2')
                .andWhere('message.is_deleted_for_sender = false')
            }))
            .orWhere(
              new Brackets(qb2 => {
                qb2.where('sender.id = :userId2 AND receiver.id = :userId1')
                  .andWhere('message.is_deleted_for_receiver = false')
              }))
        }),
      )
      .orderBy('message.sent_at', 'DESC')
      .skip(offset)
      .take(limit)
      .setParameters({ userId1, userId2 })
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
        'reaction.id',
        'reaction.emoji',
        'reaction.create_at',
        'reactionUser.id',
        'reactionUser.first_name',
        'reactionUser.last_name',
        'reactionUser.avatar_url',
      ])

      .getMany();
  }

  async getLastMessageWithFriends(userId: number) {
    const messages = await this.messageRepository.find({
      select: [
        'id',
        'content',
        'sent_at',
        'sender',
        'receiver',
        'is_read',
        'is_deleted_for_sender',
        'is_deleted_for_receiver',
      ],
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

      // Bỏ qua nếu tin nhắn đã bị xóa bởi phía tương ứng
      if ((isSenderMe && msg.is_deleted_for_sender) || (!isSenderMe && msg.is_deleted_for_receiver)) {
        return;
      }

      const friend = isSenderMe ? msg.receiver : msg.sender;
      const friendId = friend.id;

      // Đếm tin chưa đọc
      if (!isSenderMe && !msg.is_read) {
        totalUnreadCount += 1;
        unreadCountMap.set(friendId, (unreadCountMap.get(friendId) || 0) + 1);
      }

      // Nếu chưa có message với friend này, thêm vào
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
          is_read: isSenderMe ? true : msg.is_read,
          unreadCount: 0, // cập nhật sau
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
  // Thêm hoặc cập nhật cảm xúc
  async reactToMessage(messageId: number, userId: number, emoji: string) {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!message || !user) throw new NotFoundException('Message or user not found');

    const existing = await this.reactionRepository.findOne({
      where: { message: { id: messageId }, user: { id: userId } },
    });

    if (existing) {
      existing.emoji = emoji;
      return this.reactionRepository.save(existing);
    } else {
      const reaction = this.reactionRepository.create({ message, user, emoji });
      return this.reactionRepository.save(reaction);
    }
  }

  // Xoá cảm xúc
  async removeReaction(messageId: number, userId: number) {
    await this.reactionRepository.delete({
      message: { id: messageId },
      user: { id: userId },
    });
  }
  async getMessageWithRelations(messageId: number) {
    return this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver', 'reactions', 'reactions.user'],
    });
  }
  async deletedMessageForMe(messageId: number, userId: number) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver']
    });
    if (!message) {
      throw new NotFoundException("Message not found")
    }
    const isSender = message.sender.id === userId;
    const isReceiver = message.receiver.id === userId;

    if (!isSender && !isReceiver) {
      throw new UnauthorizedException('You are not allowed to delete this message');
    }

    if (isSender) {
      message.is_deleted_for_sender = true;
    }

    if (isReceiver) {
      message.is_deleted_for_receiver = true;
    }

    return this.messageRepository.save(message);

  }
  async forwardMessage(messageId: number, senderId: number, receiverId: number) {
    if (senderId === receiverId) {
      throw new BadRequestException('Không thể chuyển tiếp tin nhắn cho chính bạn.');
    }
    const originalMessage = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver'],
    });
    console.log('originalMessage', originalMessage)
    if (!originalMessage) {
      throw new NotFoundException('Original message not found');
    }

    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    const receiver = await this.userRepository.findOne({ where: { id: receiverId } });

    if (!sender || !receiver) {
      throw new NotFoundException('Sender or receiver not found');
    }

    const forwardedContent = `${originalMessage.content}`;
    console.log('forwardedContent', forwardedContent)
    const newMessage = this.messageRepository.create({
      sender,
      receiver,
      content: forwardedContent,
    });

    return this.messageRepository.save(newMessage);
  }
  //xoá cuộc trò chuyện ở bên user
  async deleteConversation(userId: number, otherUserId: number) {
    const messages = await this.messageRepository.find({
      where: [
        { sender: { id: userId }, receiver: { id: otherUserId }, is_deleted_for_sender: false },
        { sender: { id: otherUserId }, receiver: { id: userId }, is_deleted_for_receiver: false },
      ],
      relations: ['sender', 'receiver']
    });

    for (const msg of messages) {
      if (msg.sender.id === userId) {
        msg.is_deleted_for_sender = true;
      } else if (msg.receiver.id === userId) {
        msg.is_deleted_for_receiver = true;
      }
    }

    await this.messageRepository.save(messages);
    return { message: 'Conversation deleted for you' };
  }
  async blockMessageUser(blockerId: number, blockedId: number) {
    if (blockerId === blockedId) throw new BadRequestException('Không thể tự chặn chính mình');

    const existing = await this.messageBlockRepo.findOne({
      where: { blocker: { id: blockerId }, blocked: { id: blockedId } },
    });

    if (existing) return { message: 'Đã chặn người dùng này rồi' };

    const block = this.messageBlockRepo.create({
      blocker: { id: blockerId },
      blocked: { id: blockedId },
    });

    await this.messageBlockRepo.save(block);
    return { message: 'Đã chặn tin nhắn thành công' };
  }


  async unblockMessageUser(blockerId: number, blockedId: number) {
    const result = await this.messageBlockRepo.delete({
      blocker: { id: blockerId },
      blocked: { id: blockedId },
    });

    if (result.affected === 0) throw new NotFoundException('No block record found');
    return { message: 'Unblocked user for messages' };
  }

  async checkMessageBlock(userId1: number, userId2: number) {
    const block = await this.messageBlockRepo.findOne({
      where: [
        { blocker: { id: userId1 }, blocked: { id: userId2 } },
        { blocker: { id: userId2 }, blocked: { id: userId1 } },
      ],
      relations: ['blocker', 'blocked'],
    });

    return {
      isBlocked: !!block,
      blockedBy: block ? block.blocker.id : null,
    };
  }

}
