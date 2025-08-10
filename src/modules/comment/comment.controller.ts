import { Controller, Post, Body, Param, Get, Patch, Delete } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ReactionType } from 'src/entities/comment-reaction.entity';

@Controller('comments')
export class CommentController {
    constructor(private readonly commentService: CommentService) { }


    @Get('post/:postId')
    findAllByPost(@Param('postId') postId: number) {
        return this.commentService.findAllByPost(postId);
    }
 

}
