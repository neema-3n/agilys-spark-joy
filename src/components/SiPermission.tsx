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
  /** Un code, ou plusieurs : il suffit d'en détenir un, comme en base. */
  permission: string | string[];
  children: ReactNode;
  /** Ce qu'on affiche à la place, quand l'absence laisserait un vide gênant. */
  sinon?: ReactNode;
}) => {
  const { can, isLoading } = usePermissions();
  if (isLoading) return null;
  const codes = Array.isArray(permission) ? permission : [permission];
  return <>{codes.some(can) ? children : sinon}</>;
};

/**
 * N'affiche ses enfants que pour le super admin.
 *
 * Sert aux gestes que la base lui réserve — la suppression d'une pièce de la
 * chaîne de dépense, par exemple : on annule une pièce, on ne l'efface pas.
 * Proposer « Supprimer » à un administrateur d'organisation serait une
 * promesse que les politiques refusent de tenir.
 */
export const SiSuperAdmin = ({ children }: { children: ReactNode }) => {
  const { estSuperAdmin, isLoading } = usePermissions();
  if (isLoading || !estSuperAdmin) return null;
  return <>{children}</>;
};
