import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { ClientContextType, Client } from '@/types';
import { clientsService, type ClientAccess } from '@/services/api/clients.service';
import { useAuth } from './AuthContext';
import { setMoneyFormatSettings } from '@/lib/utils';

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      // `my_clients` applique déjà les règles d'appartenance côté base : ce que
      // la liste contient est exactement ce que l'utilisateur a le droit de voir.
      // Aucun filtrage supplémentaire n'est fait ici, et il ne faut pas en
      // rajouter : ce serait du confort d'affichage pris pour de la sécurité.
      const allClients = await clientsService.getAll();
      setClients(allClients);

      const preferred = allClients.find((client) => client.id === user?.clientId);
      setCurrentClient(preferred ?? allClients[0] ?? null);
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
    if (currentClient && (currentClient as ClientAccess).isTakeover) {
      void clientsService.logTakeover(currentClient.id);
    }
  }, [currentClient]);

  const contextValue = useMemo(() => ({
    currentClient,
    clients,
    setCurrentClient,
    isLoading,
    hasLoaded
  }), [currentClient, clients, isLoading, hasLoaded]);

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
