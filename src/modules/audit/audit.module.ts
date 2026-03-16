import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { WebhookEventEntity } from './entities/webhook-event.entity';
import { AuditService } from './audit.service';
import { AuditAdminController } from './controllers/audit-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity, WebhookEventEntity])],
  providers: [AuditService],
  controllers: [AuditAdminController],
  exports: [AuditService, TypeOrmModule],
})
export class AuditModule {}
