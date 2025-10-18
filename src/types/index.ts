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
  | 'en_attente' 
  | 'valide' 
  | 'rejete' 
  | 'engage';

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

export interface Exercice {
  id: string;
  clientId: string;
  annee: number;
  dateDebut: string;
  dateFin: string;
  statut: 'ouvert' | 'cloture';
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export interface ClientContextType {
  currentClient: Client | null;
  clients: Client[];
  setCurrentClient: (client: Client) => void;
}

export interface ExerciceContextType {
  currentExercice: Exercice | null;
  exercices: Exercice[];
  setCurrentExercice: (exercice: Exercice) => void;
  createExercice: (exercice: Omit<Exercice, 'id'>) => Promise<Exercice>;
  updateExercice: (id: string, updates: Partial<Omit<Exercice, 'id' | 'clientId'>>) => Promise<Exercice>;
  cloturerExercice: (id: string) => Promise<Exercice>;
  deleteExercice: (id: string) => Promise<void>;
  isLoading: boolean;
  refreshExercices: () => Promise<void>;
}

// Export budget types
export * from './budget.types';
