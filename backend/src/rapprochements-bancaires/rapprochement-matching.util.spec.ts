import { buildRapprochementInvalidationKeys, matchStatementLine } from './rapprochement-matching.util';

describe('rapprochement matching util', () => {
  it('propose un match unique déterministe sur cas nominal', () => {
    const result = matchStatementLine(
      {
        dateOperation: '2026-03-08',
        libelle: 'Virement client ACME',
        referenceBancaire: 'VIR-001',
        montant: 1500,
        typeFlux: 'encaissement',
      },
      [
        {
          id: 'op-1',
          numero: 'OPE000001',
          dateOperation: '2026-03-08',
          montant: 1500,
          referenceBancaire: 'VIR-001',
          libelle: 'Virement client ACME',
          typeOperation: 'encaissement',
        },
        {
          id: 'op-2',
          numero: 'OPE000002',
          dateOperation: '2026-03-07',
          montant: 1500,
          referenceBancaire: 'VIR-ALT',
          libelle: 'Autre flux',
          typeOperation: 'encaissement',
        },
      ]
    );

    expect(result.status).toBe('proposition_unique');
    expect(result.recommendedOperationId).toBe('op-1');
    expect(result.bestScore).toBe(110);
    expect(result.rules).toEqual(expect.arrayContaining(['Montant exact', 'Date identique', 'Reference bancaire identique']));
  });

  it('garde un cas ambigu sans auto-validation quand deux candidats ont le même score', () => {
    const result = matchStatementLine(
      {
        dateOperation: '2026-03-08',
        libelle: 'Versement',
        montant: 500,
        typeFlux: 'encaissement',
      },
      [
        {
          id: 'op-1',
          numero: 'OPE000001',
          dateOperation: '2026-03-08',
          montant: 500,
          libelle: 'Versement',
          typeOperation: 'encaissement',
        },
        {
          id: 'op-2',
          numero: 'OPE000002',
          dateOperation: '2026-03-08',
          montant: 500,
          libelle: 'Versement',
          typeOperation: 'encaissement',
        },
      ]
    );

    expect(result.status).toBe('ambigu');
    expect(result.recommendedOperationId).toBeUndefined();
    expect(result.candidates).toHaveLength(2);
  });

  it('expose les clés d invalidation React Query du workflow', () => {
    expect(buildRapprochementInvalidationKeys('rap-1')).toEqual([
      ['rapprochements-bancaires'],
      ['operations-tresorerie'],
      ['tresorerie-supervision'],
      ['rapprochements-bancaires', 'detail', 'rap-1'],
    ]);
  });
});
