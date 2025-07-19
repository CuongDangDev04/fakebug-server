import {
  Controller,
  Post as HttpPost,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Put,
  UseGuards,
  Request,
  Req,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

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




  // Bài viết công khai
  @Get('public')
  getPublicPosts() {
    return this.postService.getPublicPosts();
  }

  // Bài viết riêng tư  
  @UseGuards(JwtAuthGuard)
  @Get('private')
  getPrivatePosts(@Req() req) {
    return this.postService.getPrivatePosts(req.user.userId);
  }

  // Bài viết bạn bè 
  @UseGuards(JwtAuthGuard)
  @Get('friends')
  getFriendPosts(@Req() req) {
    const userId = req.user.id;
    console.log('userId', userId)
    return this.postService.getFriendPosts(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('feed')
  getAllVisiblePosts(@Req() req) {
    const userId = req.user.userId;
    console.log('👉 [getAllVisiblePosts Controller] userId:', userId);
    return this.postService.getAllVisiblePosts(userId);
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
