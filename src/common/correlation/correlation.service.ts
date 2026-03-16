import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

interface CorrelationStore {
  correlationId: string;
}

const storage = new AsyncLocalStorage<CorrelationStore>();

@Injectable()
export class CorrelationService {
  get(): string {
    return storage.getStore()?.correlationId ?? randomUUID();
  }

  run<T>(correlationId: string, fn: () => T): T {
    return storage.run({ correlationId }, fn);
  }
}
