create table if not exists danmu (
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
  nota_analisi text,
  note_admin text,
  note text,
  visibility publication_visibility not null default 'private',
  import_batch_id uuid,
  source_row_number integer check (source_row_number is null or source_row_number > 0),
  created_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(testo_originale, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(testo_pinyin, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(traduzione_italiana, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(nota_analisi, '')), 'D')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_danmu_updated_at'
  ) then
    create trigger trg_danmu_updated_at
    before update on danmu
    for each row execute function set_updated_at();
  end if;
end $$;

create index if not exists idx_danmu_serie_id on danmu(serie_id);
create index if not exists idx_danmu_episodio_id on danmu(episodio_id);
create index if not exists idx_danmu_timecode on danmu(timecode_secondi);
create index if not exists idx_danmu_import_batch_id on danmu(import_batch_id);
create index if not exists idx_danmu_visibility on danmu(visibility);
create index if not exists idx_danmu_search on danmu using gin(search_vector);
create index if not exists idx_danmu_testo_trgm on danmu using gin(testo_originale gin_trgm_ops);

do $$
begin
  if to_regclass('public.danmu_raw') is not null and to_regclass('public.danmu_analizzati') is not null then
    insert into danmu (
      id,
      serie_id,
      episodio_id,
      timecode_secondi,
      testo_originale,
      testo_pinyin,
      traduzione_italiana,
      piattaforma,
      data_commento,
      autore_hash,
      sentiment,
      colore,
      like_ricevuti,
      nota_analisi,
      note_admin,
      note,
      visibility,
      import_batch_id,
      source_row_number,
      created_by,
      updated_by,
      created_at,
      updated_at
    )
    select
      danmu_raw.id,
      danmu_raw.serie_id,
      danmu_raw.episodio_id,
      danmu_raw.timecode_secondi,
      danmu_raw.testo_originale,
      danmu_raw.testo_pinyin,
      danmu_raw.traduzione_italiana,
      danmu_raw.piattaforma,
      danmu_raw.data_commento,
      danmu_raw.autore_hash,
      danmu_raw.sentiment,
      danmu_raw.colore,
      danmu_raw.like_ricevuti,
      danmu_analizzati.nota_analisi,
      danmu_analizzati.note_admin,
      danmu_raw.note,
      coalesce(danmu_analizzati.visibility, 'private'::publication_visibility),
      danmu_raw.import_batch_id,
      danmu_raw.source_row_number,
      danmu_analizzati.created_by,
      danmu_analizzati.updated_by,
      danmu_raw.created_at,
      greatest(danmu_raw.updated_at, coalesce(danmu_analizzati.updated_at, danmu_raw.updated_at))
    from danmu_raw
    left join danmu_analizzati on danmu_analizzati.danmu_raw_id = danmu_raw.id
    on conflict (id) do update set
      serie_id = excluded.serie_id,
      episodio_id = excluded.episodio_id,
      timecode_secondi = excluded.timecode_secondi,
      testo_originale = excluded.testo_originale,
      testo_pinyin = excluded.testo_pinyin,
      traduzione_italiana = excluded.traduzione_italiana,
      piattaforma = excluded.piattaforma,
      data_commento = excluded.data_commento,
      autore_hash = excluded.autore_hash,
      sentiment = excluded.sentiment,
      colore = excluded.colore,
      like_ricevuti = excluded.like_ricevuti,
      nota_analisi = excluded.nota_analisi,
      note_admin = excluded.note_admin,
      note = excluded.note,
      visibility = excluded.visibility,
      import_batch_id = excluded.import_batch_id,
      source_row_number = excluded.source_row_number,
      created_by = excluded.created_by,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at;
  elsif to_regclass('public.danmu_raw') is not null then
    insert into danmu (
      id,
      serie_id,
      episodio_id,
      timecode_secondi,
      testo_originale,
      testo_pinyin,
      traduzione_italiana,
      piattaforma,
      data_commento,
      autore_hash,
      sentiment,
      colore,
      like_ricevuti,
      note,
      import_batch_id,
      source_row_number,
      created_at,
      updated_at
    )
    select
      id,
      serie_id,
      episodio_id,
      timecode_secondi,
      testo_originale,
      testo_pinyin,
      traduzione_italiana,
      piattaforma,
      data_commento,
      autore_hash,
      sentiment,
      colore,
      like_ricevuti,
      note,
      import_batch_id,
      source_row_number,
      created_at,
      updated_at
    from danmu_raw
    on conflict (id) do nothing;
  end if;
end $$;

drop view if exists public_danmu;

alter table danmu_emozioni
  add column if not exists danmu_id uuid;

do $$
begin
  if to_regclass('public.danmu_analizzati') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'danmu_emozioni'
        and column_name = 'danmu_analizzato_id'
    )
  then
    update danmu_emozioni
    set danmu_id = danmu_analizzati.danmu_raw_id
    from danmu_analizzati
    where danmu_emozioni.danmu_analizzato_id = danmu_analizzati.id
      and danmu_emozioni.danmu_id is null;
  end if;
end $$;

delete from danmu_emozioni where danmu_id is null;

alter table danmu_emozioni
  drop constraint if exists danmu_emozioni_pkey;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'danmu_emozioni'
      and column_name = 'danmu_analizzato_id'
  ) then
    alter table danmu_emozioni drop column danmu_analizzato_id;
  end if;
end $$;

alter table danmu_emozioni
  alter column danmu_id set not null,
  add constraint danmu_emozioni_pkey primary key (danmu_id, emozione_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'danmu_emozioni_danmu_id_fkey'
  ) then
    alter table danmu_emozioni
      add constraint danmu_emozioni_danmu_id_fkey
      foreign key (danmu_id) references danmu(id) on delete cascade;
  end if;
end $$;

create view public_danmu as
select
  danmu.id,
  danmu.serie_id,
  serie_tv.titolo_originale as serie_titolo_originale,
  episodi.stagione,
  episodi.numero_episodio,
  danmu.timecode_secondi,
  danmu.testo_originale,
  danmu.testo_pinyin,
  danmu.traduzione_italiana,
  danmu.piattaforma,
  danmu.data_commento,
  danmu.sentiment,
  danmu.colore,
  danmu.like_ricevuti,
  danmu.nota_analisi,
  array_remove(array_agg(distinct emozioni.nome), null) as emozioni
from danmu
join serie_tv on serie_tv.id = danmu.serie_id
left join episodi on episodi.id = danmu.episodio_id
left join danmu_emozioni on danmu_emozioni.danmu_id = danmu.id
left join emozioni on emozioni.id = danmu_emozioni.emozione_id
where danmu.visibility = 'public'
  and serie_tv.visibility = 'public'
  and (episodi.id is null or episodi.visibility = 'public')
group by
  danmu.id,
  serie_tv.titolo_originale,
  episodi.stagione,
  episodi.numero_episodio;

revoke select on public_danmu from anon, authenticated;

drop table if exists danmu_analizzati cascade;
drop table if exists danmu_raw cascade;
