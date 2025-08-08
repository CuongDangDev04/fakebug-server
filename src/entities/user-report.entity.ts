import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class UserReport {
  @PrimaryGeneratedColumn()
  id: number;

  // Người báo cáo
  @ManyToOne(() => User, user => user.reportsMade, { onDelete: 'CASCADE' })
  reporter: User;

  // Người bị báo cáo
  @ManyToOne(() => User, user => user.reportsReceived, { onDelete: 'CASCADE' })
  reportedUser: User;

  @Column({ type: 'text' })
  reason: string; // Lý do báo cáo

  @Column({ type: 'enum', enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' })
  status: 'pending' | 'reviewed' | 'dismissed';

  @CreateDateColumn()
  created_at: Date;
}
