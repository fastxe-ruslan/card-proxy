import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { WasabiClientModule } from '../wasabi-client/wasabi-client.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]),
    WasabiClientModule,
    AuthModule,
  ],
  providers: [TransactionsService],
  controllers: [TransactionsController],
  exports: [TypeOrmModule, TransactionsService],
})
export class TransactionsModule {}
