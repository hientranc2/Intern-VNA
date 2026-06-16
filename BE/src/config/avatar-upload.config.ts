import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request } from 'express';

export const AVATAR_UPLOAD_DIR = './uploads/avatars';
export const AVATAR_URL_PREFIX = '/uploads/avatars';

if (!existsSync(AVATAR_UPLOAD_DIR)) {
  mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
}

// Cấu hình multer cho avatar: lưu xuống disk, giới hạn 5MB, chỉ nhận jpeg/jpg/png.
export const avatarMulterOptions = {
  storage: diskStorage({
    destination: AVATAR_UPLOAD_DIR,
    filename: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `avatar-${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!/\/(jpe?g|png)$/.test(file.mimetype)) {
      return cb(
        new BadRequestException(
          'Chỉ chấp nhận ảnh định dạng .jpeg, .jpg, .png',
        ),
        false,
      );
    }
    cb(null, true);
  },
};
