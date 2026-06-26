import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
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

interface AuthRequest {
  user: { userId: string; username: string; role: string };
}

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

  @Post('bulk-approve')
  @HttpCode(HttpStatus.OK)
  approveMany(@Body('ids') ids: number[], @Req() req: AuthRequest) {
    return this.service.approveMany(ids ?? [], req.user.userId);
  }

  @Post('bulk-reject')
  @HttpCode(HttpStatus.OK)
  rejectMany(
    @Body() body: { ids: number[]; reason: string },
    @Req() req: AuthRequest,
  ) {
    return this.service.rejectMany(
      body.ids ?? [],
      body.reason ?? '',
      req.user.userId,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.approve(id, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

