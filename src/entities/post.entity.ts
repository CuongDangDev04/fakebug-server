import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { PostReaction } from './post-reaction.entity';
import { Comment } from './comment.entity'
@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.posts)
    user: User;

    @Column('text')
    content: string;

    @Column({ type: 'varchar', nullable: true })
    media_url: string | null;

    @Column({
        type: 'enum',
        enum: ['private', 'friends', 'public'],
        default: 'friends',
    })
    privacy: 'private' | 'friends' | 'public';

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;


    @ManyToOne(() => Post, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'original_post_id' })
    originalPost?: Post;

    @Column({ nullable: true })
    original_post_id?: number;
    
    @OneToMany(() => Comment, comment => comment.post, { cascade: true })
    comments: Comment[];

    @OneToMany(() => PostReaction, reaction => reaction.post, { cascade: true })
    reactions: PostReaction[];
}