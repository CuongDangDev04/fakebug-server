import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Post } from 'src/entities/post.entity';
import { User } from 'src/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { CloudinaryService } from 'src/modules/cloudinary/cloudinary.service';
import { Friendship } from 'src/entities/friendship.entity';

@Injectable()
export class PostService {
    constructor(
        @InjectRepository(Post)
        private postRepo: Repository<Post>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private cloudinaryService: CloudinaryService,
        @InjectRepository(Friendship)
        private friendshipRepo: Repository<Friendship>
    ) { }

    async create(dto: CreatePostDto, file?: Express.Multer.File) {
        const user = await this.userRepo.findOne({ where: { id: dto.userId } });
        if (!user) {
            throw new NotFoundException('User không tồn tại');
        }

        let mediaUrl: string | undefined = undefined;

        if (file) {
            mediaUrl = await this.cloudinaryService.uploadImage(file, 'posts');
        }

        let originalPost: Post | undefined;

        if (dto.originalPostId) {
            const foundOriginal = await this.postRepo.findOne({
                where: { id: dto.originalPostId },
                relations: ['user'],
            });

            if (!foundOriginal || foundOriginal.privacy !== 'public') {
                throw new BadRequestException('Chỉ có thể chia sẻ bài viết công khai');
            }

            originalPost = foundOriginal;
        }


        const newPost = this.postRepo.create({
            user,
            content: dto.content,
            media_url: mediaUrl,
            privacy: dto.privacy || 'friends',
            originalPost,
            original_post_id: originalPost?.id
        });


        return this.postRepo.save(newPost);
    }



    async getById(id: number) {
        const post = await this.postRepo.findOne({
            where: { id },
            relations: ['user', 'reactions', 'reactions.user', 'comments', 'originalPost', 'originalPost.user'],
        });
        console.log('post', post)
        if (!post) throw new NotFoundException('Bài viết không tồn tại');

        return this.formatPostWithReactions(post);
    }


    async update(id: number, dto: CreatePostDto, file?: Express.Multer.File) {

        const post = await this.postRepo.findOne({ where: { id }, relations: ['user'] });

        if (!post) {
            console.log('Bài viết không tồn tại');
            throw new NotFoundException('Bài viết không tồn tại');
        }

        console.log('Bài viết tìm được:', {
            id: post.id,
            userId: post.user.id,
            currentContent: post.content,
            currentMediaUrl: post.media_url,
        });

        if (dto.userId && post.user.id !== Number(dto.userId)) {
            console.log('Người dùng không có quyền chỉnh sửa bài viết này');
            throw new BadRequestException('Bạn không có quyền chỉnh sửa bài viết này');
        }

        // Xử lý ảnh
        if (file) {
            console.log('Đang upload file mới lên Cloudinary...');
            post.media_url = await this.cloudinaryService.uploadImage(file, 'posts');
            console.log('File mới đã upload, media_url:', post.media_url);
        } else if (dto.removeImage) {
            console.log('Người dùng yêu cầu xóa ảnh khỏi bài viết.');
            post.media_url = null;
        }

        // Cập nhật nội dung
        if (dto.content !== undefined) {
            console.log('Đang cập nhật nội dung bài viết...');
            post.content = dto.content;
        }
        if (dto.privacy) {
            console.log('Đang cập nhật quyền riêng tư...');
            post.privacy = dto.privacy;
        }

        console.log('Dữ liệu bài viết sau khi cập nhật:', {
            content: post.content,
            media_url: post.media_url,
        });

        const savedPost = await this.postRepo.save(post);
        console.log('Đã lưu bài viết thành công:', savedPost);

        return this.postRepo.findOne({
            where: { id: savedPost.id },
            relations: ['user', 'comments', 'reactions'],  // Trả về dữ liệu đầy đủ
        });
    }

    async checkFriendship(userId1: number, userId2: number): Promise<boolean> {
        const friendship = await this.friendshipRepo.findOne({
            where: [
                { userOne: { id: userId1 }, userTwo: { id: userId2 }, status: 'accepted' },
                { userOne: { id: userId2 }, userTwo: { id: userId1 }, status: 'accepted' },
            ]
        });
        return !!friendship;
    }

    async getPostForUser(postId: number, viewerId: number) {
        const post = await this.postRepo.findOne({
            where: { id: postId },
            relations: ['user'],
        });

        if (!post) throw new NotFoundException('Bài viết không tồn tại');

        if (post.privacy === 'private' && post.user.id !== viewerId) {
            throw new BadRequestException('Bạn không có quyền xem bài viết này');
        }

        if (post.privacy === 'friends') {
            const isFriend = await this.checkFriendship(post.user.id, viewerId);
            if (!isFriend && post.user.id !== viewerId) {
                throw new BadRequestException('Bạn không có quyền xem bài viết này');
            }
        }

        return post;
    }

    // Lấy các bài viết công khai
    async getPublicPosts(offset = 0, limit = 5) {
        const posts = await this.postRepo.find({
            where: { privacy: 'public' },
            relations: ['user', 'reactions', 'reactions.user', 'comments', 'originalPost', 'originalPost.user'],
            order: { created_at: 'DESC' },
            skip: offset,
            take: limit,
        });

        return posts.map(post => this.formatPostWithReactions(post));
    }



    // Lấy các bài viết riêng tư của chính người dùng
    async getPrivatePosts(userId: number, offset = 0, limit = 5) {
        const posts = await this.postRepo.find({
            where: {
                user: { id: userId },
                privacy: 'private',
            },
            relations: ['user', 'reactions', 'reactions.user', 'comments', 'originalPost', 'originalPost.user'],
            order: { created_at: 'DESC' },
            skip: offset,
            take: limit,
        });

        return posts.map(post => this.formatPostWithReactions(post));
    }



    // Lấy bài viết của bạn bè (và chính user)
    async getFriendPosts(userId: number, offset = 0, limit = 5) {
        const friendships = await this.friendshipRepo.find({
            where: [
                { userOne: { id: userId }, status: 'accepted' },
                { userTwo: { id: userId }, status: 'accepted' },
            ],
            relations: ['userOne', 'userTwo'],
        });

        const friendIds = friendships.map(friendship =>
            friendship.userOne.id === userId
                ? friendship.userTwo.id
                : friendship.userOne.id
        );
        friendIds.push(userId);

        const posts = await this.postRepo.find({
            where: {
                user: { id: In(friendIds) },
                privacy: 'friends',
            },
            relations: ['user', 'reactions', 'reactions.user', 'comments', 'originalPost', 'originalPost.user'],
            order: { created_at: 'DESC' },
            skip: offset,
            take: limit,
        });

        return posts.map(post => this.formatPostWithReactions(post));
    }

    // Lấy tất cả bài viết mà user được phép xem
    async getAllVisiblePosts(userId: number, offset = 0, limit = 5) {
        const friendships = await this.friendshipRepo.find({
            where: [
                { userOne: { id: userId }, status: 'accepted' },
                { userTwo: { id: userId }, status: 'accepted' },
            ],
            relations: ['userOne', 'userTwo'],
        });

        const friendIds = friendships.map(friendship =>
            friendship.userOne.id === userId
                ? friendship.userTwo.id
                : friendship.userOne.id
        );
        friendIds.push(userId);

        const posts = await this.postRepo.find({
            where: [
                { privacy: 'public' },
                { privacy: 'friends', user: { id: In(friendIds) } },
                { privacy: 'private', user: { id: userId } },
            ],
            relations: ['user', 'reactions', 'reactions.user', 'comments', 'originalPost', 'originalPost.user'],
            order: { created_at: 'DESC' },
            skip: offset,
            take: limit,
        });

        return posts.map(post => this.formatPostWithReactions(post));
    }


    private formatPostWithReactions(post: Post) {
        const reactions = post.reactions || [];

        return {
            ...post,
            total_reactions: reactions.length,

            reacted_users: reactions.map(r => ({
                id: r.user.id,
                first_name: r.user.first_name,
                last_name: r.user.last_name,
                avatar_url: r.user.avatar_url,
                type: r.type,
            })),

            original_post: post.originalPost
                ? {
                    id: post.originalPost.id,
                    content: post.originalPost.content,
                    user: {
                        id: post.originalPost.user.id,
                        first_name: post.originalPost.user.first_name,
                        last_name: post.originalPost.user.last_name,
                        avatar_url: post.originalPost.user.avatar_url,
                    },
                }
                : null,
        };
    }
    async delete(id: number, userId: number): Promise<{ message: string }> {
        const post = await this.postRepo.findOne({
            where: { id },
            relations: ['user'],
        });

        if (!post) {
            throw new NotFoundException('Bài viết không tồn tại');
        }

        if (post.user.id !== userId) {
            throw new BadRequestException('Bạn không có quyền xóa bài viết này');
        }

        await this.postRepo.remove(post);

        return { message: 'Xóa bài viết thành công' };
    }
    async getPostsMyUser(userId: number, offset = 0, limit = 5) {
        const posts = await this.postRepo.find({
            where: { user: { id: userId } },
            relations: ['user', 'reactions', 'reactions.user', 'comments', 'originalPost', 'originalPost.user'],
            order: { created_at: 'DESC' },
            skip: offset,
            take: limit,
        });

        return posts.map(post => this.formatPostWithReactions(post));
    }


}
