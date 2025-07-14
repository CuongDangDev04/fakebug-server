import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Post } from './post.entity';
import { Comment } from './comment.entity';
import { Like } from './like.entity';
import { Message } from './message.entity';
import { Friendship } from './friendship.entity';
import { Call } from './call.entity';
import { Notification } from './notification.entity';
import { MessageReaction } from './message-reaction.entity';


@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  first_name: string; // givenName từ Google

  @Column({ nullable: true })
  last_name: string; // familyName từ Google

  @Column({ nullable: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password_hash: string; // Chỉ dùng cho local

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ type: 'enum', enum: ['user', 'admin'], default: 'user' })
  role: 'user' | 'admin';

  @Column({ type: 'enum', enum: ['local', 'google'], default: 'local' })
  provider: 'local' | 'google';
  @Column({ type: 'text', nullable: true })
  access_token: string;

  @Column({ type: 'text', nullable: true })
  refresh_token: string;

  // Một user có nhiều bài viết
  @OneToMany(() => Post, post => post.user)
  posts: Post[];

  // Một user có nhiều comment
  @OneToMany(() => Comment, comment => comment.user)
  comments: Comment[];

  // Một user có nhiều likes
  @OneToMany(() => Like, like => like.user)
  likes: Like[];

  // Một user gửi nhiều tin nhắn
  @OneToMany(() => Message, message => message.sender)
  sentMessages: Message[];

  // Một user nhận nhiều tin nhắn
  @OneToMany(() => Message, message => message.receiver)
  receivedMessages: Message[];

  // Quan hệ bạn bè
  @OneToMany(() => Friendship, friendship => friendship.userOne)
  friendshipsInitiated: Friendship[];

  @OneToMany(() => Friendship, friendship => friendship.userTwo)
  friendshipsReceived: Friendship[];

  // Cuộc gọi gọi hoặc nhận
  @OneToMany(() => Call, call => call.caller)
  callsMade: Call[];

  @OneToMany(() => Call, call => call.receiver)
  callsReceived: Call[];

  //thông báo
  @OneToMany(() => Notification, notification => notification.user)
  notifications: Notification[];

  @OneToMany(() => MessageReaction, reaction => reaction.user)
  messageReactions: MessageReaction[];


}