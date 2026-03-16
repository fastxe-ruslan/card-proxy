import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { AuditQueryDto } from '../dto/audit-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PiiMasker } from '../../../common/utils/pii-masker';

@ApiTags('Admin — Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('internal/audit')
export class AuditAdminController {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
  ) {}

  @Get()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'List audit logs with filters (admin only)' })
  async list(@Query() query: AuditQueryDto) {
    const {
      actorId,
      entityType,
      entityId,
      action,
      dateFrom,
      dateTo,
      correlationId,
      page = 1,
      pageSize = 20,
    } = query;

    const qb = this.repo.createQueryBuilder('a').orderBy('a.createdAt', 'DESC');

    if (actorId) qb.andWhere('a.actorId = :actorId', { actorId });
    if (entityType) qb.andWhere('a.entityType = :entityType', { entityType });
    if (entityId) qb.andWhere('a.entityId = :entityId', { entityId });
    if (action) qb.andWhere('a.action = :action', { action });
    if (correlationId)
      qb.andWhere('a.correlationId = :correlationId', { correlationId });
    if (dateFrom) qb.andWhere('a.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('a.createdAt <= :dateTo', { dateTo });

    const total = await qb.getCount();
    const records = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      data: records.map((r) => this.sanitize(r)),
      meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
    };
  }

  @Get('sensitive')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'List sensitive audit logs (admin only, strict rate limit)',
  })
  async listSensitive(@Query() query: AuditQueryDto) {
    const { page = 1, pageSize = 20 } = query;

    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.isSensitive = true')
      .orderBy('a.createdAt', 'DESC');

    if (query.actorId)
      qb.andWhere('a.actorId = :actorId', { actorId: query.actorId });
    if (query.dateFrom)
      qb.andWhere('a.createdAt >= :dateFrom', { dateFrom: query.dateFrom });
    if (query.dateTo)
      qb.andWhere('a.createdAt <= :dateTo', { dateTo: query.dateTo });

    const total = await qb.getCount();
    const records = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      data: records.map((r) => this.sanitize(r)),
      meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
    };
  }

  @Get('entity/:entityType/:entityId')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Full history of a specific entity' })
  async entityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    const records = await this.repo.find({
      where: { entityType, entityId },
      order: { createdAt: 'ASC' },
    });

    return { data: records.map((r) => this.sanitize(r)) };
  }

  @Get(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Get single audit log entry by ID' })
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    const record = await this.repo.findOneBy({ id });
    if (!record) throw new NotFoundException('Audit log entry not found');
    return { data: this.sanitize(record) };
  }

  private sanitize(record: AuditLogEntity): Partial<AuditLogEntity> {
    return {
      ...record,
      beforeJson: record.beforeJson
        ? (PiiMasker.mask(record.beforeJson) as Record<string, unknown>)
        : null,
      afterJson: record.afterJson
        ? (PiiMasker.mask(record.afterJson) as Record<string, unknown>)
        : null,
      metadataJson: record.metadataJson
        ? (PiiMasker.mask(record.metadataJson) as Record<string, unknown>)
        : null,
    };
  }
}
