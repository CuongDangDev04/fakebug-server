import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    async uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
        const result: UploadApiResponse = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder },
                (error, result) => {
                    if (error) reject(error);
                    else if (result) resolve(result);
                    else reject(new Error('No result returned from Cloudinary'));

                },
            ).end(file.buffer);
        });

        return result.secure_url;
    }
}
