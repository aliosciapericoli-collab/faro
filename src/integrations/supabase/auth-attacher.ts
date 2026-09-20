import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

/**
 * Registrato come functionMiddleware globale in src/start.ts: senza questo
 * il browser non allega mai il bearer token alle chiamate serverFn, e
 * requireOwner le rifiuta tutte con "Non autorizzato".
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
