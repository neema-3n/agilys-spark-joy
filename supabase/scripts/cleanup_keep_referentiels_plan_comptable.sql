-- Cleanup urgent - Task 2
-- Purge all business data in public schema while preserving:
-- - public.comptes
-- - public.parametres_referentiels
-- - public.profiles
-- - public.user_roles
-- - auth.users (never touched by this script)

CREATE TEMP TABLE IF NOT EXISTS cleanup_audit_counts (
  phase text NOT NULL,
  table_name text NOT NULL,
  row_count bigint NOT NULL
);

TRUNCATE TABLE cleanup_audit_counts;

DO $$
DECLARE
  rec record;
  table_rows bigint;
BEGIN
  -- Snapshot counts before cleanup (public schema + auth.users).
  FOR rec IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', rec.tablename) INTO table_rows;
    INSERT INTO cleanup_audit_counts (phase, table_name, row_count)
    VALUES ('before', format('public.%s', rec.tablename), table_rows);
  END LOOP;

  SELECT count(*) INTO table_rows FROM auth.users;
  INSERT INTO cleanup_audit_counts (phase, table_name, row_count)
  VALUES ('before', 'auth.users', table_rows);
END $$;

BEGIN;

DO $$
DECLARE
  excluded_tables constant text[] := ARRAY[
    'comptes',
    'parametres_referentiels',
    'profiles',
    'user_roles'
  ];
  truncate_list text;
BEGIN
  -- FK-safe purge: TRUNCATE selected business tables in one statement with CASCADE.
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename)
  INTO truncate_list
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> ALL (excluded_tables);

  IF truncate_list IS NOT NULL THEN
    EXECUTE format('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', truncate_list);
  END IF;
END $$;

COMMIT;

DO $$
DECLARE
  rec record;
  table_rows bigint;
BEGIN
  -- Snapshot counts after cleanup (public schema + auth.users).
  FOR rec IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', rec.tablename) INTO table_rows;
    INSERT INTO cleanup_audit_counts (phase, table_name, row_count)
    VALUES ('after', format('public.%s', rec.tablename), table_rows);
  END LOOP;

  SELECT count(*) INTO table_rows FROM auth.users;
  INSERT INTO cleanup_audit_counts (phase, table_name, row_count)
  VALUES ('after', 'auth.users', table_rows);
END $$;

WITH pivot AS (
  SELECT
    table_name,
    max(CASE WHEN phase = 'before' THEN row_count END) AS before_count,
    max(CASE WHEN phase = 'after' THEN row_count END) AS after_count
  FROM cleanup_audit_counts
  GROUP BY table_name
)
SELECT
  table_name,
  before_count,
  after_count,
  CASE
    WHEN table_name IN (
      'public.comptes',
      'public.parametres_referentiels',
      'public.profiles',
      'public.user_roles',
      'auth.users'
    ) THEN
      CASE
        WHEN before_count = after_count THEN 'OK_KEPT'
        ELSE 'WARNING_CHANGED'
      END
    ELSE
      CASE
        WHEN after_count = 0 THEN 'OK_PURGED'
        ELSE 'WARNING_NOT_EMPTY'
      END
  END AS status
FROM pivot
ORDER BY table_name;
