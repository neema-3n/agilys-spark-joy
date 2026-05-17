import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type FocusRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

interface FocusedEditorGuardOptions {
  active: boolean;
  dirty: boolean;
  onExit: () => void;
  entityLabel?: string;
  overlayAriaLabel?: string;
}

const FocusedEditorOverlay = ({
  active,
  onAttemptExit,
  overlayAriaLabel,
}: {
  active: boolean;
  onAttemptExit: () => void;
  overlayAriaLabel: string;
}) => {
  const [sidebarRect, setSidebarRect] = useState<FocusRect | null>(null);
  const [headerRect, setHeaderRect] = useState<FocusRect | null>(null);

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    const sidebar = document.querySelector('aside');
    const header = document.querySelector('header');
    if (!(sidebar instanceof HTMLElement) || !(header instanceof HTMLElement)) return;

    const readRect = (element: HTMLElement): FocusRect => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    };

    const updateRects = () => {
      setSidebarRect(readRect(sidebar));
      setHeaderRect(readRect(header));
    };

    updateRects();

    const resizeObserver = new ResizeObserver(updateRects);
    resizeObserver.observe(sidebar);
    resizeObserver.observe(header);
    window.addEventListener('resize', updateRects);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateRects);
      setSidebarRect(null);
      setHeaderRect(null);
    };
  }, [active]);

  if (!active || !sidebarRect || !headerRect || typeof document === 'undefined') {
    return null;
  }

  const overlayClassName =
    'fixed z-[70] bg-foreground/45 backdrop-blur-[1px] transition-opacity duration-150';

  return createPortal(
    <>
      <button
        type="button"
        aria-label={overlayAriaLabel}
        className={overlayClassName}
        style={sidebarRect}
        onClick={onAttemptExit}
      />
      <button
        type="button"
        aria-label={overlayAriaLabel}
        className={overlayClassName}
        style={headerRect}
        onClick={onAttemptExit}
      />
    </>,
    document.body
  );
};

export const useFocusedEditorGuard = ({
  active,
  dirty,
  onExit,
  entityLabel = 'ce formulaire',
  overlayAriaLabel = 'Quitter le formulaire',
}: FocusedEditorGuardOptions) => {
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  const handleAttemptExit = useCallback(() => {
    if (dirty) {
      setConfirmExitOpen(true);
      return;
    }

    onExit();
  }, [dirty, onExit]);

  const guard = (
    <>
      <FocusedEditorOverlay
        active={active}
        onAttemptExit={handleAttemptExit}
        overlayAriaLabel={overlayAriaLabel}
      />
      <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le formulaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Des modifications sont en cours. Voulez-vous vraiment quitter {entityLabel} et perdre la saisie non enregistrée ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Rester ici</AlertDialogCancel>
            <AlertDialogAction onClick={onExit}>Quitter le formulaire</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return {
    confirmExitOpen,
    setConfirmExitOpen,
    handleAttemptExit,
    guard,
  };
};
