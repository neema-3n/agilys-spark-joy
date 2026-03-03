--
-- PostgreSQL database dump
--

\restrict mYmdPiLNNII9Gg0ajy0wkSWoPySGiHpKmtTzMtrRJunW0PauicpAprtiOdsraGP

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
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.profiles VALUES ('282c8ec5-ecbb-44cf-8810-09e566280cae', 'super@agilys.com', 'Super', 'Admin', 'agilys-hq', '2025-10-18 20:06:12.056138+00', '2025-10-18 20:06:12.056138+00');
INSERT INTO public.profiles VALUES ('fbe0c8e3-b2c8-4165-818f-0338801b9b63', 'admin@portonovo.bj', 'Admin', 'Client', 'client-1', '2025-10-18 20:06:12.898247+00', '2025-10-18 20:06:12.898247+00');
INSERT INTO public.profiles VALUES ('4c2a63f7-bce3-4af4-ac44-7b25df3c7cc9', 'directeur@portonovo.bj', 'Directeur', 'Financier', 'client-1', '2025-10-18 20:06:13.215807+00', '2025-10-18 20:06:13.215807+00');
INSERT INTO public.profiles VALUES ('8dd5171b-d559-4636-825e-1b183a56c97c', 'comptable@portonovo.bj', 'Comptable', 'Test', 'client-1', '2025-10-18 20:06:13.499343+00', '2025-10-18 20:06:13.499343+00');


--
-- PostgreSQL database dump complete
--

\unrestrict mYmdPiLNNII9Gg0ajy0wkSWoPySGiHpKmtTzMtrRJunW0PauicpAprtiOdsraGP

