import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Post } from './post.entity';

@Entity()
export class PostReport {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reporter_id' })
    reporter: User;
    
    @ManyToOne(() => Post, { onDelete: 'CASCADE', nullable: true }) // 👈 nullable: true để cho phép set null
    @JoinColumn({ name: 'post_id' })
    post: Post | null;

    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reported_user_id' })
    reportedUser: User; // người bị báo cáo (chính là người đăng bài)

    @Column({ type: 'text' })
    reason: string;

    @Column({ default: 'pending' })
    status: 'pending' | 'ignored' | 'removed';

    @CreateDateColumn()
    created_at: Date;
}
