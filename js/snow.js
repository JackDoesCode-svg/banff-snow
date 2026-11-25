// snow.js — pure calculations. Nothing here touches the page, so every
// function can be tested on its own with made-up numbers.

const BANFF_TZ = "America/Edmonton";
const round1 = n => Math.round(n * 10) / 10;

// ---------- Time helpers ----------

// The current hour in Banff, written the way Open-Meteo writes times:
// "2026-11-24T14:00". Using Banff time (not your phone's) keeps it right
// even if you check from another time zone.
function banffHourKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANFF_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const get = type => parts.find(p => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:00`;
}

// Find "now" in the list of hourly times. If the data is old (e.g. the
// sample file) and today isn't in it, use 9 am on the data's "today".
function currentHourIndex(times, nowKey = banffHourKey()) {
  const i = times.indexOf(nowKey);
  if (i !== -1) return i;
  return Math.min(times.length - 1, 2 * 24 + 9);
}

// ---------- Accuracy: snow-to-water ratio ----------

// Open-Meteo turns water into snow at a fixed 7:1 (1 mm water = 0.7 cm
// snow). Real snow is fluffier when it's colder: Rockies snow is often
// 12–15:1. This follows the Kuchera method: about 12:1 at -2 °C, rising
// as it gets colder and falling as it nears 0 °C. Capped at 5–18:1 so a
// very cold hour can't produce silly numbers.
function snowRatio(tempC) {
  const k = tempC + 273.15;              // Kelvin
  const ratio = k > 271.16
    ? 12 + 2 * (271.16 - k)              // near/above -2 °C: drops fast (wetter)
    : 12 + (271.16 - k);                 // colder: rises slowly (drier)
  return Math.max(5, Math.min(18, ratio));
}

// Snow depth (cm) from one model hour. Open-Meteo's own snowfall already
// tells us which part of the precipitation fell as snow; we undo its 7:1
// and apply the temperature-based ratio instead.
function correctedSnow(openMeteoSnowCm, tempC) {
  if (!openMeteoSnowCm || tempC == null) return 0;
  const waterMm = openMeteoSnowCm / 0.7;
  return (waterMm * snowRatio(tempC)) / 10;
}

// ---------- Combining the three models ----------

const mean = values => {
  const ok = values.filter(v => v != null);
  return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
};

// Turns one Open-Meteo location (with keys like snowfall_gem_seamless,
// snowfall_gfs_seamless …) into one simple timeline, averaging the models.
function blendModels(location, models = MODELS) {
  const h = location.hourly;
  const series = name => models.map(m => h[`${name}_${m}`] || []);
  const snow = series("snowfall"), temp = series("temperature_2m");
  const wind = series("wind_speed_10m"), gust = series("wind_gusts_10m");
  const freeze = series("freezing_level_height"), code = series("weather_code");

  return h.time.map((time, i) => ({
    time,
    // each model's snow is corrected with that model's own temperature
    snow: mean(models.map((_, m) => snow[m][i] == null ? null : correctedSnow(snow[m][i], temp[m][i]))) || 0,
    temp: mean(temp.map(s => s[i])),
    wind: mean(wind.map(s => s[i])),
    gust: mean(gust.map(s => s[i])),
    freezing: mean(freeze.map(s => s[i])),
    code: code.map(s => s[i]).find(c => c != null) // Canadian model first
  }));
}

// ---------- Snowfall totals ----------

// Sum the snow for hours whose time is after `fromKey` and up to `toKey`.
// (Each hourly value is "snow in the hour BEFORE this time".)
function snowBetween(hours, fromKey, toKey) {
  return round1(hours
    .filter(h => h.time > fromKey && h.time <= toKey)
    .reduce((sum, h) => sum + h.snow, 0));
}

const addDays = (isoDate, n) => {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// "Overnight" the way resorts report it: from when lifts close (4 pm
// yesterday) to the morning report (7 am today). Before 7 am it's the
// snow so far tonight.
function overnightSnow(hours, now) {
  const nowKey = hours[now].time;
  const today = nowKey.slice(0, 10);
  const from = addDays(today, -1) + "T16:00";
  const to = nowKey < today + "T07:00" ? nowKey : today + "T07:00";
  return snowBetween(hours, from, to);
}

// Snow in the last 48 hours, ending now.
function pastSnow(hours, now, hoursBack) {
  let total = 0;
  for (let i = Math.max(0, now - hoursBack + 1); i <= now; i++) total += hours[i].snow;
  return round1(total);
}

// Fresh snow for the powder score: everything since lifts closed
// yesterday at 4 pm (overnight plus anything falling today).
function freshSince4pm(hours, now) {
  const today = hours[now].time.slice(0, 10);
  return snowBetween(hours, addDays(today, -1) + "T16:00", hours[now].time);
}

// ---------- Powder score ----------

// 0–10. Each part is kept separate so you can see (and tweak) it.
function powderScore({ fresh, snow48, tempC, gustKmh }) {
  const freshPts = Math.min(6, (fresh / 25) * 6);   // up to 6: 25 cm = full marks
  const recentPts = Math.min(2, (snow48 / 30) * 2); // up to 2: 30 cm over 2 days
  const coldPts = Math.max(0, Math.min(1, -tempC / 8));      // 0 °C = 0, -8 °C = 1
  const windPts = -Math.max(0, Math.min(2, ((gustKmh - 40) / 30) * 2)); // 40+ km/h costs

  const total = Math.max(0, Math.min(10, freshPts + recentPts + coldPts + windPts));
  return {
    score: Math.round(total),
    parts: { fresh: round1(freshPts), recent: round1(recentPts), cold: round1(coldPts), wind: round1(windPts) }
  };
}

function verdict(score) {
  if (score >= 8) return { emoji: "🤩", text: "Powder day", level: "epic" };
  if (score >= 5) return { emoji: "😎", text: "Fresh turns", level: "good" };
  if (score >= 2) return { emoji: "🙂", text: "Light refresh", level: "fair" };
  return { emoji: "😴", text: "Groomer day", level: "low" };
}

// ---------- Days ----------

function dayName(isoDate, style = "short") {
  // Noon avoids any time-zone shift moving the date to the day before.
  return new Date(isoDate + "T12:00:00").toLocaleDateString("en-CA", { weekday: style });
}

// 10 days from today: total snow per calendar day (midnight to midnight).
function forecastDays(hours, now) {
  const today = hours[now].time.slice(0, 10);
  return Array.from({ length: 10 }, (_, k) => {
    const date = addDays(today, k);
    const dayHours = hours.filter(h => h.time > date + "T00:00" && h.time <= addDays(date, 1) + "T00:00");
    const temps = dayHours.map(h => h.temp).filter(t => t != null);
    return {
      date,
      label: k === 0 ? "Today" : dayName(date),
      snow: round1(dayHours.reduce((s, h) => s + h.snow, 0)),
      high: temps.length ? Math.max(...temps) : null,
      low: temps.length ? Math.min(...temps) : null
    };
  }).filter(d => d.date <= hours[hours.length - 1].time.slice(0, 10));
}

// How good a morning is for powder: snow from 4 pm the day before to 9 am
// (fresh at first chair), plus half of what falls during the ski day.
function powderMorning(hours, date) {
  const prev = addDays(date, -1);
  return snowBetween(hours, prev + "T16:00", date + "T09:00") +
         0.5 * snowBetween(hours, date + "T09:00", date + "T15:00");
}

// Best powder morning across all resorts in the next 7 days.
// `resorts` is a list of { resort, hours, now }.
function bestDay(resorts) {
  let best = null;
  for (const { resort, hours, now } of resorts) {
    const today = hours[now].time.slice(0, 10);
    for (let k = 0; k < 7; k++) {
      const date = addDays(today, k);
      const cm = powderMorning(hours, date);
      if (!best || cm > best.cm) best = { resort, date, cm: round1(cm), k };
    }
  }
  if (best) best.label = best.k === 0 ? "Today" : best.k === 1 ? "Tomorrow" : dayName(best.date, "long");
  return best;
}

// ---------- Words ----------

function windWords(kmh) {
  if (kmh < 15) return "light winds";
  if (kmh < 30) return "a breeze";
  if (kmh < 50) return "strong winds";
  return "very strong winds, so upper lifts may be on hold";
}

// One or two plain sentences about the day. `fmt` formats a snow amount
// in the chosen unit, e.g. "12 cm" or "4.7 in".
function dailySummary({ overnight, summitC, windKmh, freezingLevel, base, days, fmt }) {
  const parts = [];
  parts.push(overnight >= 0.5 ? `${fmt(overnight)} overnight.` : "No new snow overnight.");
  parts.push(`${Math.round(summitC)} °C at the summit with ${windWords(windKmh)}.`);
  if (freezingLevel != null && freezingLevel > base + 100) {
    parts.push(`Freezing level is ${Math.round(freezingLevel).toLocaleString("en-CA")} m, so expect soft or wet snow near the base.`);
  }
  const next = days.slice(1).find(d => d.snow >= 2);
  parts.push(next ? `Next snow: ${next.label}, about ${fmt(next.snow)}.` : "No real snow in the 10-day forecast.");
  return parts.join(" ");
}
