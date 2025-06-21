import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Post('send')
    async sendToUser(@Body() body: { userId: number; message: string; url?: string, avt: string }) {
        await this.notificationService.notifyUser(body.userId, body.message, body.url, body.avt);
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
    @Delete('delete/:id')
    deleteNotification(
        @Param('id') id: number
    ) {
        return this.notificationService.deleteNotification(id)
    }

    @Post('mark-read/:id')
    markAsRead(@Param('id') id: number) {
        return this.notificationService.markAsRead(id);
    }

    @Post('mark-all-read')
    markAllAsRead(@Req() req) {
        return this.notificationService.markAllAsRead(req.user.userId);
    }
    @Get('unread')
    getUnreadNotification(@Req() req){
        return this.notificationService.getUnreadNotification(req.user.userId)
    }
}
