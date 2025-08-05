import { Module } from '@nestjs/common';
import { PostController } from './posts.controller';
import { PostService } from './posts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from 'src/entities/post.entity';
import { User } from 'src/entities/user.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Friendship } from 'src/entities/friendship.entity';
import { PostReport } from 'src/entities/post-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, User,Friendship,PostReport]), CloudinaryModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostsModule {}
