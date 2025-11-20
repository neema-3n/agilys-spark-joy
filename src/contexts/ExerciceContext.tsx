import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { ExerciceContextType, Exercice } from '@/types';
import { exercicesService } from '@/services/api/exercices.service';
import { useClient } from './ClientContext';
import { toast } from 'sonner';

const ExerciceContext = createContext<ExerciceContextType | undefined>(undefined);

export const ExerciceProvider = ({ children }: { children: ReactNode }) => {
  const { currentClient } = useClient();
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [currentExercice, setCurrentExercice] = useState<Exercice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadExercices = useCallback(async () => {
    if (!currentClient) return;
    
    setIsLoading(true);
    try {
      const data = await exercicesService.getByClient(currentClient.id);
      setExercices(data);
      
      // Sélectionner l'exercice ouvert le plus récent
      const openExercice = data.find(ex => ex.statut === 'ouvert');
      setCurrentExercice(openExercice || data[0] || null);
    } catch (error) {
      console.error('Erreur lors du chargement des exercices:', error);
      toast.error('Impossible de charger les exercices');
    } finally {
      setIsLoading(false);
    }
  }, [currentClient]);

  useEffect(() => {
    if (currentClient) {
      loadExercices();
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
      setExercices(prev => prev.map(ex => ex.id === id ? updated : ex));
      if (currentExercice?.id === id) {
        const nextOpen = exercices.find(ex => ex.id !== id && ex.statut === 'ouvert');
        setCurrentExercice(nextOpen || null);
      }
      toast.success('Exercice clôturé');
      return updated;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la clôture');
      throw error;
    }
  }, [currentExercice?.id, exercices]);

  const deleteExercice = useCallback(async (id: string) => {
    try {
      await exercicesService.delete(id);
      setExercices(prev => prev.filter(ex => ex.id !== id));
      if (currentExercice?.id === id) {
        const nextExercice = exercices.find(ex => ex.id !== id);
        setCurrentExercice(nextExercice || null);
      }
      toast.success('Exercice supprimé');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
      throw error;
    }
  }, [currentExercice?.id, exercices]);

  const contextValue = useMemo(() => ({
    currentExercice,
    exercices,
    setCurrentExercice,
    createExercice,
    updateExercice,
    cloturerExercice,
    deleteExercice,
    isLoading,
    refreshExercices: loadExercices
  }), [currentExercice, exercices, isLoading, loadExercices, createExercice, updateExercice, cloturerExercice, deleteExercice]);

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
