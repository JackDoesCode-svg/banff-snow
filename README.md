# Banff Snow

A personal snow report for the three Banff ski resorts: **Sunshine Village**, **Mt. Norquay** and **Lake Louise**. Built with plain HTML, CSS and JavaScript (no frameworks, no build step). It installs on an iPhone home screen as an app.

For each resort it shows:

- a **powder score** (0–10) with an emoji verdict
- snowfall in the past **24, 48 and 72 hours** at the summit
- a short **daily summary** in plain words
- a **10-day snowfall** bar chart
- current summit and base temperature, wind, freezing level and modelled snow depth

Weather data comes from [Open-Meteo](https://open-meteo.com/) (free for non-commercial use, CC BY 4.0, no API key).

## Files

| File | What it does |
|---|---|
| `index.html` | The page skeleton and the iPhone "install" tags |
| `css/styles.css` | Colours (light and dark), layout, cards, chart styling |
| `js/resorts.js` | Resort names, coordinates and base/summit elevations. Edit here to add a resort |
| `js/api.js` | Builds the Open-Meteo request, fetches it, saves a copy for 60 minutes |
| `js/snow.js` | The maths: 24/48/72 h totals, powder score, verdict, summary sentence |
| `js/chart.js` | Draws the 10-day bar chart as SVG |
| `js/app.js` | Runs everything and builds one card per resort |
| `manifest.json` | App name, icon and colours for "Add to Home Screen" |
| `sw.js` | Service worker: stores the app's files so it opens offline |
| `data/sample.json` | **Made-up** example data, used only if the live forecast can't load |
| `icons/` | Home-screen icons |

## Run it on your computer

The service worker needs a real web address, so start a tiny local server from this folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

## Put it on your iPhone

1. Publish the folder with GitHub Pages (repository **Settings → Pages → Deploy from a branch → `main` / root**). You get an address like `https://<your-username>.github.io/banff-snow/`.
2. Open that address in **Safari** on your iPhone.
3. Tap **Share** (the square with the arrow) → **Add to Home Screen** → **Add**.

It now opens full-screen from its own icon.

## The powder score

| Part | Points | Rule |
|---|---|---|
| Fresh snow | up to 6 | last 24 h at the summit; 25 cm = full marks |
| Recent snow | up to 2 | last 72 h; 40 cm = full marks |
| Cold | up to 1 | 0 °C = 0, −8 °C or colder = 1 (colder means lighter snow) |
| Wind | down to −2 | gusts over 40 km/h start costing points; 70+ km/h = −2 |

8–10 🤩 Powder day · 5–7 😎 Fresh turns · 2–4 🙂 Light refresh · 0–1 😴 Groomer day

Tweak the numbers in `powderScore()` in `js/snow.js`.

## Things to know

- **These are model forecasts, not resort measurements.** Model snow depth in particular can be far off the resort's reported base. Always check the official report link on each card.
- When you change any file, bump `VERSION` in `sw.js` (e.g. `banff-snow-v2`) so installed copies pick up the change.
- Open-Meteo's free tier allows fewer than 10,000 calls a day. The app saves each answer for an hour, so normal use is a few dozen calls a day.
