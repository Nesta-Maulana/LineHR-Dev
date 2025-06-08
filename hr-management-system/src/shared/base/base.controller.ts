import {
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BaseService } from './base.service';
import { BaseEntity } from '@shared/entities';
import { PaginationQuery } from '@shared/types';
import { JwtAuthGuard } from '@cross-cutting/security';

export abstract class BaseController<
  T extends BaseEntity,
  CreateDto,
  UpdateDto,
> {
  constructor(
    protected readonly service: BaseService<T>,
    protected readonly entityName: string,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all resources' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  async findAll(@Query() query: PaginationQuery) {
    return await this.service.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get resource by ID' })
  @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.findByIdOrFail(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new resource' })
  @ApiResponse({ status: 201, description: 'Resource created successfully' })
  async create(@Body() createDto: CreateDto) {
    return await this.service.create(createDto as any);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update resource' })
  @ApiResponse({ status: 200, description: 'Resource updated successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDto,
  ) {
    return await this.service.update(id, updateDto as any);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete resource' })
  @ApiResponse({ status: 200, description: 'Resource deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
    return { message: `${this.entityName} deleted successfully` };
  }
}