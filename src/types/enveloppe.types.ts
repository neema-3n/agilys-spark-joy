// Types pour le module Enveloppes

export interface Enveloppe {
  id: string;
  clientId: string;
  exerciceId: string;
  code: string;
  nom: string;
  sourceFinancement: string;
  montantAlloue: number;
  montantConsomme: number;
  montantDisponible: number; // Calculated: montantAlloue - montantConsomme
  statut: 'actif' | 'cloture';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type CreateEnveloppeInput = Omit<Enveloppe, 'id' | 'montantDisponible' | 'createdAt' | 'updatedAt' | 'createdBy'>;
export type UpdateEnveloppeInput = Partial<CreateEnveloppeInput>;
