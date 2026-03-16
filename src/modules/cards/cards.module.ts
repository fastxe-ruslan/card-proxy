import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardholderEntity } from './entities/cardholder.entity';
import { CardEntity } from './entities/card.entity';
import { CardTransactionEntity } from './entities/card-transaction.entity';
import { CardHoldersService } from './services/card-holders.service';
import { CardsService } from './services/cards.service';
import { CardTransactionsService } from './services/card-transactions.service';
import { CardDocumentsService } from './services/card-documents.service';
import { CardHoldersController } from './controllers/card-holders.controller';
import { CardsController } from './controllers/cards.controller';
import { ProviderController } from './controllers/provider.controller';
import { WasabiClientModule } from '../wasabi-client/wasabi-client.module';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CardholderEntity,
      CardEntity,
      CardTransactionEntity,
    ]),
    WasabiClientModule,
    AuditModule,
    SubscriptionsModule,
  ],
  providers: [
    CardHoldersService,
    CardsService,
    CardTransactionsService,
    CardDocumentsService,
  ],
  controllers: [CardHoldersController, CardsController, ProviderController],
  exports: [CardsService, CardHoldersService, TypeOrmModule],
})
export class CardsModule {}
