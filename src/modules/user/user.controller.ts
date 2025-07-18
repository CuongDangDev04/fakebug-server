import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly cloudinaryService: CloudinaryService
    ) { }

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

    @Get('public/:userId')
    async getPublicUserInfo(@Param('userId', ParseIntPipe) userId: number) {
        return this.userService.getPublicUserInfo(userId);
    }

    @Post('upload-avatar')
    @UseInterceptors(FileInterceptor('file'))
    async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Body('userId') userId: number) {
        const url = await this.cloudinaryService.uploadImage(file, 'avatars');
        return this.userService.updateAvatar(userId, url);
    }

    @Post('upload-cover')
    @UseInterceptors(FileInterceptor('file'))
    async uploadCover(@UploadedFile() file: Express.Multer.File, @Body('userId') userId: number) {
        const url = await this.cloudinaryService.uploadImage(file, 'covers');
        return this.userService.updateCover(userId, url);
    }
}
