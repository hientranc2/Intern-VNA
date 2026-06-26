import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AccidentReportService } from '../services/accident-report.service';
import {
  CreateEnterpriseReportDto,
  UpdateEnterpriseReportDto,
} from '../../libs/shared/models/accident-report.dto';

interface AuthRequest {
  user: { userId: string; username: string; role: string };
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const fileUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req: any, file: Express.Multer.File, cb: Function) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException('Chỉ chấp nhận file PDF, JPG, JPEG, PNG'),
        false,
      );
    }
  },
};

@Controller('enterprise-reports')
@UseGuards(AuthGuard('jwt'))
export class EnterpriseReportController {
  constructor(private readonly service: AccidentReportService) {}

  @Get('my')
  findMy(@Request() req: AuthRequest) {
    return this.service.findMy(req.user.userId);
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', fileUploadOptions))
  async uploadFile(
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để tải lên');
    }
    const url = await this.service.uploadReportFile(file, req.user.userId);
    return { url };
  }

  @Get(':id')
  findMyOne(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findMyOne(req.user.userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: AuthRequest, @Body() dto: CreateEnterpriseReportDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Put(':id')
  update(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnterpriseReportDto,
  ) {
    return this.service.update(req.user.userId, id, dto);
  }
}
