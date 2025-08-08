import { Test, TestingModule } from '@nestjs/testing';
import { UserReportService } from './user-report.service';

describe('UserReportService', () => {
  let service: UserReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserReportService],
    }).compile();

    service = module.get<UserReportService>(UserReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
