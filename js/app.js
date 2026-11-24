// app.js — gets the forecast and builds the page.

const WEATHER_ICONS = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌦️", 61: "🌧️", 63: "🌧️", 65: "🌧️",
  66: "🌧️", 67: "🌧️", 71: "🌨️", 73: "🌨️", 75: "❄️", 77: "🌨️",
  80: "🌦️", 81: "🌧️", 82: "🌧️", 85: "🌨️", 86: "❄️", 95: "⛈️"
};

const fmt = n => Math.round(n).toLocaleString("en-CA");

// Turn the two raw Open-Meteo entries for one resort into the handful of
// numbers a card needs.
function summarizeResort(resort, baseData, summitData) {
  const now = currentHourIndex(summitData.hourly);
  const h = summitData.hourly;
  const todayKey = h.time[now].slice(0, 10);

  const snow24 = snowInLast(h, now, 24);
  const snow48 = snowInLast(h, now, 48);
  const snow72 = snowInLast(h, now, 72);
  const tempC = h.temperature_2m[now];
  const windKmh = h.wind_speed_10m[now];
  const gustKmh = h.wind_gusts_10m[now];
  const freezingLevel = h.freezing_level_height[now];
  const days = forecastDays(summitData.daily, todayKey);
  const { score, parts } = powderScore({ snow24, snow72, tempC, gustKmh });

  return {
    resort, score, parts, verdict: verdict(score), days,
    snow24, snow48, snow72, tempC, windKmh, gustKmh, freezingLevel,
    baseTempC: baseData.hourly.temperature_2m[now],
    baseSnow24: snowInLast(baseData.hourly, now, 24),
    depthCm: Math.round((h.snow_depth[now] || 0) * 100), // metres -> cm
    icon: WEATHER_ICONS[h.weather_code[now]] || "🌡️",
    summary: dailySummary({ snow24, tempC, windKmh, freezingLevel, base: resort.base, days })
  };
}

function cardHtml(s, isBest) {
  const r = s.resort;
  return `
  <article class="card level-${s.verdict.level}" aria-labelledby="name-${r.id}">
    <header class="card-head">
      <div>
        <h2 id="name-${r.id}">${r.name}</h2>
        <p class="elev">${fmt(r.base)}–${fmt(r.summit)} m · ${fmt(r.summit - r.base)} m vertical</p>
      </div>
      ${isBest ? `<span class="best">Best today</span>` : ""}
    </header>

    <div class="verdict">
      <div class="score" title="Fresh ${s.parts.fresh} · Recent ${s.parts.recent} · Cold ${s.parts.cold} · Wind ${s.parts.wind}">
        <b>${s.score}</b><span>/10</span>
      </div>
      <div>
        <p class="verdict-text"><span aria-hidden="true">${s.verdict.emoji}</span> ${s.verdict.text}</p>
        <p class="score-label">Powder score</p>
      </div>
    </div>

    <ul class="past" aria-label="Snowfall at the summit">
      <li><b>${Math.round(s.snow24)}</b><span>cm · 24 h</span></li>
      <li><b>${Math.round(s.snow48)}</b><span>cm · 48 h</span></li>
      <li><b>${Math.round(s.snow72)}</b><span>cm · 72 h</span></li>
    </ul>

    <p class="summary">${s.summary}</p>

    <h3 class="section-label">Next 10 days · summit snowfall</h3>
    ${snowChartSvg(s.days)}

    <dl class="now">
      <div><dt>Summit</dt><dd>${s.icon} ${Math.round(s.tempC)} °C</dd></div>
      <div><dt>Base</dt><dd>${Math.round(s.baseTempC)} °C · ${Math.round(s.baseSnow24)} cm 24 h</dd></div>
      <div><dt>Wind</dt><dd>${Math.round(s.windKmh)} km/h, gusts ${Math.round(s.gustKmh)}</dd></div>
      <div><dt>Freezing level</dt><dd>${fmt(s.freezingLevel)} m</dd></div>
      <div><dt>Snow depth</dt><dd>${s.depthCm} cm <small>modelled</small></dd></div>
    </dl>

    <a class="official" href="${r.report}" target="_blank" rel="noopener">Official lift &amp; run report ↗</a>
  </article>`;
}

function statusText(result) {
  if (result.source === "sample") {
    return "Showing sample data: the live forecast couldn't load.";
  }
  const time = new Date(result.savedAt).toLocaleTimeString("en-CA", {
    hour: "numeric", minute: "2-digit", timeZone: BANFF_TZ
  });
  if (result.error) return `Offline. Showing the forecast from ${time}.`;
  return `Forecast updated ${time} Banff time.`;
}

async function render({ force = false } = {}) {
  const status = document.getElementById("status");
  const button = document.getElementById("refresh");
  button.disabled = true;
  status.textContent = "Loading the forecast…";

  try {
    const result = await getForecast(RESORTS, { force });
    const summaries = RESORTS.map((r, i) =>
      summarizeResort(r, result.data[i * 2], result.data[i * 2 + 1]));
    const bestScore = Math.max(...summaries.map(s => s.score));

    document.getElementById("cards").innerHTML = summaries
      .map(s => cardHtml(s, s.score === bestScore && bestScore >= 2))
      .join("");

    status.textContent = statusText(result); // textContent: never treated as HTML
    status.dataset.source = result.error ? "offline" : result.source;
  } catch (err) {
    console.error(err);
    status.textContent = "Couldn't load the forecast. Check your connection and tap Refresh.";
    status.dataset.source = "offline";
  } finally {
    button.disabled = false;
  }
}

document.getElementById("refresh").addEventListener("click", () => render({ force: true }));
render();

// Register the service worker so the app opens offline and installs nicely.
// It only works on https:// (or localhost), so we check first.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service worker:", err));
}
