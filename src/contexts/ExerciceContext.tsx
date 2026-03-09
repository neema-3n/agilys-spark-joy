import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { ExerciceChecklist, ExerciceContextType, Exercice, ReouvrirExercicePayload } from '@/types';
import { exercicesService } from '@/services/api/exercices.service';
import { useClient } from './ClientContext';
import { toast } from 'sonner';

const ExerciceContext = createContext<ExerciceContextType | undefined>(undefined);

export const ExerciceProvider = ({ children }: { children: ReactNode }) => {
  const { currentClient } = useClient();
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [currentExercice, setCurrentExercice] = useState<Exercice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadExercices = useCallback(async () => {
    if (!currentClient) {
      setExercices([]);
      setCurrentExercice(null);
      setHasLoaded(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await exercicesService.getByClient(currentClient.id);
      setExercices(data);
      
      // Sélectionner l'exercice ouvert le plus récent
      const activeExercice = data.find(ex => ex.statut === 'ouverte') ?? data.find(ex => ex.statut === 'en_revue');
      setCurrentExercice(activeExercice || data[0] || null);
    } catch (error) {
      console.error('Erreur lors du chargement des exercices:', error);
      toast.error('Impossible de charger les exercices');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [currentClient]);

  useEffect(() => {
    if (currentClient) {
      loadExercices();
    } else {
      setExercices([]);
      setCurrentExercice(null);
      setHasLoaded(false);
    }
  }, [currentClient, loadExercices]);

  const createExercice = useCallback(async (exercice: Omit<Exercice, 'id'>) => {
    try {
      const newExercice = await exercicesService.create(exercice);
      setExercices(prev => [newExercice, ...prev]);
      toast.success('Exercice créé avec succès');
      return newExercice;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
      throw error;
    }
  }, []);

  const updateExercice = useCallback(async (id: string, updates: Partial<Omit<Exercice, 'id' | 'clientId'>>) => {
    try {
      const updated = await exercicesService.update(id, updates);
      setExercices(prev => prev.map(ex => ex.id === id ? updated : ex));
      if (currentExercice?.id === id) {
        setCurrentExercice(updated);
      }
      toast.success('Exercice mis à jour');
      return updated;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour');
      throw error;
    }
  }, [currentExercice?.id]);

  const cloturerExercice = useCallback(async (id: string) => {
    try {
      const updated = await exercicesService.cloturer(id);
      setExercices(prev => {
        const withoutClosed = prev.filter(ex => ex.id !== id && ex.id !== updated.nextExercice.id);
        return [updated.nextExercice, updated.exercice, ...withoutClosed];
      });
      setCurrentExercice(updated.nextExercice);
      toast.success('Exercice clôturé via le workflow gouverné');
      return updated;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la clôture');
      throw error;
    }
  }, []);

  const preCloturerExercice = useCallback(async (id: string) => {
    try {
      const checklist = await exercicesService.preCloturer(id);
      setExercices(prev => prev.map(ex => ex.id === id ? { ...ex, statut: 'en_revue' } : ex));
      if (currentExercice?.id === id) {
        setCurrentExercice(prev => prev ? { ...prev, statut: 'en_revue' } : prev);
      }
      toast.success('Exercice placé en pré-clôture');
      return checklist;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la pré-clôture');
      throw error;
    }
  }, [currentExercice?.id]);

  const reouvrirExercice = useCallback(async (id: string, payload: ReouvrirExercicePayload) => {
    try {
      const exercice = await exercicesService.reouvrir(id, payload);
      setExercices(prev => prev.map(item => item.id === id ? exercice : item));
      if (currentExercice?.id === id) {
        setCurrentExercice(exercice);
      }
      toast.success('Exercice rouvert en mode gouverné');
      return exercice;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la réouverture');
      throw error;
    }
  }, [currentExercice?.id]);

  const getExerciceChecklist = useCallback(async (id: string): Promise<ExerciceChecklist> => {
    return exercicesService.getChecklist(id);
  }, []);

  const contextValue = useMemo(() => ({
    currentExercice,
    exercices,
    setCurrentExercice,
    createExercice,
    updateExercice,
    preCloturerExercice,
    cloturerExercice,
    reouvrirExercice,
    getExerciceChecklist,
    isLoading,
    hasLoaded,
    refreshExercices: loadExercices
  }), [currentExercice, exercices, isLoading, hasLoaded, loadExercices, createExercice, updateExercice, preCloturerExercice, cloturerExercice, reouvrirExercice, getExerciceChecklist]);

  return (
    <ExerciceContext.Provider value={contextValue}>
      {children}
    </ExerciceContext.Provider>
  );
};

export const useExercice = () => {
  const context = useContext(ExerciceContext);
  if (context === undefined) {
    throw new Error('useExercice must be used within an ExerciceProvider');
  }
  return context;
};
