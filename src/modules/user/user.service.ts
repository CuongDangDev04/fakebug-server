import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Friendship } from 'src/entities/friendship.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserDetail } from 'src/entities/user-detail.entity';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Friendship)
        private readonly friendshipRepo: Repository<Friendship>,
        @InjectRepository(UserDetail)
        private readonly userDetailRepository: Repository<UserDetail>,

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
        const user = await this.userRepository.findOne({
            where: { id: userId }
        })
        if (!user) {
            throw new NotFoundException('User not found')
        }
        return { user }

    }
    async getOwnProfile(userId: number) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['posts', 'comments', 'reactions', 'detail'],  // Thêm quan hệ 'detail'
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

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
                detail: user.detail ? {
                    gender: user.detail.gender,
                    date_of_birth: user.detail.date_of_birth,
                    phone_number: user.detail.phone_number,
                    address: user.detail.address,
                    website: user.detail.website,
                    career: user.detail.career,
                    education: user.detail.education,
                    relationship_status: user.detail.relationship_status,
                    cover_url: user.detail.cover_url,
                    gallery_images: user.detail.gallery_images,
                } : null,
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
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const friends = await this.friendshipRepo
            .createQueryBuilder('friendship')
            .where('(friendship.userOneId = :userId OR friendship.userTwoId = :userId)', { userId })
            .andWhere('friendship.status = :status', { status: 'accepted' })
            .leftJoinAndSelect('friendship.userOne', 'userOne')
            .leftJoinAndSelect('friendship.userTwo', 'userTwo')
            .getMany();

        const friendshipStatus = await this.friendshipRepo
            .createQueryBuilder('friendship')
            .where('(friendship.userOneId = :viewerId AND friendship.userTwoId = :userId) OR (friendship.userOneId = :userId AND friendship.userTwoId = :viewerId)',
                { viewerId, userId })
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
                detail: user.detail ? {
                    gender: user.detail.gender,
                    date_of_birth: user.detail.date_of_birth,
                    phone_number: user.detail.phone_number,
                    address: user.detail.address,
                    website: user.detail.website,
                    career: user.detail.career,
                    education: user.detail.education,
                    relationship_status: user.detail.relationship_status,
                    cover_url: user.detail.cover_url,
                    gallery_images: user.detail.gallery_images,
                } : null,
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
        }
    }
    async getPublicUserInfo(userId: number) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

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
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['detail'],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.detail) {
            user.detail = this.userDetailRepository.create({
                user: user,
                cover_url: coverUrl,
            });
        } else {
            user.detail.cover_url = coverUrl;
        }

        return this.userDetailRepository.save(user.detail);

    }


}
