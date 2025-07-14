import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallGateway } from './call.gateway';
import { CallService } from './call.service';
import { Call } from 'src/entities/call.entity';
import { Message } from 'src/entities/message.entity';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Call, Message, User])],
  providers: [CallGateway, CallService],
  exports: [CallService],
})
export class CallModule {}
