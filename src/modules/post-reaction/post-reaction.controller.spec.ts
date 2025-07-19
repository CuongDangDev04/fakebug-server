import { Test, TestingModule } from '@nestjs/testing';
import { PostReactionController } from './post-reaction.controller';

describe('PostReactionController', () => {
  let controller: PostReactionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostReactionController],
    }).compile();

    controller = module.get<PostReactionController>(PostReactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
