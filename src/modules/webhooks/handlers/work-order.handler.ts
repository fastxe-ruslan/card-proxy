import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import type { WebhookHandler } from '../services/webhook-processor.service';
import type { WasabiWorkOrderEvent } from '../../wasabi-client/interfaces/wasabi-webhook.types';

@Injectable()
export class WorkOrderHandler implements WebhookHandler {
  private readonly logger = new Logger(WorkOrderHandler.name);

  constructor(private readonly auditService: AuditService) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async handle(payload: Record<string, unknown>): Promise<void> {
    const data = payload as unknown as WasabiWorkOrderEvent;

    if (data.tradeStatus === 'fail') {
      this.logger.warn(
        `work_order FAILED: orderNo=${data.orderNo} type=${data.tradeType} — ${data.description ?? 'no description'}`,
      );
      // TODO: notify relevant parties via NotificationService
    } else if (data.tradeStatus === 'success') {
      this.logger.log(
        `work_order SUCCESS: orderNo=${data.orderNo} type=${data.tradeType}`,
      );
    } else {
      this.logger.debug(
        `work_order ${data.tradeStatus}: orderNo=${data.orderNo} type=${data.tradeType}`,
      );
    }

    this.auditService.log({
      action: 'webhook.work_order',
      entityType: 'work_order',
      entityId: data.orderNo,
      metadata: {
        merchantOrderNo: data.merchantOrderNo,
        tradeType: data.tradeType,
        tradeStatus: data.tradeStatus,
        description: data.description,
      },
    });
  }
}
