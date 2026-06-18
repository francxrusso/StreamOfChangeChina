create table if not exists episodio_battute (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references serie_tv(id) on delete cascade,
  episodio_id uuid not null references episodi(id) on delete cascade,
  ordine integer not null check (ordine > 0),
  personaggio_id uuid references personaggi(id) on delete set null,
  parlante_label text not null,
  testo_originale text not null,
  timecode_inizio_secondi numeric(10,3) check (timecode_inizio_secondi is null or timecode_inizio_secondi >= 0),
  timecode_fine_secondi numeric(10,3) check (
    timecode_fine_secondi is null
    or timecode_inizio_secondi is null
    or timecode_fine_secondi >= timecode_inizio_secondi
  ),
  fonte text not null default 'manuale' check (fonte in ('trascrizione_marcata', 'video', 'manuale')),
  confidenza numeric(4,3) check (confidenza is null or confidenza between 0 and 1),
  verifica_stato text not null default 'da_verificare' check (verifica_stato in ('verificata', 'da_verificare', 'incerta')),
  note_admin text,
  visibility publication_visibility not null default 'private',
  created_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(parlante_label, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(testo_originale, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(note_admin, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (episodio_id, ordine)
);

drop trigger if exists trg_episodio_battute_updated_at on episodio_battute;
create trigger trg_episodio_battute_updated_at before update on episodio_battute for each row execute function set_updated_at();

create index if not exists idx_episodio_battute_serie_id on episodio_battute(serie_id);
create index if not exists idx_episodio_battute_episodio_id on episodio_battute(episodio_id);
create index if not exists idx_episodio_battute_personaggio_id on episodio_battute(personaggio_id);
create index if not exists idx_episodio_battute_verifica_stato on episodio_battute(verifica_stato);
create index if not exists idx_episodio_battute_visibility on episodio_battute(visibility);
create index if not exists idx_episodio_battute_search on episodio_battute using gin(search_vector);
create index if not exists idx_episodio_battute_testo_trgm on episodio_battute using gin(testo_originale gin_trgm_ops);
