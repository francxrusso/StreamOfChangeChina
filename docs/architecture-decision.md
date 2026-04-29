# Architecture Decision

## Scelta consigliata per l'MVP

Per la prima versione della webapp SCC useremo:

- **Next.js** per frontend, routing e API/backend;
- **React** come UI framework;
- **Tailwind CSS** per lo stile;
- **Supabase Free** come database PostgreSQL gestito, autenticazione admin e storage leggero;
- **Vercel Hobby** per il deploy gratuito del frontend.

Questa scelta mantiene il progetto moderno, ma evita di dover gestire subito server, hosting database, autenticazione e deploy manuale.

## Variante senza Supabase

Se non vogliamo usare Supabase, possiamo mantenere lo stesso frontend e sostituire solo lo strato database/auth.

Stack consigliato:

- **Next.js + React + Tailwind CSS** per la webapp;
- **Neon** oppure **Aiven** come PostgreSQL gestito gratuito;
- **Drizzle ORM** oppure query SQL dirette per parlare con il database;
- **Auth.js** per login admin;
- **Vercel Hobby** per deploy frontend.

In questa variante il database resta PostgreSQL e le migrazioni in `database/migrations/` restano valide. Cambia pero' una cosa importante: Supabase offre anche autenticazione, storage, interfaccia tabellare e import CSV; senza Supabase queste parti vanno gestite dalla webapp o da strumenti separati.

### Opzione A: Neon

Neon e' una buona scelta se vogliamo un PostgreSQL moderno e molto comodo con Vercel/Next.js. La free tier e' adatta a prototipo e sviluppo, ma lo spazio e' limitato.

Pro:

- ottimo per Next.js e deploy serverless;
- connection pooling;
- branching del database;
- nessuna carta richiesta per il piano free.

Contro:

- spazio gratuito limitato;
- autenticazione e storage non sono integrati come in Supabase.

### Opzione B: Aiven

Aiven e' una buona scelta se vogliamo un PostgreSQL gestito gratuito con piu' spazio iniziale rispetto a Neon.

Pro:

- PostgreSQL gestito;
- piano gratuito senza scadenza;
- storage gratuito piu' generoso per un MVP;
- monitoring e backup.

Contro:

- meno integrato con Vercel/Next.js rispetto a Neon;
- limite connessioni piu' basso;
- autenticazione e storage vanno gestiti a parte.

### Opzione C: PostgreSQL locale

Possiamo anche usare PostgreSQL installato sul computer per sviluppo e import massivi.

Pro:

- completamente gratuito;
- nessun limite pratico imposto da un piano cloud;
- ideale per importare e pulire grandi batch di Danmu grezzi.

Contro:

- non e' online;
- serve comunque un database cloud per la webapp pubblica;
- bisogna gestire backup e configurazione locale.

## Raccomandazione aggiornata

Per questo progetto, se non usiamo Supabase, la scelta piu' equilibrata e':

```text
Next.js + React + Tailwind
        |
        v
Neon PostgreSQL per MVP online
        |
        v
PostgreSQL locale per import pesanti e archivio Danmu grezzi
```

Se invece la priorita' e' avere piu' spazio gratuito nel database online, valutare Aiven al posto di Neon.

## Perche' Next.js + Tailwind

Next.js permette di tenere nella stessa codebase:

- pagine pubbliche;
- area admin;
- API/backend;
- chiamate al database;
- deploy semplice su Vercel.

Tailwind e' adatto per costruire velocemente un'interfaccia moderna, pulita e responsive senza introdurre subito un design system complesso.

## Perche' Supabase

Supabase e' basato su PostgreSQL e offre gratis, per iniziare:

- database Postgres gestito;
- SQL editor;
- vista tabellare simile a un foglio di calcolo;
- import CSV;
- autenticazione;
- storage file leggero.

Per questo progetto e' utile perche' permette di:

- caricare le migrazioni SQL gia' presenti in `database/migrations/`;
- gestire utenti admin;
- consultare e modificare dati anche da interfaccia tabellare;
- collegare facilmente Next.js al database.

## Limite importante: Danmu grezzi

I piani gratuiti dei database gestiti hanno limiti di spazio. Supabase Free ha un limite di database utile per partire, ma non va considerato sufficiente per archiviare indefinitamente milioni di Danmu grezzi con indici e trascrizioni lunghe.

Per questo l'MVP mantiene due livelli:

- `danmu_raw`: archivio completo importabile, utile in locale o per batch limitati;
- `danmu_analizzati`: selezione curata, annotata e pubblicabile.

Nella fase gratuita conviene:

1. mettere online serie, episodi, personaggi, emozioni, frasi/parole e Danmu analizzati;
2. caricare solo batch limitati di `danmu_raw` su Supabase;
3. conservare export completi dei Danmu grezzi fuori dal database pubblico finche' non sara' necessario un piano a pagamento o una strategia di archiviazione dedicata.

## Deployment previsto

```text
GitHub repository
  -> Vercel deploy
      -> Next.js webapp
          -> Supabase Postgres
```

## Prossimi passi tecnici

1. Creare un progetto Supabase Free.
2. Eseguire la migrazione `database/migrations/001_initial_mvp_schema.sql`.
3. Eseguire il seed `database/seeds/001_seed_emozioni.sql`.
4. Creare la webapp Next.js dentro `webapp/`.
5. Configurare Tailwind CSS.
6. Collegare la webapp a Supabase tramite variabili `.env`.
7. Creare prima le pagine pubbliche:
   - `/serie`
   - `/serie/[id]`
   - `/frasi`
   - `/danmu`
8. Poi creare l'area admin:
   - `/admin`
   - `/admin/serie`
   - `/admin/episodi`
   - `/admin/frasi`
   - `/admin/danmu`
