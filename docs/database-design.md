# Stream of Change in China - Database Design

Questo documento propone una prima architettura dati per il progetto SCC. L'obiettivo e' rendere consultabile online un corpus di serie televisive e web series cinesi, con particolare attenzione a serialita', piattaforme, dialoghi, immagini, suono, tag emotivi, benchmarking della popolarita' e fonti di ricerca.

## Obiettivi del database

- Catalogare serie, stagioni/edizioni, episodi e segmenti audiovisivi.
- Confrontare prodotti della TV tradizionale, in particolare CCTV, e prodotti nati per piattaforme streaming, in particolare Tencent Video.
- Archiviare dialoghi, immagini, suono e annotazioni multimodali.
- Taggare testi, scene, gesti e lessico secondo temi, emozioni e parole chiave.
- Conservare fonti bibliografiche, interviste, metriche di popolarita' e informazioni sui diritti.
- Esporre al frontend solo dati pubblicabili, mantenendo separati materiali riservati o protetti da copyright.

## Scelta tecnologica iniziale

PostgreSQL e' una buona base per partire:

- relazioni solide tra serie, episodi, scene, battute, tag e fonti;
- `jsonb` per metadati variabili provenienti da Atlas.ti, piattaforme streaming o dataset esterni;
- `tsvector` e indici full-text per ricerche nei dialoghi;
- supporto futuro a viste pubbliche/API, ad esempio con Supabase, PostgREST, Django, FastAPI o Next.js.

## Aree funzionali

### 1. Catalogo audiovisivo

Entita' principali:

- `platforms`: piattaforme e broadcaster, ad esempio CCTV e Tencent Video.
- `series`: opera seriale.
- `episodes`: singolo episodio.
- `segments`: scena, sequenza o clip analitica, con timecode.
- `media_assets`: file, immagini, still frame, clip, sottotitoli o riferimenti esterni.

Questa area permette di navigare il corpus dal generale al dettaglio: serie -> episodio -> segmento -> materiali.

### 2. Trascrizione e analisi testuale

Entita' principali:

- `characters`: personaggi interni all'opera.
- `utterances`: battute/dialoghi con timecode, lingua originale, traduzione e traslitterazione.
- `lexical_items`: espressioni lessicali notevoli, utili anche per materiali didattici.
- `utterance_lexical_items`: collegamento tra battute ed espressioni.
- `danmu_comments`: commenti live/bullet comments sincronizzati al video, utili per analisi della ricezione e del fandom.

Le battute sono il centro della futura consultazione: ricerca per serie, personaggio, tema, emozione, parola cinese, traduzione italiana/inglese.

### 3. Annotazioni qualitative e multimodali

Entita' principali:

- `tag_categories`: famiglie di tag, ad esempio tema, emozione, gesto, codice narrativo, censura, queer, genere, intermedialita'.
- `tags`: vocabolario controllato dei tag.
- `annotations`: annotazioni applicabili a serie, episodi, segmenti, battute o asset.
- `annotation_tags`: collegamento molti-a-molti tra annotazioni e tag.

Il modello usa un campo `target_type` + `target_id` per rendere le annotazioni flessibili. Se in seguito servono vincoli piu' rigidi, si potranno separare in tabelle specialistiche.

### 4. Benchmarking e ricezione

Entita' principali:

- `popularity_sources`: fonti delle metriche, ad esempio classifiche CCTV, ranking piattaforme, social, siti di rating.
- `popularity_metrics`: valori puntuali nel tempo.
- `audience_events`: eventi rilevanti di ricezione, controversie, censura, picchi di discussione, campagne fandom.

Questa area serve a confrontare successo, gradimento e circolazione tra TV lineare e streaming.

### 5. Ricerca, contesto e disseminazione

Entita' principali:

- `people`: ricercatori, autori, registi, produttori, intervistati.
- `person_roles`: ruoli delle persone rispetto a serie o progetto.
- `interviews`: interviste a produttori, registi, scrittori o altri attori.
- `bibliographic_sources`: bibliografia e fonti.
- `research_outputs`: workshop, convegni, articoli, monografia, materiali didattici.

Questa parte non e' solo amministrativa: collega l'analisi alle fonti e rende citabile il lavoro.

### 6. Diritti e pubblicazione online

Entita' principali:

- `rights_statements`: stato dei diritti e livello di pubblicabilita'.
- campi `visibility` sui contenuti sensibili.

Per il frontend conviene distinguere fin dall'inizio:

- contenuti pubblici: metadati, tag, estratti brevi, riferimenti bibliografici;
- contenuti riservati: trascrizioni complete, frame, clip, interviste non pubblicabili;
- contenuti interni: note di lavoro, mapping Atlas.ti, materiali provvisori.

## Percorsi di consultazione per il frontend

Prime viste utili:

- elenco serie con filtri per piattaforma, anno, tema, genere e caso studio;
- pagina serie con episodi, descrizione, piattaforma, metriche e bibliografia;
- pagina episodio con segmenti, timecode, personaggi e tag principali;
- ricerca nei dialoghi per lingua, personaggio, emozione, tema o parola chiave;
- ricerca nei Danmu per episodio, timecode, piattaforma, parola chiave o tag;
- esplorazione tag/emozioni con occorrenze e collegamenti alle scene;
- confronto tra corpus CCTV e corpus streaming;
- schede didattiche ricavate da espressioni lessicali e pragmatiche.

## Regole di modellazione consigliate

- Usare UUID come chiavi primarie: comodi per API pubbliche e import successivi.
- Conservare titoli multilingue: originale cinese, pinyin, italiano/inglese.
- Salvare sempre la fonte dei dati: ranking, metadati piattaforma, bibliografia, intervista.
- Separare asset e metadati: il database registra riferimenti e diritti, i file possono stare in storage esterno.
- Non codificare tutto in testo libero: temi, emozioni e gesti devono usare vocabolari controllati.
- Mantenere `notes` e `metadata jsonb` per non bloccare la ricerca qualitativa nelle prime fasi.

## Avvio pratico

1. Creare il database PostgreSQL.
2. Eseguire `database/migrations/001_initial_mvp_schema.sql`.
3. Eseguire i seed iniziali, a partire da `database/seeds/001_seed_emozioni.sql`.
4. Inserire 2-4 serie pilota: almeno una CCTV e una Tencent Video.
5. Catalogare pochi episodi e segmenti in profondita'.
6. Solo dopo questa prova, costruire il frontend sulle viste realmente utili.

## Viste pubbliche iniziali

Lo schema SQL include due viste pensate come base per API e frontend:

- `public_series_catalog`: elenco pubblico delle serie con piattaforma, anno, distribuzione e flag del caso studio.
- `public_utterance_search`: battute pubblicabili, collegate a serie, episodio, segmento e personaggio.
- `public_danmu_search`: commenti Danmu pubblicabili, collegati a serie, episodio, segmento, timecode e piattaforma.

Queste viste sono volutamente conservative: espongono solo righe con `visibility = 'public'`.
