import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Request,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AtvsldReportService } from '../services/atvsld-report.service';
import {
  AtvsldReportQueryDto,
  MyAtvsldReportQueryDto,
  CreateAtvsldReportDto,
  UpdateAtvsldReportDto,
  RejectAtvsldReportDto,
  BulkApproveAtvsldDto,
  BulkRejectAtvsldDto,
} from '../../libs/shared/models/atvsld-report.dto';

interface AuthRequest {
  user: { userId: string; username: string; role: string };
}

@Controller('atvsld-reports')
@UseGuards(AuthGuard('jwt'))
export class AtvsldReportController {
  constructor(private readonly service: AtvsldReportService) {}

  // ===== Role Doanh nghiệp =====

  @Get('my')
  findMy(@Request() req: AuthRequest, @Query() query: MyAtvsldReportQueryDto) {
    return this.service.findMy(req.user.userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: AuthRequest, @Body() dto: CreateAtvsldReportDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Put(':id')
  update(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAtvsldReportDto,
  ) {
    return this.service.update(req.user.userId, id, dto);
  }

  @Patch(':id/submit')
  submit(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.service.submit(req.user.userId, id);
  }

  // ===== Role Sở: thao tác hàng loạt (đặt trước :id) =====

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  approveMany(@Request() req: AuthRequest, @Body() dto: BulkApproveAtvsldDto) {
    return this.service.approveMany(req.user.userId, dto.ids);
  }

  @Post('reject')
  @HttpCode(HttpStatus.OK)
  rejectMany(@Request() req: AuthRequest, @Body() dto: BulkRejectAtvsldDto) {
    return this.service.rejectMany(req.user.userId, dto.ids, dto.lyDoTuChoi);
  }

  // ===== Role Sở: đơn lẻ =====

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.service.approve(req.user.userId, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectAtvsldReportDto,
  ) {
    return this.service.reject(req.user.userId, id, dto.lyDoTuChoi);
  }

  // ===== Dùng chung =====

  @Get()
  findAll(@Query() query: AtvsldReportQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
