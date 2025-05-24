import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Friendship } from 'src/entities/friendship.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FriendshipService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepo: Repository<Friendship>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) { }

  async sendFriendRequest(senderId: number, receiverId: number) {
    if (senderId === receiverId) {
      throw new BadRequestException('Bạn không thể gửi lời mời kết bạn cho chính mình.');
    }

    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    const receiver = await this.userRepo.findOne({ where: { id: receiverId } });

    if (!sender || !receiver) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const existing = await this.friendshipRepo.findOne({
      where: [
        { userOne: { id: sender.id }, userTwo: { id: receiver.id } },
        { userOne: { id: receiver.id }, userTwo: { id: sender.id } },
      ],
      relations: ['userOne', 'userTwo'], // Quan trọng để join bảng userOne, userTwo
    });
    if (existing) {
      if (existing.status === 'blocked') {
        throw new BadRequestException('Bạn không thể gửi lời mời vì đã bị chặn hoặc đã chặn người này.');
      }

      if (existing.status === 'pending') {
        throw new BadRequestException('Lời mời kết bạn đã được gửi, hãy chờ phản hồi.');
      }

      if (existing.status === 'accepted') {
        return {
          message: 'Hai người đã là bạn bè.',
        };
      }

      // Nếu bị từ chối  thì xóa bản ghi cũ để gửi lại
      await this.friendshipRepo.remove(existing);
    }

    const friendship = this.friendshipRepo.create({
      userOne: sender,
      userTwo: receiver,
      status: 'pending',
    });

    const savedFriendship = await this.friendshipRepo.save(friendship);

    return {
      message: 'Lời mời kết bạn đã được gửi.',
      data: {
        id: savedFriendship.id,
        status: savedFriendship.status,
        created_at: savedFriendship.created_at,
        senderId: sender.id,
        receiverId: receiver.id,
      }
    };
  }

  async respondFriendRequest(requestId: number, userId: number, accept: boolean) {
    const request = await this.friendshipRepo.findOne({
      where: { id: requestId },
      relations: ['userTwo'],
    });

    if (!request) throw new NotFoundException('Lời mời kết bạn không tồn tại');
    if (request.userTwo.id !== userId)
      throw new BadRequestException('Bạn không có quyền xử lý lời mời này');

    if (accept) {
      request.status = 'accepted';
      const updated = await this.friendshipRepo.save(request);

      return {
        message: 'Đã chấp nhận lời mời kết bạn',
        data: {
          id: updated.id,
          status: updated.status,
          updated_at: updated.created_at,
        },
      };
    } else {
      await this.friendshipRepo.remove(request);
      return {
        message: 'Đã từ chối lời mời kết bạn và xóa yêu cầu',
      };
    }
  }


  async getFriends(userId: number) {
    const friendships = await this.friendshipRepo.find({
      where: [
        { userOne: { id: userId }, status: 'accepted' },
        { userTwo: { id: userId }, status: 'accepted' },
      ],
      relations: ['userOne', 'userTwo'],
    });

    return friendships.map(friendship => {
      const friend =
        friendship.userOne.id === userId ? friendship.userTwo : friendship.userOne;

      return {
        id: friend.id,
        firstName: friend.first_name,
        lastName: friend.last_name,
        avatar: friend.avatar_url,
        friendshipId: friendship.id,
        created_at: friendship.created_at,
      };
    });
  }

}
