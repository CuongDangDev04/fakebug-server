export class EndCallDto {
  callId: number;
  status: 'ended' | 'missed' | 'rejected';
  callerId: number;      // thêm vào
  receiverId: number;    // thêm vào
}
