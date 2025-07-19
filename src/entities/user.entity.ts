import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  OneToOne,
} from 'typeorm';
import { Post } from './post.entity';
import { Comment } from './comment.entity';
import { PostReaction } from './post-reaction.entity';
import { Message } from './message.entity';
import { Friendship } from './friendship.entity';
import { Call } from './call.entity';
import { Notification } from './notification.entity';
import { MessageReaction } from './message-reaction.entity';
import { UserDetail } from './user-detail.entity';
import { CommentReaction } from './comment-reaction.entity';


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

  @OneToMany(() => CommentReaction, reaction => reaction.user)
  commentReactions: CommentReaction[];

  // Một user có nhiều post reaction
  @OneToMany(() => PostReaction, reaction => reaction.user)
  reactions: PostReaction[];

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

  @OneToOne(() => UserDetail, detail => detail.user, { cascade: true, eager: true })
  detail: UserDetail;
}