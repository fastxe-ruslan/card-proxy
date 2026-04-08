import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './modules/auth/auth.module';
import { WasabiModule } from './modules/wasabi/wasabi.module';
import { CardsModule } from './modules/cards/cards.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AuditModule } from './modules/audit/audit.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { CorrelationModule } from './common/correlation/correlation.module';
import { CorrelationMiddleware } from './common/correlation/correlation.middleware';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(5432),
        DB_USERNAME: Joi.string().default('postgres'),
        DB_PASSWORD: Joi.string().default('postgres'),
        DB_NAME: Joi.string().default('card-proxy'),
        DB_SCHEMA: Joi.string().default('card_proxy'),
        JWT_ACCESS_SECRET: Joi.string().default('dev-access-secret'),
        JWT_REFRESH_SECRET: Joi.string().default('dev-refresh-secret'),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
        WASABI_API_BASE_URL: Joi.string()
          .uri()
          .default('https://api.wasabi.local'),
        WASABI_API_KEY: Joi.string().default('dev-api-key'),
        /** Merchant RSA private key PEM — signs outgoing API calls; Card3dsHandler also uses for decrypt. */
        WASABI_PRIVATE_KEY: Joi.string().allow('').default(''),
        WASABI_TIMEOUT_MS: Joi.number().default(10000),
        WASABI_MAX_RETRIES: Joi.number().default(3),
        /** Wasabi RSA public key for `X-WSB-SIGNATURE` on inbound webhooks. */
        WASABI_WEBHOOK_PUBLIC_KEY: Joi.string().optional().allow(''),
        SKIP_WEBHOOK_SIGNATURE_VERIFICATION: Joi.string()
          .valid('true', 'false')
          .default('false'),
        APP_URL: Joi.string().uri().default('http://localhost:3000/api/v1'),
        GOOGLE_CLIENT_ID: Joi.string().optional(),
        APPLE_APP_ID: Joi.string().optional(),
      }),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get<string>('NODE_ENV') !== 'production';
        return {
          pinoHttp: {
            autoLogging: false,
            level: isDev ? 'debug' : 'info',
            base: {
              service: 'wasabi-proxy',
              env: config.get<string>('NODE_ENV'),
            },
            transport: isDev
              ? {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: true },
                }
              : undefined,
            redact: {
              paths: ['req.headers.authorization', 'req.headers["x-api-key"]'],
              remove: true,
            },
          },
        };
      },
    }),
    CorrelationModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DB_HOST'),
        port: configService.getOrThrow<number>('DB_PORT'),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_NAME'),
        schema: configService.getOrThrow<string>('DB_SCHEMA'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    AuthModule,
    WasabiModule,
    CardsModule,
    TransactionsModule,
    SubscriptionsModule,
    AuditModule,
    WebhooksModule,
    MetricsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
