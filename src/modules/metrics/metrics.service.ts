import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status'],
    registers: [this.registry],
  });

  readonly httpRequestDurationMs = new Histogram({
    name: 'http_request_duration_ms',
    help: 'HTTP request duration in milliseconds',
    labelNames: ['method', 'path'],
    buckets: [50, 100, 250, 500, 1000, 2000, 5000],
    registers: [this.registry],
  });

  readonly wasabiApiCallsTotal = new Counter({
    name: 'wasabi_api_calls_total',
    help: 'Total Wasabi API calls',
    labelNames: ['operation', 'success'],
    registers: [this.registry],
  });

  readonly wasabiApiDurationMs = new Histogram({
    name: 'wasabi_api_duration_ms',
    help: 'Wasabi API call duration in milliseconds',
    labelNames: ['operation'],
    buckets: [100, 500, 1000, 2000, 5000, 10000],
    registers: [this.registry],
  });

  readonly webhooksReceivedTotal = new Counter({
    name: 'webhooks_received_total',
    help: 'Total webhooks received',
    labelNames: ['category'],
    registers: [this.registry],
  });

  readonly webhooksProcessedTotal = new Counter({
    name: 'webhooks_processed_total',
    help: 'Total webhooks processed',
    labelNames: ['category', 'status'],
    registers: [this.registry],
  });

  readonly webhooksQueueDepth = new Gauge({
    name: 'webhooks_queue_depth',
    help: 'Current in-process webhook queue depth',
    registers: [this.registry],
  });

  readonly webhooksDlqDepth = new Gauge({
    name: 'webhooks_dlq_depth',
    help: 'Number of failed webhooks in DLQ (status=failed)',
    registers: [this.registry],
  });

  readonly auditLogsWrittenTotal = new Counter({
    name: 'audit_logs_written_total',
    help: 'Total audit log entries written',
    registers: [this.registry],
  });

  readonly dbQueryDurationMs = new Histogram({
    name: 'db_query_duration_ms',
    help: 'Database query duration in milliseconds',
    labelNames: ['operation'],
    buckets: [5, 10, 25, 50, 100, 250, 500],
    registers: [this.registry],
  });

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
  }
}
