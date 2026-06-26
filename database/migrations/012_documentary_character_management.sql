alter table serie_tv
  add column if not exists gestione_personaggi boolean not null default true;

drop view if exists public_serie_tv;

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
  gestione_personaggi,
  piattaforma,
  tipo_distribuzione,
  poster_url,
  descrizione,
  frasi_parole_ricorrenti_ai,
  note_pubbliche
from serie_tv
where visibility = 'public';

revoke select on public_serie_tv from anon, authenticated;
