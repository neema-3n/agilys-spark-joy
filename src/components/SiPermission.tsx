import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * N'affiche ses enfants que si la permission est accordée.
 *
 * Complète `PermissionButton`, qui ne conditionne qu'un bouton : ici on retire
 * un groupe entier — une colonne d'actions, un menu contextuel — quand aucune
 * de ses entrées n'est ouverte à l'utilisateur.
 *
 * Ne protège rien. Les politiques et les triggers refusent l'écriture quoi
 * qu'il arrive ; ceci évite seulement de proposer un geste voué à l'échec.
 */
export const SiPermission = ({
  permission,
  children,
  sinon = null,
}: {
  permission: string;
  children: ReactNode;
  /** Ce qu'on affiche à la place, quand l'absence laisserait un vide gênant. */
  sinon?: ReactNode;
}) => {
  const { can, isLoading } = usePermissions();
  if (isLoading) return null;
  return <>{can(permission) ? children : sinon}</>;
};
