import { isDevelopmentAppEnv, resolveAppEnv } from '@/config/runtime-env';

export interface DevLoginDefaults {
  email: string;
  password: string;
}

type PublicEnv = NodeJS.ProcessEnv;

export const resolveDevLoginDefaults = (env: PublicEnv = process.env): DevLoginDefaults | null => {
  const runtimeEnv = env === process.env
    ? {
        APP_ENV: process.env.APP_ENV,
        NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_DEV_LOGIN_EMAIL: process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL,
        NEXT_PUBLIC_DEV_LOGIN_PASSWORD: process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD,
      }
    : env;

  if (!isDevelopmentAppEnv(resolveAppEnv(runtimeEnv))) {
    return null;
  }

  const email = runtimeEnv.NEXT_PUBLIC_DEV_LOGIN_EMAIL?.trim() ?? '';
  const password = runtimeEnv.NEXT_PUBLIC_DEV_LOGIN_PASSWORD?.trim() ?? '';

  if (!email || !password) {
    return null;
  }

  return { email, password };
};
