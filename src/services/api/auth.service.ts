import { User } from '@/types';
import { MOCK_USERS, MOCK_CREDENTIALS } from '../mockData/users.mock';

export const authService = {
  login: async (email: string, password: string): Promise<{ user?: User; error?: string }> => {
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));

    // Vérifier les credentials
    const validPassword = MOCK_CREDENTIALS[email as keyof typeof MOCK_CREDENTIALS];
    if (!validPassword || validPassword !== password) {
      return { error: 'Email ou mot de passe incorrect' };
    }

    // Trouver l'utilisateur
    const user = MOCK_USERS.find(u => u.email === email);
    if (!user) {
      return { error: 'Utilisateur non trouvé' };
    }

    // Simuler un token JWT
    const mockToken = btoa(JSON.stringify({ userId: user.id, exp: Date.now() + 24 * 60 * 60 * 1000 }));
    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('user', JSON.stringify(user));

    return { user };
  },

  logout: async () => {
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 200));
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }
};
