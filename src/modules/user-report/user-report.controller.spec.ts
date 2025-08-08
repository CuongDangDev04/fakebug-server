import { Test, TestingModule } from '@nestjs/testing';
import { UserReportController } from './user-report.controller';

describe('UserReportController', () => {
  let controller: UserReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserReportController],
    }).compile();

    controller = module.get<UserReportController>(UserReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
