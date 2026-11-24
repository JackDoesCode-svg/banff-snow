// snow.js — pure calculations. Nothing here touches the page, so every
// function can be tested on its own with made-up numbers.

const BANFF_TZ = "America/Edmonton";

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
// sample file) and today isn't in it, fall back to the last past hour.
function currentHourIndex(hourly, nowKey = banffHourKey()) {
  const i = hourly.time.indexOf(nowKey);
  if (i !== -1) return i;
  return Math.min(hourly.time.length - 1, 3 * 24 + 9); // 9 am on the data's "today"
}

const round1 = n => Math.round(n * 10) / 10;

// Snow in the last `hours` hours, ending at index `now`.
// Each hourly value is "snow in the hour before this time", so adding
// the values at now-23 ... now covers exactly the last 24 hours.
function snowInLast(hourly, now, hours) {
  let total = 0;
  for (let i = Math.max(0, now - hours + 1); i <= now; i++) {
    total += hourly.snowfall[i] || 0; // `|| 0` treats missing values as no snow
  }
  return round1(total);
}

// Powder score, 0–10. Each part is kept separate so you can see (and tweak)
// how much it contributes.
function powderScore({ snow24, snow72, tempC, gustKmh }) {
  const fresh = Math.min(6, (snow24 / 25) * 6);   // up to 6 pts: 25 cm = full marks
  const recent = Math.min(2, (snow72 / 40) * 2);  // up to 2 pts: 40 cm over 3 days
  // up to 1 pt for cold: 0 °C or warmer = 0, -8 °C or colder = 1
  const cold = Math.max(0, Math.min(1, -tempC / 8));
  // up to -2 pts for wind: gusts under 40 km/h are fine, 70+ is the full penalty
  const wind = -Math.max(0, Math.min(2, ((gustKmh - 40) / 30) * 2));

  const total = Math.max(0, Math.min(10, fresh + recent + cold + wind));
  return {
    score: Math.round(total),
    parts: { fresh: round1(fresh), recent: round1(recent), cold: round1(cold), wind: round1(wind) }
  };
}

function verdict(score) {
  if (score >= 8) return { emoji: "🤩", text: "Powder day", level: "epic" };
  if (score >= 5) return { emoji: "😎", text: "Fresh turns", level: "good" };
  if (score >= 2) return { emoji: "🙂", text: "Light refresh", level: "fair" };
  return { emoji: "😴", text: "Groomer day", level: "low" };
}

function windWords(kmh) {
  if (kmh < 15) return "light winds";
  if (kmh < 30) return "a breeze";
  if (kmh < 50) return "strong winds";
  return "very strong winds, so upper lifts may be on hold";
}

// Short day name in Banff, e.g. "Fri", from "2026-11-27".
function dayName(isoDate) {
  // Noon avoids any time-zone shift moving the date to the day before.
  return new Date(isoDate + "T12:00:00").toLocaleDateString("en-CA", { weekday: "short" });
}

// The 10 forecast days from today onward (the daily data also holds the
// 3 past days we asked for, so we skip those).
function forecastDays(daily, todayKey) {
  let start = daily.time.indexOf(todayKey);
  if (start === -1) start = 3; // old data: day 4 is "today"
  return daily.time.slice(start, start + 10).map((date, k) => ({
    date,
    label: k === 0 ? "Today" : dayName(date),
    snow: round1(daily.snowfall_sum[start + k] || 0),
    high: daily.temperature_2m_max[start + k],
    low: daily.temperature_2m_min[start + k]
  }));
}

// One or two plain sentences about the day.
function dailySummary({ snow24, tempC, windKmh, freezingLevel, base, days }) {
  const parts = [];
  parts.push(snow24 >= 0.5
    ? `${Math.round(snow24)} cm in the last 24 hours up top.`
    : "No new snow in the last 24 hours.");

  parts.push(`${Math.round(tempC)} °C at the summit with ${windWords(windKmh)}.`);

  if (freezingLevel > base + 100) {
    parts.push(`Freezing level is ${Math.round(freezingLevel).toLocaleString("en-CA")} m, so expect soft or wet snow near the base.`);
  }

  // Next day (after today) with a meaningful amount of snow.
  const next = days.slice(1).find(d => d.snow >= 2);
  parts.push(next
    ? `Next snow: ${next.label}, about ${Math.round(next.snow)} cm.`
    : "No real snow in the 10-day forecast.");

  return parts.join(" ");
}
