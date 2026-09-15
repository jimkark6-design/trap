const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, "data", "visits.json");

app.use(express.json({limit: "20kb"}));
app.use(express.static(path.join(__dirname, "public")));

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return (forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress) || "unknown";
}
function loadVisits() {
  try { return JSON.parse(fs.readFileSync(DATA, "utf8")); }
  catch { return []; }
}
function saveVisits(v) {
  fs.writeFileSync(DATA, JSON.stringify(v.slice(-1000), null, 2));
}

app.post("/api/visit", (req, res) => {
  const b = req.body || {};
  const visit = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    time: new Date().toISOString(),
    ip: getIp(req),
    userAgent: req.headers["user-agent"] || null,
    acceptLanguage: req.headers["accept-language"] || null,
    referrer: b.referrer || req.headers.referer || null,
    page: b.page || "/",
    device: b.device || null,
    os: b.os || null,
    browser: b.browser || null,
    screen: b.screen || null,
    viewport: b.viewport || null,
    timezone: b.timezone || null,
    gpsConsent: false,
    latitude: null,
    longitude: null,
    accuracy: null
  };
  const visits = loadVisits();
  visits.push(visit);
  saveVisits(visits);
  res.json({ok: true, id: visit.id});
});

app.post("/api/location", (req, res) => {
  const {id, latitude, longitude, accuracy, consent} = req.body || {};
  if (!id || consent !== true || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ok:false});
  }
  const visits = loadVisits();
  const v = visits.find(x => x.id === id);
  if (!v) return res.status(404).json({ok:false});
  v.gpsConsent = true;
  v.latitude = latitude;
  v.longitude = longitude;
  v.accuracy = accuracy ?? null;
  saveVisits(visits);
  res.json({ok:true});
});

/* Demo admin endpoint. Protect this before public deployment. */
app.get("/api/visits", (req, res) => {
  res.json(loadVisits().slice().reverse());
});

app.listen(PORT, () => console.log(`Lydia Photos running on port ${PORT}`));
