import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@WebSocketGateway({
  namespace: '/comment',
  cors: { origin: '*' }
})
export class CommentGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly commentService: CommentService) { }

  // 🟢 Tạo comment mới
  @SubscribeMessage('createComment')
  async handleCreateComment(
    @MessageBody() data: CreateCommentDto,
    @ConnectedSocket() client: Socket
  ) {
    const comment = await this.commentService.create(data);

    // Emit cho tất cả client trong postId này
    this.server.to(`post_${data.postId}`).emit('newComment', comment);
    return comment;
  }

  // 🟢 Update comment
  @SubscribeMessage('updateComment')
  async handleUpdateComment(
    @MessageBody() data: { id: number; dto: UpdateCommentDto }
  ) {
    const updated = await this.commentService.update(data.id, data.dto);
    this.server.emit('commentUpdated', updated);
    return updated;
  }

  // 🟢 Xóa comment
  @SubscribeMessage('deleteComment')
  async handleDeleteComment(@MessageBody() id: number) {
    await this.commentService.remove(id);
    this.server.emit('commentDeleted', id);
    return { id };
  }

  // 🟢 Tham gia room theo postId (để nhận comment realtime)
  @SubscribeMessage('joinPost')
  handleJoinPost(@MessageBody() postId: number, @ConnectedSocket() client: Socket) {
    client.join(`post_${postId}`);
  }

  // 🟢 Reaction
 @SubscribeMessage('reactComment')
async handleReactComment(
  @MessageBody() data: { commentId: number; userId: number; type: string | null }
) {

  const reaction = await this.commentService.react(data.commentId, data.userId, data.type as any);

  let reactionPayload;

  if (reaction && typeof reaction === 'object' && 'message' in reaction) {
    reactionPayload = {
      type: null,
      user: { id: data.userId },  // gửi userId để client biết phải xoá reaction của ai
      id: null,
    };
  } else {
    reactionPayload = reaction;
  }

  this.server.emit('commentReaction', { commentId: data.commentId, reaction: reactionPayload });

  return reaction;
}



}
