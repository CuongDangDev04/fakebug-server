import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Post } from './post.entity';
import { CommentReaction } from './comment-reaction.entity';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.comments)
  user: User;

  @ManyToOne(() => Post, post => post.comments,{ onDelete: 'CASCADE' })
  post: Post;

  @ManyToOne(() => Comment, comment => comment.replies, { nullable: true , onDelete: 'CASCADE'})
  parent: Comment | null;  // Nếu null tức là bình luận gốc

  @OneToMany(() => Comment, comment => comment.parent)
  replies: Comment[];

  @Column('text')
  content: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => CommentReaction, reaction => reaction.comment)
  reactions: CommentReaction[];
}
