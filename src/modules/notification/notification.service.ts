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
  ) {}

  async notifyUser(userId: number, message: string, url?: string) {
    const notification = this.notificationRepo.create({ userId, message, url });
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
  async getAllNotificationOfUser(userId: number){
    if(!userId){
        throw new NotFoundException("user không hợp lệ")
    }
    const notification = this.notificationRepo.find({
        where: {userId: userId},
        order: {createdAt: 'DESC'}

    })
    return notification
  }
}
