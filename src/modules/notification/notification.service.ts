import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway'; // inject gateway vào service
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from 'src/entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private gateway: NotificationGateway,
  ) { }

  async notifyUser(userId: number, message: string, url?: string, avt?: string) {
    const notification = this.notificationRepo.create({ userId, message, url, avt });
    const saved = await this.notificationRepo.save(notification);
    this.gateway.sendToUserSocket(userId, saved);
    return saved;
  }

  async notifyGlobal(message: string, url?: string) {
    const notification = this.notificationRepo.create({ message, url });
    const saved = await this.notificationRepo.save(notification);
    this.gateway.sendToAllSocket(saved);
    return saved;
  }
  async getAllNotificationOfUser(userId: number, offset: number, limit: number) {
    if (!userId) {
      throw new NotFoundException("user không hợp lệ");
    }

    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    return {
      total,
      notifications,
    };
  }

  async deleteNotification(id: number) {
    if (!id) {
      throw new NotFoundException(`Thông báo với id ${id}`)
    }
    const noti = await this.notificationRepo.findOne({
      where: { id: id }
    })
    console.log('id noti', noti);
    await this.notificationRepo.delete({ id: id })
    return ('Xoá thông báo thành công');
  }

  async markAsRead(id: number) {
    if (!id) {
      throw new NotFoundException("Thông báo không tồn tại");
    }
    const notification = await this.notificationRepo.findOne({
      where: { id }
    });
    if (!notification) {
      throw new NotFoundException("Thông báo không tồn tại");
    }
    notification.isRead = true;
    return await this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: number) {
    if (!userId) {
      throw new NotFoundException("User không hợp lệ");
    }
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where("userId = :userId", { userId })
      .execute();

    return "Đã đánh dấu tất cả thông báo là đã đọc";
  }
  async getUnreadNotification(userId: number) {
    if (!userId) {
      throw new NotFoundException("UserId không hợp lệ");
    };
    const noti = await this.notificationRepo.find({
      where: { userId: userId, isRead: false },

    })
    const total = noti.length;
    return {
      total, noti
    }
  }
}
