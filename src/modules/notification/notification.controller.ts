import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Post('send')
    async sendToUser(@Body() body: { userId: number; message: string; url?: string }) {
        await this.notificationService.notifyUser(body.userId, body.message, body.url);
        return { status: 'ok' };
    }

    @Post('broadcast')
    async sendGlobal(@Body() body: { message: string; url?: string }) {
        await this.notificationService.notifyGlobal(body.message, body.url);
        return { status: 'ok' };
    }
    @Get('all')
    getAllNotificationOfUser(
        @Req() req
    ) {
        return this.notificationService.getAllNotificationOfUser(req.user.userId)
    }
    // @Get('all/:userId')
    // getAllNotificationOfUser(
    //     @Param('userId') userId: number
    // ) {
    //     return this.notificationService.getAllNotificationOfUser(userId)
    // }
}
