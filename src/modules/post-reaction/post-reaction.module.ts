import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostReactionService } from './post-reaction.service';
import { PostReactionController } from './post-reaction.controller';
import { Post } from 'src/entities/post.entity';
import { User } from 'src/entities/user.entity';
import { PostReaction } from 'src/entities/post-reaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PostReaction, Post, User])],
  controllers: [PostReactionController],
  providers: [PostReactionService],
  exports: [PostReactionService], 
})
export class PostReactionModule {}
