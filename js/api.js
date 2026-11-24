// api.js — asks Open-Meteo for the weather, and remembers the answer.
//
// Open-Meteo is free for personal use (no key needed) but asks that we stay
// under 10,000 calls a day. Saving each answer for an hour means reloading
// the app is free.

const API_BASE = "https://api.open-meteo.com/v1/forecast";
const CACHE_KEY = "banff-snow-forecast-v1";
const CACHE_MINUTES = 60;

// What we ask for. Names come straight from the Open-Meteo docs.
const HOURLY_VARS = [
  "snowfall",              // cm of snow in the preceding hour
  "snow_depth",            // modelled snow on the ground, in METRES
  "temperature_2m",        // °C
  "wind_speed_10m",        // km/h
  "wind_gusts_10m",        // km/h, strongest gust in the preceding hour
  "freezing_level_height", // metres above sea level where it's 0 °C
  "weather_code"           // number code: 71/73/75 = snow, etc.
];
const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "snowfall_sum",          // cm for the whole day
  "wind_gusts_10m_max"
];

// Build one URL for all resorts at both base and summit.
// The order of the six points is: resort 1 base, resort 1 summit,
// resort 2 base, ... — app.js relies on that order.
function buildForecastUrl(resorts) {
  const lats = [], lons = [], elevations = [];
  for (const r of resorts) {
    lats.push(r.lat, r.lat);
    lons.push(r.lon, r.lon);
    elevations.push(r.base, r.summit);
  }
  const params = new URLSearchParams({
    latitude: lats.join(","),
    longitude: lons.join(","),
    elevation: elevations.join(","),   // corrects the model to the real height
    hourly: HOURLY_VARS.join(","),
    daily: DAILY_VARS.join(","),
    past_days: "3",                    // so we can add up the last 72 hours
    forecast_days: "10",               // for the 10-day chart
    timezone: "America/Edmonton"       // all times in Banff local time
  });
  return API_BASE + "?" + params.toString();
}

// Reading and writing localStorage can fail (private browsing, storage
// full), so both are wrapped in try/catch and simply give up quietly.
function readCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
    return saved && Array.isArray(saved.data) ? saved : null;
  } catch (e) {
    return null;
  }
}
function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch (e) { /* not fatal: we just won't have a saved copy */ }
}

// Returns { data, source, savedAt } where source is
//   "live"   — fresh from Open-Meteo just now
//   "cached" — our saved copy (fresh enough, or the network failed)
//   "sample" — the example file, because nothing else worked
async function getForecast(resorts, { force = false } = {}) {
  const cached = readCache();
  const ageMinutes = cached ? (Date.now() - cached.savedAt) / 60000 : Infinity;

  if (!force && ageMinutes < CACHE_MINUTES) {
    return { data: cached.data, source: "cached", savedAt: cached.savedAt };
  }

  try {
    const response = await fetch(buildForecastUrl(resorts));
    const body = await response.json();
    // Open-Meteo reports problems as {error: true, reason: "..."}
    if (!response.ok || body.error) {
      throw new Error(body.reason || "HTTP " + response.status);
    }
    writeCache(body);
    return { data: body, source: "live", savedAt: Date.now() };
  } catch (err) {
    console.warn("Live forecast failed:", err.message);
    if (cached) {
      return { data: cached.data, source: "cached", savedAt: cached.savedAt, error: err.message };
    }
    const sample = await fetch("data/sample.json").then(r => r.json());
    return { data: sample, source: "sample", savedAt: null, error: err.message };
  }
}
