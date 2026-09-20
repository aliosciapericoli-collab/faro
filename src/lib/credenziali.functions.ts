import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner } from "@/integrations/supabase/auth-middleware";

export const PROVIDER = ["ga4", "search_console", "google_ads", "meta_ads"] as const;
export type Provider = (typeof PROVIDER)[number];

export const PROVIDER_LABEL: Record<Provider, string> = {
  ga4: "Google Analytics 4",
  search_console: "Google Search Console",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads (Facebook/Instagram)",
};

/**
 * Salva una credenziale nel Vault di Supabase. Il payload non transita mai
 * in chiaro per il client dopo il salvataggio: la RPC gira con service role,
 * l'unica cosa che torna al browser è lo stato "connesso".
 */
export const salvaCredenziale = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((d: unknown) =>
    z
      .object({
        propertyId: z.string().uuid(),
        provider: z.enum(PROVIDER),
        secret: z.string().min(1, "Credenziale vuota"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any).rpc("salva_credenziale", {
      p_property_id: data.propertyId,
      p_provider: data.provider,
      p_secret: data.secret,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const eliminaCredenziale = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((d: unknown) => z.object({ integrationId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).rpc("elimina_credenziale", {
      p_integration_id: data.integrationId,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
