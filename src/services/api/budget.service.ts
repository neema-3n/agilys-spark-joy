import { 
  LigneBudgetaire, 
  ModificationBudgetaire,
  Section,
  Programme,
  Action
} from '@/types/budget.types';
import { 
  MOCK_LIGNES_BUDGETAIRES, 
  MOCK_MODIFICATIONS_BUDGETAIRES,
  MOCK_SECTIONS,
  MOCK_PROGRAMMES,
  MOCK_ACTIONS
} from '../mockData/budget.mock';

// Simulation d'une base de données en mémoire
let lignesBudgetaires = [...MOCK_LIGNES_BUDGETAIRES];
let modifications = [...MOCK_MODIFICATIONS_BUDGETAIRES];

export const budgetService = {
  // Récupérer toutes les sections
  getSections: async (): Promise<Section[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_SECTIONS;
  },

  // Récupérer tous les programmes
  getProgrammes: async (): Promise<Programme[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_PROGRAMMES;
  },

  // Récupérer toutes les actions
  getActions: async (): Promise<Action[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_ACTIONS;
  },

  // Récupérer les lignes budgétaires par exercice
  getLignesBudgetaires: async (exerciceId: string): Promise<LigneBudgetaire[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return lignesBudgetaires.filter(lb => lb.exerciceId === exerciceId);
  },

  // Créer une ligne budgétaire
  createLigneBudgetaire: async (ligne: Omit<LigneBudgetaire, 'id' | 'dateCreation'>): Promise<LigneBudgetaire> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const nouvelleLigne: LigneBudgetaire = {
      ...ligne,
      id: `lb-${Date.now()}`,
      dateCreation: new Date().toISOString().split('T')[0],
      montantModifie: ligne.montantInitial,
      montantEngage: 0,
      montantPaye: 0,
      disponible: ligne.montantInitial,
      statut: 'actif'
    };
    
    lignesBudgetaires.push(nouvelleLigne);
    return nouvelleLigne;
  },

  // Mettre à jour une ligne budgétaire
  updateLigneBudgetaire: async (id: string, updates: Partial<LigneBudgetaire>): Promise<LigneBudgetaire> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const index = lignesBudgetaires.findIndex(lb => lb.id === id);
    if (index === -1) {
      throw new Error('Ligne budgétaire non trouvée');
    }
    
    lignesBudgetaires[index] = { ...lignesBudgetaires[index], ...updates };
    return lignesBudgetaires[index];
  },

  // Supprimer une ligne budgétaire
  deleteLigneBudgetaire: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = lignesBudgetaires.findIndex(lb => lb.id === id);
    if (index === -1) {
      throw new Error('Ligne budgétaire non trouvée');
    }
    
    lignesBudgetaires.splice(index, 1);
  },

  // Récupérer les modifications budgétaires
  getModifications: async (exerciceId: string): Promise<ModificationBudgetaire[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return modifications.filter(m => m.exerciceId === exerciceId);
  },

  // Créer une modification budgétaire
  createModification: async (modification: Omit<ModificationBudgetaire, 'id' | 'dateCreation' | 'numero'>): Promise<ModificationBudgetaire> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const count = modifications.filter(m => m.exerciceId === modification.exerciceId).length + 1;
    const annee = modification.exerciceId.split('-')[1];
    
    const nouvelleModification: ModificationBudgetaire = {
      ...modification,
      id: `mod-${Date.now()}`,
      numero: `MOD/${annee}/${String(count).padStart(3, '0')}`,
      dateCreation: new Date().toISOString().split('T')[0],
      statut: 'brouillon'
    };
    
    modifications.push(nouvelleModification);
    return nouvelleModification;
  },

  // Valider une modification budgétaire
  validerModification: async (id: string, userId: string): Promise<ModificationBudgetaire> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const modification = modifications.find(m => m.id === id);
    if (!modification) {
      throw new Error('Modification non trouvée');
    }
    
    // Appliquer la modification sur la ligne budgétaire
    const ligneDestination = lignesBudgetaires.find(lb => lb.id === modification.ligneDestinationId);
    if (!ligneDestination) {
      throw new Error('Ligne de destination non trouvée');
    }
    
    if (modification.type === 'augmentation') {
      ligneDestination.montantModifie += modification.montant;
      ligneDestination.disponible += modification.montant;
    } else if (modification.type === 'diminution') {
      ligneDestination.montantModifie -= modification.montant;
      ligneDestination.disponible -= modification.montant;
    } else if (modification.type === 'virement' && modification.ligneSourceId) {
      const ligneSource = lignesBudgetaires.find(lb => lb.id === modification.ligneSourceId);
      if (!ligneSource) {
        throw new Error('Ligne source non trouvée');
      }
      
      ligneSource.montantModifie -= modification.montant;
      ligneSource.disponible -= modification.montant;
      ligneDestination.montantModifie += modification.montant;
      ligneDestination.disponible += modification.montant;
    }
    
    // Mettre à jour le statut de la modification
    modification.statut = 'validee';
    modification.dateValidation = new Date().toISOString().split('T')[0];
    modification.validePar = userId;
    
    return modification;
  },

  // Rejeter une modification budgétaire
  rejeterModification: async (id: string): Promise<ModificationBudgetaire> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const modification = modifications.find(m => m.id === id);
    if (!modification) {
      throw new Error('Modification non trouvée');
    }
    
    modification.statut = 'rejetee';
    return modification;
  }
};
