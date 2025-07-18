import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class UserDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  gender: 'male' | 'female' | 'other';

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ nullable: true })
  phone_number: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  career: string;         // Nghề nghiệp

  @Column({ nullable: true })
  education: string;      // Trình độ học vấn

  @Column({ nullable: true })
  relationship_status: string;  // Độc thân, đã kết hôn, v.v.

  @Column({ nullable: true })
  cover_url: string;      // Ảnh bìa (cover image)

  @Column('simple-array', { nullable: true })
  gallery_images: string[];   // Các ảnh khác (nếu muốn lưu mảng url)

  @OneToOne(() => User, user => user.detail, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
