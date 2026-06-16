import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { BusinessService } from '../services/business.service';
import {
  BusinessCreateDto,
  BusinessUpdateDto,
  BusinessQueryDto,
  BusinessToggleStatusDto,
} from '../../libs/shared/models/business.dto';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  findAll(@Query() query: BusinessQueryDto) {
    return this.businessService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessService.findOne(id);
  }

  @Get(':id/account')
  getAccount(@Param('id') id: string) {
    return this.businessService.getAccount(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'licenseFile', maxCount: 1 },
        { name: 'otherFile', maxCount: 1 },
      ],
      fileUploadOptions,
    ),
  )
  create(
    @Body() dto: BusinessCreateDto,
    @UploadedFiles()
    files: {
      licenseFile?: Express.Multer.File[];
      otherFile?: Express.Multer.File[];
    },
  ) {
    return this.businessService.create(
      dto,
      files?.licenseFile?.[0],
      files?.otherFile?.[0],
    );
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'licenseFile', maxCount: 1 },
        { name: 'otherFile', maxCount: 1 },
      ],
      fileUploadOptions,
    ),
  )
  update(
    @Param('id') id: string,
    @Body() dto: BusinessUpdateDto,
    @UploadedFiles()
    files: {
      licenseFile?: Express.Multer.File[];
      otherFile?: Express.Multer.File[];
    },
  ) {
    return this.businessService.update(
      id,
      dto,
      files?.licenseFile?.[0],
      files?.otherFile?.[0],
    );
  }

  @Patch(':id/status')
  toggleStatus(@Param('id') id: string, @Body() dto: BusinessToggleStatusDto) {
    return this.businessService.toggleStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.businessService.remove(id);
  }
}
