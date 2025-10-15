import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types';

interface RoleGuardProps {
  allowedRoles: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleGuard = ({ allowedRoles, children, fallback = null }: RoleGuardProps) => {
  const { hasAnyRole } = useAuth();

  if (!hasAnyRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
