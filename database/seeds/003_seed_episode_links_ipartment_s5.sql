with episode_links(numero_episodio, link_episodio) as (
  values
  (1, 'https://www.youtube.com/watch?v=hnJ_ccFktco&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK'),
  (2, 'https://www.youtube.com/watch?v=9ZjLC6uJOTg&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=2'),
  (3, 'https://www.youtube.com/watch?v=lsP3Q-D74ek&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=3'),
  (4, 'https://www.youtube.com/watch?v=wwqke1dhJHM&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=4'),
  (5, 'https://www.youtube.com/watch?v=gguiJBWcrDo&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=5'),
  (6, 'https://www.youtube.com/watch?v=QKT35RjsxaQ&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=6'),
  (7, 'https://www.youtube.com/watch?v=6ITCKP4wcDw&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=7'),
  (8, 'https://www.youtube.com/watch?v=1tU-tafD9c4&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=8'),
  (9, 'https://www.youtube.com/watch?v=4EsF9Jgx7Fw&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=9'),
  (10, 'https://www.youtube.com/watch?v=tevCwWcWPM8&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=10'),
  (11, 'https://www.youtube.com/watch?v=YQ7zse-dzQM&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=11'),
  (12, 'https://www.youtube.com/watch?v=TRQ4Q5AIlzk&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=12'),
  (13, 'https://www.youtube.com/watch?v=EXtrUo9_dcI&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=13'),
  (14, 'https://www.youtube.com/watch?v=ZANpQD1Pmx8&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=14'),
  (15, 'https://www.youtube.com/watch?v=4q0yNFmWvrM&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=15'),
  (16, 'https://www.youtube.com/watch?v=zIeFTpzuEOI&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=16'),
  (17, 'https://www.youtube.com/watch?v=_oMHDuPyJ6o&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=17'),
  (18, 'https://www.youtube.com/watch?v=YIGGd5KV5VQ&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=18'),
  (19, 'https://www.youtube.com/watch?v=6VqkEoWNJLQ&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=19'),
  (20, 'https://www.youtube.com/watch?v=ILLHRit8nhU&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=20'),
  (21, 'https://www.youtube.com/watch?v=vpAV4EpsalY&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=21'),
  (22, 'https://www.youtube.com/watch?v=PHfxRbGtFlk&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=22'),
  (23, 'https://www.youtube.com/watch?v=2LUTwCZq2B8&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=23'),
  (24, 'https://www.youtube.com/watch?v=b2dQi_8rO8M&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=24'),
  (25, 'https://www.youtube.com/watch?v=P2KTioAQMXc&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=25'),
  (26, 'https://www.youtube.com/watch?v=62NgjY50erQ&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=26'),
  (27, 'https://www.youtube.com/watch?v=uRjN5BKBbl8&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=27'),
  (28, 'https://www.youtube.com/watch?v=sWp7BsnLaLw&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=28'),
  (29, 'https://www.youtube.com/watch?v=9wVu9C08qRk&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=29'),
  (30, 'https://www.youtube.com/watch?v=ZEiYaOrbE5g&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=30'),
  (31, 'https://www.youtube.com/watch?v=ctW8VdhAQiE&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=31'),
  (32, 'https://www.youtube.com/watch?v=6mhGqAazGdQ&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=32'),
  (33, 'https://www.youtube.com/watch?v=rHWv0g6fEAU&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=33'),
  (34, 'https://www.youtube.com/watch?v=_-YTsDonnJA&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=34'),
  (35, 'https://www.youtube.com/watch?v=MAAejpJ-vsg&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=35'),
  (36, 'https://www.youtube.com/watch?v=Zlk7_4DF_Mw&list=PLdlCwIE1t_u39qXkwLKHjBubTatKi--SK&index=36')
)
update episodi
set link_episodio = episode_links.link_episodio,
    updated_at = now()
from serie_tv, episode_links
where episodi.serie_id = serie_tv.id
  and serie_tv.titolo_originale = '爱情公寓'
  and episodi.stagione = 5
  and episodi.numero_episodio = episode_links.numero_episodio;
