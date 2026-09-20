import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listaIntegrazioni, type Integration, type Property } from "@/lib/proprieta";
import {
  PROVIDER,
  PROVIDER_LABEL,
  salvaCredenziale,
  eliminaCredenziale,
  type Provider,
} from "@/lib/credenziali.functions";

export const Route = createFileRoute("/_authenticated/proprieta/$id")({
  component: ProprietaDetail,
});

function ProprietaDetail() {
  const { id } = Route.useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const ricarica = useCallback(async () => {
    const [{ data: prop }, ints] = await Promise.all([
      supabase.from("properties").select("id, name, url, note, created_at").eq("id", id).single(),
      listaIntegrazioni(),
    ]);
    setProperty(prop as Property);
    setIntegrations(ints.filter((i) => i.property_id === id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    ricarica();
  }, [ricarica]);

  if (loading) return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  if (!property) return <p className="text-sm text-muted-foreground">Proprietà non trovata.</p>;

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Tutte le proprietà
      </Link>
      <h1 className="mt-3 text-3xl font-semibold text-primary">{property.name}</h1>
      {property.url && <p className="mt-1 text-sm text-muted-foreground">{property.url}</p>}

      <div className="mt-8 grid gap-3">
        {PROVIDER.map((provider) => {
          const integration = integrations.find((i) => i.provider === provider);
          return (
            <IntegrationCard
              key={provider}
              propertyId={property.id}
              provider={provider}
              integration={integration}
              onChange={ricarica}
            />
          );
        })}
      </div>
    </div>
  );
}

function IntegrationCard({
  propertyId,
  provider,
  integration,
  onChange,
}: {
  propertyId: string;
  provider: Provider;
  integration: Integration | undefined;
  onChange: () => void;
}) {
  const [espanso, setEspanso] = useState(false);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const salva = useServerFn(salvaCredenziale);
  const elimina = useServerFn(eliminaCredenziale);

  const connesso = integration?.status === "connected";

  const onSalva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim() || busy) return;
    setBusy(true);
    setErrore(null);
    try {
      await salva({ data: { propertyId, provider, secret: secret.trim() } });
      setSecret("");
      setEspanso(false);
      onChange();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setBusy(false);
    }
  };

  const onDisconnetti = async () => {
    if (!integration || busy) return;
    setBusy(true);
    try {
      await elimina({ data: { integrationId: integration.id } });
      onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {connesso ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-accent" />
          ) : (
            <Circle className="h-4.5 w-4.5 text-muted-foreground" />
          )}
          <span className="font-medium text-primary">{PROVIDER_LABEL[provider]}</span>
        </div>
        {connesso ? (
          <button
            type="button"
            onClick={onDisconnetti}
            disabled={busy}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Disconnetti
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEspanso((v) => !v)}
            className="text-xs font-semibold text-accent hover:underline"
          >
            {espanso ? "Annulla" : "Connetti"}
          </button>
        )}
      </div>

      {espanso && !connesso && (
        <form onSubmit={onSalva} className="mt-4 space-y-2">
          <label className="block text-xs text-muted-foreground">
            Credenziale (
            {provider === "ga4" || provider === "search_console"
              ? "JSON del service account"
              : "token / chiave API"}
            ) — viene cifrata nel Vault, non torna mai in chiaro dopo il salvataggio.
          </label>
          <textarea
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Incolla qui la credenziale…"
          />
          {errore && <p className="text-xs text-destructive">{errore}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Salvataggio…" : "Salva credenziale"}
          </button>
        </form>
      )}
    </div>
  );
}
