import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  useEffect(() => {
    if (currentClient) {
      loadExercices();
    }
  }, [currentClient]);

  const loadExercices = async () => {
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
  };

  const createExercice = async (exercice: Omit<Exercice, 'id'>) => {
    try {
      const newExercice = await exercicesService.create(exercice);
      setExercices(prev => [newExercice, ...prev]);
      toast.success('Exercice créé avec succès');
      return newExercice;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
      throw error;
    }
  };

  const updateExercice = async (id: string, updates: Partial<Omit<Exercice, 'id' | 'clientId'>>) => {
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
  };

  const cloturerExercice = async (id: string) => {
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
  };

  const deleteExercice = async (id: string) => {
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
  };

  return (
    <ExerciceContext.Provider value={{ 
      currentExercice, 
      exercices, 
      setCurrentExercice,
      createExercice,
      updateExercice,
      cloturerExercice,
      deleteExercice,
      isLoading,
      refreshExercices: loadExercices
    }}>
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
