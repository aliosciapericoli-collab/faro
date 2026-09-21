import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/supabase/auth-middleware";
import { OWNER_EMAIL } from "@/lib/site";

/**
 * Formato atteso della credenziale GA4 salvata nel Vault: un unico JSON che
 * contiene sia la chiave del service account sia l'ID numerico della
 * proprietà GA4 (diverso dal Measurement ID G-XXXX usato lato client).
 * { "service_account": { ...JSON scaricato da Google Cloud... }, "ga4_property_id": "123456789" }
 */
const credenzialeSchema = z.object({
  service_account: z.record(z.string(), z.unknown()),
  ga4_property_id: z.string().min(1),
});

export type ReportGA4 = {
  connected: true;
  daily: { date: string; activeUsers: number; pageViews: number }[];
  topEvents: { name: string; count: number }[];
};

export const leggiReportGA4 = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => z.object({ propertyId: z.string().uuid() }).parse(d))
  .handler(
    async ({ data, context }): Promise<ReportGA4 | { connected: false; errore?: string }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Il proprietario vede tutto; un membro invitato solo se assegnato a
      // QUESTA proprietà (property_members, controllato qui con il service
      // role perché il membro non ha accesso RLS diretto a quella tabella
      // per righe altrui).
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
        p_provider: "ga4",
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
            'Credenziale GA4 in un formato inatteso. Serve un JSON con {"service_account": {...}, "ga4_property_id": "..."}.',
        };
      }

      try {
        const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
        const client = new BetaAnalyticsDataClient({
          credentials: parsed.service_account as Record<string, string>,
        });
        const property = `properties/${parsed.ga4_property_id}`;

        const [serie] = await client.runReport({
          property,
          dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        });
        const daily = (serie.rows ?? []).map((row) => ({
          date: row.dimensionValues?.[0]?.value ?? "",
          activeUsers: Number(row.metricValues?.[0]?.value ?? 0),
          pageViews: Number(row.metricValues?.[1]?.value ?? 0),
        }));

        const [eventi] = await client.runReport({
          property,
          dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
          limit: 10,
        });
        const topEvents = (eventi.rows ?? []).map((row) => ({
          name: row.dimensionValues?.[0]?.value ?? "",
          count: Number(row.metricValues?.[0]?.value ?? 0),
        }));

        return { connected: true, daily, topEvents };
      } catch (err) {
        return {
          connected: false,
          errore: err instanceof Error ? err.message : "Chiamata alla GA4 Data API non riuscita.",
        };
      }
    },
  );
