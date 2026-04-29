# CSV Import

The recommended way to import the initial Airtable-style CSV exports is the Node script in the webapp.

## Source Files

The script currently reads these files from `/Users/francescarusso/Downloads`:

- `Serie TV-Vista Tabellare.csv`
- `Episodi-Vista Tabellare.csv`
- `Personaggi-Vista Tabellare.csv`
- `Emozioni-Vista Tabellare.csv`
- `Frasi e Parole-Vista Tabellare.csv`
- `Danmu 弹幕-Vista Tabella.csv`

## Run

From the repository:

```sh
cd /Users/francescarusso/Desktop/coding/StreamOfChangeChina/webapp
npm run import:csv
```

The script uses `webapp/.env.local` and prefers `SUPABASE_SERVICE_ROLE_KEY` for inserts/updates.

## Imported Data

Current CSV snapshot:

- 5 series
- 114 episodes
- 4 emotions
- 2 characters
- 1 phrase/word row
- 1 pilot Danmu row

The script imports everything with `visibility = 'public'` so the public pages can show the records immediately.

