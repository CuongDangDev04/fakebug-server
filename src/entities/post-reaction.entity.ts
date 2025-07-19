import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Post } from './post.entity';

@Entity()
export class PostReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.reactions)
  user: User;

  @ManyToOne(() => Post, post => post.reactions)
  post: Post;

  @Column({
    type: 'enum',
    enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
    default: 'like',
  })
  type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

  @CreateDateColumn()
  created_at: Date;
}
