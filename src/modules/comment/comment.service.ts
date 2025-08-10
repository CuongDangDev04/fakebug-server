import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Post } from 'src/entities/post.entity';
import { User } from 'src/entities/user.entity';
import { Comment } from 'src/entities/comment.entity';
import { CommentReaction, ReactionType } from 'src/entities/comment-reaction.entity';

@Injectable()
export class CommentService {
    constructor(
        @InjectRepository(Comment)
        private commentRepository: Repository<Comment>,

        @InjectRepository(Post)
        private postRepository: Repository<Post>,

        @InjectRepository(User)
        private userRepository: Repository<User>,

        @InjectRepository(CommentReaction)
        private reactionRepository: Repository<CommentReaction>,
    ) { }

    async create(createDto: CreateCommentDto) {
        const post = await this.postRepository.findOne({ where: { id: createDto.postId } });
        if (!post) throw new NotFoundException('Post not found');

        const user = await this.userRepository.findOne({ where: { id: createDto.userId } });
        if (!user) throw new NotFoundException('User not found');

        let parent: Comment | null = null;
        if (createDto.parentId) {
            parent = await this.commentRepository.findOne({
                where: { id: createDto.parentId },
                relations: ['parent'], // cần để kiểm tra cấp bậc
            });
            if (!parent) throw new NotFoundException('Parent comment not found');

            if (parent.parent) {
                // Nếu parent có parent, tức là parent là bình luận cấp 2
                throw new Error('Only two levels of comments are allowed');
            }
        }

        const comment = this.commentRepository.create({
            content: createDto.content,
            post,
            user,
            parent,

        });

        return this.commentRepository.save(comment);
    }


    async findAllByPost(postId: number) {
        return this.commentRepository.find({
            where: { post: { id: postId }, parent: null as any },
            relations: ['user', 'replies', 'replies.user', 'reactions', 'reactions.user', 'parent'],
            order: { created_at: 'DESC' },
        });
    }

    async update(id: number, updateDto: UpdateCommentDto) {
        const comment = await this.commentRepository.findOne({ where: { id } });
        if (!comment) throw new NotFoundException('Comment not found');

        comment.content = updateDto.content;
        return this.commentRepository.save(comment);
    }

    async remove(id: number) {
        const comment = await this.commentRepository.findOne({ where: { id } });
        if (!comment) throw new NotFoundException('Comment not found');

        await this.commentRepository.remove(comment);
        return { message: 'Comment deleted' };
    }
async react(commentId: number, userId: number, type: ReactionType | null) {
  const comment = await this.commentRepository.findOne({ where: { id: commentId } });
  if (!comment) throw new NotFoundException('Comment not found');

  const user = await this.userRepository.findOne({ where: { id: userId } });
  if (!user) throw new NotFoundException('User not found');

  let existingReaction = await this.reactionRepository.findOne({
    where: { comment: { id: commentId }, user: { id: userId } },
  });

  if (existingReaction) {
    if (type === null) {
      await this.reactionRepository.remove(existingReaction);
      return { message: 'Reaction removed' };
    } else {
      existingReaction.type = type;
      await this.reactionRepository.save(existingReaction);
      
      // Truy vấn lại để lấy reaction đầy đủ user + comment
      const updatedReaction = await this.reactionRepository.findOne({
        where: { id: existingReaction.id },
        relations: ['user', 'comment'],
      });
      return updatedReaction!;
    }
  } else {
    if (type !== null) {
      const newReaction = this.reactionRepository.create({
        comment,
        user,
        type,
      });
      const saved = await this.reactionRepository.save(newReaction);

      // Truy vấn lại để lấy reaction đầy đủ user + comment
      const fullReaction = await this.reactionRepository.findOne({
        where: { id: saved.id },
        relations: ['user', 'comment'],
      });
      return fullReaction!;
    } else {
      // Không có reaction cũ, không cần xoá, trả về null hoặc một object phù hợp
      return null;
    }
  }
}



    async findCommentWithPost(commentId: number): Promise<Comment | null> {
        return this.commentRepository.findOne({
            where: { id: commentId },
            relations: ['post'],
        });
    }
}
