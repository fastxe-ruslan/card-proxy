export interface PlanFeatures {
  maxCards: number;
  topupLimitPerMonth: number;
  topupLimitPerTransaction: number;
  allowedCardTypes: ('virtual' | 'physical')[];
  allowedPrograms: string[];
  kycRequired: boolean;
}
