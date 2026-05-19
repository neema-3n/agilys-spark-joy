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
  | 'validee' 
  | 'soldee' 
  | 'annulee';

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  clientId: string;
  roles: AppRole[];
}

export type ThousandsSeparator = 'space' | 'dot' | 'comma' | 'apostrophe' | 'none';
export type DecimalSeparator = 'comma' | 'dot';

export interface MoneyFormatSettings {
  locale?: string;
  currencyCode?: string;
  thousandsSeparator?: ThousandsSeparator;
  decimalSeparator?: DecimalSeparator;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export interface Client {
  id: string;
  nom: string;
  code: string;
  pays: string;
  devise: string;
  statut: 'actif' | 'inactif';
  moneyFormat?: MoneyFormatSettings;
}

export interface Exercice {
  id: string;
  clientId: string;
  libelle: string;
  code?: string;
  dateDebut: string;
  dateFin: string;
  statut: 'ouvert' | 'cloture';
}

export interface AuthContextType {
  user: User | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, nom: string, prenom: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
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
  cloturerExercice: (id: string) => Promise<Exercice>;
  deleteExercice: (id: string) => Promise<void>;
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
