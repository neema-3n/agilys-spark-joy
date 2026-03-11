import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyResolvedAppEnv, resolveBackendRuntimeEnv } from './config/runtime-env';

const applyRuntimeEnvDefaults = (): void => {
  const appEnv = applyResolvedAppEnv();
  if (appEnv !== 'development') {
    return;
  }

  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';
};

const isAllowedLocalOrigin = (origin: string): boolean => {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
};

const isAllowedLanOrigin = (origin: string): boolean => {
  return /^https?:\/\/((10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(192\.168\.\d{1,3}\.\d{1,3})|(172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}))(:\d+)?$/i.test(
    origin
  );
};

async function bootstrap(): Promise<void> {
  applyRuntimeEnvDefaults();
  const runtimeEnv = resolveBackendRuntimeEnv();

  const app = await NestFactory.create(AppModule);

  const explicitOrigins = runtimeEnv.corsOrigins;
  const allowLanInDev = runtimeEnv.isDevelopment;
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        explicitOrigins.includes(origin) ||
        isAllowedLocalOrigin(origin) ||
        (allowLanInDev && isAllowedLanOrigin(origin))
      ) {
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

  await app.listen(runtimeEnv.port);
}

void bootstrap();
