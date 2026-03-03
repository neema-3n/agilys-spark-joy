--
-- PostgreSQL database dump
--

\restrict klKyGrHLgOwOswie9PRUtC7yOLmjIPm4OP3HYGawwKI3jekEGFk8ul1I2uvx0QK

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
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.user_roles VALUES ('bea44e16-fba9-480e-8717-98f103edcf2a', '282c8ec5-ecbb-44cf-8810-09e566280cae', 'super_admin', '2025-10-18 20:06:12.651149+00');
INSERT INTO public.user_roles VALUES ('79ac4e9c-3ebb-42b3-83a8-8d05c5e5d533', 'fbe0c8e3-b2c8-4165-818f-0338801b9b63', 'admin_client', '2025-10-18 20:06:13.008943+00');
INSERT INTO public.user_roles VALUES ('2441bbdf-dc7f-4945-9675-01281174445a', '4c2a63f7-bce3-4af4-ac44-7b25df3c7cc9', 'directeur_financier', '2025-10-18 20:06:13.286249+00');
INSERT INTO public.user_roles VALUES ('ea135576-f3da-43dd-a0ab-3035ea4d8f53', '8dd5171b-d559-4636-825e-1b183a56c97c', 'comptable', '2025-10-18 20:06:13.572674+00');


--
-- PostgreSQL database dump complete
--

\unrestrict klKyGrHLgOwOswie9PRUtC7yOLmjIPm4OP3HYGawwKI3jekEGFk8ul1I2uvx0QK

