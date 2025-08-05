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
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ReportPostDto } from './dto/report-post.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';

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


  @UseGuards(JwtAuthGuard)
  @Get('private')
  getPrivatePosts(
    @Req() req,
    @Query('offset') offset: string,
    @Query('limit') limit: string
  ) {
    const userId = req.user.userId;
    return this.postService.getPrivatePosts(
      userId,
      parseInt(offset) || 0,
      parseInt(limit) || 5
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('friends')
  getFriendPosts(
    @Req() req,
    @Query('offset') offset: string,
    @Query('limit') limit: string
  ) {
    const userId = req.user.userId;
    return this.postService.getFriendPosts(
      userId,
      parseInt(offset) || 0,
      parseInt(limit) || 5
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('feed')
  getAllVisiblePosts(
    @Req() req,
    @Query('offset') offset: string,
    @Query('limit') limit: string
  ) {
    const userId = req.user.userId;
    return this.postService.getAllVisiblePosts(
      userId,
      parseInt(offset) || 0,
      parseInt(limit) || 5
    );
  }

  @Get('public')
  getPublicPosts(
    @Query('offset') offset: string,
    @Query('limit') limit: string
  ) {
    return this.postService.getPublicPosts(
      parseInt(offset) || 0,
      parseInt(limit) || 5
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('mypost')
  getMyPost(@Req() req, @Query('offset') offset: string, @Query('limit') limit: string) {
    const userId = req.user.userId;
    const offsetNumber = parseInt(offset) || 0;
    const limitNumber = parseInt(limit) || 5;
    return this.postService.getPostsMyUser(userId, offsetNumber, limitNumber);
  }

  @UseGuards(JwtAuthGuard)
  @HttpPost('report')
  reportPost(@Body() dto: ReportPostDto) {
    return this.postService.reportPost(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('all-post-in-other-user/:userId')
  getAllMyPostInProfileOtherUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('offset') offset: string,
    @Query('limit') limit: string,
  ) {
    const offsetNumber = parseInt(offset) || 0;
    const limitNumber = parseInt(limit) || 5;
    return this.postService.getPostsMyUser(userId, offsetNumber, limitNumber);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('all-report')
  getAllReport(@Query('page') page = 1, @Query('limit') limit = 10) {
    const offset = (page - 1) * limit;
    return this.postService.getAllPostReport(offset, Number(limit));
  }

  @HttpPost(':id/share')
  @UseGuards(JwtAuthGuard)
  async sharePost(
    @Param('id') id: number,
    @Req() req,
    @Body() body: { content: string; privacy: 'public' | 'private' | 'friends' }
  ) {
    const userId = req.user.userId;
    console.log('userId', userId)

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
