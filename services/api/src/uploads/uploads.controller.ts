import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');
const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Minimal image upload: stores files on local disk and returns a relative path
 * (served statically at /uploads). Good enough for dev/pilot; swap for S3 +
 * signed URLs in production (the client only sees the returned path either way).
 */
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  upload(@UploadedFile() file: any) {
    if (!file?.buffer) throw new BadRequestException('No file uploaded');
    let ext = extname(file.originalname || '').toLowerCase();
    if (!ALLOWED.includes(ext)) {
      const m = file.mimetype || '';
      ext = m.includes('png') ? '.png' : m.includes('webp') ? '.webp' : '.jpg';
    }
    mkdirSync(UPLOAD_DIR, { recursive: true });
    const name = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    writeFileSync(join(UPLOAD_DIR, name), file.buffer);
    return { path: `/uploads/${name}` };
  }
}
