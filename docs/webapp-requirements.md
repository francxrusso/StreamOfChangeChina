# Requisiti Webapp SCC

La webapp deve avere due esperienze distinte: una parte pubblica consultabile da tutti e una parte amministrativa per inserire e modificare i dati.

## Ruoli

### Visitatore

Il visitatore non deve fare login. Puo' consultare solo dati pubblicati.

Funzioni principali:

- vedere l'elenco delle serie TV;
- aprire la scheda di una serie;
- filtrare per serie;
- cercare nei Danmu/commenti;
- cercare nelle frasi della trascrizione;
- filtrare frasi e Danmu per emozione;
- vedere episodi e personaggi collegati ai risultati.

Il visitatore deve leggere dalle viste pubbliche:

- `public_serie_tv`
- `public_episodi`
- `public_personaggi`
- `public_frasi_parole`
- `public_danmu`

### Admin

L'admin deve fare login. Puo' inserire, modificare e pubblicare elementi del database tramite frontend.

Funzioni principali:

- creare e modificare serie TV;
- creare e modificare episodi;
- creare e modificare personaggi;
- inserire frasi/parole della trascrizione;
- associare emozioni alle frasi;
- inserire Danmu;
- importare Danmu grezzi in grandi quantita';
- selezionare Danmu da analizzare/pubblicare;
- associare emozioni ai Danmu;
- decidere se ogni elemento e' `public` o `private`;
- mantenere note interne non visibili al pubblico.

L'admin lavora sulle tabelle reali:

- `serie_tv`
- `episodi`
- `personaggi`
- `frasi_parole`
- `emozioni`
- `frasi_emozioni`
- `danmu_raw`
- `danmu_analizzati`
- `danmu_emozioni`

## Tabelle MVP

### `serie_tv`

Contiene la scheda generale della serie: titoli, anno, piattaforma, tipo di distribuzione, descrizione e visibilita'.

### `episodi`

Contiene gli episodi collegati a una serie.

### `personaggi`

Contiene i personaggi collegati a una serie, con dati anagrafici e narrativi essenziali come genere, fascia d'eta', lavoro/professione, descrizione e immagine rappresentativa.

### `frasi_parole`

Contiene le frasi della trascrizione e le parole/espressioni da analizzare. E' la tabella principale per la ricerca testuale nei dialoghi.

### `emozioni`

Contiene il vocabolario controllato delle emozioni.

### `frasi_emozioni`

Collega una frase a una o piu' emozioni.

### `danmu_raw`

Contiene tutti i commenti Danmu importati dalla piattaforma. Puo' arrivare facilmente a circa 17.000 righe per episodio, quindi va trattata come tabella di archivio completo e ricerca grezza.

Consiglio operativo: importare i Danmu per batch usando `import_batch_id`, cosi' ogni caricamento puo' essere tracciato, controllato ed eventualmente ripetuto senza confondere fonti diverse.

### `danmu_analizzati`

Contiene solo i Danmu selezionati per l'analisi, con note interpretative e stato di pubblicazione. La webapp pubblica deve mostrare questi, non l'intero archivio grezzo.

### `danmu_emozioni`

Collega un Danmu analizzato a una o piu' emozioni.

## Filtri pubblici

La prima versione del frontend pubblico dovrebbe offrire almeno:

- filtro per serie;
- filtro per episodio;
- ricerca libera nei Danmu;
- ricerca libera nelle frasi della trascrizione;
- filtro per emozione;
- filtro per personaggio, solo per le frasi/parole.

## Pagine frontend consigliate

### Area pubblica

- `/serie`: elenco delle serie pubbliche.
- `/serie/:id`: scheda della serie con episodi, personaggi, frasi pubbliche e Danmu pubblici.
- `/frasi`: ricerca nelle frasi della trascrizione.
- `/danmu`: ricerca nei commenti Danmu.

### Area admin

- `/admin/serie`: gestione delle serie.
- `/admin/episodi`: gestione degli episodi.
- `/admin/personaggi`: gestione dei personaggi.
- `/admin/frasi`: gestione di frasi e parole della trascrizione.
- `/admin/emozioni`: gestione del vocabolario delle emozioni.
- `/admin/danmu`: gestione dei commenti Danmu.
- `/admin/danmu/import`: importazione massiva dei Danmu grezzi.
- `/admin/danmu/analisi`: selezione, annotazione e pubblicazione dei Danmu.

## Query pubbliche di riferimento

Filtro per serie:

```sql
select *
from public_serie_tv
where titolo_originale ilike '%' || :query || '%'
   or titolo_italiano ilike '%' || :query || '%';
```

Filtro per frase nella trascrizione:

```sql
select *
from public_frasi_parole
where frase_originale ilike '%' || :query || '%'
   or traduzione_italiana ilike '%' || :query || '%'
order by serie_titolo_originale, numero_episodio, timecode_inizio_secondi;
```

Filtro per commento Danmu:

```sql
select *
from public_danmu
where testo_originale ilike '%' || :query || '%'
   or traduzione_italiana ilike '%' || :query || '%'
order by serie_titolo_originale, numero_episodio, timecode_secondi;
```

Ricerca nell'archivio grezzo dei Danmu, solo per admin:

```sql
select *
from danmu_raw
where episodio_id = :episodio_id
  and testo_originale ilike '%' || :query || '%'
order by timecode_secondi;
```

## Regola di pubblicazione

Ogni contenuto editoriale ha un campo `visibility`.

- `private`: visibile solo agli admin.
- `public`: visibile anche ai visitatori.

Le note interne devono restare in campi come `note_admin`, che non compaiono nelle viste pubbliche.
