import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { UserController } from './user.controller';
import { Friendship } from 'src/entities/friendship.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UserDetail } from 'src/entities/user-detail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User,Friendship,UserDetail]),CloudinaryModule],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
