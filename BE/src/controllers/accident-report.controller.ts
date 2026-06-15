import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccidentReportService } from '../services/accident-report.service';
import {
  AccidentReportQueryDto,
  SummaryQueryDto,
} from '../../libs/shared/models/accident-report.dto';

@Controller('accident-reports')
@UseGuards(AuthGuard('jwt'))
export class AccidentReportController {
  constructor(private readonly service: AccidentReportService) {}

  @Get()
  findAll(@Query() query: AccidentReportQueryDto) {
    return this.service.findAll(query);
  }

  @Get('summary')
  getSummary(@Query() query: SummaryQueryDto) {
    return this.service.getSummary(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.service.approve(id);
  }
}
