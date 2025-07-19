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
            parent = await this.commentRepository.findOne({ where: { id: createDto.parentId } });
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
            relations: ['user', 'replies', 'replies.user', 'reactions', 'reactions.user', ],
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
            // ✅ Nếu type=null thì xoá reaction
            await this.reactionRepository.remove(existingReaction);
            return { message: 'Reaction removed' };
        } else {
            existingReaction.type = type;
            return this.reactionRepository.save(existingReaction);
        }
    } else {
        if (type !== null) {
            const newReaction = this.reactionRepository.create({
                comment,
                user,
                type,
            });
            return this.reactionRepository.save(newReaction);
        } else {
            // Không có reaction cũ, không làm gì
            return { message: 'No existing reaction to remove' };
        }
    }
}

}
