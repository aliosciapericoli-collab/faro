import { createClient } from "@supabase/supabase-js";

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Variabili Supabase mancanti (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). Copia .env.example in .env e compilalo.",
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

/** Client browser (chiave pubblica, soggetto a RLS). */
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
