alter table analisi_episodi
  add column if not exists frase_target text,
  add column if not exists occorrenze_frase_target integer,
  add column if not exists top_combinazioni jsonb not null default '[]'::jsonb;
