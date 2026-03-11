import type { SchemaPrerequisiteCheckResult } from '../common/postgres.service';
import type { PostgresService } from '../common/postgres.service';
import type { IntegrationLegacyTransport } from './integration-legacy.transport';
import { IntegrationLegacyService } from './integration-legacy.service';

describe('IntegrationLegacyService bootstrap', () => {
  const query = jest.fn();
  const assertSchemaPrerequisites = jest.fn<Promise<SchemaPrerequisiteCheckResult>, [unknown]>();
  const postgresService = { query, assertSchemaPrerequisites } as unknown as PostgresService;
  const transport = { send: jest.fn() } as unknown as IntegrationLegacyTransport;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval');
    assertSchemaPrerequisites.mockReset();
    assertSchemaPrerequisites.mockResolvedValue({
      missingRelations: [],
      missingColumns: [],
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.useRealTimers();
    delete process.env.INTEGRATION_LEGACY_DISPATCH_INTERVAL_MS;
  });

  it('ne lance aucun timer quand le schéma critique est incomplet', async () => {
    const service = new IntegrationLegacyService(postgresService, transport);
    assertSchemaPrerequisites.mockResolvedValue({
      missingRelations: ['public.integration_async_events'],
      missingColumns: [],
    });

    await expect(service.onModuleInit()).rejects.toThrow(
      'Integration schema prerequisites missing: public.integration_async_events. Apply integration schema migrations before starting the backend.'
    );

    expect(setInterval).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('programme un unique timer quand le schéma critique est complet', async () => {
    const service = new IntegrationLegacyService(postgresService, transport);
    process.env.INTEGRATION_LEGACY_DISPATCH_INTERVAL_MS = '2500';

    await service.onModuleInit();

    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 2500);
    expect(jest.getTimerCount()).toBe(1);

    service.onModuleDestroy();
    expect(jest.getTimerCount()).toBe(0);
  });
});
