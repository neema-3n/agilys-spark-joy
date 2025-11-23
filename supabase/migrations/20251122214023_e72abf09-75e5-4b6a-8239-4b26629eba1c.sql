-- Fonction pour annuler automatiquement les paiements d'une dépense annulée
CREATE OR REPLACE FUNCTION public.annuler_paiements_depense_annulee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si la dépense vient d'être annulée
  IF NEW.statut = 'annulee' AND OLD.statut != 'annulee' THEN
    -- Annuler tous les paiements valides associés
    UPDATE public.paiements
    SET 
      statut = 'annule',
      motif_annulation = 'Dépense annulée : ' || COALESCE(NEW.motif_annulation, 'Aucun motif'),
      date_annulation = CURRENT_DATE,
      updated_at = now()
    WHERE depense_id = NEW.id
      AND statut = 'valide';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger qui s'exécute APRÈS l'update d'une dépense
CREATE TRIGGER trg_annuler_paiements_depense_annulee
AFTER UPDATE ON public.depenses
FOR EACH ROW
WHEN (NEW.statut = 'annulee' AND OLD.statut IS DISTINCT FROM 'annulee')
EXECUTE FUNCTION public.annuler_paiements_depense_annulee();

COMMENT ON FUNCTION public.annuler_paiements_depense_annulee() IS 
'Annule automatiquement tous les paiements valides lorsqu''une dépense est annulée';

COMMENT ON TRIGGER trg_annuler_paiements_depense_annulee ON public.depenses IS 
'Déclenche l''annulation automatique des paiements lors de l''annulation d''une dépense';