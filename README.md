# StreamOfChangeChina
This repository is a core technical component of the "Stream of Change in China - SCC" (PRA 2023-2026) research project. It provides a structured pipeline for the extraction, cataloging, and analysis of Danmu (live bullet comments) to study the "ontological condition" of Chinese television seriality in the digital age.

## Repository Structure

- `database/`: PostgreSQL migrations, seed data, and reference schema.
- `docs/`: project decisions, database design, webapp requirements, and repository structure.
- `webapp/`: future public frontend, admin interface, and API/backend code.

## Database

- [Database design](docs/database-design.md) outlines the first data model for cataloging series, episodes, segments, utterances, multimodal annotations, popularity metrics, interviews, bibliography, and publication rights.
- [MVP migration](database/migrations/001_initial_mvp_schema.sql) contains the first implementation-oriented schema for the webapp: admin editing, public browsing, TV series, episodes, characters, phrases/words, emotions, raw Danmu imports, and analyzed Danmu.
- [Emotion seed](database/seeds/001_seed_emozioni.sql) contains the initial controlled vocabulary for emotions.
- [Extended reference schema](database/reference/extended_schema.sql) preserves a broader future-oriented database design.
- [Webapp requirements](docs/webapp-requirements.md) summarizes the admin and visitor flows.
- [Repository structure](docs/repository-structure.md) explains what belongs in this repository and what should stay out.
- [CSV field mapping](docs/csv-field-mapping.md) maps the initial Airtable-style CSV exports to the PostgreSQL MVP schema.
- [Architecture decision](docs/architecture-decision.md) records the recommended MVP stack: Next.js, React, Tailwind, Supabase, and Vercel.
- [Supabase setup](docs/supabase-setup.md) explains how to initialize the hosted PostgreSQL database and environment variables.
- [CSV import](docs/csv-import.md) explains how to import the initial CSV exports into Supabase.
