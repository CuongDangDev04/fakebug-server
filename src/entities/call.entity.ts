import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';

@Entity()
export class Call {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.callsMade)
  caller: User;

  @ManyToOne(() => User, user => user.callsReceived)
  receiver: User;

  @CreateDateColumn()
  start_time: Date;

  @Column({ nullable: true })
  end_time: Date;

  @Column({
    type: 'enum',
    enum: ['ongoing', 'missed', 'ended', 'rejected', 'cancelled', 'busy'],
    default: 'ongoing',
  })
  status: 'ongoing' | 'missed' | 'ended' | 'rejected' | 'cancelled' | 'busy';


  // Tin nhắn liên kết với cuộc gọi
  @OneToOne(() => Message, { nullable: true })
  @JoinColumn()
  message: Message;
}
