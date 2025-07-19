import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { CommentGateway } from './comment.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from 'src/entities/comment.entity';
import { User } from 'src/entities/user.entity';
import { Post } from 'src/entities/post.entity';
import { CommentReaction } from 'src/entities/comment-reaction.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Post,Comment,User,CommentReaction])],
  providers: [CommentService, CommentGateway],
  controllers: [CommentController]
})
export class CommentModule {}
