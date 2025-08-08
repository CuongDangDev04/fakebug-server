import { Controller, Post, Body, Param, Get, Patch } from '@nestjs/common';
import { UserReportService } from './user-report.service';

@Controller('user-report')
export class UserReportController {
    constructor(private readonly reportService: UserReportService) { }

    @Post(':id')
    async reportUser(
        @Param('id') reportedUserId: number,
        @Body() body: { reporterId: number; reason: string },
    ) {
        return this.reportService.reportUser(body.reporterId, reportedUserId, body.reason);
    }

    @Get()
    async getAll() {
        return this.reportService.getAllReports();
    }
    
    @Get('count-pending')
    async countPending() {
        return { count: await this.reportService.countPendingReports() };
    }

    @Patch(':id')
    async updateStatus(@Param('id') id: number, @Body() body: { status: 'pending' | 'reviewed' | 'dismissed' }) {
        return this.reportService.updateReportStatus(id, body.status);
    }
}
