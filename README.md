# ECO DRIFT

Saudi Arabia Earth Trend Detective, by Team Zelo Radiation (NASA Space Apps Challenge).

## Run it

```
python server.py
```

Open http://localhost:8000 (add `?nointro` to skip the opening film).

`server.py` serves the website **and** keeps the Eco Bot AI key private on your computer.

## Eco Bot (Gemini AI)

1. Put your key in a file named `.env` next to `server.py`:
   ```
   GEMINI_API_KEY=your-key-here
   ```
2. Start `python server.py`. The bot header shows **GEMINI AI · ONLINE**.

The key is never sent to the browser, and `.env` is blocked from the web server. If you
host the site on a static host instead (no `server.py`), Eco Bot still works: it uses its
built-in knowledge + Wikipedia, or a key pasted in its settings panel.

## Folders

| Path | What |
|------|------|
| `index.html` | page structure |
| `css/styles.css` | theme (aurora violet), components, animations |
| `js/script.js` | data, statistics (Mann-Kendall), globe, intro film |
| `js/enhance.js` | starfield, parallax, ticker, live finding card, tour, transitions, toasts |
| `js/ecobot.js` | Eco Bot assistant |
| `img/photo/` | NASA background photos (WebP, loaded lazily) |
| `img/earth/` | NASA Blue Marble + Black Marble textures for the hero Earth |
| `server.py` | static server + Gemini proxy |
