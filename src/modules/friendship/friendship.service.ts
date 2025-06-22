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
  // Helper method để lấy danh sách ID bạn bè
  private async getFriendIds(userId: number): Promise<number[]> {
    const friendships = await this.friendshipRepo.find({
      where: [
        { userOne: { id: userId }, status: 'accepted' },
        { userTwo: { id: userId }, status: 'accepted' },
      ],
      relations: ['userOne', 'userTwo'],
    });

    return friendships.map(friendship =>
      friendship.userOne.id === userId ? friendship.userTwo.id : friendship.userOne.id
    );
  }
  // Lấy danh sách bạn chung
  async getMutualFriends(userId: number, targetId: number) {
    // Lấy danh sách bạn của người dùng hiện tại
    const userFriends = await this.getFriendIds(userId);
    // Lấy danh sách bạn của người dùng target 
    const targetFriends = await this.getFriendIds(targetId);

    // Tìm các ID chung giữa 2 danh sách
    const mutualFriendIds = userFriends.filter(id => targetFriends.includes(id));

    // Lấy thông tin chi tiết của các bạn chung
    const mutualFriends = await this.userRepo.findByIds(mutualFriendIds);

    const formatted = mutualFriends.map(friend => ({
      id: friend.id,
      firstName: friend.first_name,
      lastName: friend.last_name,
      avatar: friend.avatar_url
    }));

    return {
      total: formatted.length,
      friends: formatted
    };
  }
  // Gợi ý kết bạn dựa trên bạn chung
  async getFriendSuggestions(userId: number) {
    // Lấy danh sách bạn hiện tại
    const currentFriends = await this.getFriendIds(userId);

    // Lấy danh sách người đã bị chặn hoặc đã gửi lời mời
    const excludedUsers = await this.friendshipRepo.find({
      where: [
        { userOne: { id: userId }, status: 'blocked' },
        { userTwo: { id: userId }, status: 'blocked' },
        { userOne: { id: userId }, status: 'pending' },
        { userTwo: { id: userId }, status: 'pending' },
      ],
      relations: ['userOne', 'userTwo'],
    });

    const excludedIds = excludedUsers.map(friendship =>
      friendship.userOne.id === userId ? friendship.userTwo.id : friendship.userOne.id
    );

    // Lấy danh sách bạn của bạn (cấp 2)
    const friendsOfFriends = await Promise.all(
      currentFriends.map(friendId => this.getFriendIds(friendId))
    );

    // Gộp và lọc danh sách gợi ý
    const allPotentialFriends = [...new Set(friendsOfFriends.flat())]
      .filter(id =>
        id !== userId &&
        !currentFriends.includes(id) &&
        !excludedIds.includes(id)
      );

    // Tính số lượng bạn chung và lấy thông tin người dùng
    const suggestions = await Promise.all(
      allPotentialFriends.map(async (suggestedId) => {
        const [mutualFriends, user] = await Promise.all([
          this.getMutualFriends(userId, suggestedId),
          this.userRepo.findOne({ where: { id: suggestedId } })
        ]);

        if (!user) return null;

        return {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          avatar: user.avatar_url,
          mutualFriendsCount: mutualFriends.total
        };
      })
    );

    // Lọc và sắp xếp kết quả
    const validSuggestions = suggestions
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.mutualFriendsCount - a.mutualFriendsCount);

    return {
      total: validSuggestions.length,
      suggestions: validSuggestions
    };
  }
  async checkFriendshipStatus(currentUserId: number, targetUserId: number) {
    const friendship = await this.friendshipRepo.findOne({
      where: [
        { userOne: { id: currentUserId }, userTwo: { id: targetUserId } },
        { userOne: { id: targetUserId }, userTwo: { id: currentUserId } }
      ],
      relations: ['userOne', 'userTwo'],
    });

    if (!friendship) {
      return {
        status: 'not_friend',
        message: 'Chưa là bạn bè'
      };
    }

    if (friendship.status === 'blocked') {
      return {
        status: 'blocked',
        message: 'Đã bị chặn hoặc đã chặn'
      };
    }

    if (friendship.status === 'accepted') {
      return {
        status: 'friend',
        message: 'Đã là bạn bè',
        friendshipId: friendship.id
      };
    }

    if (friendship.status === 'pending') {
      if (friendship.userOne.id === currentUserId) {
        return {
          status: 'pending',
          message: 'Đã gửi lời mời kết bạn',
          friendshipId: friendship.id
        };
      } else {
        return {
          status: 'waiting',
          message: 'Đã nhận được lời mời kết bạn',
          friendshipId: friendship.id
        };
      }
    }
  }
  async getUserFriends(targetUserId: number) {
    const friendships = await this.friendshipRepo.find({
      where: [
        { userOne: { id: targetUserId }, status: 'accepted' },
        { userTwo: { id: targetUserId }, status: 'accepted' },
      ],
      relations: ['userOne', 'userTwo'],
    });

    const friends = await Promise.all(friendships.map(async (friendship) => {
      const friend = friendship.userOne.id === targetUserId ? friendship.userTwo : friendship.userOne;
      console.log('f',friend)
      const mutualFriends = await this.getMutualFriends(targetUserId, friend.id);
      console.log('bạn chung', mutualFriends)
      return {
        id: friend.id,
        firstName: friend.first_name,
        lastName: friend.last_name,
        avatar: friend.avatar_url,
        mutualCount: mutualFriends.total,
        friendshipStatus: 'FRIEND'
      };
    }));

    return {
      total: friends.length,
      friends
    };
  }

  async getFriendshipStatusBatch(currentUserId: number, userIds: number[]) {
    const friendshipStatuses = await Promise.all(
      userIds.map(async (targetId) => {
        const friendship = await this.friendshipRepo.findOne({
          where: [
            { userOne: { id: currentUserId }, userTwo: { id: targetId } },
            { userOne: { id: targetId }, userTwo: { id: currentUserId } }
          ],
          relations: ['userOne', 'userTwo'],
        });

        const mutualFriends = await this.getMutualFriends(currentUserId, targetId);
        const user = await this.userRepo.findOne({ where: { id: targetId } });

        let status: 'FRIEND' | 'NOT_FRIEND' | 'PENDING_SENT' | 'PENDING_RECEIVED' = 'NOT_FRIEND';

        if (friendship) {
          if (friendship.status === 'accepted') {
            status = 'FRIEND';
          } else if (friendship.status === 'pending') {
            status = friendship.userOne.id === currentUserId ? 'PENDING_SENT' : 'PENDING_RECEIVED';
          }
        }

        return {
          id: targetId,
          firstName: user?.first_name,
          lastName: user?.last_name,
          avatar: user?.avatar_url,
          mutualCount: mutualFriends.total,
          friendshipStatus: status
        };
      })
    );

    return friendshipStatuses;
  }

  async getBlockedUsers(userId: number) {
    // Lấy tất cả các mối quan hệ mà userId là người chặn hoặc bị chặn với status 'blocked'
    const blockedFriendships = await this.friendshipRepo.find({
      where: [
        { userOne: { id: userId }, status: 'blocked' },
        { userTwo: { id: userId }, status: 'blocked' },
      ],
      relations: ['userOne', 'userTwo'],
    });

    // Lấy user bị chặn (không phải userId)
    const blockedUsers = blockedFriendships.map(f =>
      f.userOne.id === userId ? f.userTwo : f.userOne
    );

    const formatted = blockedUsers.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar_url,
    }));

    return {
      total: formatted.length,
      blocked: formatted,
    };
  }
}
