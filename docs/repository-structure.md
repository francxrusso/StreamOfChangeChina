# Repository Structure

This repository is organized as a lightweight monorepo: database, documentation, and future webapp live together because they evolve as one product.

```text
StreamOfChangeChina/
  README.md
  .env.example
  .gitignore

  database/
    README.md
    migrations/
      001_initial_mvp_schema.sql
    seeds/
      001_seed_emozioni.sql
    reference/
      extended_schema.sql

  docs/
    csv-field-mapping.md
    database-design.md
    webapp-requirements.md
    repository-structure.md

  webapp/
    README.md
```

## What Belongs In Git

- database schema and migrations;
- seed data for controlled vocabularies;
- frontend/backend source code;
- documentation;
- safe examples.

## What Does Not Belong In Git

- `.env` files with real credentials;
- full database dumps;
- private Danmu exports;
- copyrighted video/audio assets;
- private research notes not meant for publication.

## Development Flow

1. Change the database with a new migration in `database/migrations/`.
2. Put controlled vocabulary or safe starter data in `database/seeds/`.
3. Document product decisions in `docs/`.
4. Build public and admin interfaces in `webapp/`.
5. Keep public pages connected to public database views, not directly to internal tables.
