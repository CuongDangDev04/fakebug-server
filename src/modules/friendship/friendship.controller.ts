import { Controller, Post, Body, Param, ParseIntPipe, Get, UseGuards, Req, Delete } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('friendships')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) { }
  //gửi kb
  @Post('send-request/:receiverId')
  async sendRequest(@Req() req, @Param('receiverId', ParseIntPipe) receiverId: number) {
    return this.friendshipService.sendFriendRequest(req.user.userId, receiverId);
  }
  //phản hồi lời mời kb
  @Post('respond/:requestId')
  async respondRequest(
    @Req() req,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body('accept') accept: boolean,
  ) {
    return this.friendshipService.respondFriendRequest(requestId, req.user.userId, accept);
  }

  @Get('friends')
  async getFriends(@Req() req) {
    return this.friendshipService.getFriends(req.user.userId);
  }

  @Delete('unfriend/:targetId')
  async unfriend(@Param("targetId") targetId: number, @Req() req: any) {
    return this.friendshipService.unfriend(req.user.id, +targetId)
  }
  @Post('block/:targetId')
  async block(@Param('targetId') targetId: number, @Req() req: any) {
    return this.friendshipService.blockUser(req.user.id, +targetId)
  }

  @Delete('unblock/:targetId')
  async unblockUser(@Req() req: any, @Param('targetId') targetId: number) {
    return this.friendshipService.unblockUser(req.user.id, +targetId);
  }
  //  Danh sách lời mời đã nhận
  @Get('requests/received')
  async getReceivedRequests(@Req() req: any) {
    return this.friendshipService.getReceivedFriendRequests(req.user.id);
  }

  // Danh sách lời mời đã gửi
  @Get('requests/sent')
  async getSentRequests(@Req() req: any) {
    return this.friendshipService.getSentFriendRequests(req.user.id);
  }

  //  Hủy lời mời kết bạn đã gửi
  @Delete('requests/cancel/:targetId')
  async cancelSentRequest(@Req() req: any, @Param('targetId') targetId: number) {
    return this.friendshipService.cancelSentRequest(req.user.id, +targetId);
  }
}
