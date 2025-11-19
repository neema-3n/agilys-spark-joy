import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { ClientContextType, Client } from '@/types';
import { clientsService } from '@/services/api/clients.service';
import { useAuth } from './AuthContext';

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);

  const loadClients = useCallback(async () => {
    const allClients = await clientsService.getAll();
    setClients(allClients);
    
    // SECURITY NOTE: This client-side role check is for UI/UX purposes only.
    // Actual data access control is enforced server-side via RLS policies
    // that filter by the user's client_id from their profile.
    // This code only determines which client selector to display in the UI.
    if (user?.roles.includes('super_admin')) {
      setCurrentClient(allClients[0] || null);
    } else {
      const userClient = allClients.find(c => c.id === user?.clientId);
      setCurrentClient(userClient || null);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user, loadClients]);

  const contextValue = useMemo(() => ({
    currentClient,
    clients,
    setCurrentClient
  }), [currentClient, clients]);

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
