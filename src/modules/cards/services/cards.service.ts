import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CardEntity } from '../entities/card.entity';
import { CardholderEntity } from '../entities/cardholder.entity';
import { ApplyCardDto } from '../dto/apply-card.dto';
import { ActivateCardDto } from '../dto/activate-card.dto';
import { SetPinDto } from '../dto/set-pin.dto';
import { CardStatus } from '../enums/card-status.enum';
import { CardType } from '../enums/card-type.enum';
import { CardholderStatus } from '../enums/holder-status.enum';
import { CardStatusMapper } from '../mappers/card-status.mapper';
import { ApiResponse, ok } from '../dto/api-response';
import { WasabiApiService } from '../../wasabi-client/services/wasabi-api.service';
import { AuditService } from '../../audit/audit.service';
import { WasabiErrorCode } from '../../wasabi-client/enums/wasabi-error-code.enum';
import { WasabiException } from '../../wasabi-client/errors/wasabi.errors';
import { SubscriptionLimitsService } from '../../subscriptions/services/subscription-limits.service';
import type { CardInfo } from '../../wasabi-client/interfaces/wasabi-api.types';

export interface CardDto {
  id: string;
  holderId: string;
  wasabiCardNo: string | null;
  merchantOrderNo: string;
  type: CardType;
  status: CardStatus;
  programId: string;
  createdAt: Date;
}

export interface CardDetailsDto extends CardDto {
  sensitive?: {
    cardNumber: string;
    cvv: string;
    expireDate: string;
    holderName: string;
  };
}

export interface BalanceDto {
  balance: string;
  currency: string;
}

function toDto(e: CardEntity): CardDto {
  return {
    id: e.id,
    holderId: e.holderId,
    wasabiCardNo: e.wasabiCardNo,
    merchantOrderNo: e.merchantOrderNo,
    type: e.type,
    status: e.status,
    programId: e.programId,
    createdAt: e.createdAt,
  };
}

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    @InjectRepository(CardEntity)
    private readonly cardRepo: Repository<CardEntity>,
    @InjectRepository(CardholderEntity)
    private readonly holderRepo: Repository<CardholderEntity>,
    private readonly wasabiApi: WasabiApiService,
    private readonly auditService: AuditService,
    private readonly limitsService: SubscriptionLimitsService,
  ) {}

  async applyCard(
    userId: string,
    dto: ApplyCardDto,
  ): Promise<ApiResponse<CardDto>> {
    await this.limitsService.checkCardLimit(userId, dto.cardType);

    const holder = await this.holderRepo.findOne({
      where: { id: dto.holderId, userId },
    });
    if (!holder) throw new NotFoundException('Cardholder not found');

    if (holder.status !== CardholderStatus.Approved) {
      throw new BadRequestException({
        errorCode: WasabiErrorCode.HolderNotApproved,
        message: 'Holder must be approved before a card can be issued',
        holderStatus: holder.status,
      });
    }

    const existing = await this.cardRepo.findOne({
      where: {
        holderId: dto.holderId,
        type: dto.cardType,
        status: CardStatus.Active,
      },
    });
    if (existing) {
      throw new ConflictException(
        `An active ${dto.cardType} card already exists for this holder`,
      );
    }

    const merchantOrderNo = randomUUID();

    let wasabiResult: CardInfo;
    try {
      wasabiResult = await this.wasabiApi.openCard({
        programId: dto.programId,
        holderId: holder.wasabiHolderId ?? '',
        cardType: dto.cardType,
        currency: 'USD',
      });
    } catch (err) {
      if (
        err instanceof WasabiException &&
        err.errorCode === WasabiErrorCode.CardRejected
      ) {
        throw new BadRequestException({
          errorCode: WasabiErrorCode.CardRejected,
          message: 'Card was rejected by provider',
        });
      }
      throw err;
    }

    const status = CardStatusMapper.fromWasabi(wasabiResult.status);
    const card = await this.cardRepo.save(
      this.cardRepo.create({
        userId,
        holderId: dto.holderId,
        wasabiCardNo: wasabiResult.cardId,
        wasabiOrderNo: wasabiResult.cardId,
        merchantOrderNo,
        type: dto.cardType,
        status,
        programId: dto.programId,
      }),
    );

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: 'card.apply',
      entityType: 'card',
      entityId: card.id,
    });

    return ok(toDto(card));
  }

  async activateCard(
    userId: string,
    cardId: string,
    dto: ActivateCardDto,
  ): Promise<ApiResponse<CardDto>> {
    const card = await this.findOwnCard(userId, cardId);

    if (card.status === CardStatus.Active) {
      throw new ConflictException('Card is already active');
    }
    if (card.status !== CardStatus.Pending) {
      throw new BadRequestException(
        `Cannot activate card in status: ${card.status}`,
      );
    }

    const result = await this.wasabiApi.activatePhysicalCard({
      cardId: card.wasabiCardNo ?? cardId,
      last4: dto.activationCode,
    });

    card.status = CardStatusMapper.fromWasabi(result.status);
    await this.cardRepo.save(card);
  
    await this.wasabiApi.setPin({
      cardId: card.wasabiCardNo ?? cardId,
      pin: dto.pin,
    });

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: 'card.activate',
      entityType: 'card',
      entityId: card.id,
    });

    return ok(toDto(card));
  }

  async getDetails(
    userId: string,
    cardId: string,
    includeSensitive: boolean,
  ): Promise<ApiResponse<CardDetailsDto>> {
    const card = await this.findOwnCard(userId, cardId);
    const base = toDto(card);

    if (!includeSensitive) {
      return ok(base);
    }

    const sensitive = await this.wasabiApi.getCardSensitiveDetails({
      cardId: card.wasabiCardNo ?? cardId,
    });

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: 'card.sensitive_details_requested',
      entityType: 'card',
      entityId: card.id,
    });

    return ok({
      ...base,
      sensitive: {
        cardNumber: sensitive.cardNumber,
        cvv: sensitive.cvv,
        expireDate: sensitive.expireDate,
        holderName: sensitive.holderName,
      },
    });
  }

  async getBalance(
    userId: string,
    cardId: string,
  ): Promise<ApiResponse<BalanceDto>> {
    const card = await this.findOwnCard(userId, cardId);

    if (CardStatusMapper.isClosed(card.status)) {
      throw new BadRequestException(
        `Cannot check balance for card in status: ${card.status}`,
      );
    }

    const info = await this.wasabiApi.getCardInfo({
      cardId: card.wasabiCardNo ?? cardId,
    });

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: 'card.balance_checked',
      entityType: 'card',
      entityId: card.id,
    });

    return ok({ balance: info.balance, currency: info.currency });
  }

  async freeze(userId: string, cardId: string): Promise<ApiResponse<CardDto>> {
    return this.changeCardStatus(userId, cardId, 'freeze', [CardStatus.Active]);
  }

  async unfreeze(
    userId: string,
    cardId: string,
  ): Promise<ApiResponse<CardDto>> {
    return this.changeCardStatus(userId, cardId, 'unfreeze', [
      CardStatus.Frozen,
    ]);
  }

  async lock(userId: string, cardId: string): Promise<ApiResponse<CardDto>> {
    return this.changeCardStatus(userId, cardId, 'lock', [
      CardStatus.Active,
      CardStatus.Frozen,
    ]);
  }

  async unlock(userId: string, cardId: string): Promise<ApiResponse<CardDto>> {
    return this.changeCardStatus(userId, cardId, 'unlock', [CardStatus.Locked]);
  }

  async setPin(userId: string, cardId: string, dto: SetPinDto): Promise<void> {
    const card = await this.findOwnCard(userId, cardId);
    if (!CardStatusMapper.isActive(card.status)) {
      throw new BadRequestException(
        `Cannot set PIN for card in status: ${card.status}`,
      );
    }

    await this.wasabiApi.setPin({
      cardId: card.wasabiCardNo ?? cardId,
      pin: dto.pin,
    });

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: 'card.pin_set',
      entityType: 'card',
      entityId: card.id,
    });
  }

  async findOwnCard(userId: string, cardId: string): Promise<CardEntity> {
    const card = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Card not found');
    if (card.userId !== userId) throw new ForbiddenException('Access denied');
    return card;
  }

  private async changeCardStatus(
    userId: string,
    cardId: string,
    action: 'freeze' | 'unfreeze' | 'lock' | 'unlock',
    allowedStatuses: CardStatus[],
  ): Promise<ApiResponse<CardDto>> {
    const card = await this.findOwnCard(userId, cardId);

    if (!allowedStatuses.includes(card.status)) {
      throw new BadRequestException({
        message: `Cannot ${action} card in current status`,
        currentStatus: card.status,
        allowedStatuses,
      });
    }

    const result =
      action === 'freeze' || action === 'lock'
        ? await this.wasabiApi.freezeCard({
            cardId: card.wasabiCardNo ?? cardId,
          })
        : await this.wasabiApi.unfreezeCard({
            cardId: card.wasabiCardNo ?? cardId,
          });

    card.status = CardStatusMapper.fromWasabi(result.status);

    if (action === 'lock') card.status = CardStatus.Locked;
    if (action === 'unlock') card.status = CardStatus.Active;

    await this.cardRepo.save(card);

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: `card.${action}`,
      entityType: 'card',
      entityId: card.id,
    });

    return ok(toDto(card));
  }
}
