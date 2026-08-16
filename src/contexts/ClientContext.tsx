import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ClientContextType, Client } from '@/types';
import { clientsService, type ClientAccess } from '@/services/api/clients.service';
import { useAuth } from './AuthContext';
import { setMoneyFormatSettings } from '@/lib/utils';

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientAccess[]>([]);
  const [currentClient, setCurrentClient] = useState<ClientAccess | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const queryClient = useQueryClient();

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      // `my_clients` applique déjà les règles d'appartenance côté base : ce que
      // la liste contient est exactement ce que l'utilisateur a le droit de voir.
      // Aucun filtrage supplémentaire n'est fait ici, et il ne faut pas en
      // rajouter : ce serait du confort d'affichage pris pour de la sécurité.
      const allClients = await clientsService.getAll();
      setClients(allClients);

      // `isActive` reflète le client porté par le jeton, donc le périmètre
      // réellement appliqué par la base. Il prime sur profiles.client_id, qui
      // n'est qu'une préférence historique : sans cette priorité, une bascule
      // vers un autre client serait aussitôt annulée au rechargement de la
      // liste, et l'interface reviendrait au client du profil.
      const active = allClients.find((client) => client.isActive);
      const preferred = allClients.find((client) => client.id === user?.clientId);
      setCurrentClient(active ?? preferred ?? allClients[0] ?? null);
    } catch (error) {
      console.error('Chargement des clients impossible :', error);
      setClients([]);
      setCurrentClient(null);
    } finally {
      setHasLoaded(true);
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadClients();
    } else {
      setClients([]);
      setCurrentClient(null);
      setHasLoaded(false);
    }
  }, [user, loadClients]);

  useEffect(() => {
    setMoneyFormatSettings({
      ...currentClient?.moneyFormat,
      currencyCode: currentClient?.moneyFormat?.currencyCode || currentClient?.devise || '',
    });
  }, [currentClient]);

  // Un super admin qui consulte un client dont il n'est pas membre laisse une
  // trace. Les triggers d'audit ne couvrent que les écritures : sans cet appel,
  // une consultation ne laisserait rien derrière elle.
  useEffect(() => {
    if (currentClient?.isTakeover) {
      void clientsService.logTakeover(currentClient.id);
    }
  }, [currentClient]);

  const switchClient = useCallback(async (clientId: string) => {
    const target = clients.find((client) => client.id === clientId);
    if (!target) return;

    // Pas de raccourci "c'est déjà le client courant" : `currentClient` est un
    // état React, alors que le périmètre réel vit dans le jeton. Les deux
    // peuvent diverger — c'est précisément le cas juste après la connexion,
    // où l'interface affiche un client alors que le jeton n'en porte aucun.
    // Sauter l'appel dans ce cas laisserait un utilisateur multi-client sans
    // périmètre, donc devant des écrans vides.
    setIsSwitching(true);
    try {
      // Pose le client actif côté serveur et rafraîchit le jeton.
      await clientsService.switchTo(clientId);

      // Purge totale du cache, et non une invalidation ciblée : chaque requête
      // en cache a été résolue sous le périmètre du client précédent. En
      // conserver une seule reviendrait à afficher les données d'un client
      // sous l'en-tête d'un autre.
      queryClient.clear();

      setCurrentClient(target);
      await loadClients();
    } finally {
      setIsSwitching(false);
    }
  }, [clients, currentClient, queryClient, loadClients]);

  const contextValue = useMemo(() => ({
    currentClient,
    clients,
    setCurrentClient,
    switchClient,
    isSwitching,
    isLoading,
    hasLoaded
  }), [currentClient, clients, switchClient, isSwitching, isLoading, hasLoaded]);

  return (
    <ClientContext.Provider value={contextValue}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
};
