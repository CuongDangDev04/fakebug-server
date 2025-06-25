import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { MessageService } from './message.service';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) { }

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
    @Query('userId2') userId2: number) {
    return this.messageService.getMessagesBetweenUsers(userId1, userId2);
  }
}
