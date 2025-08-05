import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Post } from 'src/entities/post.entity';
import { User } from 'src/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { CloudinaryService } from 'src/modules/cloudinary/cloudinary.service';
import { Friendship } from 'src/entities/friendship.entity';
import { PostReport } from 'src/entities/post-report.entity';
import { ReportPostDto } from './dto/report-post.dto';

@Injectable()
export class PostService {
    constructor(
        @InjectRepository(Post)
        private postRepo: Repository<Post>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private cloudinaryService: CloudinaryService,
        @InjectRepository(Friendship)
        private friendshipRepo: Repository<Friendship>,
        @InjectRepository(PostReport)
        private postReportRepo: Repository<PostReport>

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

    // async getPostForUser(postId: number, viewerId: number) {
    //     const post = await this.postRepo.findOne({
    //         where: { id: postId },
    //         relations: ['user'],
    //     });

    //     if (!post) throw new NotFoundException('Bài viết không tồn tại');

    //     if (post.privacy === 'private' && post.user.id !== viewerId) {
    //         throw new BadRequestException('Bạn không có quyền xem bài viết này');
    //     }

    //     if (post.privacy === 'friends') {
    //         const isFriend = await this.checkFriendship(post.user.id, viewerId);
    //         if (!isFriend && post.user.id !== viewerId) {
    //             throw new BadRequestException('Bạn không có quyền xem bài viết này');
    //         }
    //     }

    //     return post;
    // }

    private buildPostQueryBuilder() {
        return this.postRepo
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user')
            .leftJoinAndSelect('post.reactions', 'reaction')
            .leftJoinAndSelect('reaction.user', 'reactionUser')
            .leftJoinAndSelect('post.comments', 'comment')
            .leftJoinAndSelect('post.originalPost', 'originalPost')
            .leftJoinAndSelect('originalPost.user', 'originalPostUser')
            .select([
                'post',
                'user.id',
                'user.email',
                'user.first_name',
                'user.last_name',
                'user.avatar_url',
                'reaction',
                'reactionUser.id',
                'reactionUser.first_name',
                'reactionUser.last_name',
                'reactionUser.avatar_url',
                'comment',
                'originalPost',
                'originalPostUser.id',
                'originalPostUser.first_name',
                'originalPostUser.last_name',
                'originalPostUser.avatar_url',
            ]);
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
        const posts = await this.buildPostQueryBuilder()
            .where('post.user.id = :userId', { userId })
            .andWhere('post.privacy = :privacy', { privacy: 'private' })
            .orderBy('post.created_at', 'DESC')
            .skip(offset)
            .take(limit)
            .getMany();

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
        friendIds.push(userId); // Bao gồm chính user

        const posts = await this.buildPostQueryBuilder()
            .where('post.privacy = :privacy AND post.user.id IN (:...friendIds)', {
                privacy: 'friends',
                friendIds,
            })
            .orderBy('post.created_at', 'DESC')
            .skip(offset)
            .take(limit)
            .getMany();

        return posts.map(post => this.formatPostWithReactions(post));
    }

    //lấy tất cả bài viết user có thể thấy
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

        const qb = this.buildPostQueryBuilder();

        qb.where(
            new Brackets(qb => {
                qb.where('post.privacy = :public', { public: 'public' })
                    .orWhere('post.privacy = :friends AND post.user.id IN (:...friendIds)', { friends: 'friends', friendIds })
                    .orWhere('post.privacy = :private AND post.user.id = :userId', { private: 'private', userId });
            }),
        )
            .orderBy('post.created_at', 'DESC')
            .skip(offset)
            .take(limit);

        const posts = await qb.getMany();
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
        const posts = await this.buildPostQueryBuilder()
            .where('post.user.id = :userId', { userId })
            .orderBy('post.created_at', 'DESC')
            .skip(offset)
            .take(limit)
            .getMany();

        return posts.map(post => this.formatPostWithReactions(post));
    }

    async reportPost(dto: ReportPostDto) {
        const [reporter, post] = await Promise.all([
            this.userRepo.findOne({ where: { id: dto.reporterId } }),
            this.postRepo.findOne({ where: { id: dto.postId }, relations: ['user'] }),
        ]);

        if (!reporter) {
            throw new NotFoundException('Người báo cáo không tồn tại');
        }

        if (!post) {
            throw new NotFoundException('Bài viết không tồn tại');
        }

        if (reporter.id === post.user.id) {
            throw new BadRequestException('Bạn không thể báo cáo bài viết của chính mình');
        }

        const existingReport = await this.postReportRepo.findOne({
            where: {
                reporter: { id: reporter.id },
                post: { id: post.id },
            },
        });

        if (existingReport) {
            throw new BadRequestException('Bạn đã báo cáo bài viết này trước đó');
        }

        const newReport = this.postReportRepo.create({
            reporter,
            post,
            reportedUser: post.user, // lấy từ post
            reason: dto.reason,
        });

        await this.postReportRepo.save(newReport);

        return { message: 'Báo cáo bài viết thành công' };
    }

    async getAllPostReport(offset = 0, limit = 10) {
        const [reports, total] = await this.postReportRepo
            .createQueryBuilder('report')
            .leftJoinAndSelect('report.reporter', 'reporter')
            .leftJoinAndSelect('report.reportedUser', 'reportedUser')
            .leftJoinAndSelect('report.post', 'post')
            .leftJoinAndSelect('post.user', 'postOwner')
            .orderBy('report.created_at', 'DESC')
            .skip(offset)
            .take(limit)
            .getManyAndCount();

        const formattedReports = reports.map(r => ({
            id: r.id,
            reason: r.reason,
            created_at: r.created_at,

            reporter: {
                id: r.reporter.id,
                first_name: r.reporter.first_name,
                last_name: r.reporter.last_name,
                avatar_url: r.reporter.avatar_url,
            },

            reportedUser: {
                id: r.reportedUser.id,
                first_name: r.reportedUser.first_name,
                last_name: r.reportedUser.last_name,
                avatar_url: r.reportedUser.avatar_url,
            },

            post: {
                id: r.post.id,
                content: r.post.content,
                media_url: r.post.media_url,
                privacy: r.post.privacy,
            }
        }));

        return {
            total,
            page: Math.floor(offset / limit) + 1,
            limit,
            data: formattedReports,
        };
    }



}
