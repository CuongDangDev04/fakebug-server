import { Controller, Post, Body, Param, Get, Patch, Delete } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ReactionType } from 'src/entities/comment-reaction.entity';

@Controller('comments')
export class CommentController {
    constructor(private readonly commentService: CommentService) { }

    @Post()
    create(@Body() createDto: CreateCommentDto) {
        return this.commentService.create(createDto);
    }


    @Patch(':id')
    update(@Param('id') id: number, @Body() updateDto: UpdateCommentDto) {
        return this.commentService.update(id, updateDto);
    }

    @Get('post/:postId')
    findAllByPost(@Param('postId') postId: number) {
        return this.commentService.findAllByPost(postId);
    }
    @Post(':commentId/react')
    react(
        @Param('commentId') commentId: number,
        @Body() body: { userId: number; type: ReactionType },
    ) {
        return this.commentService.react(commentId, body.userId, body.type);
    }
    @Delete(':id')
    remove(@Param('id') id: number) {
        return this.commentService.remove(id);
    }

}
