import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WasabiWebhookEntity } from '../entities/wasabi-webhook.entity';
import { WebhookStatus } from '../enums/webhook-status.enum';
import type { WebhookJobData } from '../dto/webhook-job.dto';


@Injectable()
export class WebhookQueueService {
  private readonly logger = new Logger(WebhookQueueService.name);
  private readonly maxConcurrency = 5;
  private activeJobs = 0;

  private processorRef: {
    processJob(data: WebhookJobData): Promise<void>;
  } | null = null;

  constructor(
    @InjectRepository(WasabiWebhookEntity)
    private readonly webhookRepo: Repository<WasabiWebhookEntity>,
  ) {}

  setProcessor(processor: {
    processJob(data: WebhookJobData): Promise<void>;
  }): void {
    this.processorRef = processor;
  }

  enqueue(data: WebhookJobData): void {
    setImmediate(() => {
      void this.runJob(data);
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async recoverStuck(): Promise<void> {
    const staleThreshold = new Date(Date.now() - 2 * 60 * 1000);
    const stuck = await this.webhookRepo.find({
      where: [
        { status: WebhookStatus.Queued, createdAt: LessThan(staleThreshold) },
        {
          status: WebhookStatus.Processing,
          createdAt: LessThan(staleThreshold),
        },
      ],
      take: 20,
    });

    if (stuck.length > 0) {
      this.logger.warn(`Recovering ${stuck.length} stuck webhooks`);
    }

    for (const wh of stuck) {
      this.enqueue({
        webhookId: wh.id,
        requestId: wh.requestId,
        category: wh.category,
        payload: wh.payloadJson,
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.webhookRepo.delete({
      status: In([WebhookStatus.Processed, WebhookStatus.Duplicate]),
      createdAt: LessThan(cutoff),
    });
    if ((result.affected ?? 0) > 0) {
      this.logger.log(`Cleaned up ${result.affected ?? 0} old webhook records`);
    }
  }

  private async runJob(data: WebhookJobData): Promise<void> {
    if (!this.processorRef) {
      this.logger.error('Processor not registered in WebhookQueueService');
      return;
    }

    if (this.activeJobs >= this.maxConcurrency) {
      setTimeout(() => void this.runJob(data), 1000);
      return;
    }

    this.activeJobs++;
    try {
      await this.processorRef.processJob(data);
    } catch (err) {
      this.logger.error(`Job failed for webhook ${data.webhookId}`, err);
    } finally {
      this.activeJobs--;
    }
  }
}
