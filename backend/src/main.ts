import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const parseCorsOrigins = (): string[] => {
  const rawOrigins = process.env.CORS_ORIGINS;
  if (!rawOrigins) {
    return [];
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

const isAllowedLocalOrigin = (origin: string): boolean => {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const explicitOrigins = parseCorsOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (explicitOrigins.includes(origin) || isAllowedLocalOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    }
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
