import { useState, useEffect } from 'react';

/**
 * Hook pour gérer la progression du scroll dans l'élément main
 * Utilisé pour créer l'effet de disparition progressive du PageHeader
 * lors de l'affichage d'un snapshot
 * 
 * @param isSnapshotOpen - Indique si un snapshot est actuellement ouvert
 * @param maxScroll - Distance de scroll maximum pour atteindre progress = 1 (défaut: 100px)
 * @returns scrollProgress - Valeur entre 0 et 1 représentant la progression du scroll
 */
export const useScrollProgress = (isSnapshotOpen: boolean, maxScroll: number = 100): number => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // Si pas de snapshot ouvert, reset le progress
    if (!isSnapshotOpen) {
      setScrollProgress(0);
      return;
    }

    // Récupérer l'élément main qui contient le scroll
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    const handleScroll = () => {
      const scrollTop = mainElement.scrollTop;
      const progress = Math.min(scrollTop / maxScroll, 1);
      setScrollProgress(progress);
    };

    // Attacher le listener de scroll
    mainElement.addEventListener('scroll', handleScroll);
    
    // Cleanup au unmount
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [isSnapshotOpen, maxScroll]);

  return scrollProgress;
};
