import {
  Controller,
  Post as HttpPost,
  Body,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) { }

  @HttpPost()
  @UseInterceptors(FileInterceptor('file'))  // 'file' là key của FormData
  createPost(
    @Body() createPostDto: CreatePostDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.postService.create(createPostDto, file);
  }

  @Get()
  getAllPosts() {
    return this.postService.getAll();
  }

  @Get(':id')
  getPostById(@Param('id') id: number) {
    return this.postService.getById(id);
  }
  
  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))  // giống create
  updatePost(
    @Param('id') id: number,
    @Body() updatePostDto: CreatePostDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.postService.update(Number(id), updatePostDto, file);
  }
}
