import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { leggiReportGA4, type ReportGA4 } from "@/lib/analytics-ga4.functions";

const COLORE_UTENTI = "oklch(0.78 0.15 75)"; // stesso ambra dell'accent del cruscotto
const COLORE_VISUALIZZAZIONI = "oklch(0.72 0.14 220)"; // blu, per distinguere le due grandezze

function formattaGiorno(d: unknown): string {
  // GA4 restituisce YYYYMMDD
  const s = String(d ?? "");
  if (s.length !== 8) return s;
  return `${s.slice(6, 8)}/${s.slice(4, 6)}`;
}

export function AnalyticsGA4({ propertyId }: { propertyId: string }) {
  const [stato, setStato] = useState<
    { fase: "carico" } | { fase: "non-connesso"; errore?: string } | { fase: "ok"; dati: ReportGA4 }
  >({ fase: "carico" });
  const leggiRaw = useServerFn(leggiReportGA4);
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
    return <p className="text-sm text-muted-foreground">Carico i dati da Google Analytics…</p>;
  }

  if (stato.fase === "non-connesso") {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Google Analytics 4 non è ancora connesso: i grafici compaiono qui appena colleghi
        l'integrazione qui sopra.
        {stato.errore && <p className="mt-2 text-destructive">{stato.errore}</p>}
      </div>
    );
  }

  const { daily, topEvents } = stato.dati;
  const totaleUtenti = daily.reduce((s, d) => s + d.activeUsers, 0);
  const totaleVisualizzazioni = daily.reduce((s, d) => s + d.pageViews, 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Pannello titolo="Utenti attivi" sottotitolo="Ultimi 28 giorni" totale={totaleUtenti}>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formattaGiorno}
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
                width={32}
              />
              <Tooltip
                labelFormatter={formattaGiorno}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="activeUsers"
                name="Utenti attivi"
                stroke={COLORE_UTENTI}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Pannello>

        <Pannello
          titolo="Visualizzazioni pagina"
          sottotitolo="Ultimi 28 giorni"
          totale={totaleVisualizzazioni}
        >
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formattaGiorno}
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
                width={32}
              />
              <Tooltip
                labelFormatter={formattaGiorno}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="pageViews"
                name="Visualizzazioni"
                stroke={COLORE_VISUALIZZAZIONI}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Pannello>
      </div>

      {topEvents.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="eyebrow">Eventi principali</p>
          <p className="text-xs text-muted-foreground">
            Ultimi 28 giorni · include iscrizione_newsletter e lettura_articolo
          </p>
          <ul className="mt-3 space-y-2">
            {topEvents.map((ev) => {
              const max = topEvents[0]?.count || 1;
              return (
                <li key={ev.name} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs text-foreground">{ev.name}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${(ev.count / max) * 100}%`, background: COLORE_UTENTI }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
                    {ev.count}
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
  titolo,
  sottotitolo,
  totale,
  children,
}: {
  titolo: string;
  sottotitolo: string;
  totale: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="eyebrow">{titolo}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-primary">
          {totale.toLocaleString("it-IT")}
        </span>
        <span className="text-xs text-muted-foreground">{sottotitolo}</span>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
