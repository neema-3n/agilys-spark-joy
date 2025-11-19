import { toast } from 'sonner';
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
  toast.success(description, {
    duration: 8000,
    action: {
      label: (
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Voir
        </span>
      ),
      onClick: () => navigate(targetPage.path),
    },
  });
};
