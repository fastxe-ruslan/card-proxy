import {
  Controller,
  Post,
  Req,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WasabiWebhookEntity } from '../entities/wasabi-webhook.entity';
import { WebhookStatus } from '../enums/webhook-status.enum';
import { WebhookSignatureService } from '../services/webhook-signature.service';
import { WebhookQueueService } from '../services/webhook-queue.service';

interface WasabiAckResponse {
  success: boolean;
  code: number;
  msg: string;
}

@ApiExcludeController()
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @InjectRepository(WasabiWebhookEntity)
    private readonly webhookRepo: Repository<WasabiWebhookEntity>,
    private readonly signatureService: WebhookSignatureService,
    private readonly queueService: WebhookQueueService,
  ) {}

  @Post('wasabi')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-wsb-category') category?: string,
    @Headers('x-wsb-signature') signature?: string,
    @Headers('x-wsb-request-id') requestId?: string,
  ): Promise<WasabiAckResponse> {
    if (!category || !requestId) {
      this.logger.warn(
        'Incoming webhook missing required headers (x-wsb-category / x-wsb-request-id)',
      );
      return { success: false, code: 400, msg: 'missing required headers' };
    }

    const rawBody = req.rawBody?.toString('utf8') ?? '{}';

    let payloadJson: Record<string, unknown> = {};
    try {
      payloadJson = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      this.logger.warn(`Non-JSON webhook body from requestId=${requestId}`);
    }

    const signatureValid = this.signatureService.verify(rawBody, signature);
    if (!signatureValid) {
      this.logger.warn(
        `Invalid signature for requestId=${requestId} sig=${signature?.slice(0, 20)}...`,
      );
      await this.safeCreateRecord(
        requestId,
        category,
        signature ?? null,
        false,
        payloadJson,
        req,
      );
      return { success: false, code: 401, msg: 'invalid signature' };
    }

    let webhookId: string | null = null;
    try {
      const record = await this.createRecord(
        requestId,
        category,
        signature ?? null,
        true,
        payloadJson,
        req,
      );
      webhookId = record.id;

      await this.webhookRepo.update(record.id, {
        status: WebhookStatus.Queued,
      });

      this.queueService.enqueue({
        webhookId: record.id,
        requestId,
        category,
        payload: payloadJson,
      });
    } catch (err) {
      this.logger.error(`Webhook intake pipeline error for ${requestId}`, err);
    }

    this.logger.debug(
      `Webhook ${requestId} (${category}) queued — id=${webhookId ?? 'n/a'}`,
    );
    return { success: true, code: 200, msg: 'ok' };
  }

  private async createRecord(
    requestId: string,
    category: string,
    signature: string | null,
    signatureValid: boolean,
    payloadJson: Record<string, unknown>,
    req: Request,
  ): Promise<WasabiWebhookEntity> {
    const safeHeaders = this.extractSafeHeaders(req);
    return this.webhookRepo.save(
      this.webhookRepo.create({
        requestId,
        category,
        signature,
        signatureValid,
        payloadJson,
        headersJson: safeHeaders,
        status: WebhookStatus.Received,
      }),
    );
  }

  private async safeCreateRecord(
    ...args: Parameters<typeof this.createRecord>
  ): Promise<void> {
    try {
      await this.createRecord(...args);
    } catch (err) {
      this.logger.error('Failed to save invalid-signature webhook record', err);
    }
  }

  private extractSafeHeaders(req: Request): Record<string, unknown> {
    const skip = new Set(['authorization', 'cookie', 'x-wsb-signature']);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!skip.has(k.toLowerCase())) out[k] = v;
    }
    return out;
  }
}
