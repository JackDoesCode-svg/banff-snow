// app.js — gets the forecast and builds the page.

const WEATHER_ICONS = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌦️", 61: "🌧️", 63: "🌧️", 65: "🌧️",
  66: "🌧️", 67: "🌧️", 71: "🌨️", 73: "🌨️", 75: "❄️", 77: "🌨️",
  80: "🌦️", 81: "🌧️", 82: "🌧️", 85: "🌨️", 86: "❄️", 95: "⛈️"
};
const LAPSE = 0.0065; // °C cooler per metre of height (standard atmosphere)
const fmtM = n => Math.round(n).toLocaleString("en-CA");

// ---------- Units (cm / in) ----------
// Remembered on this phone only, so each friend keeps their own choice.
const UNITS_KEY = "banff-snow-units";
let unit = "cm";
try { if (localStorage.getItem(UNITS_KEY) === "in") unit = "in"; } catch (e) {}

// A snow amount (always stored in cm) as text in the chosen unit.
function snowNumber(cm) {
  if (unit === "in") {
    const inches = cm / 2.54;
    if (inches < 0.05) return "0";            // no "0.0 in"
    return inches < 10 ? inches.toFixed(1) : String(Math.round(inches));
  }
  return String(Math.round(cm));
}
const fmtSnow = cm => `${snowNumber(cm)} ${unit}`;

// ---------- Turning raw data into card numbers ----------

function summarizeResort(resort, location) {
  const hours = blendModels(location);         // 3 models -> 1 corrected timeline
  const now = currentHourIndex(hours.map(h => h.time));
  const cur = hours[now];

  const overnight = overnightSnow(hours, now);
  const snow48 = pastSnow(hours, now, 48);
  const fresh = freshSince4pm(hours, now);
  const days = forecastDays(hours, now);
  // Forecast is for mid-mountain; summit and base temperatures follow
  // the normal cooling with height.
  const summitC = cur.temp - LAPSE * (resort.summit - resort.snowAt);
  const baseC = cur.temp + LAPSE * (resort.snowAt - resort.base);
  const { score, parts } = powderScore({ fresh, snow48, tempC: summitC, gustKmh: cur.gust });

  return {
    resort, hours, now, score, parts, verdict: verdict(score), days,
    overnight, snow48, summitC, baseC,
    windKmh: cur.wind, gustKmh: cur.gust, freezingLevel: cur.freezing,
    icon: WEATHER_ICONS[cur.code] || "🌡️"
  };
}

// ---------- Pieces of a card ----------

// Ring of 10 segments; the first `score` segments are filled.
// pathLength="10" makes the circle exactly 10 units long, so each
// segment is 1 unit: 0.8 of line, then 0.2 of gap.
function scoreRing(score) {
  const seg = "0.8 0.2";
  const filled = score > 0
    ? Array(score - 1).fill(seg).concat("0.8 10").join(" ")
    : null;
  return `
    <div class="ring" role="img" aria-label="Powder score ${score} out of 10">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle class="ring-track" cx="50" cy="50" r="42" pathLength="10" stroke-dasharray="${seg}"/>
        ${filled ? `<circle class="ring-fill" cx="50" cy="50" r="42" pathLength="10" stroke-dasharray="${filled}"/>` : ""}
      </svg>
      <div class="ring-num" aria-hidden="true"><div><b>${score}</b><span>/10</span></div></div>
    </div>`;
}

// The resort's logo if its image file exists, otherwise a round badge
// with its initials. If the image fails to load (file not added yet),
// badgeFallback() swaps it for the initials badge.
function initialsBadge(resort) {
  return `<span class="badge" style="--badge:${resort.badge.color}" aria-hidden="true">${resort.badge.initials}</span>`;
}
function badge(resort) {
  if (resort.logo) {
    return `<img class="badge badge-img" src="${resort.logo}" alt="" width="84" height="56" data-resort="${resort.id}" onerror="badgeFallback(this)">`;
  }
  return initialsBadge(resort);
}
function badgeFallback(img) {
  const resort = RESORTS.find(r => r.id === img.dataset.resort);
  if (resort) img.outerHTML = initialsBadge(resort);
}

function cardHtml(s, isBest) {
  const r = s.resort;
  const summary = dailySummary({
    overnight: s.overnight, summitC: s.summitC, windKmh: s.windKmh,
    freezingLevel: s.freezingLevel, base: r.base, days: s.days, fmt: fmtSnow
  });
  return `
  <article class="card level-${s.verdict.level}" aria-labelledby="name-${r.id}">
    <header class="card-head">
      ${badge(r)}
      <div class="card-title">
        <h2 id="name-${r.id}">${r.name}</h2>
      </div>
      ${isBest ? `<span class="best">Best today</span>` : ""}
    </header>

    <div class="verdict">
      ${scoreRing(s.score)}
      <div>
        <p class="verdict-text"><span aria-hidden="true">${s.verdict.emoji}</span> ${s.verdict.text}</p>
        <p class="score-label">Powder score</p>
      </div>
    </div>

    <ul class="past" aria-label="Recent snowfall">
      <li><b>${snowNumber(s.overnight)}</b><span>${unit} · overnight</span></li>
      <li><b>${snowNumber(s.snow48)}</b><span>${unit} · past 48 h</span></li>
    </ul>

    <p class="summary">${summary}</p>

    <h3 class="section-label">Snowfall · next 10 days</h3>
    ${snowChartSvg(s.days, unit)}

    <dl class="now">
      <div><dt>Summit</dt><dd>${s.icon} ${Math.round(s.summitC)} °C</dd></div>
      <div><dt>Base</dt><dd>${Math.round(s.baseC)} °C</dd></div>
      <div><dt>Wind</dt><dd>${Math.round(s.windKmh)} km/h, gusts ${Math.round(s.gustKmh)}</dd></div>
      <div><dt>Freezing level</dt><dd>${s.freezingLevel == null ? "–" : fmtM(s.freezingLevel) + " m"}</dd></div>
    </dl>

    <a class="official" href="${r.report}" target="_blank" rel="noopener">Official lift &amp; run report ↗</a>
  </article>`;
}

function bestDayHtml(best) {
  if (!best || best.cm < 3) {
    return `<p class="best-day"><span class="best-kicker">Day of the week</span> No powder in sight for the next 7 days. Enjoy the groomers.</p>`;
  }
  return `<p class="best-day"><span class="best-kicker">Day of the week</span>
    <b>${best.label}</b> at <b>${best.resort.name}</b> · about ${fmtSnow(best.cm)} by first chair</p>`;
}

function statusText(result) {
  if (result.source === "sample") return "Showing sample data: the live forecast couldn't load.";
  const time = new Date(result.savedAt).toLocaleTimeString("en-CA", {
    hour: "numeric", minute: "2-digit", timeZone: BANFF_TZ
  });
  if (result.error) return `Offline. Showing the forecast from ${time}.`;
  return `Forecast updated ${time} Banff time.`;
}

// ---------- Drawing the page ----------

let lastResult = null; // kept so the cm/in switch can redraw without re-downloading

function drawCards() {
  const summaries = RESORTS.map((r, i) => summarizeResort(r, lastResult.data[i]));
  const bestScore = Math.max(...summaries.map(s => s.score));
  document.getElementById("best").innerHTML = bestDayHtml(bestDay(summaries));
  document.getElementById("cards").innerHTML = summaries
    .map(s => cardHtml(s, s.score === bestScore && bestScore >= 2))
    .join("");
}

async function render({ force = false } = {}) {
  const status = document.getElementById("status");
  const button = document.getElementById("refresh");
  const started = Date.now();
  button.disabled = true;
  button.classList.add("spinning");          // CSS spins the icon
  status.textContent = "Loading the forecast…";

  try {
    lastResult = await getForecast(RESORTS, { force });
    drawCards();
    status.textContent = statusText(lastResult); // textContent: never treated as HTML
    status.dataset.source = lastResult.error ? "offline" : lastResult.source;
  } catch (err) {
    console.error(err);
    status.textContent = "Couldn't load the forecast. Check your connection and tap ↻ to try again.";
    status.dataset.source = "offline";
  } finally {
    // Spin for at least 0.6 s so a tap always visibly does something.
    const wait = Math.max(0, 600 - (Date.now() - started));
    setTimeout(() => {
      button.disabled = false;
      button.classList.remove("spinning");
    }, wait);
  }
}

// ---------- Buttons ----------

const unitButton = document.getElementById("units");
function showUnit() {
  unitButton.textContent = unit;
  unitButton.setAttribute("aria-label", unit === "cm" ? "Showing centimetres. Switch to inches" : "Showing inches. Switch to centimetres");
}
unitButton.addEventListener("click", () => {
  unit = unit === "cm" ? "in" : "cm";
  try { localStorage.setItem(UNITS_KEY, unit); } catch (e) {}
  showUnit();
  if (lastResult) drawCards();
});
showUnit();

document.getElementById("refresh").addEventListener("click", () => render({ force: true }));
render();

// ---------- Share ----------
// The link to share is this page's own address (without any #… or ?…),
// so it keeps working if the site moves to a new address.
const shareUrl = location.origin + location.pathname;

// A small pop-up message that disappears after a few seconds.
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
}

document.getElementById("share").addEventListener("click", async () => {
  const shareData = {
    title: "Banff Snow Report",
    text: "Powder scores and 10-day snow forecasts for Sunshine, Norquay and Lake Louise. Get it on your home screen: open in Safari, tap the three dots (•••), tap Share, then Add to Home Screen.",
    url: shareUrl
  };
  // 1st choice: the phone's own share sheet (Messages, WhatsApp, AirDrop…)
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      if (err.name === "AbortError") return; // they closed the sheet: that's fine
    }
  }
  // 2nd choice: copy the link so they can paste it anywhere
  try {
    await navigator.clipboard.writeText(shareUrl);
    showToast("Link copied. Paste it to a friend.");
  } catch (err) {
    showToast(shareUrl); // last resort: show it so they can copy it by hand
  }
});

// Show the install tip only when the page is open in a browser, not when
// it's already running as the installed home-screen app.
const installed = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
document.getElementById("install-tip").hidden = installed;

// Register the service worker so the app opens offline and installs nicely.
// It only works on https:// (or localhost), so we check first.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service worker:", err));
}
