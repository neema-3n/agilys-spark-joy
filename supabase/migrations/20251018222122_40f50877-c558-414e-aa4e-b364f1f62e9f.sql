-- Ajouter les priorités de projet dans les référentiels
INSERT INTO public.parametres_referentiels (client_id, categorie, code, libelle, description, ordre, actif, modifiable) VALUES
('client-1', 'priorite_projet', 'haute', 'Haute', 'Priorité haute - urgent', 1, true, true),
('client-1', 'priorite_projet', 'moyenne', 'Moyenne', 'Priorité moyenne - standard', 2, true, true),
('client-1', 'priorite_projet', 'basse', 'Basse', 'Priorité basse - peut attendre', 3, true, true);