import { Module } from '@nestjs/common';
import { FriendshipController } from './friendship.controller';
import { FriendshipService } from './friendship.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from 'src/entities/friendship.entity';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship, User])],
  controllers: [FriendshipController],
  providers: [FriendshipService]
})
export class FriendshipModule { }
