import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, Target, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listaIntegrazioni, type Integration, type Property } from "@/lib/proprieta";
import { listaMembri, invitaMembro, rimuoviMembro, type Membro } from "@/lib/membri";
import {
  PROVIDER,
  PROVIDER_LABEL,
  salvaCredenziale,
  eliminaCredenziale,
  type Provider,
} from "@/lib/credenziali.functions";
import { AnalyticsGA4 } from "@/components/AnalyticsGA4";
import { AnalyticsSearchConsole } from "@/components/AnalyticsSearchConsole";
import { AnalyticsGoogleAds } from "@/components/AnalyticsGoogleAds";
import { AnalyticsLovable } from "@/components/AnalyticsLovable";
import { OWNER_EMAIL } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/proprieta/$id")({
  component: ProprietaDetail,
});

function ProprietaDetail() {
  const { id } = Route.useParams();
  const [email, setEmail] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner = email === OWNER_EMAIL;

  const ricarica = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setEmail(user?.email ?? null);

    const { data: prop } = await supabase
      .from("properties")
      .select("id, name, url, note, created_at")
      .eq("id", id)
      .single();
    setProperty(prop as Property);

    if (user?.email === OWNER_EMAIL) {
      const ints = await listaIntegrazioni();
      setIntegrations(ints.filter((i) => i.property_id === id));
    }
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

      {isOwner && (
        <>
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
          <MembriProprieta propertyId={property.id} />
        </>
      )}

      <div className="mt-10">
        <p className="eyebrow">Analytics</p>
        <h2 className="mt-1 mb-4 text-xl font-semibold text-primary">Google Analytics 4</h2>
        <AnalyticsGA4 propertyId={property.id} />
      </div>

      <div className="mt-10">
        <p className="eyebrow">Analytics</p>
        <h2 className="mt-1 mb-4 text-xl font-semibold text-primary">Google Search Console</h2>
        <AnalyticsSearchConsole propertyId={property.id} />
      </div>

      <div className="mt-10">
        <p className="eyebrow">Analytics</p>
        <h2 className="mt-1 mb-4 text-xl font-semibold text-primary">Google Ads</h2>
        <AnalyticsGoogleAds propertyId={property.id} isOwner={isOwner} />
      </div>

      <div className="mt-10">
        <p className="eyebrow">Analytics</p>
        <h2 className="mt-1 mb-4 text-xl font-semibold text-primary">Lovable Analytics</h2>
        <AnalyticsLovable propertyId={property.id} />
      </div>

      {isOwner && (
        <div className="mt-10">
          <p className="eyebrow">Altri canali</p>
          <h2 className="mt-1 mb-4 text-xl font-semibold text-primary">In arrivo</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <CanaleNonCollegato
              icona={<Target className="h-4 w-4" />}
              nome="Meta Ads"
              descrizione="Campagne Facebook/Instagram, richiede verifica Business."
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CanaleNonCollegato({
  icona,
  nome,
  descrizione,
}: {
  icona: React.ReactNode;
  nome: string;
  descrizione: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icona}
        <p className="font-sans text-[0.68rem] font-semibold tracking-[0.16em] uppercase">{nome}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{descrizione}</p>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">Non ancora connesso</p>
    </div>
  );
}

function MembriProprieta({ propertyId }: { propertyId: string }) {
  const [membri, setMembri] = useState<Membro[]>([]);
  const [nuovaEmail, setNuovaEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const ricarica = useCallback(async () => {
    setMembri(await listaMembri(propertyId));
  }, [propertyId]);

  useEffect(() => {
    ricarica();
  }, [ricarica]);

  const onInvita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuovaEmail.trim() || busy) return;
    setBusy(true);
    setErrore(null);
    try {
      await invitaMembro(propertyId, nuovaEmail.trim());
      setNuovaEmail("");
      await ricarica();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Invito non riuscito.");
    } finally {
      setBusy(false);
    }
  };

  const onRimuovi = async (membroId: string) => {
    setBusy(true);
    try {
      await rimuoviMembro(membroId);
      await ricarica();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8">
      <p className="eyebrow">Accesso esterno</p>
      <h2 className="mt-1 mb-1 text-xl font-semibold text-primary">Chi vede gli analytics</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Solo gli analytics di questa proprietà — mai le credenziali, mai le altre proprietà.
        L'utente va prima creato in Supabase Auth (Authentication → Users → Add user), esattamente
        come il tuo account.
      </p>

      <div className="grid gap-2">
        {membri.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5"
          >
            <span className="text-sm text-foreground">{m.email}</span>
            <button
              type="button"
              onClick={() => onRimuovi(m.id)}
              disabled={busy}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Rimuovi
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={onInvita} className="mt-3 flex flex-wrap gap-2">
        <input
          type="email"
          value={nuovaEmail}
          onChange={(e) => setNuovaEmail(e.target.value)}
          placeholder="email@esempio.it"
          required
          className="min-w-[220px] flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-1.5 rounded-md border border-accent px-4 py-2 text-sm font-semibold text-accent transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" /> Invita
        </button>
      </form>
      {errore && <p className="mt-2 text-xs text-destructive">{errore}</p>}
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
            Credenziale — viene cifrata nel Vault, non torna mai in chiaro dopo il salvataggio.
            {provider === "ga4" && (
              <>
                {" "}
                Formato atteso, un unico JSON:{" "}
                <code className="text-[11px]">
                  {'{"service_account": {...}, "ga4_property_id": "123456789"}'}
                </code>
                . Il service account si crea su Google Cloud Console (API GA4 Data abilitata), l'ID
                proprietà (numerico, diverso dal Measurement ID G-XXXX) si trova in Analytics →
                Amministrazione → Dettagli proprietà.
              </>
            )}
            {provider === "search_console" && (
              <>
                {" "}
                Formato atteso, un unico JSON:{" "}
                <code className="text-[11px]">
                  {'{"service_account": {...}, "site_url": "sc-domain:esempio.it"}'}
                </code>
                . Stesso service account di GA4 (va aggiunto anche qui come utente in Search Console
                → Impostazioni → Utenti e permessi). <code className="text-[11px]">site_url</code> è
                l'identificativo esatto della proprietà in Search Console: per una proprietà a
                dominio è <code className="text-[11px]">sc-domain:esempio.it</code>, per una a
                prefisso URL è l'URL verificato per intero con lo slash finale (es.{" "}
                <code className="text-[11px]">https://www.esempio.it/</code>).
              </>
            )}
            {provider === "google_ads" && (
              <>
                {" "}
                Formato atteso, un unico JSON:{" "}
                <code className="text-[11px]">
                  {
                    '{"developer_token": "...", "client_id": "...", "client_secret": "...", "refresh_token": "...", "customer_id": "1234567890"}'
                  }
                </code>
                . Il <code className="text-[11px]">developer_token</code> si richiede da Google Ads
                → Strumenti e impostazioni → Centro API;{" "}
                <code className="text-[11px]">client_id</code>/
                <code className="text-[11px]">client_secret</code> sono un client OAuth di Google
                Cloud Console (stesso progetto di GA4, con la Google Ads API abilitata);{" "}
                <code className="text-[11px]">refresh_token</code> si ottiene una volta autorizzando
                l'app (es. con l'OAuth 2.0 Playground di Google);{" "}
                <code className="text-[11px]">customer_id</code> è l'ID dell'account Ads a 10 cifre,
                senza trattini. Se l'account è gestito da un account manager (MCC), aggiungi anche{" "}
                <code className="text-[11px]">"login_customer_id": "..."</code>.
              </>
            )}
            {provider === "lovable_analytics" && (
              <>
                {" "}
                Formato atteso, un unico JSON:{" "}
                <code className="text-[11px]">{'{"api_key": "lov_...", "project_id": "..."}'}</code>
                . La chiave si crea su Lovable → Settings → Access tokens (serve piano Business o
                superiore, ruolo owner/admin); l'ID progetto è nell'URL dell'editor Lovable
                (lovable.dev/projects/<code className="text-[11px]">ID-QUI</code>).
              </>
            )}
            {provider === "meta_ads" && " Formato: token / chiave API."}
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
