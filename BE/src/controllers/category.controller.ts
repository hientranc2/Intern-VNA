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
import { CategoryService } from '../services/category.service';
import {
  CreateInjuryFactorDto,
  UpdateInjuryFactorDto,
  ToggleInjuryFactorActiveDto,
  CreateTreeNodeDto,
  UpdateTreeNodeDto,
} from '../../libs/shared/models/category.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  // --- Yếu tố gây chấn thương ---

  @Get('injury-factors')
  findAllInjuryFactors() {
    return this.service.findAllInjuryFactors();
  }

  @Post('injury-factors')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'))
  createInjuryFactor(@Body() dto: CreateInjuryFactorDto) {
    return this.service.createInjuryFactor(dto);
  }

  @Put('injury-factors/:id')
  @UseGuards(AuthGuard('jwt'))
  updateInjuryFactor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInjuryFactorDto,
  ) {
    return this.service.updateInjuryFactor(id, dto);
  }

  @Patch('injury-factors/:id/active')
  @UseGuards(AuthGuard('jwt'))
  toggleInjuryFactorActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleInjuryFactorActiveDto,
  ) {
    return this.service.toggleInjuryFactorActive(id, dto.active);
  }

  @Delete('injury-factors/:id')
  @UseGuards(AuthGuard('jwt'))
  removeInjuryFactor(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeInjuryFactor(id);
  }

  // --- Loại chấn thương ---

  @Get('injury-types')
  findAllInjuryTypes() {
    return this.service.findAllInjuryTypes();
  }

  @Post('injury-types')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'))
  createInjuryType(@Body() dto: CreateTreeNodeDto) {
    return this.service.createInjuryType(dto);
  }

  @Put('injury-types/:id')
  @UseGuards(AuthGuard('jwt'))
  updateInjuryType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTreeNodeDto,
  ) {
    return this.service.updateInjuryType(id, dto);
  }

  @Delete('injury-types/:id')
  @UseGuards(AuthGuard('jwt'))
  removeInjuryType(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeInjuryType(id);
  }

  // --- Nghề nghiệp ---

  @Get('occupations')
  findAllOccupations() {
    return this.service.findAllOccupations();
  }

  @Post('occupations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'))
  createOccupation(@Body() dto: CreateTreeNodeDto) {
    return this.service.createOccupation(dto);
  }

  @Put('occupations/:id')
  @UseGuards(AuthGuard('jwt'))
  updateOccupation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTreeNodeDto,
  ) {
    return this.service.updateOccupation(id, dto);
  }

  @Delete('occupations/:id')
  @UseGuards(AuthGuard('jwt'))
  removeOccupation(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeOccupation(id);
  }
}
