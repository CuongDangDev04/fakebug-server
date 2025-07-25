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
  Delete,
  Query,
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
    return this.postService.getAllVisiblePosts(userId);
  }

 @UseGuards(JwtAuthGuard)
@Get('mypost')
getMyPost(@Req() req, @Query('offset') offset: string, @Query('limit') limit: string) {
  const userId = req.user.userId;
  const offsetNumber = parseInt(offset) || 0;
  const limitNumber = parseInt(limit) || 5;
  return this.postService.getPostsMyUser(userId, offsetNumber, limitNumber);
}



  @HttpPost(':id/share')
  @UseGuards(JwtAuthGuard)
  async sharePost(
    @Param('id') id: number,
    @Req() req,
    @Body() body: { content: string; privacy: 'public' | 'private' | 'friends' }
  ) {
    const userId = req.user.userId;
    console.log('userId',userId)

    const dto: CreatePostDto = {
      userId,
      originalPostId: Number(id),
      content: body.content || '',  
      privacy: body.privacy || 'friends',  
    };

    return this.postService.create(dto);
  }



  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deletePost(@Param('id') id: number, @Req() req) {
    return this.postService.delete(Number(id), req.user.userId);
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
