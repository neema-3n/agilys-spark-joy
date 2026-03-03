--
-- PostgreSQL database dump
--

\restrict voa9T44wDv9c76IRmfSTMCrNGryMjiUUlkzkPrvxW2EvpCrNbyQObhUDw71uBJ3

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: parametres_referentiels; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.parametres_referentiels VALUES ('e4e06608-0235-4688-bc07-82195e8f67c1', 'client-1', 'compte_type', 'actif', 'Actif', NULL, 1, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('6fdae240-fcc4-45f6-926b-1c0e0d603a04', 'client-1', 'compte_type', 'passif', 'Passif', NULL, 2, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('53c2286c-ae0a-4f45-9809-cf6a69bad76b', 'client-1', 'compte_type', 'charge', 'Charge', NULL, 3, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('d67f4dde-3996-4105-8cdd-83d4ab17fa9b', 'client-1', 'compte_type', 'produit', 'Produit', NULL, 4, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('ef18842c-7cfb-4c67-ad34-345b17bf67fe', 'client-1', 'compte_type', 'resultat', 'Résultat', NULL, 5, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('b06d5724-92a1-4186-8947-b16202c51ee6', 'client-1', 'compte_categorie', 'immobilisation', 'Immobilisation', NULL, 1, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('445eeab8-79b7-49ee-b455-cabde64cce76', 'client-1', 'compte_categorie', 'stock', 'Stock', NULL, 2, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('f54e1da7-ac94-4502-af4a-40ea0ad82a4e', 'client-1', 'compte_categorie', 'creance', 'Créance', NULL, 3, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('b506d375-eb69-41c1-acfb-8b64283f2282', 'client-1', 'compte_categorie', 'tresorerie', 'Trésorerie', NULL, 4, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('286dcc78-8c53-418e-a5dc-7bba5ebfded9', 'client-1', 'compte_categorie', 'dette', 'Dette', NULL, 5, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('02ee4522-36af-4ff8-a951-5a1a0b86642f', 'client-1', 'compte_categorie', 'capital', 'Capital', NULL, 6, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('522517ae-c96f-44bf-b714-703ec85135ed', 'client-1', 'compte_categorie', 'exploitation', 'Exploitation', NULL, 7, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('3c8ab022-cc58-442c-aa9d-f5be60cc6490', 'client-1', 'compte_categorie', 'financier', 'Financier', NULL, 8, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('11dc1e4a-5304-4209-ae2c-28ba91dc55e2', 'client-1', 'compte_categorie', 'exceptionnel', 'Exceptionnel', NULL, 9, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('de800032-d162-45f5-b7aa-735ed790361c', 'client-1', 'compte_categorie', 'autre', 'Autre', NULL, 10, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('3825ff8b-4be0-4b11-a567-00a2bd38e097', 'client-1', 'structure_type', 'entite', 'Entité', NULL, 1, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('582e4fcc-505b-4bc5-8267-c33d61d4a1d6', 'client-1', 'structure_type', 'service', 'Service', NULL, 2, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('68dbd0e3-d227-48c1-bd96-aedc8149e72d', 'client-1', 'structure_type', 'centre_cout', 'Centre de coût', NULL, 3, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('c338c8a0-20d0-4fea-9072-39bc94793fca', 'client-1', 'structure_type', 'direction', 'Direction', NULL, 4, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('8ca6aea9-e077-4b1d-8ad8-eb79430920ed', 'client-1', 'source_financement', 'budget_etat', 'Budget État', NULL, 1, true, true, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('db61f0ab-e193-40f9-b429-e601fb166481', 'client-1', 'source_financement', 'fonds_propres', 'Fonds propres', NULL, 2, true, true, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('d29570df-b4d7-4957-85e6-0c3d1a419086', 'client-1', 'source_financement', 'subvention', 'Subvention', NULL, 3, true, true, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('04cf82ae-6190-4a94-81e8-fc82bfb34ab9', 'client-1', 'source_financement', 'emprunt', 'Emprunt', NULL, 4, true, true, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('078c5317-9bcf-4579-aafe-d9ea2052bff3', 'client-1', 'source_financement', 'partenaire', 'Partenaire', NULL, 5, true, true, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('7e9cea3c-d54c-4a49-8b1d-5de513c4f61b', 'client-1', 'statut_general', 'actif', 'Actif', NULL, 1, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('28139b46-7c70-4266-9bfb-35b60652c623', 'client-1', 'statut_general', 'inactif', 'Inactif', NULL, 2, true, false, '2025-10-18 21:40:42.311652+00', '2025-10-18 21:40:42.311652+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('6788b408-90f6-4ed0-bc29-668edf966179', 'client-1', 'compte_categorie', 'test', 'test', '', 0, true, true, '2025-10-18 21:53:41.325955+00', '2025-10-18 21:53:41.325955+00', '282c8ec5-ecbb-44cf-8810-09e566280cae');
INSERT INTO public.parametres_referentiels VALUES ('bb1aabc9-1e07-464d-96b1-87fb1b1b2c18', 'client-1', 'type_projet', 'infrastructure', 'Infrastructure', 'Projets d''infrastructure et équipements', 1, true, true, '2025-10-18 22:09:44.836406+00', '2025-10-18 22:09:44.836406+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('5f33a1e2-2cae-4dfa-8277-6e9caecdf1cf', 'client-1', 'type_projet', 'formation', 'Formation', 'Projets de formation et renforcement des capacités', 2, true, true, '2025-10-18 22:09:44.836406+00', '2025-10-18 22:09:44.836406+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('94366b44-f388-483c-ba29-f9df271beb57', 'client-1', 'type_projet', 'sante', 'Santé', 'Projets du secteur santé', 3, true, true, '2025-10-18 22:09:44.836406+00', '2025-10-18 22:09:44.836406+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('d33f86b7-7ee0-4b4a-a621-b718992a121b', 'client-1', 'type_projet', 'education', 'Éducation', 'Projets du secteur éducation', 4, true, true, '2025-10-18 22:09:44.836406+00', '2025-10-18 22:09:44.836406+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('9507f123-742f-45da-b8d6-4112a75c0ce3', 'client-1', 'type_projet', 'autre', 'Autre', 'Autres types de projets', 5, true, true, '2025-10-18 22:09:44.836406+00', '2025-10-18 22:09:44.836406+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('3bd33611-b1a3-4d28-9ff8-45070ede8bc3', 'client-1', 'statut_projet', 'planifie', 'Planifié', 'Projet en phase de planification', 1, true, true, '2025-10-18 22:09:44.836406+00', '2025-10-18 22:09:44.836406+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('ef64d4f9-45c9-47f7-abc0-88f7bc2748b1', 'client-1', 'statut_projet', 'en_cours', 'En cours', 'Projet en cours d''exécution', 2, true, true, '2025-10-18 22:09:44.836406+00', '2025-10-18 22:09:44.836406+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('211faed3-facf-4ac1-a4ab-18e576a2cdfc', 'client-1', 'statut_projet', 'en_attente', 'En attente', 'Projet en attente de décision ou déblocage', 3, true, true, '2025-10-18 22:09:44.836406+00', '2025-10-18 22:09:44.836406+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('8e0f5754-9deb-4d73-aec8-f503a7ddf2f3', 'client-1', 'statut_projet', 'termine', 'Terminé', 'Projet terminé et clôturé', 4, true, true, '2025-10-18 22:09:44.836406+00', '2025-10-18 22:09:44.836406+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('71fb0f48-004f-4b14-9646-9b3547aaf7bc', 'client-1', 'statut_projet', 'annule', 'Annulé', 'Projet annulé', 5, true, true, '2025-10-18 22:09:44.836406+00', '2025-10-18 22:09:44.836406+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('df3f1d1d-7194-4211-911b-6d64da4b24b0', 'client-1', 'priorite_projet', 'haute', 'Haute', 'Priorité haute - urgent', 1, true, true, '2025-10-18 22:21:21.022625+00', '2025-10-18 22:21:21.022625+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('15da5d0f-ac57-4363-bc1d-ef70c8409f8d', 'client-1', 'priorite_projet', 'moyenne', 'Moyenne', 'Priorité moyenne - standard', 2, true, true, '2025-10-18 22:21:21.022625+00', '2025-10-18 22:21:21.022625+00', NULL);
INSERT INTO public.parametres_referentiels VALUES ('fae8ef61-fa99-4215-b774-f2bc61ee33a6', 'client-1', 'priorite_projet', 'basse', 'Basse', 'Priorité basse - peut attendre', 3, true, true, '2025-10-18 22:21:21.022625+00', '2025-10-18 22:21:21.022625+00', NULL);


--
-- PostgreSQL database dump complete
--

\unrestrict voa9T44wDv9c76IRmfSTMCrNGryMjiUUlkzkPrvxW2EvpCrNbyQObhUDw71uBJ3

