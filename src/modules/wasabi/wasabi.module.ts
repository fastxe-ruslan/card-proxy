import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasabiClientModule } from '../wasabi-client/wasabi-client.module';
import { WasabiSyncService } from './wasabi.sync.service';
import { WebhookEventEntity } from '../audit/entities/webhook-event.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    WasabiClientModule,
    AuthModule,
    TypeOrmModule.forFeature([WebhookEventEntity, TransactionEntity]),
  ],
  providers: [WasabiSyncService],
  controllers: [],
  exports: [WasabiClientModule, WasabiSyncService],
})
export class WasabiModule {}
