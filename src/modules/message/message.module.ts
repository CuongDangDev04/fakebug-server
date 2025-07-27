import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { MessageReaction } from 'src/entities/message-reaction.entity';
import { MessageBlock } from 'src/entities/message-block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, User, MessageReaction,MessageBlock])],
  controllers: [MessageController],
  providers: [MessageService, MessageGateway]
})
export class MessageModule {}
