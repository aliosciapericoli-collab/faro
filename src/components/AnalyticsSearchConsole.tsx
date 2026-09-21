import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Eye, MousePointerClick } from "lucide-react";
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
  leggiReportSearchConsole,
  type ReportSearchConsole,
} from "@/lib/analytics-search-console.functions";

const COLORE_CLIC = "oklch(0.78 0.15 75)"; // stesso linguaggio visivo di GA4: ambra per la metrica primaria
const COLORE_IMPRESSIONI = "oklch(0.72 0.14 220)"; // blu per la secondaria
const COLORE_POSITIVO = "#3ecf5f";
const COLORE_NEGATIVO = "#e5645f";

function formattaGiorno(d: unknown): string {
  const s = String(d ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [, mese, giorno] = s.split("-");
  return `${giorno}/${mese}`;
}

export function AnalyticsSearchConsole({ propertyId }: { propertyId: string }) {
  const [stato, setStato] = useState<
    | { fase: "carico" }
    | { fase: "non-connesso"; errore?: string }
    | { fase: "ok"; dati: ReportSearchConsole }
  >({ fase: "carico" });
  const leggiRaw = useServerFn(leggiReportSearchConsole);
  const leggi = useCallback(
    (input: { data: { propertyId: string } }) => leggiRaw(input),
    [leggiRaw],
  );

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
        Google Search Console non è ancora connesso: i grafici compaiono qui appena colleghi
        l'integrazione qui sopra.
        {stato.errore && <p className="mt-2 text-destructive">{stato.errore}</p>}
      </div>
    );
  }

  const { daily, topQueries, variazione } = stato.dati;
  const totaleClic = daily.reduce((s, d) => s + d.clicks, 0);
  const totaleImpressioni = daily.reduce((s, d) => s + d.impressions, 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Pannello
          icona={<MousePointerClick className="h-4 w-4" />}
          titolo="Clic totali"
          sottotitolo="Ultimi 28 giorni"
          totale={totaleClic}
          variazionePct={variazione.clicks}
          colore={COLORE_CLIC}
        >
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="gradienteClic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORE_CLIC} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLORE_CLIC} stopOpacity={0} />
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
                dataKey="clicks"
                name="Clic"
                stroke={COLORE_CLIC}
                strokeWidth={2}
                fill="url(#gradienteClic)"
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
          totale={totaleImpressioni}
          variazionePct={variazione.impressions}
          colore={COLORE_IMPRESSIONI}
        >
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="gradienteImpressioni" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#gradienteImpressioni)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Pannello>
      </div>

      {topQueries.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="eyebrow">Query principali</p>
          <p className="text-xs text-muted-foreground">Ultimi 28 giorni · ordinate per clic</p>
          <ul className="mt-3 space-y-2.5">
            {topQueries.map((q) => {
              const max = topQueries[0]?.clicks || 1;
              return (
                <li key={q.query} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs text-foreground">{q.query}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full transition-[width] duration-500 ease-out"
                      style={{ width: `${(q.clicks / max) * 100}%`, background: COLORE_CLIC }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs font-medium text-muted-foreground">
                    {q.clicks.toLocaleString("it-IT")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Pannello({
  icona,
  titolo,
  sottotitolo,
  totale,
  variazionePct,
  colore,
  children,
}: {
  icona: React.ReactNode;
  titolo: string;
  sottotitolo: string;
  totale: number;
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
        <span className="text-3xl font-semibold text-primary">
          {totale.toLocaleString("it-IT")}
        </span>
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
