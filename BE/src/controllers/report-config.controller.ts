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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportConfigService } from '../services/report-config.service';
import {
  CreateReportConfigDto,
  UpdateReportConfigDto,
  ToggleReportConfigActiveDto,
} from '../../libs/shared/models/report-config.dto';

@Controller('report-configs')
export class ReportConfigController {
  constructor(private readonly service: ReportConfigService) {}

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
  create(@Body() dto: CreateReportConfigDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportConfigDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/active')
  @UseGuards(AuthGuard('jwt'))
  toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleReportConfigActiveDto,
  ) {
    return this.service.toggleActive(id, dto.active);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
