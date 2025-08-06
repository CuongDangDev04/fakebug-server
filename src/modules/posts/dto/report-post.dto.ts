// dto/report-post.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ReportPostDto {
    @IsNumber()
    postId: number;

    @IsString()
    @IsNotEmpty()
    reason: string;
}
