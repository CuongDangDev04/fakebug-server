import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class PasswordReset {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email: string;

    @Column()
    otp: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'timestamp' })
    expiresAt: Date;
}
