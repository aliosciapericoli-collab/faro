# Roadmap — Faro

## v1 (questa build) — la struttura

- [x] Repo, stack (TanStack Start + Supabase), branding (nome, logo, tag
      "Alioscia Network").
- [x] Login a utente singolo, nessuna registrazione pubblica.
- [x] Elenco proprietà (aggiungi/vedi), con pallini di stato per le 4
      integrazioni previste.
- [x] Vault delle credenziali: salva/disconnetti per proprietà, cifrato,
      mai esposto in chiaro dopo il salvataggio.
- [x] **Deploy su Render** (`render.yaml`), live su `faro-cq84.onrender.com`.
- [x] **Grafici GA4** (utenti attivi, visualizzazioni pagina, eventi
      principali — ultimi 28 giorni) sulla pagina di ogni proprietà,
      collegati alla GA4 Data API reale. Restano "non connesso" finché non
      si incolla la credenziale GA4 (vedi sotto) — nessun dato finto.
- [x] **Sub-account**: da ogni scheda proprietà (solo il proprietario la
      vede) si può invitare un'email esterna che, dopo il login, vede
      **solo i grafici GA4 di quella proprietà** — niente credenziali,
      niente altre proprietà, niente pulsanti di connessione. L'utente va
      creato prima in Supabase Auth (Authentication → Users → Add user),
      poi aggiunto in "Accesso esterno" sulla pagina della proprietà.
- [x] **Migration applicate**: `0001_init.sql`, `0002_leggi_credenziale.sql`
      e `0003_property_members.sql` sono tutte live sul database Supabase
      di produzione di Faro.
- [x] **Grafici in stile "consumer"**: aree sfumate, numeri hero, chip di
      variazione % vs i 28 giorni precedenti (mai finta: nulla se il
      periodo precedente è a zero), card "in arrivo" per i canali non
      ancora collegati.
- [x] **Google Search Console** — collegato e live: clic, impressioni e
      query principali reali per Discernia. Stesso service account di GA4.
- [x] **Google Ads** — collegato e live per Discernia: spesa, impressioni
      e campagne principali reali, in EUR. A differenza di GA4/Search
      Console serve un client OAuth + refresh token, non un service
      account (vedi sotto).

## Per ogni integrazione: cosa serve prima che diventi "viva"

Oggi il cruscotto sa _conservare_ le credenziali. Il prossimo passo per
ciascuna integrazione è usarle davvero (leggere dati, o creare campagne).
Elenco di cosa serve raccogliere, integrazione per integrazione:

### Google Analytics 4 (lettura dati) — grafici già pronti, manca solo la credenziale

- Service account Google Cloud con accesso alla **GA4 Data API** (abilitarla
  in Google Cloud Console → API e servizi).
- Il service account aggiunto come utente "Visualizzatore" sulla proprietà
  GA4 in Analytics → Amministrazione → Accesso alla proprietà.
- L'**ID proprietà GA4** (numerico, tipo `123456789` — diverso dal
  Measurement ID `G-XXXX` usato per il tracciamento sul sito), da
  Analytics → Amministrazione → Dettagli proprietà.
- In Faro, sulla scheda GA4 della proprietà, incollare un unico JSON:
  `{"service_account": {...il JSON scaricato da Google Cloud...}, "ga4_property_id": "123456789"}`.
- Appena connesso, compaiono da soli: utenti attivi e visualizzazioni
  pagina (28 giorni), più gli eventi principali — incluse le due
  conversioni già attive su Discernia (`iscrizione_newsletter`,
  `lettura_articolo`).

### Google Search Console (lettura dati) — grafici già pronti, manca solo la credenziale

- Abilitare la **Search Console API** nello stesso progetto Google Cloud del
  service account già creato per GA4 (API e servizi → Abilita API).
- Lo stesso service account aggiunto come utente in Search Console →
  Impostazioni → Utenti e permessi.
- In Faro, sulla scheda Search Console della proprietà, incollare un unico
  JSON: `{"service_account": {...lo stesso JSON di GA4...}, "site_url": "sc-domain:esempio.it"}`.
  `site_url` è l'identificativo esatto della proprietà così com'è in Search
  Console: per una proprietà a dominio è `sc-domain:esempio.it` (es. per
  Discernia: `sc-domain:discernia.it`), per una a prefisso URL è l'URL
  verificato per intero con lo slash finale.
- Appena connesso, compaiono da soli: clic e impressioni (28 giorni), più le
  query di ricerca principali.

### Google Ads (lettura dati) — collegato e live per Discernia

- Un **account Google Ads** (anche vuoto, per iniziare), con l'**ID cliente**
  a 10 cifre (in alto a destra nell'interfaccia Google Ads, es. `123-456-7890`
  → si incolla senza trattini). Un account appena creato resta
  "Configurazione in corso" e l'API lo rifiuta (`CUSTOMER_NOT_ENABLED`)
  finché non si crea almeno una campagna (anche a budget minimo, 1€/giorno,
  da mettere subito in pausa — l'importante è completare il wizard di
  onboarding di Google Ads).
- Il **client OAuth** (Web, non Desktop — serve un "URI di reindirizzamento
  autorizzato" che solo il tipo Web espone) va creato nello stesso progetto
  Google Cloud già usato per GA4/Search Console (`Alma` /
  `gen-lang-client-0155255216`), con la **Google Ads API abilitata**
  (API e servizi → Libreria).
- Dal 9 settembre 2026 Google ha **ritirato i developer token classici**:
  il livello di accesso ora è legato al *progetto Google Cloud* che possiede
  le credenziali OAuth, non più al token. Si richiede da Google Cloud
  Console → API e servizi → Google Ads API → "Livelli di accesso" →
  "Gestisci" → "Richiedi l'accesso" (livello Explorer, approvazione
  automatica in pochi minuti — ma può esserci un bug noto di propagazione
  che dà `USER_PERMISSION_DENIED` per una decina di minuti dopo
  l'approvazione). Il developer token stesso (dal vecchio Centro API di
  Google Ads) va comunque incluso nell'header per compatibilità.
- Un **refresh token**, ottenuto una tantum autorizzando l'app con quel
  client OAuth (es. tramite l'[OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
  di Google, scope `https://www.googleapis.com/auth/adwords`, tipo di
  accesso **Offline**).
- In Faro, sulla scheda Google Ads della proprietà, incollare un unico
  JSON: `{"developer_token": "...", "client_id": "...", "client_secret": "...", "refresh_token": "...", "customer_id": "1234567890"}`.
  **Non aggiungere `login_customer_id`** a meno che l'account non sia
  davvero gestito tramite un MCC con utenti separati: se l'utente OAuth ha
  già accesso diretto all'account (caso comune), quell'header fa fallire
  la chiamata con `USER_PERMISSION_DENIED` — si verifica facilmente con
  `customers:listAccessibleCustomers`, che elenca gli account a cui
  l'utente ha accesso diretto.
- Appena connesso, compaiono da soli: spesa e impressioni (28 giorni, in
  valuta reale dell'account) più le campagne principali per spesa.
- [x] **Gestione campagne dal cruscotto**: solo il proprietario (mai i
  sub-account) può mettere in pausa/riattivare una campagna esistente e
  cambiarne il budget giornaliero, direttamente dalla scheda della
  proprietà. Ogni azione richiede due click (il primo mostra "Confermi?",
  il secondo esegue davvero la chiamata a Google Ads) — nessuna modifica
  parte da un solo click.
- [x] **Creazione campagne di ricerca dal cruscotto**: form "+ Nuova
  campagna" (solo proprietario) — nome, URL, budget, parole chiave, titoli
  e descrizioni per un annuncio responsive di ricerca. Tutto creato in
  un'unica chiamata atomica (budget + campagna + gruppo annunci + parole
  chiave + annuncio): o va tutto a buon fine, o non viene creato nulla.
  La campagna nasce **sempre in pausa** — parte solo se poi la riattivi
  esplicitamente dalla lista qui sopra, mai in automatico dalla
  creazione. Solo campagne di tipo Search per ora (niente Performance
  Max/Display/Shopping da qui).

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

Fatto: Render (`render.yaml`), live su `faro-cq84.onrender.com`, redeploy
automatico a ogni push su `main`.
