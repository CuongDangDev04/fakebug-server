import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserReport } from 'src/entities/user-report.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserReportService {
  constructor(
    @InjectRepository(UserReport)
    private readonly userReportRepo: Repository<UserReport>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) { }

  /**
   * Người dùng báo cáo người khác
   */
  async reportUser(reporterId: number, reportedUserId: number, reason: string) {
    if (reporterId === reportedUserId) {
      throw new ForbiddenException('Bạn không thể tự báo cáo chính mình');
    }

    const reporter = await this.userRepo.findOne({ where: { id: reporterId } });
    if (!reporter) throw new NotFoundException('Người báo cáo không tồn tại');

    const reportedUser = await this.userRepo.findOne({ where: { id: reportedUserId } });
    if (!reportedUser) throw new NotFoundException('Người bị báo cáo không tồn tại');

    const report = this.userReportRepo.create({
      reporter,
      reportedUser,
      reason,
    });

    return await this.userReportRepo.save(report);
  }

  /**
   * Admin lấy danh sách báo cáo
   */
  async getAllReports() {
    return await this.userReportRepo.find({
      relations: ['reporter', 'reportedUser'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Admin cập nhật trạng thái báo cáo
   */
  async updateReportStatus(
    reportId: number,
    status: 'pending' | 'reviewed' | 'dismissed'
  ) {
    console.log('Bắt đầu updateReportStatus với:', { reportId, status });

    const report = await this.userReportRepo.findOne({
      where: { id: reportId },
      relations: ['reportedUser', 'reporter'],
    });

    console.log('Kết quả findOne:', report);

    if (!report) {
      console.log('Không tìm thấy báo cáo');
      throw new NotFoundException('Báo cáo không tồn tại');
    }

    report.status = status;
    await this.userReportRepo.save(report);
    console.log('Đã lưu trạng thái mới:', status);

    if (status === 'reviewed') {
      const banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + 1);

      console.log(`Khóa tài khoản userId=${report.reportedUser.id} đến:`, banUntil);

      report.reportedUser.banned_until = banUntil;
      await this.userRepo.save(report.reportedUser);

      console.log('Đã lưu thông tin khóa tài khoản cho userId:', report.reportedUser.id);
    }

    return report;
  }
  /**
   * Đếm số báo cáo chưa xử lý
   */
  async countPendingReports(): Promise<number> {
    return await this.userReportRepo.count({
      where: { status: 'pending' },
    });
  }

}
