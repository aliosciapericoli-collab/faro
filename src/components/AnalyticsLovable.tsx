import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Eye, Users } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { leggiReportLovable, type ReportLovable } from "@/lib/analytics-lovable.functions";

const COLORE_VISITATORI = "oklch(0.75 0.16 300)"; // viola, per distinguerlo dai colori Google già usati
const COLORE_PAGEVIEWS = "oklch(0.7 0.14 340)";

function formattaGiorno(d: unknown): string {
  const s = String(d ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [, mese, giorno] = s.split("-");
  return `${giorno}/${mese}`;
}

export function AnalyticsLovable({ propertyId }: { propertyId: string }) {
  const [stato, setStato] = useState<
    | { fase: "carico" }
    | { fase: "non-connesso"; errore?: string }
    | { fase: "ok"; dati: ReportLovable }
  >({ fase: "carico" });
  const leggiRaw = useServerFn(leggiReportLovable);
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
        Lovable Analytics non è ancora connesso: i grafici compaiono qui appena colleghi
        l'integrazione qui sopra.
        {stato.errore && <p className="mt-2 text-destructive">{stato.errore}</p>}
      </div>
    );
  }

  const { daily, totali, pagine, sorgenti } = stato.dati;

  return (
    <div className="grid gap-4">
      <p className="text-xs text-muted-foreground">
        Traffico reale misurato lato server: a differenza di GA4, non dipende dal consenso cookie
        del visitatore.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Pannello
          icona={<Users className="h-4 w-4" />}
          titolo="Visitatori"
          sottotitolo="Ultimi 28 giorni"
          totale={totali.visitors}
          colore={COLORE_VISITATORI}
        >
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="gradienteVisitatori" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORE_VISITATORI} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLORE_VISITATORI} stopOpacity={0} />
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
                dataKey="visitors"
                name="Visitatori"
                stroke={COLORE_VISITATORI}
                strokeWidth={2}
                fill="url(#gradienteVisitatori)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Pannello>

        <Pannello
          icona={<Eye className="h-4 w-4" />}
          titolo="Pagine viste"
          sottotitolo="Ultimi 28 giorni"
          totale={totali.pageviews}
          colore={COLORE_PAGEVIEWS}
        >
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="gradientePageviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORE_PAGEVIEWS} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLORE_PAGEVIEWS} stopOpacity={0} />
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
                dataKey="pageviews"
                name="Pagine viste"
                stroke={COLORE_PAGEVIEWS}
                strokeWidth={2}
                fill="url(#gradientePageviews)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Pannello>
      </div>

      {(pagine.length > 0 || sorgenti.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {pagine.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="eyebrow">Pagine principali</p>
              <p className="text-xs text-muted-foreground">Ultimi 28 giorni · per visite</p>
              <ul className="mt-3 space-y-2.5">
                {pagine.map((p) => {
                  const max = pagine[0]?.visite || 1;
                  return (
                    <li key={p.path} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-xs text-foreground">
                        {p.path}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full transition-[width] duration-500 ease-out"
                          style={{
                            width: `${(p.visite / max) * 100}%`,
                            background: COLORE_VISITATORI,
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs font-medium text-muted-foreground">
                        {p.visite}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {sorgenti.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="eyebrow">Sorgenti principali</p>
              <p className="text-xs text-muted-foreground">Ultimi 28 giorni · per visite</p>
              <ul className="mt-3 space-y-2.5">
                {sorgenti.map((s) => {
                  const max = sorgenti[0]?.visite || 1;
                  return (
                    <li key={s.nome} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-xs text-foreground">
                        {s.nome}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full transition-[width] duration-500 ease-out"
                          style={{
                            width: `${(s.visite / max) * 100}%`,
                            background: COLORE_PAGEVIEWS,
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs font-medium text-muted-foreground">
                        {s.visite}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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
  colore,
  children,
}: {
  icona: React.ReactNode;
  titolo: string;
  sottotitolo: string;
  totale: number;
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
        <span className="w-full text-xs text-muted-foreground">{sottotitolo}</span>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
