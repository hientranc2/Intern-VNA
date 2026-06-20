import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

// Định dạng file được phép khi import: Excel (.xlsx/.xls) và CSV.
const ALLOWED_IMPORT_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
  'application/csv',
];

const ALLOWED_IMPORT_EXT = ['.xlsx', '.xls', '.csv'];
const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

// Cấu hình multer cho import file: lưu vào memory (buffer) để parse trực tiếp,
// giới hạn 5MB, chỉ nhận .xlsx/.xls/.csv.
export const importFileOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMPORT_FILE_SIZE },
  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const ext = '.' + (file.originalname.split('.').pop() || '').toLowerCase();
    const mimeOk = ALLOWED_IMPORT_MIME.includes(file.mimetype);
    const extOk = ALLOWED_IMPORT_EXT.includes(ext);
    // Một số trình duyệt/OS báo sai mimetype cho CSV/Excel → chấp nhận nếu đuôi đúng.
    if (!mimeOk && !extOk) {
      return cb(
        new BadRequestException(
          'Chỉ chấp nhận file định dạng .xlsx, .xls hoặc .csv',
        ),
        false,
      );
    }
    cb(null, true);
  },
};
