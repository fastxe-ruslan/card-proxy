import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { privateDecrypt, constants } from 'crypto';
import { CardEntity } from '../../cards/entities/card.entity';
import { AuditService } from '../../audit/audit.service';
import type { WebhookHandler } from '../services/webhook-processor.service';
import type { WasabiCard3dsEvent } from '../../wasabi-client/interfaces/wasabi-webhook.types';

@Injectable()
export class Card3dsHandler implements WebhookHandler {
  private readonly logger = new Logger(Card3dsHandler.name);

  constructor(
    @InjectRepository(CardEntity)
    private readonly cardRepo: Repository<CardEntity>,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    const data = payload as unknown as WasabiCard3dsEvent;

    const card = await this.cardRepo.findOne({
      where: { wasabiCardNo: data.cardNo },
    });
    if (!card) {
      this.logger.warn(
        `card_3ds: card not found (cardNo=${data.cardNo}) — ACK`,
      );
      return;
    }
    
    const expiredAt = data.expirationTime
      ? new Date(data.expirationTime)
      : null;
    if (expiredAt && expiredAt < new Date()) {
      this.logger.warn(
        `card_3ds: event expired at ${expiredAt.toISOString()} for card ${card.id} — discarding`,
      );
      return;
    }

    let decryptedValue: string | null = null;
    if (data.values) {
      decryptedValue = this.decryptValues(data.values);
    }

    if (!decryptedValue) {
      this.logger.warn(
        `card_3ds: failed to decrypt values for tradeNo=${data.tradeNo}`,
      );
    }

    if (decryptedValue) {
      this.deliverToUser(card.userId, data.type, decryptedValue, expiredAt);
    }

    this.auditService.log({
      action: 'webhook.3ds',
      entityType: 'card',
      entityId: card.id,
      metadata: {
        type: data.type,
        tradeNo: data.tradeNo,
        expirationTime: data.expirationTime,
        delivered: !!decryptedValue,
      },
    });
  }

  private decryptValues(encryptedBase64: string): string | null {
    const privateKeyPem = this.configService.get<string>('WASABI_PRIVATE_KEY');
    if (!privateKeyPem) {
      this.logger.warn(
        'WASABI_PRIVATE_KEY not configured — cannot decrypt 3DS values',
      );
      return null;
    }
    try {
      const buf = Buffer.from(encryptedBase64, 'base64');
      const decrypted = privateDecrypt(
        { key: privateKeyPem, padding: constants.RSA_PKCS1_PADDING },
        buf,
      );
      return decrypted.toString('utf8');
    } catch (err) {
      this.logger.error('3DS RSA decryption failed', err);
      return null;
    }
  }


  private deliverToUser(
    userId: string,
    type: string,
    value: string,
    expiresAt: Date | null,
  ): void {
    this.logger.log(
      `[3DS DELIVERY] userId=${userId} type=${type} expires=${expiresAt?.toISOString() ?? 'n/a'} ` +
        `(value redacted — integrate with NotificationService)`,
    );
    void value;
  }
}
