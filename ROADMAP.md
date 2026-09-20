# Roadmap — Faro

## v1 (questa build) — la struttura

- [x] Repo, stack (TanStack Start + Supabase), branding (nome, logo, tag
      "Alioscia Network").
- [x] Login a utente singolo, nessuna registrazione pubblica.
- [x] Elenco proprietà (aggiungi/vedi), con pallini di stato per le 4
      integrazioni previste.
- [x] Vault delle credenziali: salva/disconnetti per proprietà, cifrato,
      mai esposto in chiaro dopo il salvataggio.
- [ ] **Deploy**: da fare — dipende da dove decidi di ospitarlo (Cloudflare
      via Lovable, o un altro host Node). Vedi nota in fondo.

## Per ogni integrazione: cosa serve prima che diventi "viva"

Oggi il cruscotto sa _conservare_ le credenziali. Il prossimo passo per
ciascuna integrazione è usarle davvero (leggere dati, o creare campagne).
Elenco di cosa serve raccogliere, integrazione per integrazione:

### Google Analytics 4 (lettura dati)

- Service account Google Cloud con accesso alla **GA4 Data API**.
- Aggiunto come utente "Visualizzatore" sulla proprietà GA4 in Analytics
  → Amministrazione → Accesso alla proprietà.
- Una volta incollato in Faro: pannello con utenti attivi, sorgenti di
  traffico, eventi chiave (le due conversioni già attive su Discernia:
  `iscrizione_newsletter`, `lettura_articolo`).

### Google Search Console (lettura dati)

- Stesso service account (o uno dedicato) aggiunto come utente in Search
  Console → Impostazioni → Utenti e permessi, proprietà `www.discernia.it`.
- Una volta collegato: query di ricerca, posizione media, copertura
  dell'indice, sitemap inviate — l'"indicizzazione" di cui parlavamo.

### Google Ads (creazione/gestione campagne)

- Un **account Google Ads** (anche vuoto, per iniziare).
- Un **developer token** (richiesto tramite il Centro API di Google Ads —
  l'accesso "standard" richiede una verifica che può richiedere giorni).
- Un **client OAuth** (Google Cloud Console) con permesso sulla Google Ads
  API.
- Una volta collegato: creazione di campagne Search dal cruscotto, con
  conferma manuale prima di ogni attivazione — mai spesa automatica senza
  un tuo click esplicito.

### Meta Ads (Facebook/Instagram, creazione/gestione campagne)

- Una **Meta Business App** (developers.facebook.com), con **verifica
  Business** completata (richiesta per il permesso `ads_management`).
- Un **access token** di sistema (System User) con accesso all'ad account.
- Stessa logica di conferma manuale prima di ogni campagna attivata.

## Dopo le prime due integrazioni (GA4 + Search Console)

- Dashboard unificata per proprietà: traffico, conversioni, stato
  indicizzazione in un'unica vista (oggi separata tra Google Analytics e
  Search Console).
- Notifiche quando una pagina esce dall'indice o una conversione crolla.

## Deploy

Non ancora scelto. Opzioni, da discutere quando si arriva lì:

- Stesso schema di Discernia (Cloudflare via Nitro) — richiede connettere
  questo repo a un progetto Cloudflare/Lovable.
- Un host Node semplice (Railway, Render, Fly.io) — meno configurazione,
  va bene per un tool interno a basso traffico come questo.
