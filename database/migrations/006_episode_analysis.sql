create table if not exists analisi_episodi (
  id uuid primary key default gen_random_uuid(),
  episodio_id uuid not null references episodi(id) on delete cascade,
  serie_id uuid not null references serie_tv(id) on delete cascade,
  tipo text not null default 'word_frequency',
  parola_target text,
  totale_token integer not null default 0,
  token_unici integer not null default 0,
  occorrenze_target integer,
  top_parole jsonb not null default '[]'::jsonb,
  statistiche jsonb not null default '{}'::jsonb,
  note_ai text,
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_analisi_episodi_updated_at
before update on analisi_episodi
for each row execute function set_updated_at();

create index if not exists idx_analisi_episodi_episodio_id on analisi_episodi(episodio_id);
create index if not exists idx_analisi_episodi_serie_id on analisi_episodi(serie_id);
create index if not exists idx_analisi_episodi_tipo on analisi_episodi(tipo);
