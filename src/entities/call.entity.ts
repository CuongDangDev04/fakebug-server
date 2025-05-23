import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Call {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.callsMade)
  caller: User;

  @ManyToOne(() => User, user => user.callsReceived)
  receiver: User;

  @Column()
  start_time: Date;

  @Column({ nullable: true })
  end_time: Date;

  @Column({ type: 'enum', enum: ['missed', 'ended', 'rejected'], default: 'ended' })
  status: 'missed' | 'ended' | 'rejected';
}
