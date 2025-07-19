import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    Column,
    CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Comment } from './comment.entity';

export enum ReactionType {
    LIKE = 'like',
    LOVE = 'love',
    HAHA = 'haha',
    WOW = 'wow',
    SAD = 'sad',
    ANGRY = 'angry',
}

@Entity()
export class CommentReaction {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.commentReactions)
    user: User;

    @ManyToOne(() => Comment, comment => comment.reactions, { onDelete: 'CASCADE' })
    comment: Comment;

    @Column({
        type: 'enum',
        enum: ReactionType,
        default: 'like',
    })
    type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

    @CreateDateColumn()
    created_at: Date;
}
