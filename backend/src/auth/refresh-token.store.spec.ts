import { RefreshTokenStore } from './refresh-token.store';
import type { PostgresService } from '../common/postgres.service';

type PostgresQueryMock = jest.Mock<Promise<{ rows: unknown[]; rowCount?: number }>, [string, unknown[]?]>;

const createStore = (queryMock: PostgresQueryMock): RefreshTokenStore => {
  const postgresService = {
    query: queryMock
  } as unknown as PostgresService;

  return new RefreshTokenStore(postgresService);
};

describe('RefreshTokenStore (postgres)', () => {
  const originalStorageMode = process.env.AUTH_STORAGE_MODE;

  beforeEach(() => {
    process.env.AUTH_STORAGE_MODE = 'postgres';
  });

  afterEach(() => {
    if (originalStorageMode === undefined) {
      delete process.env.AUTH_STORAGE_MODE;
      return;
    }

    process.env.AUTH_STORAGE_MODE = originalStorageMode;
  });

  it('saves token hash in postgres', async () => {
    const queryMock: PostgresQueryMock = jest.fn().mockResolvedValue({ rows: [] });
    const store = createStore(queryMock);

    await store.save({
      jti: 'jti-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      tokenHash: 'hashed-token',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      revokedAt: null
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('INSERT INTO public.auth_refresh_tokens');
    expect(queryMock.mock.calls[0][1]).toEqual([
      'jti-1',
      'user-1',
      'tenant-1',
      'hashed-token',
      new Date('2030-01-01T00:00:00.000Z'),
      null
    ]);
  });

  it('loads token by jti and maps persisted fields', async () => {
    const queryMock: PostgresQueryMock = jest.fn().mockResolvedValue({
      rows: [
        {
          jti: 'jti-1',
          user_id: 'user-1',
          tenant_id: 'tenant-1',
          token_hash: 'hashed-token',
          expires_at: new Date('2030-01-01T00:00:00.000Z'),
          revoked_at: null
        }
      ]
    });
    const store = createStore(queryMock);

    const token = await store.findByJti('jti-1');

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('SELECT jti, user_id, tenant_id, token_hash, expires_at, revoked_at');
    expect(token).toEqual({
      jti: 'jti-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      tokenHash: 'hashed-token',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      revokedAt: null
    });
  });

  it('revokes active token by jti', async () => {
    const queryMock: PostgresQueryMock = jest.fn().mockResolvedValue({ rows: [] });
    const store = createStore(queryMock);

    await store.revoke('jti-1');

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('UPDATE public.auth_refresh_tokens');
    expect(queryMock.mock.calls[0][1]).toEqual(['jti-1']);
  });

  it('throws an actionable error when migration is missing', async () => {
    const queryMock: PostgresQueryMock = jest
      .fn()
      .mockRejectedValue({ code: '42P01', message: 'relation does not exist' });
    const store = createStore(queryMock);

    await expect(
      store.save({
        jti: 'jti-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        tokenHash: 'hashed-token',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        revokedAt: null
      })
    ).rejects.toThrow('Run `pnpm run db:migrate`');
  });

  it('atomically rotates token in postgres with revokeAndSave', async () => {
    const queryMock: PostgresQueryMock = jest.fn().mockResolvedValue({
      rows: [{ jti: 'jti-2' }],
      rowCount: 1
    });
    const store = createStore(queryMock);

    const rotated = await store.revokeAndSave('jti-1', {
      jti: 'jti-2',
      userId: 'user-1',
      tenantId: 'tenant-1',
      tokenHash: 'hashed-token-2',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      revokedAt: null
    });

    expect(rotated).toBe(true);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('WITH revoked AS');
    expect(queryMock.mock.calls[0][1]).toEqual([
      'jti-1',
      'jti-2',
      'user-1',
      'tenant-1',
      'hashed-token-2',
      new Date('2030-01-01T00:00:00.000Z'),
      null
    ]);
  });

  it('returns false when revokeAndSave cannot revoke previous token', async () => {
    const queryMock: PostgresQueryMock = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const store = createStore(queryMock);

    const rotated = await store.revokeAndSave('missing-jti', {
      jti: 'jti-2',
      userId: 'user-1',
      tenantId: 'tenant-1',
      tokenHash: 'hashed-token-2',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      revokedAt: null
    });

    expect(rotated).toBe(false);
  });
});
