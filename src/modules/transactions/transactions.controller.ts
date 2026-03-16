import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ROUTES } from 'src/common/constants/routes';
import {
  ApiTransactionsTag,
  ApiListLocalTransactions,
  ApiSyncTransactions,
} from './docs/transactions.controller.docs';

@ApiTransactionsTag()
@Controller(ROUTES.TRANSACTIONS.BASE)
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiListLocalTransactions()
  @Get(ROUTES.TRANSACTIONS.LIST)
  listLocal() {
    return this.transactionsService.listLocal();
  }

  @ApiSyncTransactions()
  @Post(ROUTES.TRANSACTIONS.SYNC)
  sync(@Query('cardId') cardId?: string) {
    return this.transactionsService.syncFromWasabi(cardId);
  }
}
