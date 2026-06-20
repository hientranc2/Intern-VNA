import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { EnterpriseTypeService } from '../services/enterprise-type.service';
import { importFileOptions } from '../config/import-upload.config';
import {
  CreateEnterpriseTypeDto,
  UpdateEnterpriseTypeDto,
  ToggleEnterpriseTypeActiveDto,
} from '../../libs/shared/models/enterprise-type.dto';

@Controller('enterprise-types')
export class EnterpriseTypeController {
  constructor(private readonly service: EnterpriseTypeService) {}

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
  create(@Body() dto: CreateEnterpriseTypeDto) {
    return this.service.create(dto);
  }

  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', importFileOptions))
  importEnterpriseTypes(@UploadedFile() file: Express.Multer.File) {
    return this.service.importEnterpriseTypes(file);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnterpriseTypeDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/active')
  @UseGuards(AuthGuard('jwt'))
  toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleEnterpriseTypeActiveDto,
  ) {
    return this.service.toggleActive(id, dto.active);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
