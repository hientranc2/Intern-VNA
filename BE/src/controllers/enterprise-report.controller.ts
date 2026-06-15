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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccidentReportService } from '../services/accident-report.service';
import {
  CreateEnterpriseReportDto,
  UpdateEnterpriseReportDto,
} from '../../libs/shared/models/accident-report.dto';

interface AuthRequest {
  user: { userId: string; username: string; role: string };
}

@Controller('enterprise-reports')
@UseGuards(AuthGuard('jwt'))
export class EnterpriseReportController {
  constructor(private readonly service: AccidentReportService) {}

  @Get('my')
  findMy(@Request() req: AuthRequest) {
    return this.service.findMy(req.user.userId);
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
