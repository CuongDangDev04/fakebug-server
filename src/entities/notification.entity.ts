import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    // Quan hệ nhiều thông báo thuộc về 1 user
    @ManyToOne(() => User, user => user.notifications, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ nullable: true })
    userId: number; // giữ để truy vấn nhanh

    @Column()
    message: string;

    @Column({ default: false })
    isRead: boolean;

    @Column({ nullable: true })
    url: string;

    @CreateDateColumn()
    createdAt: Date;
}
