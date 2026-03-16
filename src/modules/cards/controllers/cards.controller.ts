import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CardsService } from '../services/cards.service';
import { CardTransactionsService } from '../services/card-transactions.service';
import { ApplyCardDto } from '../dto/apply-card.dto';
import { ActivateCardDto } from '../dto/activate-card.dto';
import { TopupCardDto } from '../dto/topup-card.dto';
import { SetPinDto } from '../dto/set-pin.dto';
import { GetTransactionsQueryDto } from '../dto/get-transactions-query.dto';
import {
  ApiCardsTag,
  ApiApplyCard,
  ApiActivateCard,
  ApiGetCardDetails,
  ApiGetCardBalance,
  ApiFreezeCard,
  ApiUnfreezeCard,
  ApiLockCard,
  ApiUnlockCard,
  ApiTopupCard,
  ApiGetCardTransactions,
  ApiSetPin,
} from '../docs/cards.controller.docs';

@ApiCardsTag()
@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(
    private readonly cardsService: CardsService,
    private readonly txService: CardTransactionsService,
  ) {}

  @ApiApplyCard()
  @Post('apply')
  applyCard(@CurrentUser('sub') userId: string, @Body() dto: ApplyCardDto) {
    return this.cardsService.applyCard(userId, dto);
  }

  @ApiActivateCard()
  @Post(':cardId/activate')
  activateCard(
    @CurrentUser('sub') userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() dto: ActivateCardDto,
  ) {
    return this.cardsService.activateCard(userId, cardId, dto);
  }

  @ApiGetCardDetails()
  @Get(':cardId/details')
  getDetails(
    @CurrentUser('sub') userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Query('includeSensitive', new ParseBoolPipe({ optional: true }))
    includeSensitive = false,
  ) {
    return this.cardsService.getDetails(userId, cardId, includeSensitive);
  }

  @ApiGetCardBalance()
  @Get(':cardId/balance')
  getBalance(
    @CurrentUser('sub') userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    return this.cardsService.getBalance(userId, cardId);
  }

  @ApiFreezeCard()
  @Post(':cardId/freeze')
  freeze(
    @CurrentUser('sub') userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    return this.cardsService.freeze(userId, cardId);
  }

  @ApiUnfreezeCard()
  @Post(':cardId/unfreeze')
  unfreeze(
    @CurrentUser('sub') userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    return this.cardsService.unfreeze(userId, cardId);
  }

  @ApiLockCard()
  @Post(':cardId/lock')
  lock(
    @CurrentUser('sub') userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    return this.cardsService.lock(userId, cardId);
  }

  @ApiUnlockCard()
  @Post(':cardId/unlock')
  unlock(
    @CurrentUser('sub') userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    return this.cardsService.unlock(userId, cardId);
  }

  @ApiTopupCard()
  @Post(':cardId/topup')
  topup(
    @CurrentUser('sub') userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() dto: TopupCardDto,
  ) {
    return this.txService.topUp(userId, cardId, dto);
  }

  @ApiGetCardTransactions()
  @Get(':cardId/transactions')
  getTransactions(
    @CurrentUser('sub') userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Query() query: GetTransactionsQueryDto,
  ) {
    return this.txService.getTransactions(userId, cardId, query);
  }

  @ApiSetPin()
  @Post(':cardId/pin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPin(
    @CurrentUser('sub') userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() dto: SetPinDto,
  ) {
    await this.cardsService.setPin(userId, cardId, dto);
  }
}
