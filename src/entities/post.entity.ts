import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import {  PostReaction } from './post-reaction.entity';
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

    @OneToMany(() => Comment, comment => comment.post)
    comments: Comment[];

    @OneToMany(() => PostReaction, reaction => reaction.post)
    reactions: PostReaction[];
}