-- Le lot B n'etait pas termine : quatre tables portent un statut traduisant un
-- acte humain sans aucun garde de transition.
--
-- Le cas le plus flagrant est modifications_budgetaires. Le catalogue annonce
-- « Valider une modification budgetaire » sous le code budgets.valider, mais
-- rien ne l'appliquait : n'importe qui pouvant modifier la table pouvait faire
-- passer une modification en validee. C'est exactement la permission
-- decorative que cette tranche etait censee supprimer.

DO $$
DECLARE
  v_conf record;
BEGIN
  FOR v_conf IN
    SELECT * FROM (VALUES
      -- table,                      module,         etats de validation,  etats d'annulation, permission explicite
      ('modifications_budgetaires', 'budgets',      'validee',            'rejetee',          NULL),
      ('rapprochements_bancaires',  'tresorerie',   'valide',             'annule',           'tresorerie.rapprocher'),
      ('recettes',                  'tresorerie',   'validee',            'annulee',          'tresorerie.gerer'),
      ('operations_tresorerie',     'tresorerie',   'validee',            'annulee',          'tresorerie.gerer')
    ) AS t(tbl, module, valider, annuler, permission)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS statut_transition_%1$s ON public.%1$I', v_conf.tbl);

    IF v_conf.permission IS NULL THEN
      EXECUTE format(
        'CREATE TRIGGER statut_transition_%1$s
           BEFORE UPDATE OF statut ON public.%1$I
           FOR EACH ROW EXECUTE FUNCTION public.enforce_statut_transition(%2$L, %3$L, %4$L)',
        v_conf.tbl, v_conf.module, v_conf.valider, v_conf.annuler);
    ELSE
      -- Le module tresorerie n'a ni .valider ni .annuler : ses actes relevent
      -- de .gerer, et le rapprochement de .rapprocher.
      EXECUTE format(
        'CREATE TRIGGER statut_transition_%1$s
           BEFORE UPDATE OF statut ON public.%1$I
           FOR EACH ROW EXECUTE FUNCTION public.enforce_statut_transition(%2$L, %3$L, %4$L, %5$L)',
        v_conf.tbl, v_conf.module, v_conf.valider, v_conf.annuler, v_conf.permission);
    END IF;
  END LOOP;
END;
$$;
