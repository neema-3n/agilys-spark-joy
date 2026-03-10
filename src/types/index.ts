// Types de l'application
export type AppRole = 
  | 'super_admin' 
  | 'admin_client' 
  | 'directeur_financier' 
  | 'chef_service' 
  | 'comptable' 
  | 'operateur_saisie';

export type StatutEngagement = 
  | 'brouillon' 
  | 'valide' 
  | 'annule';

export type StatutFacture = 
  | 'brouillon' 
  | 'en_attente' 
  | 'validee' 
  | 'payee' 
  | 'rejetee';

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  clientId: string;
  roles: AppRole[];
}

export interface Client {
  id: string;
  nom: string;
  code: string;
  pays: string;
  devise: string;
  statut: 'actif' | 'inactif';
}

export type ExerciceStatut = 'ouverte' | 'en_revue' | 'fermee';

export interface Exercice {
  id: string;
  clientId: string;
  libelle: string;
  code?: string;
  dateDebut: string;
  dateFin: string;
  statut: ExerciceStatut;
}

export interface ExerciceChecklistItem {
  code: string;
  label: string;
  status: 'ok' | 'warning' | 'blocking';
  detail: string;
  evidenceCount: number;
  evidence: Array<Record<string, unknown>>;
}

export interface ExerciceChecklist {
  exerciceId: string;
  statutExercice: ExerciceStatut;
  generatedAt: string;
  canClose: boolean;
  items: ExerciceChecklistItem[];
}

export interface ExerciceCloseResult {
  exercice: Exercice;
  checklist: ExerciceChecklist;
  nextExercice: Exercice;
}

export interface ReouvrirExercicePayload {
  motif: string;
  approbateur?: string;
  impact?: string;
  regularisationAttendue?: string;
}

export interface AuthContextType {
  user: User | null;
  session: { accessTokenExpiresAt: number | null } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, nom: string, prenom: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export interface ClientContextType {
  currentClient: Client | null;
  clients: Client[];
  setCurrentClient: (client: Client) => void;
  isLoading: boolean;
  hasLoaded: boolean;
}

export interface ExerciceContextType {
  currentExercice: Exercice | null;
  exercices: Exercice[];
  setCurrentExercice: (exercice: Exercice) => void;
  hasLoaded: boolean;
  createExercice: (exercice: Omit<Exercice, 'id'>) => Promise<Exercice>;
  updateExercice: (id: string, updates: Partial<Omit<Exercice, 'id' | 'clientId'>>) => Promise<Exercice>;
  preCloturerExercice: (id: string) => Promise<ExerciceChecklist>;
  cloturerExercice: (id: string) => Promise<ExerciceCloseResult>;
  reouvrirExercice: (id: string, payload: ReouvrirExercicePayload) => Promise<Exercice>;
  getExerciceChecklist: (id: string) => Promise<ExerciceChecklist>;
  isLoading: boolean;
  refreshExercices: () => Promise<void>;
}

// Export budget types
export * from './budget.types';

// Export enveloppe types
export * from './enveloppe.types';

// Export structure types
export * from './structure.types';

// Export compte types
export * from './compte.types';

// Export projet types
export * from './projet.types';

// Export prevision types
export * from './prevision.types';

// Export fournisseur types
export * from './fournisseur.types';

// Export regle comptable types
export * from './regle-comptable.types';

// Export reservation types
export * from './reservation.types';

// Export engagement types
export * from './engagement.types';

// Export reporting comptable types
export * from './reporting-comptable.types';

// Export reporting fournisseurs types
export * from './reporting-fournisseurs.types';

// Export reporting analytique types
export * from './reporting-analytique.types';
