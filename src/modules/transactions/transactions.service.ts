import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { WasabiApiService } from '../wasabi-client/services/wasabi-api.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    private readonly wasabiApi: WasabiApiService,
  ) {}

  listLocal() {
    return this.transactionRepository.find({ order: { postedAt: 'DESC' } });
  }

  async syncFromWasabi(cardId?: string): Promise<TransactionEntity[]> {
    const response = await this.wasabiApi.getAuthTransactions({
      cardId,
      pageNum: 1,
      pageSize: 100,
    });

    for (const tx of response.records) {
      await this.transactionRepository.upsert(
        {
          externalTransactionId: tx.transactionId,
          externalCardId: tx.cardId,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          description: tx.merchantName ?? null,
          postedAt: tx.createdAt ? new Date(tx.createdAt) : null,
        },
        ['externalTransactionId'],
      );
    }

    return this.listLocal();
  }
}
