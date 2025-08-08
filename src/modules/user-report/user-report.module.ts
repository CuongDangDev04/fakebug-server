import { Module } from '@nestjs/common';
import { UserReportController } from './user-report.controller';
import { UserReportService } from './user-report.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserReport } from 'src/entities/user-report.entity';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserReport, User])],
  controllers: [UserReportController],
  providers: [UserReportService]
})
export class UserReportModule { }
