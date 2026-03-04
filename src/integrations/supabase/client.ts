/**
 * Legacy Supabase runtime is intentionally disabled.
 * Any runtime import of this module is a migration error.
 */
export const supabase = new Proxy(
  {},
  {
    get() {
      throw new Error(
        'Supabase runtime client is decommissioned. Use the unified NestJS API services instead.'
      );
    }
  }
);
