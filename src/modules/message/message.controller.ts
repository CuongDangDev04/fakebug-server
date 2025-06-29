import { Controller, Post, Body, Get, Query, Param } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';

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
}
