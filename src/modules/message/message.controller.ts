import { Controller, Post, Body, Get, Query, Param, Req, UseGuards, Put } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly messageGateway: MessageGateway 
  ) {}

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
  ) {
    return this.messageService.getMessagesBetweenUsers(userId1, userId2);
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
  @Put('mark-as-read/:friendId')
  async markAsRead(@Req() req, @Param('friendId') friendId:number){
      await this.messageService.markMessagesAsRead(friendId, req.user.userId)
      await this.messageGateway.handleMarkAsRead(req.user.userId, friendId)
      return {success: true}
  }

}
