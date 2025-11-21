export type ModePaiement = 'virement' | 'cheque' | 'carte' | 'espece' | 'autre';

export interface Paiement {
  id: string;
  factureId: string;
  factureNumero: string;
  fournisseurNom?: string;
  montant: number;
  date: string;
  mode: ModePaiement;
  reference?: string;
  note?: string;
}

export type PaiementInput = Omit<Paiement, 'id' | 'factureNumero' | 'fournisseurNom'>;
