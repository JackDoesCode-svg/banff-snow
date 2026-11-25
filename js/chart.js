// chart.js — draws the 10-day snowfall bar chart as an SVG.
//
// SVG coordinates start at the TOP-left, and y grows downward. So a bar's
// top edge is "bottom of chart minus bar height".
//
// `unit` is "cm" or "in". Snow amounts arrive in cm and are converted here,
// only for display.

function snowChartSvg(days, unit = "cm") {
  const W = 320, H = 150;
  const pad = { top: 18, right: 6, bottom: 34, left: 26 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const toUnit = cm => unit === "in" ? cm / 2.54 : cm;
  const values = days.map(d => toUnit(d.snow));

  // y-axis top: a minimum (10 cm or 4 in) so a quiet week doesn't make a
  // dusting look huge, then rounded up to a tidy step.
  const step = unit === "in" ? 2 : 5;
  const yMax = Math.max(unit === "in" ? 4 : 10, Math.ceil(Math.max(...values) / step) * step);
  const y = v => pad.top + plotH - (v / yMax) * plotH;

  const slot = plotW / days.length;
  const barW = slot * 0.62;
  let svg = "";

  for (const tick of [0, yMax / 2, yMax]) {
    svg += `<line class="grid" x1="${pad.left}" x2="${W - pad.right}" y1="${y(tick)}" y2="${y(tick)}"/>`;
    svg += `<text class="axis" x="${pad.left - 5}" y="${y(tick) + 3.5}" text-anchor="end">${tick}</text>`;
  }

  days.forEach((d, i) => {
    const v = values[i];
    const cx = pad.left + slot * i + slot / 2;
    const top = y(v);
    const h = y(0) - top;
    const cls = i === 0 ? "bar today" : d.snow >= 10 ? "bar big" : "bar";
    svg += `<rect class="${cls}" x="${cx - barW / 2}" y="${h < 1.5 ? y(0) - 1.5 : top}" width="${barW}" height="${Math.max(h, 1.5)}" rx="2"/>`;
    // Label bars with at least ~1 cm; inches get one decimal when small.
    if (d.snow >= 1) {
      const text = unit === "in" && v < 10 ? v.toFixed(1) : Math.round(v);
      svg += `<text class="val" x="${cx}" y="${top - 4}" text-anchor="middle">${text}</text>`;
    }
    svg += `<text class="day${i === 0 ? " today" : ""}" x="${cx}" y="${H - pad.bottom + 15}" text-anchor="middle">${d.label}</text>`;
    svg += `<text class="date" x="${cx}" y="${H - pad.bottom + 27}" text-anchor="middle">${Number(d.date.slice(8))}</text>`;
  });

  const total = values.reduce((s, v) => s + v, 0);
  const label = `10-day snowfall forecast, ${unit === "in" ? total.toFixed(1) : Math.round(total)} ${unit} in total. ` +
    days.map((d, i) => `${d.label} ${unit === "in" ? values[i].toFixed(1) : Math.round(values[i])} ${unit}`).join(", ");

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${svg}<text class="axis unit" x="${pad.left - 5}" y="${pad.top - 8}" text-anchor="end">${unit}</text></svg>`;
}
