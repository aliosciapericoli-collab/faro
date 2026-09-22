import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/supabase/auth-middleware";
import { OWNER_EMAIL } from "@/lib/site";

/**
 * Formato atteso della credenziale Lovable Analytics salvata nel Vault:
 * { "api_key": "lov_...", "project_id": "..." }. La chiave si crea su
 * Lovable → Settings → Access tokens (richiede piano Business o superiore).
 * A differenza di GA4, questi numeri non dipendono dal consenso cookie del
 * visitatore: Lovable misura il traffico lato server/edge.
 */
const credenzialeSchema = z.object({
  api_key: z.string().min(1).regex(/^lov_/, "L'API key di Lovable inizia con 'lov_'"),
  project_id: z.string().min(1),
});

export type ReportLovable = {
  connected: true;
  daily: { date: string; visitors: number; pageviews: number }[];
  totali: { visitors: number; pageviews: number; bounceRate: number };
  pagine: { path: string; visite: number }[];
  sorgenti: { nome: string; visite: number }[];
};

function formattaData(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sottraiGiorni(giorni: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - giorni);
  return d;
}

async function chiamaLovable(cred: z.infer<typeof credenzialeSchema>, path: string): Promise<any> {
  const res = await fetch(`https://api.lovable.dev/v1${path}`, {
    headers: {
      "Lovable-API-Key": cred.api_key,
      "Lovable-Version": "2026-09-11",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Lovable API: ${body.slice(0, 400)}`);
  }
  return res.json();
}

export const leggiReportLovable = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => z.object({ propertyId: z.string().uuid() }).parse(d))
  .handler(
    async ({ data, context }): Promise<ReportLovable | { connected: false; errore?: string }> => {
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
        p_provider: "lovable_analytics",
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
              ? `Credenziale Lovable incompleta: ${err.issues.map((i) => i.path.join(".")).join(", ")}.`
              : "Credenziale Lovable in un formato inatteso. Serve un JSON con api_key e project_id.",
        };
      }

      try {
        const inizio = formattaData(sottraiGiorni(27));
        const oggi = formattaData(new Date());

        const [analytics, breakdowns] = await Promise.all([
          chiamaLovable(
            cred,
            `/projects/${cred.project_id}/analytics?starts_at=${inizio}T00:00:00Z&ends_at=${oggi}T23:59:59Z&granularity=daily`,
          ),
          chiamaLovable(
            cred,
            `/projects/${cred.project_id}/analytics/breakdowns?starts_at=${inizio}T00:00:00Z&ends_at=${oggi}T23:59:59Z`,
          ).catch(() => null),
        ]);

        const ts = analytics.time_series ?? {};
        const visitorsData: { timestamp: string; value: number }[] = ts.visitors?.data ?? [];
        const pageviewsData: { timestamp: string; value: number }[] = ts.pageviews?.data ?? [];
        const pageviewsByDate = new Map(
          pageviewsData.map((d) => [d.timestamp.slice(0, 10), d.value]),
        );

        const daily = visitorsData.map((d) => ({
          date: d.timestamp.slice(0, 10),
          visitors: d.value,
          pageviews: pageviewsByDate.get(d.timestamp.slice(0, 10)) ?? 0,
        }));

        const pagine =
          breakdowns?.pages?.map((p: { label: string; visitors: number }) => ({
            path: p.label,
            visite: p.visitors,
          })) ?? [];
        const sorgenti =
          breakdowns?.sources?.map((s: { label: string; visitors: number }) => ({
            nome: s.label,
            visite: s.visitors,
          })) ?? [];

        return {
          connected: true,
          daily,
          totali: {
            visitors: ts.visitors?.total ?? 0,
            pageviews: ts.pageviews?.total ?? 0,
            bounceRate: ts.bounce_rate?.total ?? 0,
          },
          pagine: pagine.slice(0, 8),
          sorgenti: sorgenti.slice(0, 6),
        };
      } catch (err) {
        return {
          connected: false,
          errore: err instanceof Error ? err.message : "Chiamata alla Lovable API non riuscita.",
        };
      }
    },
  );
