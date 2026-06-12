# CSV Field Mapping

Questa nota documenta come i CSV esportati dalle tabelle iniziali vengono tradotti nello schema PostgreSQL MVP.

## Principio generale

I CSV sembrano provenire da Airtable o da una struttura simile. Alcuni campi sono dati reali, altri sono lookup, conteggi, copie o riepiloghi automatici.

Nel database relazionale:

- i dati reali diventano colonne;
- le relazioni diventano chiavi esterne;
- i conteggi si ricavano con query;
- i campi `copy`, `from ...`, `collegati` e simili non vanno duplicati se possono essere ottenuti con join;
- i campi AI possono restare colonne editoriali quando rappresentano una sintesi pubblicabile o una classificazione utile.

## Inventario CSV letto

| CSV | Righe dati | Colonne | Nota |
| --- | ---: | ---: | --- |
| `Serie TV-Vista Tabellare.csv` | 5 | 16 | contiene metadati serie, poster e campi riepilogativi |
| `Episodi-Vista Tabellare.csv` | 114 | 13 | contiene trascrizioni lunghe e analisi episodio |
| `Personaggi-Vista Tabellare.csv` | 2 | 6 | contiene personaggi pilota |
| `Frasi e Parole-Vista Tabellare.csv` | 1 | 15 | contiene un esempio gia' associato a emozione |
| `Emozioni-Vista Tabellare.csv` | 4 | 9 | contiene vocabolario emozioni |
| `Danmu 弹幕-Vista Tabella.csv` | 1 | 11 | contiene un esempio pilota; i dataset reali saranno molto piu' grandi |

## Serie TV

CSV: `Serie TV-Vista Tabellare.csv`

| CSV | Database |
| --- | --- |
| Titolo | `serie_tv.titolo_originale` |
| Titolo Inglese | `serie_tv.titolo_inglese` |
| Descrizione | `serie_tv.descrizione` |
| Anno di Uscita | `serie_tv.anno` |
| Stagioni | `serie_tv.stagioni` |
| Genere | `serie_tv.genere` |
| Poster | `serie_tv.poster_url` |
| Frasi/Parole Piu Ricorrenti (AI) | `serie_tv.frasi_parole_ricorrenti_ai` |

Campi ricostruibili e quindi non fondamentali come colonne:

- Episodi Collegati
- Numero Episodi
- Numero Frasi/Parole Estratte
- Frasi e Parole
- Danmu copy

## Episodi

CSV: `Episodi-Vista Tabellare.csv`

| CSV | Database |
| --- | --- |
| Titolo Episodio | `episodi.titolo_originale` |
| Episodio | `episodi.numero_episodio` |
| Stagione | `episodi.stagione` |
| Messa In Onda | `episodi.messa_in_onda` |
| Trascrizione | `episodi.trascrizione` |
| Serie TV | `episodi.serie_id` tramite match su `serie_tv.titolo_originale` |
| Sintesi Automatica Episodio | `episodi.sintesi_automatica` |
| Analisi Tematica e Emotiva | `episodi.analisi_tematica_emotiva` |

Campi ricostruibili:

- Numero Frasi/Parole Estratte
- Frasi e Parole
- Danmu
- Danmu copy

Nota: `serie_tv.stagioni` conserva il numero complessivo di stagioni; `episodi.stagione` identifica la stagione del singolo episodio.

## Personaggi

CSV: `Personaggi-Vista Tabellare.csv`

| CSV | Database |
| --- | --- |
| Nome | `personaggi.nome_originale` |
| Serie TV di Origine | `personaggi.serie_id` tramite match su `serie_tv.titolo_originale` |
| Genere | `personaggi.genere` |
| Fascia d'età | `personaggi.fascia_eta` |
| Lavoro / Professione | `personaggi.lavoro` |
| Immagine Rappresentativa | `personaggi.immagine_rappresentativa` |
| Note Aggiuntive | `personaggi.note_admin` o `personaggi.descrizione`, secondo contenuto |

Campo ricostruibile:

- Emozioni Associate

## Frasi e Parole

CSV: `Frasi e Parole-Vista Tabellare.csv`

| CSV | Database |
| --- | --- |
| Testo Frase o Parola | `frasi_parole.frase_originale` |
| Tipo | `frasi_parole.tipo` |
| Episodio di Origine | `frasi_parole.episodio_id` tramite match su episodio |
| Serie TV di Origine | `frasi_parole.serie_id` tramite match su serie |
| Emozioni Associate | `frasi_emozioni` |
| Intensita | `frasi_emozioni.intensita` |
| Immagine Rappresentativa | `frasi_parole.immagine_rappresentativa` |
| Note Aggiuntive | `frasi_parole.note_admin` o `frasi_parole.nota_analisi`, secondo contenuto |
| Nome Emozione Principale | `frasi_parole.emozione_principale_id` |
| Sintesi Automatica Frase/Parola | `frasi_parole.sintesi_automatica` |
| Classificazione Tematica AI | `frasi_parole.classificazione_tematica_ai` |

Campi ricostruibili:

- Numero Emozioni Associate
- Titolo Episodio di Origine
- Stagione Episodio di Origine
- Genere Serie TV di Origine

## Emozioni

CSV: `Emozioni-Vista Tabellare.csv`

| CSV | Database |
| --- | --- |
| Nome Emozione | `emozioni.nome` |
| Descrizione | `emozioni.descrizione` |
| Colore Associato | `emozioni.colore_assoc` |
| Icona Emozione | `emozioni.icona` |
| Sintesi delle Frasi/Parole Collegate (AI) | `emozioni.sintesi_frasi_collegate_ai` |
| Analisi Semantica delle Frasi/Parole (AI) | `emozioni.analisi_semantica_frasi_ai` |

Campi ricostruibili:

- Parole o Frasi Collegate
- Numero di Frasi/Parole Collegate
- Frasi e Parole copy

## Danmu

CSV: `Danmu 弹幕-Vista Tabella.csv`

| CSV | Database |
| --- | --- |
| Commento | `danmu_raw.testo_originale` |
| Traduzione | `danmu_raw.traduzione_italiana` |
| Data creazione | `danmu_raw.data_commento` |
| Minutaggio | `danmu_raw.timecode_secondi` |
| Episodi | `danmu_raw.episodio_id` tramite match su episodio |
| Serie TV | `danmu_raw.serie_id` tramite match su serie |
| Sentiment | `danmu_raw.sentiment` |
| Colore | `danmu_raw.colore` |
| Like ricevuti | `danmu_raw.like_ricevuti` |
| Note | `danmu_raw.note` |

Campo da ignorare o usare solo come supporto import:

- Episodio (from Episodi)

## Prossimo passo

Per importare davvero questi CSV servira' uno script di import che:

1. importa prima `serie_tv`;
2. importa `episodi`, collegandoli alle serie;
3. importa `personaggi`;
4. importa `emozioni`;
5. importa `frasi_parole` e compila `frasi_emozioni`;
6. importa `danmu_raw` a batch.
