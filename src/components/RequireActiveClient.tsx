import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useClient } from '@/contexts/ClientContext';

/**
 * Interdit l'entrée dans l'application tant qu'aucun client actif n'est posé
 * dans le jeton.
 *
 * Sans ce garde-fou, un utilisateur rattaché à plusieurs clients dont la
 * session est restaurée depuis le navigateur entre directement dans
 * l'application sans repasser par l'écran de sélection. `get_user_client_id()`
 * ne peut alors pas trancher entre ses rattachements, la RLS filtre tout, et
 * il voit des écrans vides — indiscernables d'un compte réellement sans
 * données. C'est une panne silencieuse : aucune erreur, aucun message.
 *
 * Le repli sur l'appartenance unique couvre les utilisateurs mono-client, mais
 * on les fait passer par le même chemin : un client actif explicite vaut mieux
 * qu'un périmètre déduit, et le comportement reste ainsi uniforme.
 */
export const RequireActiveClient = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { clients, hasLoaded, isSwitching } = useClient();

  if (!hasLoaded || isSwitching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
      </div>
    );
  }

  // Aucun rattachement : l'écran de sélection affiche le message adéquat.
  if (clients.length === 0) {
    return <Navigate to="/auth/select-client" replace state={{ from: location.pathname }} />;
  }

  const hasActiveClient = clients.some((client) => client.isActive);
  if (!hasActiveClient) {
    return <Navigate to="/auth/select-client" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
