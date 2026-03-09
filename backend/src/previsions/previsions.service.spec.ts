import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import { PrevisionsService } from './previsions.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['admin_client']
};

describe('PrevisionsService ecarts', () => {
  let service: PrevisionsService;
  let postgresService: jest.Mocked<Pick<PostgresService, 'query'>>;

  beforeEach(() => {
    postgresService = {
      query: jest.fn()
    };

    service = new PrevisionsService(postgresService as unknown as PostgresService);
  });

  it('retourne des ecarts consolides avec totaux', async () => {
    postgresService.query
      .mockResolvedValueOnce({ rows: [{ id: 'ex-1' }] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            periode: '2026',
            section_code: 'SEC-INV',
            programme_code: 'PRG-OPS',
            action_code: 'ACT-01',
            enveloppe_id: null,
            montant_prevu: '1000',
            montant_execute: '1250'
          }
        ]
      } as never);

    const result = await service.getEcartsPrevisionExecution(actor, {
      exerciceId: '2f0715a2-3860-4584-b8ca-df8bcd5b6f64',
      periode: '2026'
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      periode: '2026',
      montantPrevu: 1000,
      montantExecute: 1250,
      ecartMontant: 250
    });
    expect(result.totaux.nombreAxes).toBe(1);
    expect(result.totaux.montantPrevu).toBe(1000);
    expect(result.totaux.montantExecute).toBe(1250);
    expect(result.totaux.ecartMontant).toBe(250);
  });

  it('scope strictement la requete sur tenant + exercice pour eviter les lectures cross-tenant', async () => {
    postgresService.query
      .mockResolvedValueOnce({ rows: [{ id: 'ex-1' }] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            periode: '2026',
            section_code: 'SEC-OPS',
            programme_code: 'PRG-INV',
            action_code: 'ACT-1',
            enveloppe_id: 'env-1',
            montant_prevu: '100',
            montant_execute: '50'
          }
        ]
      } as never);

    await service.getEcartsPrevisionExecution(actor, {
      exerciceId: '2f0715a2-3860-4584-b8ca-df8bcd5b6f64'
    });

    expect(postgresService.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE id = $1'),
      ['2f0715a2-3860-4584-b8ca-df8bcd5b6f64', actor.tenantId]
    );
    expect(postgresService.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE lp.client_id = $1'),
      expect.arrayContaining([actor.tenantId, '2f0715a2-3860-4584-b8ca-df8bcd5b6f64'])
    );
  });

  it('applique les filtres metier dans la requete SQL', async () => {
    postgresService.query
      .mockResolvedValueOnce({ rows: [{ id: 'ex-1' }] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            periode: '2026',
            section_code: 'SEC-OPS',
            programme_code: 'PRG-INV',
            action_code: 'ACT-01',
            enveloppe_id: '8f36cbf4-9658-49e5-a311-731f1764892a',
            montant_prevu: '900',
            montant_execute: '1000'
          }
        ]
      } as never);

    await service.getEcartsPrevisionExecution(actor, {
      exerciceId: '2f0715a2-3860-4584-b8ca-df8bcd5b6f64',
      periode: '2026',
      sectionCode: 'SEC-OPS',
      programmeCode: 'PRG-INV',
      actionCode: 'ACT-01',
      enveloppeId: '8f36cbf4-9658-49e5-a311-731f1764892a'
    });

    const secondCall = postgresService.query.mock.calls[1];
    const sql = String(secondCall?.[0] ?? '');
    const values = (secondCall?.[1] ?? []) as unknown[];

    expect(sql).toContain('lp.section_code = $4');
    expect(sql).toContain('prg.code = $5');
    expect(sql).toContain('act.code = $6');
    expect(sql).toContain('lb.enveloppe_id = $7');
    expect(values).toEqual([
      'tenant-1',
      '2f0715a2-3860-4584-b8ca-df8bcd5b6f64',
      2026,
      'SEC-OPS',
      'PRG-INV',
      'ACT-01',
      '8f36cbf4-9658-49e5-a311-731f1764892a'
    ]);
  });

  it('rejette une periode invalide', async () => {
    postgresService.query.mockResolvedValueOnce({ rows: [{ id: 'ex-1' }] } as never);

    await expect(
      service.getEcartsPrevisionExecution(actor, {
        exerciceId: '2f0715a2-3860-4584-b8ca-df8bcd5b6f64',
        periode: '2026-Q1'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('echoue si exercice inexistant', async () => {
    const warnSpy = jest.spyOn((service as unknown as { logger: { warn: (message: string) => void } }).logger, 'warn');
    postgresService.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      service.getEcartsPrevisionExecution(actor, {
        exerciceId: '2f0715a2-3860-4584-b8ca-df8bcd5b6f64'
      })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Tentative d\'acces hors scope'));
  });

  it('retourne une erreur metier actionnable si aucune donnee', async () => {
    postgresService.query
      .mockResolvedValueOnce({ rows: [{ id: 'ex-1' }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      service.getEcartsPrevisionExecution(actor, {
        exerciceId: '2f0715a2-3860-4584-b8ca-df8bcd5b6f64'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stabilise le mapping periodes/montants avec numeros en texte et valeurs nullables', async () => {
    postgresService.query
      .mockResolvedValueOnce({ rows: [{ id: 'ex-1' }] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            periode: '2025',
            section_code: null,
            programme_code: null,
            action_code: null,
            enveloppe_id: null,
            montant_prevu: '0',
            montant_execute: '125.75'
          },
          {
            periode: '2026',
            section_code: 'SEC-A',
            programme_code: 'PRG-A',
            action_code: 'ACT-A',
            enveloppe_id: 'env-a',
            montant_prevu: '200.50',
            montant_execute: '100.25'
          }
        ]
      } as never);

    const result = await service.getEcartsPrevisionExecution(actor, {
      exerciceId: '2f0715a2-3860-4584-b8ca-df8bcd5b6f64'
    });

    expect(result.items[0]).toMatchObject({
      periode: '2025',
      montantPrevu: 0,
      montantExecute: 125.75,
      ecartMontant: 125.75,
      ecartTaux: undefined
    });
    expect(result.items[1]).toMatchObject({
      periode: '2026',
      axe: {
        sectionCode: 'SEC-A',
        programmeCode: 'PRG-A',
        actionCode: 'ACT-A',
        enveloppeId: 'env-a'
      },
      montantPrevu: 200.5,
      montantExecute: 100.25,
      ecartMontant: -100.25
    });
    expect(result.totaux).toMatchObject({
      montantPrevu: 200.5,
      montantExecute: 226,
      ecartMontant: 25.5,
      nombreAxes: 2
    });
  });
});
