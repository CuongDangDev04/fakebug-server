export class CreateCommentDto {
  postId: number;
  userId: number;
  content: string;
  parentId?: number;   // nếu có thì là reply, nếu không là comment gốc
}
