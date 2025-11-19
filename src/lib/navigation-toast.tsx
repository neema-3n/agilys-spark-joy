import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Eye } from 'lucide-react';

interface NavigationToastOptions {
  title: string;
  description: string;
  targetPage: {
    name: string;
    path: string;
  };
  navigate: (path: string) => void;
}

export const showNavigationToast = ({
  title,
  description,
  targetPage,
  navigate,
}: NavigationToastOptions) => {
  toast({
    title,
    description,
    duration: 8000,
    action: (
      <ToastAction altText="Voir l'élément créé" onClick={() => navigate(targetPage.path)}>
        <Eye className="h-3 w-3 mr-1" />
        Voir
      </ToastAction>
    ),
  });
};
