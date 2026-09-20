# Faro — by Alioscia Network

Cruscotto unico per spingere la visibilità dei contenuti su tutte le
proprietà (Discernia e le altre che verranno aggiunte): stato SEO,
Analytics, e — quando le API saranno collegate — creazione e gestione di
campagne a pagamento.

Costruito incrementalmente: ogni integrazione (Google Analytics 4, Search
Console, Google Ads, Meta Ads) si accende quando arriva la sua credenziale,
non prima. Vedi `ROADMAP.md` per lo stato di ciascuna.

## Stack

Lo stesso di Discernia, per riusare pattern già collaudati: TanStack Start
(React, file-based routing, server functions) + Supabase (auth, Postgres,
Vault per le credenziali) + Tailwind v4.

**Perché un progetto Supabase separato da Discernia**: Faro conserva le
credenziali di _tutte_ le proprietà gestite (token Google Ads, Meta Ads,
service account GA4/Search Console…). Tenerle in un progetto isolato,
dedicato solo a questo cruscotto, evita che un bug o un accesso più ampio a
un sito specifico esponga le chiavi delle campagne pubblicitarie di un
altro.

## Come funziona il vault delle credenziali

Le credenziali non sono mai salvate in chiaro in una tabella normale.
Passano dal **Vault di Supabase** (estensione `supabase_vault`, cifratura
gestita da Supabase): la funzione Postgres `salva_credenziale` (SECURITY
DEFINER, eseguibile solo dal service role) la cifra e la registra; il
browser non vede mai il segreto dopo il salvataggio, solo lo stato
"connesso/non connesso". Dettagli in `supabase/migrations/0001_init.sql`.

## Setup locale

1. `bun install` (o `npm install`)
2. Crea un progetto Supabase nuovo (gratuito) su supabase.com, dedicato a
   Faro (non riusare quello di Discernia).
3. Nel SQL Editor del progetto, esegui `supabase/migrations/0001_init.sql`.
4. In **Authentication → Users → Add user**, crea il tuo utente (email +
   password) — non c'è registrazione pubblica, di proposito.
5. Copia `.env.example` in `.env` (URL + chiave pubblica) e in `.env.local`
   (service role key, mai committata).
6. `bun run dev`

## Struttura

- `src/routes/login.tsx` — accesso (Supabase Auth, nessuna auto-registrazione)
- `src/routes/_authenticated/` — guardia di sessione + pagine protette
  - `index.tsx` — elenco proprietà, stato integrazioni a colpo d'occhio
  - `proprieta.$id.tsx` — dettaglio: collega/disconnetti ogni integrazione
- `src/lib/credenziali.functions.ts` — uniche funzioni server che toccano
  il Vault (salvataggio/eliminazione credenziali)
- `supabase/migrations/` — schema + funzioni del Vault
