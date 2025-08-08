import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Friendship } from 'src/entities/friendship.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { UpdateUserProfileDto } from './dto/update-profile-user.dto';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Friendship)
        private readonly friendshipRepo: Repository<Friendship>,
    ) { }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async create(data: Partial<User>): Promise<User> {
        const user = this.userRepository.create(data);
        return this.userRepository.save(user);
    }

    async update(user: User): Promise<User> {
        return this.userRepository.save(user);
    }

    async findById(id: number): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async findByEmailOrUsername(identifier: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: [
                { email: identifier },
                { username: identifier },
            ],
        });
    }

    async getInfoUser(userId: number) {
        const user = await this.userRepository
            .createQueryBuilder('user')
            .select([
                'user.id',
                'user.first_name',
                'user.last_name',
                'user.username',
                'user.email',
                'user.avatar_url',
                'user.cover_url',
                'user.bio',
                'user.role',
                'user.provider',
                'user.is_disabled'
            ])
            .where('user.id = :userId', { userId })
            .getOne();

        if (!user) throw new NotFoundException('User not found');

        return { user };
    }


    async getOwnProfile(userId: number) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['posts', 'comments', 'reactions'],
        });

        if (!user) throw new NotFoundException('User not found');

        const friends = await this.friendshipRepo
            .createQueryBuilder('friendship')
            .where('(friendship.userOneId = :userId OR friendship.userTwoId = :userId)', { userId })
            .andWhere('friendship.status = :status', { status: 'accepted' })
            .leftJoinAndSelect('friendship.userOne', 'userOne')
            .leftJoinAndSelect('friendship.userTwo', 'userTwo')
            .getMany();

        const friendUsers = friends.map(f =>
            (f.userOne.id === userId ? f.userTwo : f.userOne)
        );

        return {
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                email: user.email,
                avatar_url: user.avatar_url,
                bio: user.bio,
                role: user.role,
                provider: user.provider,
                cover_url: user.cover_url,
            },
            friends: {
                total: friends.length,
                list: friendUsers.map(friend => ({
                    id: friend.id,
                    first_name: friend.first_name,
                    last_name: friend.last_name,
                    username: friend.username,
                    avatar_url: friend.avatar_url,
                })),
            },
        };
    }

    async getOtherUserProfile(userId: number, viewerId: number) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['posts', 'comments', 'reactions'],
        });

        if (!user) throw new NotFoundException('User not found');

        const friends = await this.friendshipRepo
            .createQueryBuilder('friendship')
            .where('(friendship.userOneId = :userId OR friendship.userTwoId = :userId)', { userId })
            .andWhere('friendship.status = :status', { status: 'accepted' })
            .leftJoinAndSelect('friendship.userOne', 'userOne')
            .leftJoinAndSelect('friendship.userTwo', 'userTwo')
            .getMany();

        const friendshipStatus = await this.friendshipRepo
            .createQueryBuilder('friendship')
            .where(
                '(friendship.userOneId = :viewerId AND friendship.userTwoId = :userId) OR (friendship.userOneId = :userId AND friendship.userTwoId = :viewerId)',
                { viewerId, userId },
            )
            .getOne();

        const friendUsers = friends
            .map(f => (f.userOne.id === userId ? f.userTwo : f.userOne))
            .slice(0, 6);

        return {
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                avatar_url: user.avatar_url,
                bio: user.bio,
                cover_url: user.cover_url,
            },
            friendshipStatus: friendshipStatus ? friendshipStatus.status : null,
            friends: {
                total: friends.length,
                list: friendUsers.map(friend => ({
                    id: friend.id,
                    first_name: friend.first_name,
                    last_name: friend.last_name,
                    username: friend.username,
                    avatar_url: friend.avatar_url,
                })),
            },
        };
    }

    async getPublicUserInfo(userId: number) {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) throw new NotFoundException('User not found');

        return {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            avatar_url: user.avatar_url,
            bio: user.bio,
        };
    }

    async updateAvatar(userId: number, avatarUrl: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        user.avatar_url = avatarUrl;
        return this.userRepository.save(user);
    }

    async updateCover(userId: number, coverUrl: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        user.cover_url = coverUrl;
        return this.userRepository.save(user);
    }

    async searchUsers(keyword: string, page = 1, limit = 10) {
        const lowerKeyword = `%${keyword.toLowerCase()}%`;

        const [users, total] = await this.userRepository
            .createQueryBuilder('user')
            .where('LOWER(user.first_name) LIKE :keyword', { keyword: lowerKeyword })
            .orWhere('LOWER(user.last_name) LIKE :keyword', { keyword: lowerKeyword })
            .select([
                'user.id',
                'user.first_name',
                'user.last_name',
                'user.username',
                'user.avatar_url',
                'user.bio',
                'user.cover_url',
            ])
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data: users,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async updateProfile(userId: number, dto: UpdateUserProfileDto) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Người dùng không tồn tại');

        // Kiểm tra username đã tồn tại chưa (nếu có sửa)
        if (dto.username && dto.username !== user.username) {
            const existingUser = await this.userRepository.findOne({
                where: { username: dto.username },
            });
            if (existingUser) throw new BadRequestException('Tên người dùng đã tồn tại');
        }

        Object.assign(user, dto);
        const updatedUser = await this.userRepository.save(user);

        return {
            message: 'Cập nhật thông tin cá nhân thành công',
            user: {
                id: updatedUser.id,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                username: updatedUser.username,
                bio: updatedUser.bio,
                avatar_url: updatedUser.avatar_url,
                cover_url: updatedUser.cover_url,
            },
        };
    }
    async getUsersByRole(role: 'user' | 'admin', page = 1, limit = 10) {
        const [users, total] = await this.userRepository.findAndCount({
            where: { role },
            skip: (page - 1) * limit,
            take: limit,
            select: [
                'id', 'first_name', 'last_name', 'username',
                'email', 'avatar_url', 'bio', 'role', 'is_disabled',
            ],
        });

        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async toggleUserStatus(userId: number, disable: boolean) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        if (user.role === 'admin') {
            throw new BadRequestException('Không thể vô hiệu hóa tài khoản admin');
        }

        user.is_disabled = disable;
        await this.userRepository.save(user);

        return {
            message: disable ? 'Tài khoản đã bị vô hiệu hóa' : 'Tài khoản đã được kích hoạt lại',
            user: {
                id: user.id,
                username: user.username,
                is_disabled: user.is_disabled,
            },
        };
    }
    async countUsers(): Promise<number> {
        return this.userRepository.count();
    }

}
