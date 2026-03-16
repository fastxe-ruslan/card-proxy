export enum TransactionDirection {
  Debit = 'debit',
  Credit = 'credit',
}

export enum TransactionType {
  Auth = 'auth',
  Settlement = 'settlement',
  Fee = 'fee',
  ThreeDS = '3ds',
}

export enum TransactionStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
  Reversed = 'reversed',
}
