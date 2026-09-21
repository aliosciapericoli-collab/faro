import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/supabase/auth-middleware";
import { OWNER_EMAIL } from "@/lib/site";

/**
 * Formato atteso della credenziale Search Console salvata nel Vault: il
 * service account, più l'identificativo esatto della proprietà così come
 * censita in Search Console — non è detto che coincida con l'URL salvato in
 * Faro (una proprietà a dominio usa il formato "sc-domain:esempio.it", una a
 * prefisso URL usa l'URL verificato per intero, con lo slash finale).
 * { "service_account": { ...JSON scaricato da Google Cloud... }, "site_url": "sc-domain:esempio.it" }
 */
const credenzialeSchema = z.object({
  service_account: z.record(z.string(), z.unknown()),
  site_url: z.string().min(1),
});

export type ReportSearchConsole = {
  connected: true;
  daily: { date: string; clicks: number; impressions: number }[];
  topQueries: { query: string; clicks: number; impressions: number }[];
  variazione: { clicks: number | null; impressions: number | null };
};

function formattaData(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sottraiGiorni(giorni: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - giorni);
  return d;
}

export const leggiReportSearchConsole = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => z.object({ propertyId: z.string().uuid() }).parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<ReportSearchConsole | { connected: false; errore?: string }> => {
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
        p_provider: "search_console",
      });
      if (error) throw new Error(error.message);
      if (!secretRaw) return { connected: false };

      let parsed: z.infer<typeof credenzialeSchema>;
      try {
        parsed = credenzialeSchema.parse(JSON.parse(secretRaw));
      } catch {
        return {
          connected: false,
          errore:
            'Credenziale Search Console in un formato inatteso. Serve un JSON con {"service_account": {...}, "site_url": "..."}.',
        };
      }

      try {
        const { JWT } = await import("google-auth-library");
        const sa = parsed.service_account as { client_email?: string; private_key?: string };
        if (!sa.client_email || !sa.private_key) {
          return { connected: false, errore: "service_account senza client_email o private_key." };
        }
        const client = new JWT({
          email: sa.client_email,
          key: sa.private_key,
          scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        });

        const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(parsed.site_url)}/searchAnalytics/query`;
        const oggi = new Date();
        const query = async (body: Record<string, unknown>) => {
          const res = await client.request<{
            rows?: { keys?: string[]; clicks?: number; impressions?: number }[];
          }>({ url: base, method: "POST", data: body });
          return res.data.rows ?? [];
        };

        const righeGiornaliere = await query({
          startDate: formattaData(sottraiGiorni(28)),
          endDate: formattaData(oggi),
          dimensions: ["date"],
          rowLimit: 1000,
        });
        const daily = righeGiornaliere
          .map((r) => ({
            date: r.keys?.[0] ?? "",
            clicks: r.clicks ?? 0,
            impressions: r.impressions ?? 0,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const righeQuery = await query({
          startDate: formattaData(sottraiGiorni(28)),
          endDate: formattaData(oggi),
          dimensions: ["query"],
          rowLimit: 10,
        });
        const topQueries = righeQuery.map((r) => ({
          query: r.keys?.[0] ?? "",
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
        }));

        const righePrecedenti = await query({
          startDate: formattaData(sottraiGiorni(56)),
          endDate: formattaData(sottraiGiorni(29)),
          rowLimit: 1,
        });
        const prevClicks = righePrecedenti[0]?.clicks ?? 0;
        const prevImpressions = righePrecedenti[0]?.impressions ?? 0;
        const totaleClicks = daily.reduce((s, d) => s + d.clicks, 0);
        const totaleImpressions = daily.reduce((s, d) => s + d.impressions, 0);
        const variazionePct = (attuale: number, precedente: number) =>
          precedente > 0 ? ((attuale - precedente) / precedente) * 100 : null;

        return {
          connected: true,
          daily,
          topQueries,
          variazione: {
            clicks: variazionePct(totaleClicks, prevClicks),
            impressions: variazionePct(totaleImpressions, prevImpressions),
          },
        };
      } catch (err) {
        return {
          connected: false,
          errore:
            err instanceof Error ? err.message : "Chiamata alla Search Console API non riuscita.",
        };
      }
    },
  );
