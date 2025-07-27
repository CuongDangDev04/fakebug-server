import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class MessageBlock {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.blockedMessageUsers, { onDelete: 'CASCADE' })
  blocker: User;

  @ManyToOne(() => User, user => user.blockedByMessageUsers, { onDelete: 'CASCADE' })
  blocked: User;

  @CreateDateColumn()
  createdAt: Date;
}
