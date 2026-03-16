import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CardTransactionEntity } from '../entities/card-transaction.entity';
import { TopupCardDto } from '../dto/topup-card.dto';
import { GetTransactionsQueryDto } from '../dto/get-transactions-query.dto';
import {
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../enums/transaction.enums';
import { CardStatusMapper } from '../mappers/card-status.mapper';
import { ApiResponse, ok, paginated } from '../dto/api-response';
import { WasabiApiService } from '../../wasabi-client/services/wasabi-api.service';
import { AuditService } from '../../audit/audit.service';
import { CardsService } from './cards.service';
import { SubscriptionLimitsService } from '../../subscriptions/services/subscription-limits.service';
import type { AuthTransaction } from '../../wasabi-client/interfaces/wasabi-api.types';

export interface TransactionDto {
  id: string;
  wasabiTxnId: string;
  merchantName: string | null;
  amount: string;
  currency: string;
  direction: TransactionDirection;
  status: TransactionStatus;
  transactionType: TransactionType;
  occurredAt: Date | null;
  createdAt: Date;
}

const SAFE_RAW_FIELDS = new Set([
  'transactionId',
  'cardId',
  'amount',
  'currency',
  'merchantName',
  'merchantCategory',
  'status',
  'transactionType',
  'createdAt',
  'authCode',
]);

function sanitizeRaw(tx: AuthTransaction): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(tx)) {
    if (SAFE_RAW_FIELDS.has(k)) result[k] = v;
  }
  return result;
}

function toDto(e: CardTransactionEntity): TransactionDto {
  return {
    id: e.id,
    wasabiTxnId: e.wasabiTxnId,
    merchantName: e.merchantName,
    amount: e.amount,
    currency: e.currency,
    direction: e.direction,
    status: e.status,
    transactionType: e.transactionType,
    occurredAt: e.occurredAt,
    createdAt: e.createdAt,
  };
}

@Injectable()
export class CardTransactionsService {
  constructor(
    @InjectRepository(CardTransactionEntity)
    private readonly txRepo: Repository<CardTransactionEntity>,
    private readonly cardsService: CardsService,
    private readonly wasabiApi: WasabiApiService,
    private readonly auditService: AuditService,
    private readonly limitsService: SubscriptionLimitsService,
  ) {}

  async topUp(
    userId: string,
    cardId: string,
    dto: TopupCardDto,
  ): Promise<ApiResponse<TransactionDto>> {
    const card = await this.cardsService.findOwnCard(userId, cardId);

    if (!CardStatusMapper.isActive(card.status)) {
      throw new BadRequestException(
        `Cannot top up card in status: ${card.status}`,
      );
    }

    const amount = Math.floor(dto.amount * 100) / 100;
    if (amount <= 0)
      throw new BadRequestException('Amount must be greater than 0');

    await this.limitsService.checkTopupLimit(userId, amount);

    const currency = dto.currency ?? 'USD';
    const merchantOrderNo = randomUUID();

    const result = await this.wasabiApi.depositToCard(
      {
        cardId: card.wasabiCardNo ?? cardId,
        amount: amount.toFixed(2),
        currency,
        remark: merchantOrderNo,
      },
      { programId: card.programId },
    );

    const tx = await this.txRepo.save(
      this.txRepo.create({
        cardId: card.id,
        wasabiTxnId: result.orderId,
        amount: amount.toFixed(2),
        currency,
        direction: TransactionDirection.Credit,
        status: TransactionStatus.Pending,
        transactionType: TransactionType.Settlement,
        rawPayload: {
          orderId: result.orderId,
          amount: result.amount,
          currency: result.currency,
          status: result.status,
        },
      }),
    );

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: 'card.topup',
      entityType: 'card',
      entityId: card.id,
      metadata: { amount: amount.toFixed(2), currency },
    });

    return ok(toDto(tx));
  }

  async getTransactions(
    userId: string,
    cardId: string,
    query: GetTransactionsQueryDto,
  ): Promise<ApiResponse<TransactionDto[]>> {
    const card = await this.cardsService.findOwnCard(userId, cardId);

    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);

    const endDate = query.endDate ?? new Date().toISOString().slice(0, 10);
    const startDate =
      query.startDate ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

    const wasabiResult = await this.wasabiApi.getAuthTransactions(
      {
        cardId: card.wasabiCardNo ?? cardId,
        startDate,
        endDate,
        pageNum: page,
        pageSize,
      },
      { programId: card.programId },
    );

    for (const tx of wasabiResult.records) {
      await this.txRepo.upsert(
        {
          cardId: card.id,
          wasabiTxnId: tx.transactionId,
          merchantName: tx.merchantName ?? null,
          amount: tx.amount,
          currency: tx.currency,
          direction: TransactionDirection.Debit,
          status: this.mapTxStatus(tx.status),
          transactionType: TransactionType.Auth,
          occurredAt: tx.createdAt ? new Date(tx.createdAt) : null,
          rawPayload: sanitizeRaw(tx) as unknown as null,
        },
        ['wasabiTxnId'],
      );
    }

    const [local, total] = await this.txRepo.findAndCount({
      where: { cardId: card.id },
      order: { occurredAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return paginated(local.map(toDto), total, page, pageSize);
  }

  private mapTxStatus(raw: string): TransactionStatus {
    const map: Record<string, TransactionStatus> = {
      completed: TransactionStatus.Completed,
      success: TransactionStatus.Completed,
      failed: TransactionStatus.Failed,
      reversed: TransactionStatus.Reversed,
    };
    return map[raw?.toLowerCase()] ?? TransactionStatus.Pending;
  }
}
