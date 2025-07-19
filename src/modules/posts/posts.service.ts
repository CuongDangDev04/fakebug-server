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

        const newPost = this.postRepo.create({
            user,
            content: dto.content,
            media_url: mediaUrl,
            privacy: dto.privacy || 'friends',
        });


        return this.postRepo.save(newPost);
    }



    async getById(id: number) {
        return this.postRepo.findOne({
            where: { id },
            relations: ['user', 'likes', 'comments'],
        });
    }

    async update(id: number, dto: CreatePostDto, file?: Express.Multer.File) {
        console.log('=== [UPDATE POST] ===');
        console.log('Post ID:', id);
        console.log('DTO nhận vào:', dto);
        console.log('Có file upload không:', !!file);

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
            relations: ['user', 'comments', 'likes'],  // Trả về dữ liệu đầy đủ
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
    async getPublicPosts() {
        return this.postRepo.find({
            where: { privacy: 'public' },
            relations: ['user', 'likes', 'comments'],
            order: { created_at: 'DESC' },
        });
    }

    // Lấy các bài viết riêng tư của chính người dùng
    async getPrivatePosts(userId: number) {
        return this.postRepo.find({
            where: {
                user: { id: userId },
                privacy: 'private',
            },
            relations: ['user', 'likes', 'comments'],
            order: { created_at: 'DESC' },
        });
    }

    // Lấy bài viết của bạn bè (và chính user)
    async getFriendPosts(userId: number) {
        console.log('👉 [getFriendPosts] userId:', userId);

        const friendships = await this.friendshipRepo.find({
            where: [
                { userOne: { id: userId }, status: 'accepted' },
                { userTwo: { id: userId }, status: 'accepted' },
            ],
            relations: ['userOne', 'userTwo'],
        });

        console.log('👉 [getFriendPosts] friendships:', friendships);

        const friendIds = friendships.map(friendship =>
            friendship.userOne.id === userId
                ? friendship.userTwo.id
                : friendship.userOne.id
        );

        friendIds.push(userId); // Bao gồm cả userId

        console.log('👉 [getFriendPosts] friendIds (bao gồm cả chính mình):', friendIds);

        const data = await this.postRepo.find({
            where: {
                user: { id: In(friendIds) },
                privacy: 'friends',
            },
            relations: ['user', 'likes', 'comments'],
            order: { created_at: 'DESC' },
        });

        console.log('👉 [getFriendPosts] posts:', data);

        return data;
    }
    // Lấy tất cả bài viết mà user được phép xem
    async getAllVisiblePosts(userId: number) {
        console.log('👉 [getAllVisiblePosts] userId:', userId);

        // 1. Lấy danh sách bạn bè
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

        friendIds.push(userId);  // Bao gồm cả userId chính mình

        console.log('👉 [getAllVisiblePosts] friendIds (gồm chính mình):', friendIds);

        // 2. Lấy các bài viết:
        const posts = await this.postRepo.find({
            where: [
                { privacy: 'public' },
                { privacy: 'friends', user: { id: In(friendIds) } },
                { privacy: 'private', user: { id: userId } },
            ],
            relations: ['user', 'likes', 'comments'],
            order: { created_at: 'DESC' },
        });

        console.log('👉 [getAllVisiblePosts] Tổng bài viết:', posts.length);

        return posts;
    }


}
