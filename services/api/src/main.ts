import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { UPLOAD_DIR } from './uploads/uploads.controller';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  // Serve uploaded images at /uploads/* (outside the /api global prefix).
  app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(`KANNI API listening on http://localhost:${port}/api`);
}

bootstrap();
