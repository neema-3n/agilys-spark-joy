export function applyTestEnv(): void {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret';
  process.env.JWT_ACCESS_TTL_SECONDS = process.env.JWT_ACCESS_TTL_SECONDS ?? '900';
  process.env.JWT_REFRESH_TTL_SECONDS = process.env.JWT_REFRESH_TTL_SECONDS ?? '604800';
  process.env.AUTH_TEST_USER_EMAIL = process.env.AUTH_TEST_USER_EMAIL ?? 'user@agilys.local';
  process.env.AUTH_TEST_USER_PASSWORD = process.env.AUTH_TEST_USER_PASSWORD ?? 'ChangeMe123!';
}
