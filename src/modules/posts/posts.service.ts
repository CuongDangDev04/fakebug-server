import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from 'src/entities/post.entity';
import { User } from 'src/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { CloudinaryService } from 'src/modules/cloudinary/cloudinary.service';

@Injectable()
export class PostService {
    constructor(
        @InjectRepository(Post)
        private postRepo: Repository<Post>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private cloudinaryService: CloudinaryService,
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
        });

        return this.postRepo.save(newPost);
    }

    async getAll() {
        return this.postRepo.find({
            relations: ['user', 'likes', 'comments'],
            order: { created_at: 'DESC' },
        });
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


}
