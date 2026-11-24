// resorts.js — the facts about each resort, in one place.
//
// Every other file reads from this list, so to add a resort (or fix an
// elevation) you only change it here.
//
//   lat / lon : where to ask Open-Meteo for weather (decimal degrees;
//               west longitudes are negative)
//   base      : bottom lift elevation, metres above sea level
//   summit    : top lift elevation, metres above sea level
//   report    : the resort's own conditions page (official lift/run info)

const RESORTS = [
  {
    id: "sunshine",
    name: "Sunshine Village",
    lat: 51.0786,
    lon: -115.7822,
    base: 1660,
    summit: 2730,
    report: "https://www.skibanff.com/conditions"
  },
  {
    id: "norquay",
    name: "Mt. Norquay",
    lat: 51.2040,
    lon: -115.5990,
    base: 1630,
    summit: 2133,
    report: "https://banffnorquay.com/winter/conditions/"
  },
  {
    id: "louise",
    name: "Lake Louise",
    lat: 51.4419,
    lon: -116.1606,
    base: 1646,
    summit: 2637,
    report: "https://www.skilouise.com/snow-conditions/"
  }
];
