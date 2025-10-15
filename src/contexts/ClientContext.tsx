import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ClientContextType, Client } from '@/types';
import { clientsService } from '@/services/api/clients.service';
import { useAuth } from './AuthContext';

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user]);

  const loadClients = async () => {
    const allClients = await clientsService.getAll();
    setClients(allClients);
    
    // Définir le client actuel selon le rôle
    if (user?.roles.includes('super_admin')) {
      setCurrentClient(allClients[0] || null);
    } else {
      const userClient = allClients.find(c => c.id === user?.clientId);
      setCurrentClient(userClient || null);
    }
  };

  return (
    <ClientContext.Provider value={{ currentClient, clients, setCurrentClient }}>
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
