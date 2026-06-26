alter table danmu
  add column if not exists screenshot_url text,
  add column if not exists screenshot_storage_path text;

drop view if exists public_danmu;

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
  danmu.screenshot_url,
  danmu.screenshot_storage_path,
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
