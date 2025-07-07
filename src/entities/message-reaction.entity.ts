import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Message } from "./message.entity";
import { User } from "./user.entity";

@Entity()
export class MessageReaction {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Message, message => message.reactions, { onDelete: 'CASCADE' })
    message: Message;

    @ManyToOne(() => User, user => user.messageReactions, { onDelete: 'CASCADE' })
    user: User;

    @Column()
    emoji: string;

    @CreateDateColumn()
    create_at: Date;
}