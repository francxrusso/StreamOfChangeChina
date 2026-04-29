# Supabase Setup

Questa guida descrive come configurare il progetto Supabase per SCC.

## 1. Creare il progetto

Nel dashboard Supabase:

1. crea un nuovo progetto;
2. scegli una region europea se disponibile;
3. salva la password del database in un password manager;
4. aspetta che il progetto sia pronto.

## 2. Eseguire lo schema

Apri **SQL Editor** e incolla il contenuto di:

```text
database/migrations/001_initial_mvp_schema.sql
```

Esegui la query.

## 3. Eseguire i seed

Sempre da **SQL Editor**, incolla il contenuto di:

```text
database/seeds/001_seed_emozioni.sql
```

Esegui la query.

## 4. Salvare le variabili ambiente

Copia `webapp/.env.example` in `webapp/.env.local` e compila:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

Dove trovarle:

- `NEXT_PUBLIC_SUPABASE_URL`: Project Settings -> API -> Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Project Settings -> API -> anon public key.
- `SUPABASE_SERVICE_ROLE_KEY`: Project Settings -> API -> service_role key.
- `DATABASE_URL`: Project Settings -> Database -> connection string.

`NEXT_PUBLIC_SUPABASE_URL` deve essere solo il Project URL, per esempio:

```text
https://your-project-ref.supabase.co
```

Non deve contenere percorsi come:

```text
/rest/v1
```

Non committare mai `.env.local`.

## 5. Controllo rapido

Nel Table Editor dovresti vedere almeno queste tabelle:

- `serie_tv`
- `episodi`
- `personaggi`
- `emozioni`
- `frasi_parole`
- `frasi_emozioni`
- `danmu_raw`
- `danmu_analizzati`
- `danmu_emozioni`

E queste viste:

- `public_serie_tv`
- `public_episodi`
- `public_personaggi`
- `public_frasi_parole`
- `public_danmu`

## 6. Regola di sicurezza

Per l'MVP, la webapp pubblica deve leggere dalle viste pubbliche. Le tabelle reali saranno usate dall'area admin.

Prima del deploy pubblico bisogna configurare le policy di sicurezza Supabase/RLS oppure passare sempre da API server-side controllate.
