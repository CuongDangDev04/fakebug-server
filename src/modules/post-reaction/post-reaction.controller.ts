import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { PostReactionService } from './post-reaction.service';

@Controller('post-reactions')
export class PostReactionController {
  constructor(private readonly postReactionService: PostReactionService) {}

  @Post(':postId')
  async reactToPost(
    @Param('postId') postId: number,
    @Body('userId') userId: number,
    @Body('type') type: string,
  ) {
    return this.postReactionService.react(postId, userId, type as any);
  }

  @Delete(':postId/:userId')
  async removeReaction(
    @Param('postId') postId: number,
    @Param('userId') userId: number,
  ) {
    return this.postReactionService.removeReaction(postId, userId);
  }
}
