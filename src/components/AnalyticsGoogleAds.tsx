import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Eye, Loader2, Pause, Play, Wallet } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  leggiReportGoogleAds,
  impostaStatoCampagnaGoogleAds,
  impostaBudgetGoogleAds,
  creaCampagnaGoogleAds,
  type ReportGoogleAds,
} from "@/lib/analytics-google-ads.functions";

const COLORE_SPESA = "oklch(0.78 0.15 75)";
const COLORE_IMPRESSIONI = "oklch(0.72 0.14 220)";
const COLORE_POSITIVO = "#3ecf5f";
const COLORE_NEGATIVO = "#e5645f";

function formattaGiorno(d: unknown): string {
  const s = String(d ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [, mese, giorno] = s.split("-");
  return `${giorno}/${mese}`;
}

export function AnalyticsGoogleAds({
  propertyId,
  isOwner = false,
}: {
  propertyId: string;
  isOwner?: boolean;
}) {
  const [stato, setStato] = useState<
    | { fase: "carico" }
    | { fase: "non-connesso"; errore?: string }
    | { fase: "ok"; dati: ReportGoogleAds }
  >({ fase: "carico" });
  const leggiRaw = useServerFn(leggiReportGoogleAds);
  const leggi = useCallback(
    (input: { data: { propertyId: string } }) => leggiRaw(input),
    [leggiRaw],
  );

  const ricarica = useCallback(() => {
    leggi({ data: { propertyId } }).then((res) => {
      if (res.connected) setStato({ fase: "ok", dati: res });
      else setStato({ fase: "non-connesso", errore: "errore" in res ? res.errore : undefined });
    });
  }, [propertyId, leggi]);

  useEffect(() => {
    let attivo = true;
    leggi({ data: { propertyId } }).then((res) => {
      if (!attivo) return;
      if (res.connected) setStato({ fase: "ok", dati: res });
      else setStato({ fase: "non-connesso", errore: "errore" in res ? res.errore : undefined });
    });
    return () => {
      attivo = false;
    };
  }, [propertyId, leggi]);

  if (stato.fase === "carico") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-[220px] animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (stato.fase === "non-connesso") {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Google Ads non è ancora connesso: i grafici compaiono qui appena colleghi l'integrazione qui
        sopra.
        {stato.errore && <p className="mt-2 text-destructive">{stato.errore}</p>}
      </div>
    );
  }

  const { daily, campaigns, variazione, valuta } = stato.dati;
  const formattaValuta = (n: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: valuta }).format(n);
  const totaleSpesa = daily.reduce((s, d) => s + d.cost, 0);
  const totaleImpressioni = daily.reduce((s, d) => s + d.impressions, 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Pannello
          icona={<Wallet className="h-4 w-4" />}
          titolo="Spesa totale"
          sottotitolo="Ultimi 28 giorni"
          valore={formattaValuta(totaleSpesa)}
          variazionePct={variazione.cost}
          colore={COLORE_SPESA}
        >
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="gradienteSpesa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORE_SPESA} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLORE_SPESA} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formattaGiorno}
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
                width={32}
              />
              <Tooltip
                labelFormatter={formattaGiorno}
                formatter={(v) => formattaValuta(Number(v ?? 0))}
                cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="cost"
                name="Spesa"
                stroke={COLORE_SPESA}
                strokeWidth={2}
                fill="url(#gradienteSpesa)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Pannello>

        <Pannello
          icona={<Eye className="h-4 w-4" />}
          titolo="Impressioni"
          sottotitolo="Ultimi 28 giorni"
          valore={totaleImpressioni.toLocaleString("it-IT")}
          variazionePct={variazione.impressions}
          colore={COLORE_IMPRESSIONI}
        >
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="gradienteImpressioniAds" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORE_IMPRESSIONI} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLORE_IMPRESSIONI} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formattaGiorno}
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
                width={32}
              />
              <Tooltip
                labelFormatter={formattaGiorno}
                cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="impressions"
                name="Impressioni"
                stroke={COLORE_IMPRESSIONI}
                strokeWidth={2}
                fill="url(#gradienteImpressioniAds)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Pannello>
      </div>

      {campaigns.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="eyebrow">Campagne principali</p>
          <p className="text-xs text-muted-foreground">
            Ultimi 28 giorni · ordinate per spesa
            {isOwner && " · pausa/riattiva e budget si applicano subito su Google Ads"}
          </p>
          <ul className="mt-3 space-y-2.5">
            {campaigns.map((c) => (
              <CampagnaRiga
                key={c.resourceName || c.name}
                campagna={c}
                max={campaigns[0]?.cost || 1}
                formattaValuta={formattaValuta}
                propertyId={propertyId}
                isOwner={isOwner}
                onCambiato={ricarica}
              />
            ))}
          </ul>
        </div>
      )}

      {isOwner && <NuovaCampagnaForm propertyId={propertyId} onCreata={ricarica} />}
    </div>
  );
}

function textAreaARighe(valore: string): string[] {
  return valore
    .split("\n")
    .map((riga) => riga.trim())
    .filter(Boolean);
}

function NuovaCampagnaForm({ propertyId, onCreata }: { propertyId: string; onCreata: () => void }) {
  const creaRaw = useServerFn(creaCampagnaGoogleAds);
  const [aperto, setAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [budget, setBudget] = useState("");
  const [paroleChiave, setParoleChiave] = useState("");
  const [titoli, setTitoli] = useState("");
  const [descrizioni, setDescrizioni] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);

  const listaParole = textAreaARighe(paroleChiave);
  const listaTitoli = textAreaARighe(titoli);
  const listaDescrizioni = textAreaARighe(descrizioni);

  const valido =
    nome.trim().length > 0 &&
    /^https?:\/\//.test(url.trim()) &&
    Number(budget.replace(",", ".")) > 0 &&
    listaParole.length >= 1 &&
    listaTitoli.length >= 3 &&
    listaTitoli.every((t) => t.length <= 30) &&
    listaDescrizioni.length >= 2 &&
    listaDescrizioni.every((d) => d.length <= 90);

  const crea = async () => {
    if (!valido) {
      setErrore(
        "Controlla i campi: servono almeno 3 titoli (max 30 caratteri) e 2 descrizioni (max 90 caratteri), un URL valido e almeno una parola chiave.",
      );
      return;
    }
    setInviando(true);
    setErrore(null);
    try {
      await creaRaw({
        data: {
          propertyId,
          nome: nome.trim(),
          urlFinale: url.trim(),
          budgetEuro: Number(budget.replace(",", ".")),
          paroleChiave: listaParole,
          titoli: listaTitoli,
          descrizioni: listaDescrizioni,
        },
      });
      setFatto(true);
      setNome("");
      setUrl("");
      setBudget("");
      setParoleChiave("");
      setTitoli("");
      setDescrizioni("");
      onCreata();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Creazione non riuscita.");
    } finally {
      setInviando(false);
    }
  };

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => {
          setAperto(true);
          setFatto(false);
        }}
        className="w-full rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
      >
        + Nuova campagna
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Nuova campagna di ricerca</p>
        <button
          type="button"
          onClick={() => setAperto(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Chiudi
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Viene creata <strong className="text-foreground">sempre in pausa</strong>: budget, parole
        chiave e annuncio pronti, ma zero spesa finché non la riattivi tu esplicitamente dalla lista
        campagne qui sopra.
      </p>

      {fatto && (
        <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-xs text-accent">
          Campagna creata in pausa. Riattivala dalla lista qui sopra quando vuoi che parta.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Nome campagna</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Discernia — ricerca brand"
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">URL di destinazione</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.discernia.it"
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Budget giornaliero (€)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="1.00"
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Parole chiave (una per riga)
          </label>
          <textarea
            value={paroleChiave}
            onChange={(e) => setParoleChiave(e.target.value)}
            rows={3}
            placeholder={"filosofia intelligenza artificiale\netica tecnologia"}
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Titoli — min. 3, max. 30 caratteri ciascuno, uno per riga
          </label>
          <textarea
            value={titoli}
            onChange={(e) => setTitoli(e.target.value)}
            rows={4}
            placeholder={"Discernia\nFilosofia e Tecnologia\nIntelligenza Artificiale Umana"}
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-[0.65rem] text-muted-foreground">
            {listaTitoli.length} titoli ·{" "}
            {listaTitoli.filter((t) => t.length > 30).length > 0 && "alcuni superano 30 caratteri"}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Descrizioni — min. 2, max. 90 caratteri ciascuna, una per riga
          </label>
          <textarea
            value={descrizioni}
            onChange={(e) => setDescrizioni(e.target.value)}
            rows={4}
            placeholder={
              "Riflessioni su filosofia, etica e tecnologia nell'era dell'IA.\nArticoli per orientarsi tra innovazione e valori umani."
            }
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-[0.65rem] text-muted-foreground">
            {listaDescrizioni.length} descrizioni ·{" "}
            {listaDescrizioni.filter((d) => d.length > 90).length > 0 &&
              "alcune superano 90 caratteri"}
          </p>
        </div>
      </div>

      {errore && <p className="mt-3 text-xs text-destructive">{errore}</p>}

      <button
        type="button"
        onClick={crea}
        disabled={inviando}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {inviando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Crea campagna (resta in pausa)
      </button>
    </div>
  );
}

function CampagnaRiga({
  campagna,
  max,
  formattaValuta,
  propertyId,
  isOwner,
  onCambiato,
}: {
  campagna: ReportGoogleAds["campaigns"][number];
  max: number;
  formattaValuta: (n: number) => string;
  propertyId: string;
  isOwner: boolean;
  onCambiato: () => void;
}) {
  const impostaStatoRaw = useServerFn(impostaStatoCampagnaGoogleAds);
  const impostaBudgetRaw = useServerFn(impostaBudgetGoogleAds);

  const [confermaStato, setConfermaStato] = useState(false);
  const [salvandoStato, setSalvandoStato] = useState(false);
  const [erroreStato, setErroreStato] = useState<string | null>(null);

  const [editBudget, setEditBudget] = useState(false);
  const [valoreBudget, setValoreBudget] = useState(String(campagna.budgetEuro ?? ""));
  const [confermaBudget, setConfermaBudget] = useState(false);
  const [salvandoBudget, setSalvandoBudget] = useState(false);
  const [erroreBudget, setErroreBudget] = useState<string | null>(null);

  const attiva = campagna.status === "ENABLED";
  const puoAgire = isOwner && !!campagna.resourceName;

  const cambiaStato = async () => {
    if (!confermaStato) {
      setConfermaStato(true);
      return;
    }
    setSalvandoStato(true);
    setErroreStato(null);
    try {
      await impostaStatoRaw({
        data: {
          propertyId,
          campaignResourceName: campagna.resourceName,
          stato: attiva ? "PAUSED" : "ENABLED",
        },
      });
      onCambiato();
    } catch (err) {
      setErroreStato(err instanceof Error ? err.message : "Operazione non riuscita.");
    } finally {
      setSalvandoStato(false);
      setConfermaStato(false);
    }
  };

  const salvaBudget = async () => {
    const importo = Number(valoreBudget.replace(",", "."));
    if (!Number.isFinite(importo) || importo <= 0) {
      setErroreBudget("Inserisci un importo valido.");
      return;
    }
    if (!confermaBudget) {
      setConfermaBudget(true);
      return;
    }
    if (!campagna.budgetResourceName) return;
    setSalvandoBudget(true);
    setErroreBudget(null);
    try {
      await impostaBudgetRaw({
        data: { propertyId, budgetResourceName: campagna.budgetResourceName, importoEuro: importo },
      });
      setEditBudget(false);
      setConfermaBudget(false);
      onCambiato();
    } catch (err) {
      setErroreBudget(err instanceof Error ? err.message : "Operazione non riuscita.");
    } finally {
      setSalvandoBudget(false);
    }
  };

  return (
    <li className="flex flex-col gap-1.5 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="w-40 shrink-0 truncate text-xs text-foreground">{campagna.name}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-2 rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${(campagna.cost / max) * 100}%`, background: COLORE_SPESA }}
          />
        </div>
        <span className="w-16 shrink-0 text-right text-xs font-medium text-muted-foreground">
          {formattaValuta(campagna.cost)}
        </span>
      </div>

      {puoAgire && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium ${
              attiva ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
            }`}
          >
            {attiva ? "Attiva" : "In pausa"}
          </span>

          <button
            type="button"
            onClick={cambiaStato}
            disabled={salvandoStato}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[0.7rem] font-medium transition-colors disabled:opacity-50 ${
              confermaStato
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {salvandoStato ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : attiva ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {confermaStato
              ? attiva
                ? "Confermi la pausa?"
                : "Confermi la riattivazione?"
              : attiva
                ? "Metti in pausa"
                : "Riattiva"}
          </button>
          {confermaStato && !salvandoStato && (
            <button
              type="button"
              onClick={() => setConfermaStato(false)}
              className="text-[0.7rem] text-muted-foreground hover:text-foreground"
            >
              Annulla
            </button>
          )}

          {campagna.budgetResourceName && !editBudget && (
            <button
              type="button"
              onClick={() => {
                setValoreBudget(String(campagna.budgetEuro ?? ""));
                setEditBudget(true);
              }}
              className="rounded-md border border-border px-2 py-1 text-[0.7rem] font-medium text-muted-foreground hover:text-foreground"
            >
              Budget: {campagna.budgetEuro != null ? formattaValuta(campagna.budgetEuro) : "—"}
              /giorno
            </button>
          )}

          {editBudget && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={valoreBudget}
                onChange={(e) => {
                  setValoreBudget(e.target.value);
                  setConfermaBudget(false);
                }}
                className="w-20 rounded-md border border-input bg-transparent px-2 py-1 text-[0.7rem] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={salvaBudget}
                disabled={salvandoBudget}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[0.7rem] font-medium disabled:opacity-50 ${
                  confermaBudget
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {salvandoBudget && <Loader2 className="h-3 w-3 animate-spin" />}
                {confermaBudget ? "Confermi?" : "Salva"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditBudget(false);
                  setConfermaBudget(false);
                  setErroreBudget(null);
                }}
                className="text-[0.7rem] text-muted-foreground hover:text-foreground"
              >
                Annulla
              </button>
            </div>
          )}
        </div>
      )}
      {erroreStato && <p className="text-[0.7rem] text-destructive">{erroreStato}</p>}
      {erroreBudget && <p className="text-[0.7rem] text-destructive">{erroreBudget}</p>}
    </li>
  );
}

function Pannello({
  icona,
  titolo,
  sottotitolo,
  valore,
  variazionePct,
  colore,
  children,
}: {
  icona: React.ReactNode;
  titolo: string;
  sottotitolo: string;
  valore: string;
  variazionePct: number | null;
  colore: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5" style={{ color: colore }}>
        {icona}
        <p className="font-sans text-[0.68rem] font-semibold tracking-[0.16em] uppercase">
          {titolo}
        </p>
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-3xl font-semibold text-primary">{valore}</span>
        {variazionePct !== null && <VariazioneChip pct={variazionePct} />}
        <span className="w-full text-xs text-muted-foreground">{sottotitolo}</span>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function VariazioneChip({ pct }: { pct: number }) {
  const positiva = pct >= 0;
  const colore = positiva ? COLORE_POSITIVO : COLORE_NEGATIVO;
  const Icona = positiva ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold"
      style={{ color: colore, background: `color-mix(in oklch, ${colore} 16%, transparent)` }}
      title="Variazione rispetto ai 28 giorni precedenti"
    >
      <Icona className="h-3 w-3" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}
