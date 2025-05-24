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
  //gửi lời mời kb
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
  //phản hồi lời mời kb
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

    const friends = friendships.map(friendship => {
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
    return {
      totalFriends: friends.length,
      friends,
    };
  }
  async unfriend(userId: number, targerId: number) {
    const friendship = await this.friendshipRepo.findOne({
      where: [
        {
          userOne: { id: userId }, userTwo: { id: targerId }, status: 'accepted'
        },
        {
          userOne: { id: targerId }, userTwo: { id: userId }, status: 'accepted'
        }
      ]
    })
    if (!friendship) {
      throw new NotFoundException("Hai người không phải bạn bè")
    }
    await this.friendshipRepo.remove(friendship)
    return {
      message: "Đã huỷ kết bạn thành công"
    }
  }
  async blockUser(requestId: number, targetId: number) {
    if (requestId === targetId) {
      throw new BadRequestException("Không thể tự chặn chính mình");
    }

    const requester = await this.userRepo.findOne({ where: { id: requestId } });
    const target = await this.userRepo.findOne({ where: { id: targetId } });

    if (!requester || !target) {
      throw new NotFoundException("Người dùng không tồn tại");
    }

    let friendship = await this.friendshipRepo.findOne({
      where: [
        { userOne: { id: requestId }, userTwo: { id: targetId } },
        { userOne: { id: targetId }, userTwo: { id: requestId } }
      ],
      relations: ['userOne', 'userTwo'],
    });

    if (friendship) {
      if (friendship.status === 'blocked') {
        throw new BadRequestException("Bạn đã chặn người này trước đó");
      }

      friendship.status = 'blocked';
    } else {
      friendship = this.friendshipRepo.create({
        userOne: requester!,
        userTwo: target!,
        status: 'blocked',
      });
    }

    await this.friendshipRepo.save(friendship);
    return { message: 'Đã chặn người dùng thành công' };
  }
  async unblockUser(requestId: number, targetId: number) {
    const friendship = await this.friendshipRepo.findOne({
      where: [
        { userOne: { id: requestId }, userTwo: { id: targetId }, status: 'blocked' },
        { userOne: { id: targetId }, userTwo: { id: requestId }, status: 'blocked' },
      ],
      relations: ['userOne', 'userTwo'],
    });

    if (!friendship) {
      throw new NotFoundException("Không có người dùng bị chặn");
    }

    await this.friendshipRepo.remove(friendship);
    return {
      message: "Đã bỏ chặn người dùng",
    };
  }
  //danh sách lời mời kết bạn đã nhận
  async getReceivedFriendRequests(userId: number) {
    const requests = await this.friendshipRepo.find({
      where: {
        userTwo: { id: userId },
        status: 'pending',
      },
      relations: ['userOne'],
    });

    const formatted = requests.map(r => ({
      id: r.id,
      from: {
        id: r.userOne.id,
        firstName: r.userOne.first_name,
        lastName: r.userOne.last_name,
        avatar: r.userOne.avatar_url,
      },
      created_at: r.created_at,
    }));

    return {
      total: formatted.length,
      requests: formatted,
    };
  }
  //danh sách lời mời đã gửi
  async getSentFriendRequests(userId: number) {
    const requests = await this.friendshipRepo.find({
      where: {
        userOne: { id: userId },
        status: 'pending',
      },
      relations: ['userTwo'],
    });

    const formatted = requests.map(r => ({
      id: r.id,
      to: {
        id: r.userTwo.id,
        firstName: r.userTwo.first_name,
        lastName: r.userTwo.last_name,
        avatar: r.userTwo.avatar_url,
      },
      created_at: r.created_at,
    }));
    return {
      total: formatted.length,
      requests: formatted,
    }
  }
  //Hủy lời mời kết bạn đã gửi
  async cancelSentRequest(senderId: number, receiverId: number) {
    const request = await this.friendshipRepo.findOne({
      where: {
        userOne: { id: senderId },
        userTwo: { id: receiverId },
        status: 'pending',
      },
    });

    if (!request) {
      throw new NotFoundException("Không tìm thấy lời mời đã gửi");
    }

    await this.friendshipRepo.remove(request);
    return {
      message: "Đã hủy lời mời kết bạn",
    };
  }

}
