import { expect, test } from '@playwright/test';
import {
  buildPaiementStatsSummary,
  canReprendrePaiement,
  formatPaiementTableNumero,
  getPaiementTableActions,
  getDepenseStatusLabel,
  getMontantPayeFromPaiements,
  getMontantRestantDepense,
  getPaiementStatusLabel,
  isPaiementActif,
} from '../src/lib/paiement-workflow';
import {
  buildPaiementMotifSubmission,
  filterPaiements,
  getPaiementFilterOptions,
  getPaiementInvalidationKeys,
  getPaiementMotifDialogCopy,
  openPaiementMotifDialog,
  resetPaiementMotifDialog,
} from '../src/lib/paiement-page';
import type { Paiement } from '../src/types/paiement.types';

const makePaiement = (overrides: Partial<Paiement> = {}): Paiement => ({
  id: 'pay-1',
  clientId: 'tenant-1',
  exerciceId: 'ex-1',
  numero: 'PAY000001',
  depenseId: 'dep-1',
  montant: 150,
  datePaiement: '2026-03-06',
  modePaiement: 'virement',
  statut: 'execute',
  tentativeNumero: 1,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
  depense: {
    id: 'dep-1',
    numero: 'DEP-001',
    objet: 'Paiement fournisseur',
    montant: 400,
    montantPaye: 150,
    resteAPayer: 250,
    statut: 'partiellement_payee',
    fournisseur: {
      id: 'fou-1',
      nom: 'ACME',
      code: 'F001',
    },
  },
  ...overrides,
});

test.describe('paiements workflow helpers', () => {
  test('calcule le reste à payer et ignore les paiements rejetés/annulés', async () => {
    const depense = {
      montant: 1000,
      montantPaye: 400,
    };

    const montantPayeActif = getMontantPayeFromPaiements([
      { montant: 250, statut: 'execute' },
      { montant: 150, statut: 'reconcilie' },
      { montant: 100, statut: 'rejete' },
      { montant: 50, statut: 'annule' },
    ]);

    expect(montantPayeActif).toBe(400);
    expect(getMontantRestantDepense(depense)).toBe(600);
  });

  test('expose des libellés métier cohérents pour les statuts dépense et paiement', async () => {
    expect(getPaiementStatusLabel('execute')).toBe('Exécuté');
    expect(getPaiementStatusLabel('rejete')).toBe('Rejeté');
    expect(getDepenseStatusLabel('partiellement_payee')).toBe('Partiellement payée');
    expect(isPaiementActif('reconcilie')).toBeTruthy();
    expect(isPaiementActif('annule')).toBeFalsy();
  });

  test('autorise la reprise pour les paiements rejetés et annulés', async () => {
    expect(canReprendrePaiement('rejete')).toBeTruthy();
    expect(canReprendrePaiement('annule')).toBeTruthy();
    expect(canReprendrePaiement('execute')).toBeFalsy();
  });

  test('expose les actions attendues dans la table selon le statut', async () => {
    expect(getPaiementTableActions('transmis')).toEqual(['view', 'accepter', 'executer', 'rejeter', 'annuler']);
    expect(getPaiementTableActions('annule')).toEqual(['view', 'reprendre']);
    expect(getPaiementTableActions('rejete')).toEqual(['view', 'reprendre']);
    expect(getPaiementTableActions('reconcilie')).toEqual(['view']);
  });

  test('formate le numéro affiché en table pour une tentative reprise', async () => {
    expect(
      formatPaiementTableNumero(
        makePaiement({
          numero: 'PAY000002',
          tentativeNumero: 2,
          statut: 'annule',
        })
      )
    ).toBe('PAY000002 • T2');
  });

  test('calcule les stats frontend en comptabilisant seulement les paiements réussis', async () => {
    const stats = buildPaiementStatsSummary(
      [
        makePaiement({ id: 'pay-1', montant: 150, statut: 'execute', datePaiement: '2026-03-06' }),
        makePaiement({ id: 'pay-2', montant: 75, statut: 'reconcilie', datePaiement: '2026-03-02' }),
        makePaiement({ id: 'pay-3', montant: 30, statut: 'annule', datePaiement: '2026-03-06' }),
      ],
      '2026-03-06',
      '2026-03-01'
    );

    expect(stats).toEqual({
      nombreTotal: '3',
      nombreSucces: '2',
      montantTotal: '225.00 €',
      montantAujourdHui: '150.00 €',
      montantCeMois: '225.00 €',
    });
  });

  test('filtre les paiements par statut, recherche et tri décroissant', async () => {
    const filtered = filterPaiements(
      [
        makePaiement({
          id: 'pay-1',
          numero: 'PAY000001',
          statut: 'execute',
          datePaiement: '2026-03-01',
          depense: { ...makePaiement().depense!, numero: 'DEP-001' },
        }),
        makePaiement({
          id: 'pay-2',
          numero: 'PAY000002',
          statut: 'annule',
          datePaiement: '2026-03-06',
          referencePaiement: 'REF-XYZ',
          depense: { ...makePaiement().depense!, numero: 'DEP-002', fournisseur: { id: 'f1', nom: 'Beta', code: 'B' } },
        }),
      ],
      'ref-xyz',
      'annule'
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.numero).toBe('PAY000002');
  });

  test('expose le contenu métier du dialogue de rejet et d’annulation', async () => {
    expect(getPaiementMotifDialogCopy('rejeter')).toEqual({
      title: 'Rejeter ce paiement',
      description: 'Cette action marque la tentative comme rejetée et conserve son historique.',
      label: 'Motif de rejet *',
      placeholder: 'Indiquez le motif du rejet...',
    });

    expect(getPaiementMotifDialogCopy('annuler')).toEqual({
      title: 'Annuler ce paiement',
      description: 'Cette action annule la tentative. Les montants et écritures liés seront recalculés si nécessaire.',
      label: "Motif d'annulation *",
      placeholder: "Indiquez le motif de l'annulation...",
    });
  });

  test('ouvre, valide et réinitialise le dialogue motif', async () => {
    const opened = openPaiementMotifDialog('pay-42', 'rejeter');
    expect(opened).toEqual({
      open: true,
      selectedPaiementId: 'pay-42',
      pendingAction: 'rejeter',
      motif: '',
    });

    expect(
      buildPaiementMotifSubmission({
        ...opened,
        motif: '  Retour banque  ',
      })
    ).toEqual({
      id: 'pay-42',
      action: 'rejeter',
      payload: { motif: 'Retour banque' },
    });

    expect(resetPaiementMotifDialog()).toEqual({
      open: false,
      selectedPaiementId: null,
      pendingAction: null,
      motif: '',
    });
  });

  test('expose les clés React Query invalidées par le workflow paiement', async () => {
    expect(getPaiementInvalidationKeys('dep-1')).toEqual([
      ['paiements'],
      ['paiements', 'depense', 'dep-1'],
      ['depenses'],
      ['ecritures-comptables'],
    ]);

    expect(getPaiementInvalidationKeys()).toEqual([
      ['paiements'],
      ['depenses'],
      ['ecritures-comptables'],
    ]);
  });

  test('expose les options de filtre frontend attendues pour la page paiements', async () => {
    expect(getPaiementFilterOptions()).toEqual([
      { value: 'tous', label: 'Tous' },
      { value: 'transmis', label: 'Transmis' },
      { value: 'accepte', label: 'Accepté' },
      { value: 'execute', label: 'Exécuté' },
      { value: 'reconcilie', label: 'Réconcilié' },
      { value: 'rejete', label: 'Rejeté' },
      { value: 'annule', label: 'Annulé' },
    ]);
  });
});
