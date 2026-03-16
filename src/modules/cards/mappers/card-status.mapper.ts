import { Logger } from '@nestjs/common';
import { CardStatus } from '../enums/card-status.enum';

const logger = new Logger('CardStatusMapper');

const WASABI_TO_INTERNAL: Record<string, CardStatus> = {
  active: CardStatus.Active,
  normal: CardStatus.Active,
  pending: CardStatus.Pending,
  freeze: CardStatus.Frozen,
  frozen: CardStatus.Frozen,
  freezing: CardStatus.Frozen,
  lock: CardStatus.Locked,
  locked: CardStatus.Locked,
  suspend: CardStatus.Suspended,
  suspended: CardStatus.Suspended,
  close: CardStatus.Closed,
  closed: CardStatus.Closed,
  cancelled: CardStatus.Closed,
  lost: CardStatus.Lost,
  reject: CardStatus.Closed,
};

export class CardStatusMapper {
  static fromWasabi(raw: string): CardStatus {
    const mapped = WASABI_TO_INTERNAL[raw?.toLowerCase()];
    if (!mapped) {
      logger.warn(`Unknown Wasabi card status: "${raw}" — mapping to Unknown`);
      return CardStatus.Unknown;
    }
    return mapped;
  }

  static isActive(status: CardStatus): boolean {
    return status === CardStatus.Active;
  }

  static isClosed(status: CardStatus): boolean {
    return status === CardStatus.Closed || status === CardStatus.Suspended;
  }
}
