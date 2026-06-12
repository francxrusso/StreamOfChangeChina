create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create type app_user_role as enum ('admin');
create type publication_visibility as enum ('public', 'private');

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  role app_user_role not null default 'admin',
  password_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table serie_tv (
  id uuid primary key default gen_random_uuid(),
  titolo_originale text not null,
  titolo_pinyin text,
  titolo_italiano text,
  titolo_inglese text,
  anno integer check (anno is null or anno between 1900 and 2100),
  stagioni integer check (stagioni is null or stagioni > 0),
  genere text,
  piattaforma text,
  tipo_distribuzione text check (tipo_distribuzione is null or tipo_distribuzione in ('tv', 'streaming', 'ibrida')),
  poster_url text,
  descrizione text,
  frasi_parole_ricorrenti_ai text,
  note_pubbliche text,
  note_admin text,
  visibility publication_visibility not null default 'private',
  created_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table episodi (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references serie_tv(id) on delete cascade,
  stagione integer not null default 1 check (stagione > 0),
  numero_episodio integer not null check (numero_episodio > 0),
  titolo_originale text,
  titolo_italiano text,
  messa_in_onda date,
  durata_secondi integer check (durata_secondi is null or durata_secondi >= 0),
  trascrizione text,
  sintesi_automatica text,
  analisi_tematica_emotiva text,
  descrizione text,
  note_admin text,
  visibility publication_visibility not null default 'private',
  created_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (serie_id, stagione, numero_episodio)
);

create table personaggi (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references serie_tv(id) on delete cascade,
  nome_originale text not null,
  nome_pinyin text,
  nome_italiano text,
  genere text,
  fascia_eta text,
  lavoro text,
  immagine_rappresentativa text,
  descrizione text,
  note_admin text,
  visibility publication_visibility not null default 'public',
  created_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (serie_id, nome_originale)
);

create table emozioni (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descrizione text,
  colore_assoc text,
  colore_hex char(7),
  icona text,
  sintesi_frasi_collegate_ai text,
  analisi_semantica_frasi_ai text,
  created_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table frasi_parole (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references serie_tv(id) on delete cascade,
  episodio_id uuid references episodi(id) on delete cascade,
  personaggio_id uuid references personaggi(id) on delete set null,
  emozione_principale_id uuid references emozioni(id) on delete set null,
  timecode_inizio_secondi numeric(10,3) check (timecode_inizio_secondi is null or timecode_inizio_secondi >= 0),
  timecode_fine_secondi numeric(10,3) check (
    timecode_fine_secondi is null
    or timecode_inizio_secondi is null
    or timecode_fine_secondi >= timecode_inizio_secondi
  ),
  tipo text check (tipo is null or tipo in ('Frase', 'Parola', 'Espressione')),
  frase_originale text not null,
  frase_pinyin text,
  traduzione_italiana text,
  parola_chiave text,
  immagine_rappresentativa text,
  sintesi_automatica text,
  classificazione_tematica_ai text,
  nota_analisi text,
  note_admin text,
  visibility publication_visibility not null default 'private',
  created_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(frase_originale, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(frase_pinyin, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(traduzione_italiana, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(parola_chiave, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table frasi_emozioni (
  frase_id uuid not null references frasi_parole(id) on delete cascade,
  emozione_id uuid not null references emozioni(id) on delete cascade,
  intensita integer check (intensita is null or intensita between 1 and 5),
  note text,
  primary key (frase_id, emozione_id)
);

create table danmu_raw (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references serie_tv(id) on delete cascade,
  episodio_id uuid references episodi(id) on delete cascade,
  timecode_secondi numeric(10,3) check (timecode_secondi is null or timecode_secondi >= 0),
  testo_originale text not null,
  testo_pinyin text,
  traduzione_italiana text,
  piattaforma text,
  data_commento timestamptz,
  autore_hash text,
  sentiment text,
  colore text,
  like_ricevuti integer check (like_ricevuti is null or like_ricevuti >= 0),
  note text,
  import_batch_id uuid,
  source_row_number integer check (source_row_number is null or source_row_number > 0),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(testo_originale, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(testo_pinyin, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(traduzione_italiana, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table danmu_analizzati (
  id uuid primary key default gen_random_uuid(),
  danmu_raw_id uuid not null references danmu_raw(id) on delete cascade,
  nota_analisi text,
  note_admin text,
  visibility publication_visibility not null default 'private',
  created_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (danmu_raw_id)
);

create table danmu_emozioni (
  danmu_analizzato_id uuid not null references danmu_analizzati(id) on delete cascade,
  emozione_id uuid not null references emozioni(id) on delete cascade,
  intensita integer check (intensita is null or intensita between 1 and 5),
  note text,
  primary key (danmu_analizzato_id, emozione_id)
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_admin_users_updated_at before update on admin_users for each row execute function set_updated_at();
create trigger trg_serie_tv_updated_at before update on serie_tv for each row execute function set_updated_at();
create trigger trg_episodi_updated_at before update on episodi for each row execute function set_updated_at();
create trigger trg_personaggi_updated_at before update on personaggi for each row execute function set_updated_at();
create trigger trg_emozioni_updated_at before update on emozioni for each row execute function set_updated_at();
create trigger trg_frasi_parole_updated_at before update on frasi_parole for each row execute function set_updated_at();
create trigger trg_danmu_raw_updated_at before update on danmu_raw for each row execute function set_updated_at();
create trigger trg_danmu_analizzati_updated_at before update on danmu_analizzati for each row execute function set_updated_at();

create index idx_serie_tv_visibility on serie_tv(visibility);
create index idx_episodi_serie_id on episodi(serie_id);
create index idx_episodi_visibility on episodi(visibility);
create index idx_personaggi_serie_id on personaggi(serie_id);
create index idx_frasi_parole_serie_id on frasi_parole(serie_id);
create index idx_frasi_parole_episodio_id on frasi_parole(episodio_id);
create index idx_frasi_parole_personaggio_id on frasi_parole(personaggio_id);
create index idx_frasi_parole_visibility on frasi_parole(visibility);
create index idx_frasi_parole_search on frasi_parole using gin(search_vector);
create index idx_frasi_parole_originale_trgm on frasi_parole using gin(frase_originale gin_trgm_ops);
create index idx_frasi_parole_traduzione_trgm on frasi_parole using gin(traduzione_italiana gin_trgm_ops);
create index idx_danmu_raw_serie_id on danmu_raw(serie_id);
create index idx_danmu_raw_episodio_id on danmu_raw(episodio_id);
create index idx_danmu_raw_timecode on danmu_raw(timecode_secondi);
create index idx_danmu_raw_import_batch_id on danmu_raw(import_batch_id);
create index idx_danmu_raw_search on danmu_raw using gin(search_vector);
create index idx_danmu_raw_testo_trgm on danmu_raw using gin(testo_originale gin_trgm_ops);
create index idx_danmu_analizzati_raw_id on danmu_analizzati(danmu_raw_id);
create index idx_danmu_analizzati_visibility on danmu_analizzati(visibility);

create view public_serie_tv as
select
  id,
  titolo_originale,
  titolo_pinyin,
  titolo_italiano,
  titolo_inglese,
  anno,
  stagioni,
  genere,
  piattaforma,
  tipo_distribuzione,
  poster_url,
  descrizione,
  frasi_parole_ricorrenti_ai,
  note_pubbliche
from serie_tv
where visibility = 'public';

create view public_episodi as
select
  episodi.id,
  episodi.serie_id,
  serie_tv.titolo_originale as serie_titolo_originale,
  episodi.stagione,
  episodi.numero_episodio,
  episodi.titolo_originale,
  episodi.titolo_italiano,
  episodi.messa_in_onda,
  episodi.durata_secondi,
  episodi.trascrizione,
  episodi.sintesi_automatica,
  episodi.analisi_tematica_emotiva,
  episodi.descrizione
from episodi
join serie_tv on serie_tv.id = episodi.serie_id
where episodi.visibility = 'public'
  and serie_tv.visibility = 'public';

create view public_personaggi as
select
  personaggi.id,
  personaggi.serie_id,
  serie_tv.titolo_originale as serie_titolo_originale,
  personaggi.nome_originale,
  personaggi.nome_pinyin,
  personaggi.nome_italiano,
  personaggi.genere,
  personaggi.fascia_eta,
  personaggi.lavoro,
  personaggi.immagine_rappresentativa,
  personaggi.descrizione
from personaggi
join serie_tv on serie_tv.id = personaggi.serie_id
where personaggi.visibility = 'public'
  and serie_tv.visibility = 'public';

create view public_emozioni as
select
  id,
  nome,
  descrizione,
  colore_assoc,
  colore_hex,
  icona,
  sintesi_frasi_collegate_ai,
  analisi_semantica_frasi_ai
from emozioni;

create view public_frasi_parole as
select
  frasi_parole.id,
  frasi_parole.serie_id,
  serie_tv.titolo_originale as serie_titolo_originale,
  episodi.stagione,
  episodi.numero_episodio,
  personaggi.nome_originale as personaggio_nome_originale,
  emozione_principale.nome as emozione_principale,
  frasi_parole.timecode_inizio_secondi,
  frasi_parole.timecode_fine_secondi,
  frasi_parole.tipo,
  frasi_parole.frase_originale,
  frasi_parole.frase_pinyin,
  frasi_parole.traduzione_italiana,
  frasi_parole.parola_chiave,
  frasi_parole.immagine_rappresentativa,
  frasi_parole.sintesi_automatica,
  frasi_parole.classificazione_tematica_ai,
  frasi_parole.nota_analisi,
  array_remove(array_agg(distinct emozioni.nome), null) as emozioni
from frasi_parole
join serie_tv on serie_tv.id = frasi_parole.serie_id
left join episodi on episodi.id = frasi_parole.episodio_id
left join personaggi on personaggi.id = frasi_parole.personaggio_id
left join emozioni emozione_principale on emozione_principale.id = frasi_parole.emozione_principale_id
left join frasi_emozioni on frasi_emozioni.frase_id = frasi_parole.id
left join emozioni on emozioni.id = frasi_emozioni.emozione_id
where frasi_parole.visibility = 'public'
  and serie_tv.visibility = 'public'
  and (episodi.id is null or episodi.visibility = 'public')
group by
  frasi_parole.id,
  serie_tv.titolo_originale,
  episodi.stagione,
  episodi.numero_episodio,
  personaggi.nome_originale,
  emozione_principale.nome;

create view public_danmu as
select
  danmu_analizzati.id,
  danmu_raw.id as danmu_raw_id,
  danmu_raw.serie_id,
  serie_tv.titolo_originale as serie_titolo_originale,
  episodi.stagione,
  episodi.numero_episodio,
  danmu_raw.timecode_secondi,
  danmu_raw.testo_originale,
  danmu_raw.testo_pinyin,
  danmu_raw.traduzione_italiana,
  danmu_raw.piattaforma,
  danmu_raw.data_commento,
  danmu_raw.sentiment,
  danmu_raw.colore,
  danmu_raw.like_ricevuti,
  danmu_analizzati.nota_analisi,
  array_remove(array_agg(distinct emozioni.nome), null) as emozioni
from danmu_analizzati
join danmu_raw on danmu_raw.id = danmu_analizzati.danmu_raw_id
join serie_tv on serie_tv.id = danmu_raw.serie_id
left join episodi on episodi.id = danmu_raw.episodio_id
left join danmu_emozioni on danmu_emozioni.danmu_analizzato_id = danmu_analizzati.id
left join emozioni on emozioni.id = danmu_emozioni.emozione_id
where danmu_analizzati.visibility = 'public'
  and serie_tv.visibility = 'public'
  and (episodi.id is null or episodi.visibility = 'public')
group by
  danmu_analizzati.id,
  danmu_raw.id,
  serie_tv.titolo_originale,
  episodi.stagione,
  episodi.numero_episodio;
