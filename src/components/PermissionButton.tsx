import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/usePermissions';

type Props = ComponentProps<typeof Button> & {
  /** Code du catalogue, par exemple `depenses.valider`. */
  permission: string;
  /**
   * `masquer` retire le bouton — pour une action qu'on ne propose pas.
   * `desactiver` le laisse visible et explique pourquoi il ne répond pas —
   * pour une action attendue sur une pièce qu'on a sous les yeux.
   */
  quandRefuse?: 'masquer' | 'desactiver';
  motif?: ReactNode;
};

/**
 * Bouton conditionné à une permission.
 *
 * Ne protège rien : les politiques et les triggers refusent l'écriture quoi
 * qu'il arrive. Sert à ne pas proposer un geste voué à l'échec — un refus
 * découvert au clic ressemble à une panne, pas à une règle d'organisation.
 *
 * À n'utiliser que sur les modules dont la base applique réellement les
 * permissions : masquer ailleurs rendrait l'interface plus stricte que la
 * base, et bloquerait des utilisateurs qui en ont pourtant le droit.
 */
export const PermissionButton = forwardRef<HTMLButtonElement, Props>(
  ({ permission, quandRefuse = 'masquer', motif, children, ...props }, ref) => {
    const { can, isLoading } = usePermissions();

    if (isLoading) return null;
    if (can(permission)) {
      return <Button ref={ref} {...props}>{children}</Button>;
    }

    if (quandRefuse === 'masquer') return null;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Un bouton désactivé n'émet pas d'événement de survol : le span
              porte l'infobulle à sa place. */}
          <span className="inline-flex">
            <Button ref={ref} {...props} disabled className="pointer-events-none">
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {motif ?? 'Cette action revient à un autre rôle de votre organisation.'}
        </TooltipContent>
      </Tooltip>
    );
  },
);
PermissionButton.displayName = 'PermissionButton';
