import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { BusinessSectorService } from '../services/business-sector.service';
import { importFileOptions } from '../config/import-upload.config';
import {
  CreateBusinessSectorDto,
  UpdateBusinessSectorDto,
} from '../../libs/shared/models/business-sector.dto';

@Controller('business-sectors')
export class BusinessSectorController {
  constructor(private readonly service: BusinessSectorService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'))
  create(@Body() dto: CreateBusinessSectorDto) {
    return this.service.create(dto);
  }

  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', importFileOptions))
  importBusinessSectors(@UploadedFile() file: Express.Multer.File) {
    return this.service.importBusinessSectors(file);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessSectorDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
