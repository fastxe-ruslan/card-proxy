import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { WasabiWebhookEntity } from '../entities/wasabi-webhook.entity';
import { IdempotencyKeyEntity } from '../entities/idempotency-key.entity';
import { WebhookStatus } from '../enums/webhook-status.enum';
import { WebhookQueueService } from '../services/webhook-queue.service';

@ApiTags('Internal / Webhooks Admin')
@ApiBearerAuth()
@Controller('internal/webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'internal')
export class WebhookAdminController {
  constructor(
    @InjectRepository(WasabiWebhookEntity)
    private readonly webhookRepo: Repository<WasabiWebhookEntity>,
    @InjectRepository(IdempotencyKeyEntity)
    private readonly idempotencyRepo: Repository<IdempotencyKeyEntity>,
    private readonly queueService: WebhookQueueService,
  ) {}

  @ApiOperation({ summary: 'List webhooks with optional filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @Get()
  async list(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    const where: FindOptionsWhere<WasabiWebhookEntity> = {};
    if (status) where.status = status as WebhookStatus;
    if (category) where.category = category;
    if (from && to) {
      where.createdAt = Between(new Date(from), new Date(to)) as never;
    }

    const [items, total] = await this.webhookRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
      select: [
        'id',
        'requestId',
        'category',
        'signatureValid',
        'status',
        'errorMessage',
        'createdAt',
        'processedAt',
      ],
    });

    return {
      data: items,
      meta: { total, page: Number(page), pageSize: Number(pageSize) },
    };
  }

  @ApiOperation({ summary: 'Get full webhook details including raw payload' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @Get('stats')
  async stats() {
    const rows = await this.webhookRepo
      .createQueryBuilder('w')
      .select('w.status', 'status')
      .addSelect('w.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('w.status')
      .addGroupBy('w.category')
      .getRawMany<{ status: string; category: string; count: string }>();

    return { data: rows };
  }

  @ApiOperation({ summary: 'Get full webhook record' })
  @Get(':id')
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    const wh = await this.webhookRepo.findOne({ where: { id } });
    if (!wh) throw new NotFoundException('Webhook not found');
    return { data: wh };
  }

  @ApiOperation({
    summary: 'Replay a failed or duplicate webhook',
    description:
      'Resets the idempotency key and re-queues the webhook for processing. ' +
      'Only allowed for `failed` or `duplicate` status.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 202, description: 'Webhook re-queued' })
  @Post(':id/replay')
  @HttpCode(HttpStatus.ACCEPTED)
  async replay(@Param('id', ParseUUIDPipe) id: string) {
    const wh = await this.webhookRepo.findOne({ where: { id } });
    if (!wh) throw new NotFoundException('Webhook not found');

    const replayableStatuses: WebhookStatus[] = [
      WebhookStatus.Failed,
      WebhookStatus.Duplicate,
    ];
    if (!replayableStatuses.includes(wh.status)) {
      throw new BadRequestException(
        `Cannot replay webhook in status "${wh.status}" — only failed or duplicate allowed`,
      );
    }

    await this.idempotencyRepo.delete({ key: wh.requestId, scope: 'webhook' });

    await this.webhookRepo.update(id, {
      status: WebhookStatus.Queued,
      errorMessage: null,
      processedAt: null,
    });

    this.queueService.enqueue({
      webhookId: wh.id,
      requestId: wh.requestId,
      category: wh.category,
      payload: wh.payloadJson,
    });

    return { data: { id, status: 'queued', msg: 'replay scheduled' } };
  }
}
