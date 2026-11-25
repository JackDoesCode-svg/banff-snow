// resorts.js — the facts about each resort, in one place.
//
// Every other file reads from this list, so to add a resort (or fix an
// elevation) you only change it here.
//
//   lat / lon : where to ask Open-Meteo for weather (decimal degrees;
//               west longitudes are negative)
//   base      : bottom lift elevation, metres above sea level
//   summit    : top lift elevation, metres above sea level
//   snowAt    : the elevation we forecast snow for: mid-mountain, which is
//               close to where resorts measure their own snowfall
//   report    : the resort's own conditions page (official lift/run info)
//   badge     : initials and colour for the round badge beside the name
//   logo      : optional path to an image (e.g. "icons/resorts/sunshine.png").
//               If set, it's shown instead of the initials badge.

const RESORTS = [
  {
    id: "sunshine",
    name: "Sunshine Village",
    lat: 51.0786,
    lon: -115.7822,
    base: 1660,
    summit: 2730,
    snowAt: 2195,
    report: "https://www.skibanff.com/conditions",
    badge: { initials: "SV", color: "#b8860b" },
    logo: null
  },
  {
    id: "norquay",
    name: "Mt. Norquay",
    lat: 51.2040,
    lon: -115.5990,
    base: 1630,
    summit: 2133,
    snowAt: 1880,
    report: "https://banffnorquay.com/winter/conditions/",
    badge: { initials: "NQ", color: "#c8432b" },
    logo: null
  },
  {
    id: "louise",
    name: "Lake Louise",
    lat: 51.4419,
    lon: -116.1606,
    base: 1646,
    summit: 2637,
    snowAt: 2140,
    report: "https://www.skilouise.com/snow-conditions/",
    badge: { initials: "LL", color: "#1f6fb2" },
    logo: null
  }
];
