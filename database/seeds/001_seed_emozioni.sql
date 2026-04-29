insert into emozioni (nome, descrizione, colore_assoc, colore_hex, icona)
values
  ('Felicità', 'Uno stato di gioia e soddisfazione, spesso associato a momenti positivi e relazioni armoniose tra i personaggi.', 'Verde', '#27ae60', '😁'),
  ('Tristezza', 'Un''emozione di malinconia o dolore, spesso rappresentata da perdite o conflitti emotivi.', 'Blu', '#3498db', '😭'),
  ('Rabbia', 'Un sentimento di frustrazione o irritazione, spesso scatenato da ingiustizie o conflitti.', 'Rosso', '#c0392b', '😡'),
  ('Paura', 'Emozione legata a minaccia, ansia, rischio o incertezza.', 'Nero', '#2c3e50', '😨')
on conflict (nome) do update
set
  descrizione = excluded.descrizione,
  colore_assoc = excluded.colore_assoc,
  colore_hex = excluded.colore_hex,
  icona = excluded.icona;
