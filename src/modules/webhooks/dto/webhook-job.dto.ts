export interface WebhookJobData {
  webhookId: string;
  requestId: string;
  category: string;
  payload: Record<string, unknown>;
}
