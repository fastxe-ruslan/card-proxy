import { Logger } from '@nestjs/common';
import { CardholderStatus } from '../enums/holder-status.enum';

const logger = new Logger('HolderStatusMapper');

const WASABI_TO_INTERNAL: Record<string, CardholderStatus> = {
  wait_audit: CardholderStatus.WaitAudit,
  pass_audit: CardholderStatus.Approved,
  under_review: CardholderStatus.UnderReview,
  reject: CardholderStatus.Rejected,
  rejected: CardholderStatus.Rejected,
};

export class HolderStatusMapper {
  static fromWasabi(raw: string): CardholderStatus {
    const mapped = WASABI_TO_INTERNAL[raw?.toLowerCase()];
    if (!mapped) {
      logger.warn(
        `Unknown Wasabi holder status: "${raw}" — mapping to Unknown`,
      );
      return CardholderStatus.Unknown;
    }
    return mapped;
  }

  static isApproved(status: CardholderStatus): boolean {
    return status === CardholderStatus.Approved;
  }
}
