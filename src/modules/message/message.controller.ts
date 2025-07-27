import { Controller, Post, Body, Get, Query, Param, Req, UseGuards, Put } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly messageGateway: MessageGateway
  ) { }

  @Post('send')
  async sendMessage(
    @Body('senderId') senderId: number,
    @Body('receiverId') receiverId: number,
    @Body('content') content: string,
  ) {
    return this.messageService.sendMessage(senderId, receiverId, content);
  }

  @Get('between')
  async getMessagesBetweenUsers(
    @Query('userId1') userId1: number,
    @Query('userId2') userId2: number,
    @Query('limit') limit: number = 15,
    @Query('offset') offset: number = 0,
  ) {
    return this.messageService.getMessagesBetweenUsers(userId1, userId2, limit, offset);
  }


  // lấy lastSeen theo userId
  @Get('last-seen/:userId')
  getLastSeen(@Param('userId') userId: string) {
    const id = Number(userId);
    const lastSeen = this.messageGateway.getLastSeen(id);
    return { userId: id, lastSeen };
  }
  @UseGuards(JwtAuthGuard)
  @Get('friend-messages')
  async getFriendMessages(@Req() req) {
    return this.messageService.getLastMessageWithFriends(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('total-unread')
  async getTotalUnread(@Req() req) {
    return this.messageService.getTotalUnreadCount(req.user.userId);
  }
  @UseGuards(JwtAuthGuard)
  @Put('mark-as-read/:friendId')
  async markAsRead(@Req() req, @Param('friendId') friendId: number) {
    await this.messageService.markMessagesAsRead(friendId, req.user.userId)
    await this.messageGateway.handleMarkAsRead(req.user.userId, friendId)
    return { success: true }
  }

  @UseGuards(JwtAuthGuard)
  @Put('revoke/:messageId')
  async revokeMessage(@Req() req, @Param('messageId') messageId: number) {
    const message = await this.messageService.revokeMessage(messageId, req.user.userId);

    await this.messageGateway.broadcastRevokeMessage(
      message.id,
      message.sender.id,
      message.receiver.id
    );

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Put('delete-for-me/:messageId')
  async deleteMessageForMe(@Req() req, @Param('messageId') messageId: number) {
    await this.messageService.deletedMessageForMe(messageId, req.user.userId);
    return { success: true }
  }

  @UseGuards(JwtAuthGuard)
  @Put('delete-conversation/:otherUserId')
  async deleteConversation(
    @Req() req,
    @Param('otherUserId') otherUserId: number
  ) {
    const result = await this.messageService.deleteConversation(req.user.userId, otherUserId);
    return result;
  }

}
