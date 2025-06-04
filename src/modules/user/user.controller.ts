import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UserService } from './user.service';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get('my-profile')
    async getOwnProfile(@Req() req: any) {
        return this.userService.getOwnProfile(req.user.userId);
    }

    @Get('profile/:userId')
    async getOtherUserProfile(
        @Param('userId', ParseIntPipe) userId: number,
        @Req() req: any
    ) {
        return this.userService.getOtherUserProfile(userId, req.user.userId);
    }

    @Get('getInfo-user')
    async getInfoUser(@Req() req: any) {
        return this.userService.getInfoUser(req.user.userId)
    }
}
