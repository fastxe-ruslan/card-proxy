import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const { apiReference } = await new Function(
    'return import("@scalar/nestjs-api-reference")',
  )();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  app.enableCors();
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  const openApiConfig = new DocumentBuilder()
    .setTitle('Card Proxy API')
    .setDescription('Proxy backend for Wasabi Card integration')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use('/docs', apiReference({ spec: { content: openApiDocument } }));

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
