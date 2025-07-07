import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { MessageReaction } from './message-reaction.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.sentMessages)
  sender: User;

  @ManyToOne(() => User, user => user.receivedMessages)
  receiver: User;

  @Column('text')
  content: string;

  @CreateDateColumn()
  sent_at: Date;

  @Column({ default: false })
  is_read: boolean;

  @Column({ default: false })
  is_revoked: boolean;

  @OneToMany(() => MessageReaction, reaction => reaction.message)
  reactions: MessageReaction[];
}
