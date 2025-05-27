import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UserService } from './user.service';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get('getProfile')
    async getProfile(@Req() req: any) {
        return this.userService.getUserProfile(req.user.userId);
    }
}
