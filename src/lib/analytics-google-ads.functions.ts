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

type Credenziale = z.infer<typeof credenzialeSchema>;

const API_VERSION = "v25";

export type ReportGoogleAds = {
  connected: true;
  valuta: string;
  daily: { date: string; clicks: number; impressions: number; cost: number }[];
  campaigns: {
    name: string;
    clicks: number;
    impressions: number;
    cost: number;
    resourceName: string;
    status: "ENABLED" | "PAUSED" | "REMOVED" | "UNKNOWN";
    budgetResourceName: string | null;
    budgetEuro: number | null;
  }[];
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

async function ottieniAccessToken(cred: Credenziale): Promise<string> {
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

function headersGoogleAds(cred: Credenziale, accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": cred.developer_token,
    "Content-Type": "application/json",
  };
  if (cred.login_customer_id) headers["login-customer-id"] = cred.login_customer_id;
  return headers;
}

async function eseguiGAQL(
  cred: Credenziale,
  accessToken: string,
  query: string,
): Promise<{ results?: Record<string, any>[] }> {
  const res = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers/${cred.customer_id}/googleAds:search`,
    {
      method: "POST",
      headers: headersGoogleAds(cred, accessToken),
      body: JSON.stringify({ query }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Ads API: ${body.slice(0, 400)}`);
  }
  return res.json();
}

async function eseguiMutate(
  cred: Credenziale,
  accessToken: string,
  risorsa: "campaigns" | "campaignBudgets",
  resourceName: string,
  update: Record<string, unknown>,
  updateMask: string,
): Promise<void> {
  const res = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers/${cred.customer_id}/${risorsa}:mutate`,
    {
      method: "POST",
      headers: headersGoogleAds(cred, accessToken),
      body: JSON.stringify({
        operations: [{ update: { resourceName, ...update }, updateMask }],
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Ads API: ${body.slice(0, 400)}`);
  }
}

/** Legge e valida la credenziale Google Ads della proprietà, verificando che
 * chi chiama abbia accesso in lettura (owner o membro invitato). */
async function leggiCredenziale(
  propertyId: string,
  userEmail: string,
): Promise<Credenziale | { errore: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (userEmail !== OWNER_EMAIL) {
    const { data: membro } = await (supabaseAdmin as any)
      .from("property_members")
      .select("id")
      .eq("property_id", propertyId)
      .eq("email", userEmail)
      .maybeSingle();
    if (!membro) throw new Error("Non hai accesso a questa proprietà.");
  }

  const { data: secretRaw, error } = await (supabaseAdmin as any).rpc("leggi_credenziale", {
    p_property_id: propertyId,
    p_provider: "google_ads",
  });
  if (error) throw new Error(error.message);
  if (!secretRaw) return { errore: "Google Ads non è connesso per questa proprietà." };

  try {
    return credenzialeSchema.parse(JSON.parse(secretRaw));
  } catch (err) {
    return {
      errore:
        err instanceof z.ZodError
          ? `Credenziale Google Ads incompleta: ${err.issues.map((i) => i.path.join(".")).join(", ")}.`
          : "Credenziale Google Ads in un formato inatteso.",
    };
  }
}

export const leggiReportGoogleAds = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => z.object({ propertyId: z.string().uuid() }).parse(d))
  .handler(
    async ({ data, context }): Promise<ReportGoogleAds | { connected: false; errore?: string }> => {
      const cred = await leggiCredenziale(data.propertyId, context.userEmail);
      if ("errore" in cred) return { connected: false, errore: cred.errore };

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
            `SELECT campaign.name, campaign.status, campaign.resource_name,
                    campaign_budget.resource_name, campaign_budget.amount_micros,
                    metrics.clicks, metrics.impressions, metrics.cost_micros
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
          resourceName: r.campaign?.resourceName ?? "",
          status: (r.campaign?.status ??
            "UNKNOWN") as ReportGoogleAds["campaigns"][number]["status"],
          budgetResourceName: r.campaignBudget?.resourceName ?? null,
          budgetEuro:
            r.campaignBudget?.amountMicros != null
              ? Number(r.campaignBudget.amountMicros) / 1_000_000
              : null,
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

/** Solo il proprietario può agire su Google Ads: pausa/riattiva una campagna
 * o ne cambia il budget. I sub-account invitati restano sempre di sola lettura. */
export const impostaStatoCampagnaGoogleAds = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) =>
    z
      .object({
        propertyId: z.string().uuid(),
        campaignResourceName: z.string().min(1),
        stato: z.enum(["ENABLED", "PAUSED"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (context.userEmail !== OWNER_EMAIL)
      throw new Error("Solo il proprietario può gestire le campagne.");

    const cred = await leggiCredenziale(data.propertyId, context.userEmail);
    if ("errore" in cred) throw new Error(cred.errore);

    const accessToken = await ottieniAccessToken(cred);
    await eseguiMutate(
      cred,
      accessToken,
      "campaigns",
      data.campaignResourceName,
      { status: data.stato },
      "status",
    );
    return { ok: true as const };
  });

export const impostaBudgetGoogleAds = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) =>
    z
      .object({
        propertyId: z.string().uuid(),
        budgetResourceName: z.string().min(1),
        importoEuro: z
          .number()
          .positive()
          .max(
            1000,
            "Budget massimo 1000€/giorno da qui — per cifre più alte usa direttamente Google Ads.",
          ),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (context.userEmail !== OWNER_EMAIL)
      throw new Error("Solo il proprietario può gestire le campagne.");

    const cred = await leggiCredenziale(data.propertyId, context.userEmail);
    if ("errore" in cred) throw new Error(cred.errore);

    const accessToken = await ottieniAccessToken(cred);
    await eseguiMutate(
      cred,
      accessToken,
      "campaignBudgets",
      data.budgetResourceName,
      { amountMicros: String(Math.round(data.importoEuro * 1_000_000)) },
      "amount_micros",
    );
    return { ok: true as const };
  });
