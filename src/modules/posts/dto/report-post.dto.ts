import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ReportPostDto {
    @IsNumber()
    postId: number;

    @IsNumber()
    reporterId: number;

    @IsString()
    @IsNotEmpty()
    reason: string;
}
