import { Controller, Post, Body, Param, ParseIntPipe, Get, UseGuards, Req, Delete } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('friendships')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) { }
  //gửi kb
  @UseGuards(JwtAuthGuard)
  @Post('send-request/:receiverId')
  async sendRequest(@Req() req, @Param('receiverId', ParseIntPipe) receiverId: number) {
    return this.friendshipService.sendFriendRequest(req.user.userId, receiverId);
  }
  //phản hồi lời mời kb
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

  @UseGuards(JwtAuthGuard)
  @Delete('unfriend/:targetId')
  async unfriend(@Param("targetId") targetId: number, @Req() req: any) {
    return this.friendshipService.unfriend(req.user.userId, +targetId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('block/:targetId')
  async block(@Param('targetId') targetId: number, @Req() req: any) {
    return this.friendshipService.blockUser(req.user.userId, +targetId)
  }

  @UseGuards(JwtAuthGuard)
  @Delete('unblock/:targetId')
  async unblockUser(@Req() req: any, @Param('targetId') targetId: number) {
    return this.friendshipService.unblockUser(req.user.userId, +targetId);
  }
  //  Danh sách lời mời đã nhận
  @UseGuards(JwtAuthGuard)
  @Get('requests/received')
  async getReceivedRequests(@Req() req: any) {
    return this.friendshipService.getReceivedFriendRequests(req.user.userId);
  }

  // Danh sách lời mời đã gửi
  @UseGuards(JwtAuthGuard)
  @Get('requests/sent')
  async getSentRequests(@Req() req: any) {
    return this.friendshipService.getSentFriendRequests(req.user.userId);
  }

  //  Hủy lời mời kết bạn đã gửi
  @UseGuards(JwtAuthGuard)
  @Delete('requests/cancel/:targetId')
  async cancelSentRequest(@Req() req: any, @Param('targetId') targetId: number) {
    return this.friendshipService.cancelSentRequest(req.user.userId, +targetId);
  }

  // Lấy danh sách bạn chung với một người dùng khác

  @UseGuards(JwtAuthGuard)
  @Get('mutual/:targetId')
  async getMutualFriends(@Req() req, @Param('targetId', ParseIntPipe) targetId: number) {
    return this.friendshipService.getMutualFriends(req.user.userId, targetId);
  }

  // Lấy danh sách gợi ý kết bạn dựa trên bạn chung
  @UseGuards(JwtAuthGuard)
  @Get('suggestions')
  async getFriendSuggestions(@Req() req) {
    return this.friendshipService.getFriendSuggestions(req.user.userId);
  }

  // Kiểm tra trạng thái bạn bè với một người dùng
  @UseGuards(JwtAuthGuard)
  @Get('status/:targetId')
  async checkFriendshipStatus(
    @Req() req,
    @Param('targetId', ParseIntPipe) targetId: number
  ) {
    return this.friendshipService.checkFriendshipStatus(req.user.userId, targetId);
  }
}
