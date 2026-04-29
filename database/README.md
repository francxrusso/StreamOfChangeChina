# Database

This folder contains the database structure for the SCC webapp.

## Folders

- `migrations/`: versioned SQL files that create or change the database structure.
- `seeds/`: repeatable SQL files for initial controlled vocabularies and safe sample data.
- `reference/`: design/reference SQL that should not be treated as the current production migration path.

## Current MVP

Run migrations first, then seeds:

```sh
psql "$DATABASE_URL" -f database/migrations/001_initial_mvp_schema.sql
psql "$DATABASE_URL" -f database/seeds/001_seed_emozioni.sql
```

The current MVP separates Danmu into:

- `danmu_raw`: complete imported archive.
- `danmu_analizzati`: selected, annotated, publishable Danmu.

The public frontend should read from views such as `public_serie_tv`, `public_frasi_parole`, and `public_danmu`.

