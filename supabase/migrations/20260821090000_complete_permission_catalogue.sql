-- Neuf permissions manquaient au catalogue alors que des politiques les
-- exigeaient déjà. Aucune règle n'en était bloquée — chacune cite plusieurs
-- codes en alternative — mais trois d'entre elles ne vivaient plus que par
-- leur code de validation : modifier un paiement supposait le pouvoir de
-- décaisser, modifier un bon de commande celui de l'émettre. La séparation
-- des tâches que les rôles standard décrivent s'en trouvait écrasée.

-- Laisser la place aux nouveaux codes dans l'ordre d'affichage : au sein d'un
-- module, on lit, on crée, on modifie, on valide, puis on annule.
UPDATE public.permissions SET ordre = 34 WHERE code = 'reservations.annuler';
UPDATE public.permissions SET ordre = 53 WHERE code = 'bons_commande.valider';
UPDATE public.permissions SET ordre = 83 WHERE code = 'paiements.valider';

INSERT INTO public.permissions (code, module, action, libelle, ordre) VALUES
  ('budgets.annuler',        'budgets',       'annuler',  'Annuler une modification budgétaire', 15),
  ('reservations.modifier',  'reservations',  'modifier', 'Modifier une réservation',            32),
  ('reservations.valider',   'reservations',  'valider',  'Valider une réservation',             33),
  ('bons_commande.modifier', 'bons_commande', 'modifier', 'Modifier un bon de commande',         52),
  ('bons_commande.annuler',  'bons_commande', 'annuler',  'Annuler un bon de commande',          54),
  ('factures.annuler',       'factures',      'annuler',  'Annuler une facture',                 64),
  ('depenses.annuler',       'depenses',      'annuler',  'Annuler une dépense',                 75),
  ('paiements.modifier',     'paiements',     'modifier', 'Modifier un paiement',                82),
  ('paiements.annuler',      'paiements',     'annuler',  'Annuler un paiement',                 84)
ON CONFLICT (code) DO NOTHING;

-- Rattachement aux rôles standard des organisations existantes. Les rôles
-- clonés ne sont pas touchés : leur contenu appartient à l'organisation.

-- Administrateur : tout le catalogue, comme à l'amorçage.
INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, p.code
  FROM public.roles r CROSS JOIN public.permissions p
 WHERE r.est_standard AND r.code = 'admin_client'
ON CONFLICT DO NOTHING;

-- Directeur financier : annuler relève du même niveau que valider.
INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, c.code
  FROM public.roles r
  CROSS JOIN (VALUES ('budgets.annuler'), ('bons_commande.annuler'),
                     ('factures.annuler'), ('depenses.annuler'),
                     ('paiements.annuler'), ('reservations.valider')) AS c(code)
 WHERE r.est_standard AND r.code = 'directeur_financier'
ON CONFLICT DO NOTHING;

-- Chef de service : il crée réservations et bons de commande, il doit pouvoir
-- corriger les siens sans emprunter le pouvoir de les valider.
INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, c.code
  FROM public.roles r
  CROSS JOIN (VALUES ('reservations.modifier'), ('bons_commande.modifier')) AS c(code)
 WHERE r.est_standard AND r.code = 'chef_service'
ON CONFLICT DO NOTHING;

-- Comptable : il prépare les paiements, il les corrige. Le décaissement reste
-- à un autre — c'est tout l'objet de la séparation.
INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, 'paiements.modifier'
  FROM public.roles r
 WHERE r.est_standard AND r.code = 'comptable'
ON CONFLICT DO NOTHING;

-- L'opérateur de saisie et la consultation restent inchangés : le premier ne
-- corrige pas ce qu'il a saisi, la seconde n'écrit rien.

-- Les futures organisations doivent naître avec la même répartition. Seules
-- les listes des rôles concernés changent ; le reste est repris tel quel.
CREATE OR REPLACE FUNCTION public.seed_standard_roles(_client_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role_id uuid;
BEGIN
  -- Administrateur : toutes les permissions du catalogue.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'admin_client', 'Administrateur',
          'Accès complet, y compris la gestion des utilisateurs et des rôles.',
          'admin_client', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions;
  END IF;

  -- Directeur financier : valide et annule, mais ne saisit pas ce qu'il valide.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'directeur_financier', 'Directeur financier',
          'Valide les engagements, les dépenses et les décaissements. Ne saisit pas ce qu''il valide.',
          'directeur_financier', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
     WHERE action IN ('lire', 'exporter')
        OR code IN ('budgets.valider', 'budgets.annuler',
                    'engagements.valider', 'engagements.annuler',
                    'bons_commande.valider', 'bons_commande.annuler',
                    'factures.valider', 'factures.annuler',
                    'depenses.valider', 'depenses.annuler',
                    'paiements.valider', 'paiements.annuler',
                    'reservations.valider', 'reservations.annuler',
                    'comptabilite.cloturer');
  END IF;

  -- Chef de service : engage pour son service, corrige ses pièces, sans valider.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'chef_service', 'Chef de service',
          'Réserve des crédits et prépare les engagements. La validation revient à un autre.',
          'chef_service', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
     WHERE action IN ('lire', 'exporter')
        OR code IN ('reservations.creer', 'reservations.modifier',
                    'engagements.creer', 'engagements.modifier',
                    'bons_commande.creer', 'bons_commande.modifier',
                    'projets.creer', 'projets.modifier');
  END IF;

  -- Comptable : tient la comptabilité, prépare et corrige les paiements,
  -- sans jamais décaisser.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'comptable', 'Comptable',
          'Saisit factures et dépenses, tient la comptabilité, prépare les paiements. Le décaissement revient à un autre.',
          'comptable', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
     WHERE action IN ('lire', 'exporter')
        OR code IN ('factures.creer', 'factures.modifier',
                    'depenses.creer', 'depenses.modifier', 'depenses.supprimer',
                    'paiements.creer', 'paiements.modifier',
                    'comptabilite.gerer', 'tresorerie.gerer', 'tresorerie.rapprocher',
                    'fournisseurs.gerer');
  END IF;

  -- Opérateur de saisie : saisit, ne valide rien, ne supprime rien.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'operateur_saisie', 'Opérateur de saisie',
          'Saisit les pièces. Aucune validation, aucune suppression.',
          'operateur_saisie', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
     WHERE action = 'lire'
        OR code IN ('factures.creer', 'depenses.creer', 'engagements.creer',
                    'reservations.creer', 'bons_commande.creer');
  END IF;

  -- Consultation : lecture et export, rien d'autre. Utile pour un bailleur ou
  -- un auditeur externe, cas frequent dans ce metier.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'lecture_seule', 'Consultation',
          'Lecture et export uniquement. Convient à un auditeur ou à un bailleur.',
          'operateur_saisie', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
     WHERE action IN ('lire', 'exporter')
       AND module <> 'utilisateurs';
  END IF;
END;
$function$;
