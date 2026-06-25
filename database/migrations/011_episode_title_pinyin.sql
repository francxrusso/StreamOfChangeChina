alter table episodi
  add column if not exists titolo_pinyin text;

drop view if exists public_episodi;

create view public_episodi as
select
  episodi.id,
  episodi.serie_id,
  serie_tv.titolo_originale as serie_titolo_originale,
  episodi.stagione,
  episodi.numero_episodio,
  episodi.titolo_originale,
  episodi.titolo_pinyin,
  episodi.titolo_italiano,
  episodi.messa_in_onda,
  episodi.durata_secondi,
  episodi.link_episodio,
  episodi.trascrizione,
  episodi.sintesi_automatica,
  episodi.analisi_tematica_emotiva,
  episodi.descrizione
from episodi
join serie_tv on serie_tv.id = episodi.serie_id
where episodi.visibility = 'public'
  and serie_tv.visibility = 'public';

revoke select on public_episodi from anon, authenticated;
