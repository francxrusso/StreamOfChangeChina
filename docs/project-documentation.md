# Stream of Change China, documentazione tecnica e strutturale

Ultimo aggiornamento: 2026-06-25

## 1. Scopo del progetto

Stream of Change China e' una webapp riservata per catalogare, consultare e analizzare contenuti legati alla serialita televisiva cinese. Il progetto gestisce serie TV, episodi, personaggi, trascrizioni, lessico, emozioni, Danmu e analisi linguistiche sul mandarino.

La piattaforma non e' pensata come sito pubblico aperto. Tutte le viste applicative sono protette da login admin tramite middleware Next.js. Gli utenti configurati possono avere permessi di sola consultazione oppure permessi di modifica.

Gli obiettivi principali sono:

- organizzare un corpus audiovisivo e testuale per serie ed episodio;
- collegare personaggi, trascrizioni, battute, lessico, emozioni e Danmu;
- permettere modifica rapida dei dati dalle viste operative e dal pannello admin;
- generare sintesi e analisi tematico-emotive degli episodi;
- creare analisi lessicali filtrabili per serie, stagione o episodi;
- supportare analisi specifiche per cinese mandarino, evitando stopword e parole poco significative.

## 2. Stack tecnico

Il progetto e' organizzato come monorepo leggero:

```text
StreamOfChangeChina/
  database/
  docs/
  webapp/
```

La webapp usa:

- Next.js App Router;
- React 19;
- TypeScript;
- Tailwind CSS;
- Supabase/Postgres;
- Server Actions Next.js per login, admin, analisi e azioni rapide;
- `pinyin-pro` per generazione automatica del pinyin;
- `Intl.Segmenter` per segmentazione lessicale del cinese;
- Vercel come target di deploy.

Le dipendenze principali sono definite in `webapp/package.json`.

## 3. Struttura del repository

### 3.1 Root

```text
README.md
.env.example
database/
docs/
webapp/
```

- `README.md`: introduzione generale al progetto.
- `.env.example`: esempio di variabili ambiente root.
- `database/`: migrazioni, seed e schema di riferimento.
- `docs/`: documentazione di progetto.
- `webapp/`: applicazione Next.js.

### 3.2 Database

```text
database/
  README.md
  migrations/
  reference/
  seeds/
```

`database/migrations/` contiene l'evoluzione dello schema. Le migrazioni importanti sono:

- `001_initial_mvp_schema.sql`: schema MVP iniziale con serie, episodi, personaggi, emozioni, lessico, Danmu raw/analizzati e viste pubbliche.
- `002_restrict_public_views.sql`: restrizione delle viste pubbliche.
- `003_admin_user_permissions.sql`: gestione permessi admin.
- `004_episode_links.sql`: campo link episodio.
- `005_delete_private_series.sql`: pulizia serie private.
- `006_episode_analysis.sql`: campi di sintesi e analisi episodio.
- `007_mandarin_analysis_fields.sql`: campi a supporto analisi mandarino.
- `008_unify_danmu.sql`: unificazione Danmu raw e Danmu analizzati in una sola tabella `danmu`.
- `009_analysis_runs.sql`: tabella `analisi_create`.
- `010_episode_dialogue_lines.sql`: tabella `episodio_battute` per battute segmentate per parlante.

`database/seeds/` contiene dati iniziali:

- emozioni;
- import iniziale Airtable/CSV;
- link episodi iPartment stagione 5.

### 3.3 Webapp

```text
webapp/
  public/
  scripts/
  src/
  package.json
  next.config.ts
  tailwind.config.ts
```

- `public/`: favicon e asset statici.
- `scripts/`: script Node per import e manutenzione dati.
- `src/app/`: routing App Router.
- `src/components/`: componenti riutilizzabili.
- `src/lib/`: client Supabase, auth, analisi, pinyin, generi, paginazione.

## 4. Variabili ambiente

Il file locale e' `webapp/.env.local`. Non va committato.

Variabili principali:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
DATABASE_URL=
EPISODE_AI_PROVIDER=local
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
```

Significato:

- `NEXT_PUBLIC_SUPABASE_URL`: URL progetto Supabase, disponibile anche lato browser.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chiave anon pubblica Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: chiave server-only per operazioni admin. Non deve mai essere esposta nel browser.
- `ADMIN_PASSWORD`: fallback legacy usato anche come possibile secret se `ADMIN_SESSION_SECRET` manca.
- `ADMIN_SESSION_SECRET`: segreto HMAC per firmare il cookie di sessione.
- `DATABASE_URL`: connection string Postgres, utile per migrazioni dirette.
- `EPISODE_AI_PROVIDER`: `local` di default; `openai` solo se si vuole usare API OpenAI a pagamento.
- `OPENAI_API_KEY`: necessaria solo con provider OpenAI.
- `OPENAI_MODEL`: modello OpenAI opzionale.

## 5. Autenticazione e sicurezza

L'accesso e' protetto da `webapp/src/middleware.ts`.

Il middleware:

- permette `/accesso`;
- permette asset statici, `_next`, favicon e file pubblici;
- blocca tutte le altre route se non esiste una sessione valida;
- reindirizza a `/accesso` gli utenti non autenticati;
- reindirizza alla home un utente autenticato che prova ad aprire `/accesso`.

La sessione e' salvata nel cookie HTTP-only `scc_admin_session`.

Il token e' generato in `webapp/src/lib/auth-session.ts`:

- payload JSON con `userId`, `email`, `displayName`, `canEdit`, `expiresAt`;
- firma HMAC SHA-256;
- scadenza a 12 ore;
- verifica server-side a ogni richiesta protetta.

Le azioni auth sono in `webapp/src/app/access-actions.ts`:

- `loginAdmin(formData)`;
- `logoutAdmin()`;
- `getAdminSession()`;
- `requireAdminSession()`;
- `requireEditSession()`.

`requireEditSession()` e' usato da tutte le azioni che modificano dati. Questo separa chi puo' consultare da chi puo' modificare.

## 6. Modello dati principale

### 6.1 Tabelle editoriali

#### `serie_tv`

Contiene metadati serie:

- titoli originale, pinyin, italiano, inglese;
- anno;
- numero stagioni;
- genere, salvato come lista testuale normalizzata;
- piattaforma;
- tipo distribuzione;
- poster;
- descrizione;
- note pubbliche/admin;
- `visibility`.

I generi sono gestiti in `webapp/src/lib/serie-genres.ts` con label inglese e cinese.

#### `episodi`

Contiene episodi collegati a una serie:

- `serie_id`;
- stagione;
- numero episodio;
- titoli;
- titolo pinyin, generato automaticamente da `titolo_originale` se lasciato vuoto;
- data messa in onda;
- durata;
- `link_episodio`;
- `trascrizione`;
- `sintesi_automatica`;
- `analisi_tematica_emotiva`;
- descrizione;
- `visibility`.

La coppia `(serie_id, stagione, numero_episodio)` e' unica.

#### `personaggi`

Contiene i personaggi narrativi, non gli attori o doppiatori:

- `serie_id`;
- nome originale;
- pinyin;
- nome italiano;
- genere;
- fascia eta;
- lavoro;
- immagine rappresentativa;
- descrizione;
- note admin;
- `visibility`.

La coppia `(serie_id, nome_originale)` e' unica.

#### `emozioni`

Vocabolario controllato:

- nome;
- descrizione;
- colore associato;
- colore hex;
- icona;
- sintesi/analisi AI collegate alle frasi.

Le emozioni non hanno `visibility` perche sono vocabolario controllato.

#### `frasi_parole`

Lessico annotato:

- serie;
- episodio;
- personaggio;
- emozione principale;
- timecode inizio/fine;
- tipo: `Frase`, `Parola`, `Espressione`;
- frase originale;
- pinyin;
- traduzione italiana;
- parola chiave;
- immagine;
- sintesi;
- classificazione tematica;
- nota analisi;
- `visibility`.

Le emozioni multiple sono gestite tramite tabella ponte `frasi_emozioni`.

#### `danmu`

Tabella unica dei Danmu, dopo la migrazione `008_unify_danmu.sql`:

- serie;
- episodio;
- timecode;
- testo originale;
- pinyin;
- traduzione;
- piattaforma;
- data commento;
- autore hash;
- sentiment;
- colore;
- like;
- nota analisi;
- note admin;
- note;
- import batch;
- source row number;
- `visibility`.

Le emozioni multiple dei Danmu sono gestite tramite `danmu_emozioni`.

#### `episodio_battute`

Segmentazione delle trascrizioni per parlante:

- serie;
- episodio;
- ordine;
- personaggio verificato;
- label parlante;
- testo originale;
- timecode inizio/fine;
- fonte: `trascrizione_marcata`, `video`, `manuale`;
- confidenza;
- stato verifica: `verificata`, `da_verificare`, `incerta`;
- note admin;
- `visibility`.

Questa tabella serve per passare da trascrizioni monolitiche a battute collegate ai personaggi.

#### `analisi_create`

Contiene analisi salvate:

- titolo;
- serie;
- scope: `serie`, `stagioni`, `episodi`;
- stagioni selezionate;
- episodi selezionati;
- flag grafici;
- totale episodi;
- totale token;
- token unici;
- top parole;
- top combinazioni;
- statistiche JSON;
- note AI;
- autore.

### 6.2 Viste pubbliche

Le viste con prefisso `public_` espongono solo record pubblici e sono usate dalle viste di consultazione:

- `public_serie_tv`;
- `public_episodi`;
- `public_personaggi`;
- `public_emozioni`;
- `public_frasi_parole`;
- `public_danmu`.

Anche se si chiamano `public_`, l'app e' protetta da login. Il nome indica solo che la vista filtra i dati con `visibility = 'public'`.

## 7. Routing applicativo

Le route principali sono in `webapp/src/app/`.

### `/accesso`

Pagina login admin. Usa `loginAdmin`.

### `/`

Dashboard iniziale con riepilogo del corpus e accessi rapidi.

### `/serie`

Vista elenco serie:

- ricerca testuale;
- filtro per genere;
- paginazione;
- pulsante admin "Aggiungi nuova serie";
- card con poster, titolo, generi bilingui e azioni rapide se l'utente puo' modificare.

### `/serie/[id]`

Dettaglio serie:

- dati serie e poster;
- accordion personaggi;
- accordion episodi;
- episodi raggruppati per stagione quando la serie ha piu stagioni;
- immagini personaggi;
- azioni rapide modifica/elimina se `canEdit`.

### `/episodi/[id]`

Dettaglio episodio:

- dati episodio;
- link episodio;
- sintesi;
- quote visuale;
- analisi tematica ed emotiva;
- trascrizione;
- battute segmentate quando presenti;
- pulsante per generare o rigenerare analisi AI;
- modal per aggiungere rapidamente un elemento lessicale dalla trascrizione.

Le azioni episodio sono in `webapp/src/app/episodi/[id]/actions.ts`.

### `/frasi`

Vista "Lessico":

- ricerca testuale;
- filtro serie;
- filtro emozione;
- filtro personaggio;
- paginazione server-side;
- eliminazione rapida con conferma;
- azioni admin rapide.

### `/emozioni`

Vista emozioni:

- ricerca testuale;
- conteggio frasi e Danmu collegati;
- link verso lessico/Danmu filtrati;
- paginazione;
- azioni admin rapide.

### `/danmu`

Vista Danmu:

- ricerca testuale;
- filtro serie;
- filtro episodio;
- filtro emozione;
- paginazione server-side;
- eliminazione rapida con conferma;
- azioni admin rapide.

### `/analisi`

Dashboard analisi:

- pulsante "Crea nuova analisi";
- modal per scegliere serie, stagioni o episodi specifici;
- scelta output con grafici o senza grafici;
- card per ogni analisi salvata;
- paginazione.

### `/analisi/[id]`

Dettaglio analisi:

- metriche principali;
- parole ricorrenti;
- combinazioni ricorrenti;
- personaggi e lessico associato;
- modi di dire;
- riferimenti ricorrenti;
- grafici/viste se previsti;
- eliminazione analisi.

### `/admin`

Pannello database generico.

Usa la configurazione dichiarativa in `webapp/src/app/admin/admin-config.ts`.

Ogni risorsa definisce:

- chiave;
- label;
- tabella;
- primary key;
- campi riepilogo;
- campi ricerca;
- campi editabili;
- relazioni.

Risorse gestite:

- serie;
- episodi;
- personaggi;
- emozioni;
- lessico;
- Danmu;
- battute episodio;
- emozioni frasi;
- emozioni Danmu.

Il pannello supporta:

- creazione;
- modifica;
- eliminazione;
- ricerca;
- filtro serie;
- filtro visibility;
- paginazione.

### `/admin/utenti`

Gestione utenti:

- creazione utente;
- email;
- password;
- nome;
- attivo/disattivo;
- permesso modifica;
- paginazione.

Le password sono salvate come hash, non in chiaro.

## 8. Componenti condivisi

### `Pagination`

File: `webapp/src/components/pagination.tsx`

Componente server compatibile con App Router. Costruisce link preservando filtri e query string. Mostra:

- intervallo record corrente;
- totale;
- precedente/successiva;
- finestra di pagine;
- ellissi quando necessario.

Helper:

- `parsePage`;
- `getPagination`;
- `paginateItems`.

### `QuickAdminActions`

File: `webapp/src/components/quick-admin-actions.tsx`

Componente per modificare o eliminare record direttamente dalle viste operative, senza passare dal pannello admin.

Le server actions sono in `webapp/src/app/quick-admin-actions.ts`.

### `TranscriptViewer`

File: `webapp/src/components/transcript-viewer.tsx`

Visualizzazione trascrizione/battute con ricerca e gestione parlanti.

## 9. Admin dichiarativo

Il cuore del pannello admin e' `admin-config.ts`.

Per aggiungere una nuova tabella al pannello:

1. aggiungere una risorsa in `adminResources`;
2. indicare `key`, `label`, `table`, `primaryKey`;
3. scegliere `summaryFields`;
4. definire `searchFields`;
5. definire `fields`;
6. se serve una select relazionale, usare `relation`.

Tipi campo supportati:

- `text`;
- `textarea`;
- `number`;
- `decimal`;
- `date`;
- `datetime`;
- `select`;
- `multiselect`;
- `uuid`.

Le operazioni CRUD sono generiche:

- `createAdminRecord`;
- `updateAdminRecord`;
- `deleteAdminRecord`.

Durante create/update il sistema genera automaticamente il pinyin per:

- serie;
- personaggi;
- lessico;
- Danmu.

Il valore generato puo' comunque essere modificato manualmente.

## 10. Pinyin

File: `webapp/src/lib/pinyin.ts`

Il progetto usa `pinyin-pro` per generare pinyin quando il campo pinyin e' vuoto.

Regola generale:

- se l'utente compila il pinyin, viene mantenuto;
- se il campo e' vuoto e il testo originale contiene cinese, viene generato;
- la generazione avviene nelle Server Actions admin e nelle azioni rapide episodio/lessico.

## 11. Generi serie

File: `webapp/src/lib/serie-genres.ts`

I generi sono normalizzati tramite una lista centrale. Ogni opzione ha:

- valore inglese;
- label cinese;
- render bilingue.

Nella UI:

- la creazione/modifica serie usa multiselect;
- la pagina serie ha filtro per genere;
- le card e i dettagli mostrano label bilingui.

## 12. Analisi AI locale e analisi mandarino

Il progetto ha una soluzione gratuita/local-first. Le API OpenAI sono opzionali.

### 12.1 Analisi lessicale mandarino

File: `webapp/src/lib/word-analysis.ts`

Funzioni principali:

- `tokenizeTranscript`;
- `analyzeTranscript`.

Caratteristiche:

- usa `Intl.Segmenter("zh", { granularity: "word" })`;
- filtra stopword cinesi, italiane e inglesi;
- scarta token numerici e monocaratteri non significativi;
- conserva alcuni Han singoli significativi tramite allowlist;
- calcola frequenze parole;
- calcola bigrammi, trigrammi e quadrigrammi;
- identifica combinazioni ricorrenti;
- estrae possibili modi di dire/espressioni;
- estrae riferimenti tra virgolette o titoli;
- associa statistiche ai personaggi quando la trascrizione ha parlanti espliciti o quando il personaggio viene menzionato.

Output principale:

- totale token;
- token unici;
- top parole;
- top combinazioni;
- statistiche personaggi;
- modi di dire;
- riferimenti;
- occorrenze target word/phrase.

### 12.2 Sintesi e analisi episodio

File: `webapp/src/lib/episode-ai.ts`

La generazione episodio produce:

- sintesi automatica;
- analisi tematica ed emotiva;
- citazione rappresentativa.

Con `EPISODE_AI_PROVIDER=local`, la generazione e' gratuita e basata sulla trascrizione:

- segnali narrativi;
- segnali tematici;
- segnali emotivi;
- frasi salienti;
- lessico ricorrente;
- personaggi noti della serie.

Con `EPISODE_AI_PROVIDER=openai`, il file puo' chiamare OpenAI Responses API se `OPENAI_API_KEY` e' configurata.

### 12.3 Analisi dashboard

File: `webapp/src/app/analisi/actions.ts`

La creazione analisi:

1. richiede permesso modifica;
2. riceve serie e scope;
3. seleziona episodi in base a serie/stagione/episodi;
4. concatena le trascrizioni;
5. carica i personaggi della serie;
6. esegue `analyzeTranscript`;
7. salva il risultato in `analisi_create`.

La pagina dettaglio mostra i dati salvati senza ricalcolarli ogni volta.

## 13. Trascrizioni e battute per parlante

La trascrizione completa vive in `episodi.trascrizione`.

La segmentazione per parlante vive in `episodio_battute`:

- ogni riga ha ordine;
- label parlante;
- eventuale `personaggio_id`;
- testo originale;
- stato verifica.

Quando una battuta e' collegata a `personaggio_id`, il legame e' esplicito verso la tabella `personaggi`. Quando manca, resta solo `parlante_label` e deve essere verificata.

Lo script `webapp/scripts/import-dialogue-lines.mjs` importa battute da trascrizioni marcate e prova a collegare i parlanti ai personaggi.

## 14. Script di import e manutenzione

### `webapp/scripts/import-initial-csv.mjs`

Importa dati iniziali da CSV/Airtable verso Supabase.

### `webapp/scripts/import-dialogue-lines.mjs`

Importa battute episodio e prova a collegarle ai personaggi.

### `webapp/scripts/update-new-series-character-images.mjs`

Aggiorna i personaggi delle nuove serie e le immagini rappresentative:

- `一仆二主`;
- `中国奇谭`;
- `我的爸爸是条龙`.

Nel caso di `我的爸爸是条龙`, lo script mantiene i personaggi animati della storia, non attori o doppiatori:

- `龙爸`;
- `龙妈`;
- `东东`.

## 15. Paginazione

La paginazione e' stata centralizzata in:

- `webapp/src/components/pagination.tsx`;
- `webapp/src/lib/pagination.ts`.

Le viste grandi usano paginazione server-side con Supabase `range()` e `count: "exact"`:

- `/frasi`;
- `/danmu`;
- `/analisi`;
- `/admin`;
- `/admin/utenti`.

Le viste piu leggere possono paginare dopo il filtro in memoria:

- `/serie`;
- `/emozioni`.

La query string usa `page`. I filtri vengono preservati nei link di paginazione.

## 16. Flussi operativi principali

### 16.1 Aggiungere una serie

1. Accedere con un utente `can_edit`.
2. Aprire `/serie`.
3. Cliccare "Aggiungi nuova serie" oppure aprire `/admin?tab=serie`.
4. Compilare titoli, anno, generi, poster, descrizione.
5. Impostare `visibility`.
6. Salvare.

### 16.2 Aggiungere episodi

1. Aprire `/admin?tab=episodi`.
2. Selezionare serie.
3. Inserire stagione e numero episodio.
4. Aggiungere trascrizione e link episodio se disponibili.
5. Impostare `visibility`.
6. Salvare.

### 16.3 Aggiungere personaggi

1. Aprire `/admin?tab=personaggi`.
2. Selezionare serie.
3. Inserire nome originale.
4. Il pinyin viene generato se lasciato vuoto.
5. Inserire immagine, genere, fascia eta, lavoro, descrizione.
6. Salvare.

### 16.3.1 Modificare in bulk serie, episodi e personaggi

Le viste operative espongono pannelli di modifica in bulk solo agli utenti con permesso `can_edit`.

- In `/serie` e' possibile selezionare piu serie e aggiornare in blocco visibilita, generi, piattaforma e distribuzione.
- Nel dettaglio serie, dentro l'accordion Personaggi, e' possibile selezionare piu personaggi e aggiornare in blocco visibilita, genere, fascia eta e lavoro.
- Nel dettaglio serie, dentro l'accordion Episodi, e' possibile selezionare piu episodi e aggiornare in blocco visibilita, stagione, data di messa in onda e rigenerazione pinyin del titolo.

I campi lasciati vuoti non vengono modificati. La selezione avviene tramite checkbox sui singoli record.

### 16.4 Aggiungere lessico da un episodio

1. Aprire dettaglio episodio.
2. Nella sezione trascrizione usare la modal rapida.
3. Inserire frase/parola/espressione.
4. Selezionare una o piu emozioni.
5. Collegare personaggio e timecode se utile.
6. Salvare.

### 16.5 Generare sintesi e analisi episodio

1. Aprire dettaglio episodio.
2. Verificare che `trascrizione` sia presente.
3. Cliccare "Genera analisi AI".
4. Se esistono gia sintesi/analisi, usare rigenerazione.

Con provider locale non ci sono costi API.

### 16.6 Creare analisi dashboard

1. Aprire `/analisi`.
2. Cliccare "Crea nuova analisi".
3. Scegliere serie.
4. Scegliere scope: serie intera, stagioni, episodi.
5. Scegliere output grafici.
6. Salvare.
7. Aprire la card generata per vedere il dettaglio.

## 17. Deploy Vercel

Configurazione consigliata:

- Root Directory: `webapp`;
- Framework: Next.js;
- Build Command: `npm run build`;
- Output: default Next.js;
- Node: versione supportata da Next 15.

Variabili da impostare su Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_SESSION_SECRET
ADMIN_PASSWORD
EPISODE_AI_PROVIDER
OPENAI_API_KEY
OPENAI_MODEL
```

Per la modalita gratuita:

```env
EPISODE_AI_PROVIDER=local
```

`OPENAI_API_KEY` puo' restare assente se non si usa provider OpenAI.

## 18. Comandi locali

Da `webapp/`:

```sh
npm install
npm run dev
npm run build
npm run start
npm run import:csv
```

Note:

- `npm run dev` avvia lo sviluppo locale.
- `npm run build` verifica TypeScript e build produzione.
- `npm run start` serve la build produzione.
- `npm run import:csv` esegue import iniziale.

## 19. Convenzioni di sviluppo

### 19.1 Server Components e Server Actions

Le pagine App Router sono principalmente Server Components. Le mutazioni avvengono tramite Server Actions.

Vantaggi:

- meno JavaScript client;
- accesso sicuro alle chiavi server-only;
- redirect e revalidate gestiti lato server.

### 19.2 Accesso dati

Usare:

- `createServerSupabaseClient()` per letture server;
- `createSupabaseAdminClient()` per operazioni admin con service role;
- viste `public_*` per consultazione filtrata da `visibility`;
- tabelle reali per admin e mutazioni.

### 19.3 Visibilita

La maggior parte delle tabelle editoriali ha `visibility`:

- `public`: visibile nelle viste di consultazione;
- `private`: non visibile nelle viste `public_*`.

La webapp resta comunque dietro login.

### 19.4 Pinyin

Non duplicare logica di pinyin nei componenti. Usare `maybeGeneratePinyin` nelle Server Actions.

### 19.5 Generi

Non scrivere generi hardcoded nei componenti. Usare `SERIE_GENRE_OPTIONS`.

### 19.6 Admin

Per aggiungere un campo gestibile in admin, aggiornare `admin-config.ts`.

Per aggiungere una risorsa nuova, aggiornare:

- schema database;
- eventuali relazioni in `AdminField["relation"]`;
- `getRelationOptions()` se serve una nuova relation;
- `adminResources`.

## 20. Stato attuale e punti di attenzione

### Gia implementato

- login obbligatorio su tutte le route applicative;
- gestione utenti e permessi;
- CRUD admin generico;
- azioni rapide dalle viste;
- modifiche in bulk per serie, episodi e personaggi dalle viste operative;
- serie con filtro per genere e ricerca;
- dettagli serie con accordion personaggi/episodi;
- immagini personaggi;
- pagina Lessico;
- pagina Emozioni con ricerca;
- pagina Danmu con paginazione;
- analisi dashboard;
- AI locale gratuita per episodi;
- analisi lessicale mandarino;
- pinyin automatico modificabile;
- Danmu unificati in una tabella;
- battute episodio per parlante;
- paginazione sulle viste principali.

### Da monitorare

- Le immagini remote dipendono da URL esterni. Se una fonte cambia hotlinking o rimuove file, alcune immagini potrebbero non caricarsi.
- La segmentazione per parlante e' affidabile solo quando le trascrizioni sono marcate o verificate.
- L'analisi locale e' euristica: utile per esplorazione, ma non sostituisce una validazione umana.
- Le viste `public_*` filtrano i dati, ma l'accesso applicativo e' protetto dal middleware. Entrambe le cose sono importanti.
- `SUPABASE_SERVICE_ROLE_KEY` deve restare solo server-side.

## 21. Dove mettere nuova documentazione

- Decisioni architetturali: `docs/architecture-decision.md`.
- Schema dati concettuale: `docs/database-design.md`.
- Setup Supabase: `docs/supabase-setup.md`.
- Import CSV: `docs/csv-import.md`.
- Mappature CSV: `docs/csv-field-mapping.md`.
- Manuale tecnico aggiornato: questo file.
