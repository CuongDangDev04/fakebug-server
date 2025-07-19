import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from 'src/entities/post.entity';
import { User } from 'src/entities/user.entity';
import { PostReaction } from 'src/entities/post-reaction.entity';

@Injectable()
export class PostReactionService {
  constructor(
    @InjectRepository(PostReaction)
    private reactionRepo: Repository<PostReaction>,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async react(postId: number, userId: number, type: PostReaction['type']) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    let reaction = await this.reactionRepo.findOne({
      where: { post: { id: postId }, user: { id: userId } },
    });

    if (reaction) {
      reaction.type = type;  // Cập nhật loại reaction
    } else {
      reaction = this.reactionRepo.create({ post, user, type });
    }

    return this.reactionRepo.save(reaction);
  }

  async removeReaction(postId: number, userId: number) {
    return this.reactionRepo.delete({
      post: { id: postId },
      user: { id: userId },
    });
  }
}
