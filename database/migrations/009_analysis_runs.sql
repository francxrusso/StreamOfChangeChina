create table if not exists analisi_create (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  serie_id uuid not null references serie_tv(id) on delete cascade,
  scope_tipo text not null default 'serie' check (scope_tipo in ('serie', 'stagioni', 'episodi')),
  stagioni integer[] not null default '{}'::integer[],
  episodio_ids uuid[] not null default '{}'::uuid[],
  output_grafici boolean not null default true,
  totale_episodi integer not null default 0,
  totale_token integer not null default 0,
  token_unici integer not null default 0,
  top_parole jsonb not null default '[]'::jsonb,
  top_combinazioni jsonb not null default '[]'::jsonb,
  statistiche jsonb not null default '{}'::jsonb,
  note_ai text,
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_analisi_create_updated_at
before update on analisi_create
for each row execute function set_updated_at();

create index if not exists idx_analisi_create_serie_id on analisi_create(serie_id);
create index if not exists idx_analisi_create_scope_tipo on analisi_create(scope_tipo);
create index if not exists idx_analisi_create_created_at on analisi_create(created_at desc);
