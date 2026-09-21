import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/supabase/auth-middleware";
import { OWNER_EMAIL } from "@/lib/site";

/**
 * Formato atteso della credenziale Google Ads salvata nel Vault. A differenza
 * di GA4/Search Console, l'API Google Ads non accetta un service account per
 * un account Google normale: serve un client OAuth (Google Cloud Console) più
 * un refresh token ottenuto una tantum autorizzando l'app (es. via OAuth 2.0
 * Playground), oltre al developer token rilasciato dal Centro API di Google
 * Ads e all'ID del cliente (l'account Ads da leggere, senza trattini).
 * { "developer_token": "...", "client_id": "....apps.googleusercontent.com",
 *   "client_secret": "...", "refresh_token": "1//...", "customer_id": "1234567890",
 *   "login_customer_id": "1234567890" }  <- login_customer_id solo se customer_id
 *   è gestito da un account manager (MCC), altrimenti si omette.
 */
const credenzialeSchema = z.object({
  developer_token: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  refresh_token: z.string().min(1),
  customer_id: z.string().regex(/^\d{10}$/, "customer_id deve avere 10 cifre, senza trattini"),
  login_customer_id: z
    .string()
    .regex(/^\d{10}$/)
    .optional(),
});

const API_VERSION = "v25";

export type ReportGoogleAds = {
  connected: true;
  valuta: string;
  daily: { date: string; clicks: number; impressions: number; cost: number }[];
  campaigns: { name: string; clicks: number; impressions: number; cost: number }[];
  variazione: { clicks: number | null; impressions: number | null; cost: number | null };
};

function formattaData(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sottraiGiorni(giorni: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - giorni);
  return d;
}

async function ottieniAccessToken(cred: z.infer<typeof credenzialeSchema>): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cred.client_id,
      client_secret: cred.client_secret,
      refresh_token: cred.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Refresh token OAuth non riuscito: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function eseguiGAQL(
  cred: z.infer<typeof credenzialeSchema>,
  accessToken: string,
  query: string,
): Promise<{ results?: Record<string, any>[] }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": cred.developer_token,
    "Content-Type": "application/json",
  };
  if (cred.login_customer_id) headers["login-customer-id"] = cred.login_customer_id;

  const res = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers/${cred.customer_id}/googleAds:search`,
    { method: "POST", headers, body: JSON.stringify({ query }) },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Ads API: ${body.slice(0, 400)}`);
  }
  return res.json();
}

export const leggiReportGoogleAds = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => z.object({ propertyId: z.string().uuid() }).parse(d))
  .handler(
    async ({ data, context }): Promise<ReportGoogleAds | { connected: false; errore?: string }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      if (context.userEmail !== OWNER_EMAIL) {
        const { data: membro } = await (supabaseAdmin as any)
          .from("property_members")
          .select("id")
          .eq("property_id", data.propertyId)
          .eq("email", context.userEmail)
          .maybeSingle();
        if (!membro) throw new Error("Non hai accesso a questa proprietà.");
      }

      const { data: secretRaw, error } = await (supabaseAdmin as any).rpc("leggi_credenziale", {
        p_property_id: data.propertyId,
        p_provider: "google_ads",
      });
      if (error) throw new Error(error.message);
      if (!secretRaw) return { connected: false };

      let cred: z.infer<typeof credenzialeSchema>;
      try {
        cred = credenzialeSchema.parse(JSON.parse(secretRaw));
      } catch (err) {
        return {
          connected: false,
          errore:
            err instanceof z.ZodError
              ? `Credenziale Google Ads incompleta: ${err.issues.map((i) => i.path.join(".")).join(", ")}.`
              : "Credenziale Google Ads in un formato inatteso. Serve un JSON con developer_token, client_id, client_secret, refresh_token, customer_id.",
        };
      }

      try {
        const accessToken = await ottieniAccessToken(cred);
        const inizio28 = formattaData(sottraiGiorni(28));
        const inizio56 = formattaData(sottraiGiorni(56));
        const fine29 = formattaData(sottraiGiorni(29));
        const oggi = formattaData(new Date());

        const [giornaliero, campagne, precedente, cliente] = await Promise.all([
          eseguiGAQL(
            cred,
            accessToken,
            `SELECT segments.date, metrics.clicks, metrics.impressions, metrics.cost_micros
             FROM customer WHERE segments.date BETWEEN '${inizio28}' AND '${oggi}'
             ORDER BY segments.date ASC`,
          ),
          eseguiGAQL(
            cred,
            accessToken,
            `SELECT campaign.name, metrics.clicks, metrics.impressions, metrics.cost_micros
             FROM campaign WHERE segments.date BETWEEN '${inizio28}' AND '${oggi}'
             ORDER BY metrics.cost_micros DESC LIMIT 10`,
          ),
          eseguiGAQL(
            cred,
            accessToken,
            `SELECT metrics.clicks, metrics.impressions, metrics.cost_micros
             FROM customer WHERE segments.date BETWEEN '${inizio56}' AND '${fine29}'`,
          ),
          eseguiGAQL(cred, accessToken, `SELECT customer.currency_code FROM customer LIMIT 1`),
        ]);

        const valuta = cliente.results?.[0]?.customer?.currencyCode ?? "EUR";
        const daily = (giornaliero.results ?? []).map((r) => ({
          date: r.segments?.date ?? "",
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: Number(r.metrics?.costMicros ?? 0) / 1_000_000,
        }));
        const campaigns = (campagne.results ?? []).map((r) => ({
          name: r.campaign?.name ?? "",
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: Number(r.metrics?.costMicros ?? 0) / 1_000_000,
        }));
        const prev = precedente.results?.[0]?.metrics ?? {};
        const prevClicks = Number(prev.clicks ?? 0);
        const prevImpressions = Number(prev.impressions ?? 0);
        const prevCost = Number(prev.costMicros ?? 0) / 1_000_000;
        const totClicks = daily.reduce((s, d) => s + d.clicks, 0);
        const totImpressions = daily.reduce((s, d) => s + d.impressions, 0);
        const totCost = daily.reduce((s, d) => s + d.cost, 0);
        const variazionePct = (attuale: number, precedente: number) =>
          precedente > 0 ? ((attuale - precedente) / precedente) * 100 : null;

        return {
          connected: true,
          valuta,
          daily,
          campaigns,
          variazione: {
            clicks: variazionePct(totClicks, prevClicks),
            impressions: variazionePct(totImpressions, prevImpressions),
            cost: variazionePct(totCost, prevCost),
          },
        };
      } catch (err) {
        return {
          connected: false,
          errore: err instanceof Error ? err.message : "Chiamata alla Google Ads API non riuscita.",
        };
      }
    },
  );
