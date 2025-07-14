export class StartCallDto {
  callerId: number;
  receiverId: number;
  callType: 'audio' | 'video';
}
