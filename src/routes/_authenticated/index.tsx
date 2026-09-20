import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  listaProprieta,
  listaIntegrazioni,
  creaProprieta,
  type Property,
  type Integration,
} from "@/lib/proprieta";
import { PROVIDER, PROVIDER_LABEL } from "@/lib/credenziali.functions";
import { APP_TAGLINE } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovoUrl, setNuovoUrl] = useState("");
  const [creando, setCreando] = useState(false);

  const ricarica = async () => {
    const [props, ints] = await Promise.all([listaProprieta(), listaIntegrazioni()]);
    setProperties(props);
    setIntegrations(ints);
  };

  useEffect(() => {
    ricarica();
  }, []);

  const onCrea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuovoNome.trim() || creando) return;
    setCreando(true);
    try {
      await creaProprieta({ name: nuovoNome.trim(), url: nuovoUrl.trim() });
      setNuovoNome("");
      setNuovoUrl("");
      await ricarica();
    } finally {
      setCreando(false);
    }
  };

  return (
    <div>
      <p className="eyebrow">Cruscotto</p>
      <h1 className="mt-2 text-3xl font-semibold text-primary">Le tue proprietà</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{APP_TAGLINE}</p>

      <div className="mt-10 grid gap-4">
        {properties === null && <p className="text-sm text-muted-foreground">Caricamento…</p>}
        {properties?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nessuna proprietà ancora. Aggiungine una qui sotto.
          </p>
        )}
        {properties?.map((p) => {
          const connesse = new Set(
            integrations
              .filter((i) => i.property_id === p.id && i.status === "connected")
              .map((i) => i.provider),
          );
          return (
            <Link
              key={p.id}
              to="/proprieta/$id"
              params={{ id: p.id }}
              className="block rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent/50"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-primary">{p.name}</p>
                  {p.url && <p className="mt-0.5 text-xs text-muted-foreground">{p.url}</p>}
                </div>
                <div className="flex gap-1.5">
                  {PROVIDER.map((prov) => (
                    <span
                      key={prov}
                      title={`${PROVIDER_LABEL[prov]}${connesse.has(prov) ? " — connesso" : " — non connesso"}`}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: connesse.has(prov) ? "var(--color-accent)" : "transparent",
                        border: connesse.has(prov) ? "none" : "1.5px solid var(--color-border)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <form
        onSubmit={onCrea}
        className="mt-8 flex flex-wrap gap-2 rounded-lg border border-dashed border-border p-4"
      >
        <input
          value={nuovoNome}
          onChange={(e) => setNuovoNome(e.target.value)}
          placeholder="Nome proprietà (es. Discernia)"
          required
          className="min-w-[200px] flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={nuovoUrl}
          onChange={(e) => setNuovoUrl(e.target.value)}
          placeholder="https://www.esempio.it (opzionale)"
          className="min-w-[220px] flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={creando}
          className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Aggiungi
        </button>
      </form>
    </div>
  );
}
