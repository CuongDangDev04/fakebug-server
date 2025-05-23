import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.friendshipsInitiated)
  userOne: User;

  @ManyToOne(() => User, user => user.friendshipsReceived)
  userTwo: User;

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'blocked'], default: 'pending' })
  status: 'pending' | 'accepted' | 'blocked';

  @CreateDateColumn()
  created_at: Date;
}
