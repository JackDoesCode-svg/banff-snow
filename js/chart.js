// chart.js — draws the 10-day snowfall bar chart as an SVG.
//
// SVG coordinates start at the TOP-left, and y grows downward. So a bar's
// top edge is "bottom of chart minus bar height".

function snowChartSvg(days) {
  // Drawing area, in SVG units (it scales to fit the card's width).
  const W = 320, H = 150;
  const pad = { top: 18, right: 6, bottom: 34, left: 26 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // The y-axis top: at least 10 cm, rounded up to a multiple of 5,
  // so a quiet week doesn't make 1 cm look like a huge dump.
  const maxSnow = Math.max(...days.map(d => d.snow));
  const yMax = Math.max(10, Math.ceil(maxSnow / 5) * 5);
  const y = cm => pad.top + plotH - (cm / yMax) * plotH; // cm -> SVG y

  const slot = plotW / days.length;  // width given to each day
  const barW = slot * 0.62;

  let svg = "";

  // Gridlines and their labels: 0, half, top.
  for (const tick of [0, yMax / 2, yMax]) {
    svg += `<line class="grid" x1="${pad.left}" x2="${W - pad.right}" y1="${y(tick)}" y2="${y(tick)}"/>`;
    svg += `<text class="axis" x="${pad.left - 5}" y="${y(tick) + 3.5}" text-anchor="end">${tick}</text>`;
  }

  days.forEach((d, i) => {
    const cx = pad.left + slot * i + slot / 2; // centre of this day's slot
    const top = y(d.snow);
    const h = y(0) - top;
    const cls = i === 0 ? "bar today" : d.snow >= 10 ? "bar big" : "bar";
    // A tiny minimum height so zero days still show a stub on the baseline.
    svg += `<rect class="${cls}" x="${cx - barW / 2}" y="${h < 1.5 ? y(0) - 1.5 : top}" width="${barW}" height="${Math.max(h, 1.5)}" rx="2"/>`;
    if (d.snow >= 1) {
      svg += `<text class="val" x="${cx}" y="${top - 4}" text-anchor="middle">${Math.round(d.snow)}</text>`;
    }
    // Day name, then the date number underneath.
    svg += `<text class="day${i === 0 ? " today" : ""}" x="${cx}" y="${H - pad.bottom + 15}" text-anchor="middle">${d.label}</text>`;
    svg += `<text class="date" x="${cx}" y="${H - pad.bottom + 27}" text-anchor="middle">${Number(d.date.slice(8))}</text>`;
  });

  // A text description for screen readers (VoiceOver on iPhone).
  const total = Math.round(days.reduce((s, d) => s + d.snow, 0));
  const label = `10-day snowfall forecast, ${total} cm in total. ` +
    days.map(d => `${d.label} ${Math.round(d.snow)} cm`).join(", ");

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${svg}<text class="axis unit" x="${pad.left - 5}" y="${pad.top - 8}" text-anchor="end">cm</text></svg>`;
}
