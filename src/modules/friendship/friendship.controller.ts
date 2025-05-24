import { Controller, Post, Body, Param, ParseIntPipe, Get, UseGuards, Req } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('friendships')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @UseGuards(JwtAuthGuard)
  @Post('send-request/:receiverId')
  async sendRequest(@Req() req, @Param('receiverId', ParseIntPipe) receiverId: number) {
    return this.friendshipService.sendFriendRequest(req.user.userId, receiverId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('respond/:requestId')
  async respondRequest(
    @Req() req,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body('accept') accept: boolean,
  ) {
    return this.friendshipService.respondFriendRequest(requestId, req.user.userId, accept);
  }

  @UseGuards(JwtAuthGuard)
  @Get('friends')
  async getFriends(@Req() req) {
    return this.friendshipService.getFriends(req.user.userId);
  }
}
