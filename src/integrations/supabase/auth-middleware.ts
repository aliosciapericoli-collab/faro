import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { OWNER_EMAIL } from "@/lib/site";

async function getAuthenticatedEmail(): Promise<string> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Variabili Supabase mancanti lato server.");
  }

  const request = getRequest();
  const authHeader = request?.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Non autorizzato: nessun token.");
  }
  const token = authHeader.slice("Bearer ".length);

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  const email = data?.claims?.email as string | undefined;
  if (error || !data?.claims || !email) {
    throw new Error("Non autorizzato.");
  }
  return email;
}

/** Qualunque utente con una sessione Supabase valida (proprietario o membro invitato). */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const email = await getAuthenticatedEmail();
  return next({ context: { userEmail: email } });
});

/**
 * Solo il proprietario. Faro è a utente singolo per la gestione (proprietà,
 * credenziali): un membro invitato passa da requireAuth + un controllo
 * mirato su property_members, mai da qui.
 */
export const requireOwner = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const email = await getAuthenticatedEmail();
  if (email !== OWNER_EMAIL) {
    throw new Error("Non autorizzato.");
  }
  return next({ context: { userEmail: email } });
});
