import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ExerciceContextType, Exercice } from '@/types';
import { MOCK_EXERCICES } from '@/services/mockData/exercices.mock';
import { useClient } from './ClientContext';

const ExerciceContext = createContext<ExerciceContextType | undefined>(undefined);

export const ExerciceProvider = ({ children }: { children: ReactNode }) => {
  const { currentClient } = useClient();
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [currentExercice, setCurrentExercice] = useState<Exercice | null>(null);

  useEffect(() => {
    if (currentClient) {
      const clientExercices = MOCK_EXERCICES.filter(ex => ex.clientId === currentClient.id);
      setExercices(clientExercices);
      
      // Sélectionner l'exercice ouvert le plus récent
      const openExercice = clientExercices.find(ex => ex.statut === 'ouvert');
      setCurrentExercice(openExercice || clientExercices[0] || null);
    }
  }, [currentClient]);

  return (
    <ExerciceContext.Provider value={{ currentExercice, exercices, setCurrentExercice }}>
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
