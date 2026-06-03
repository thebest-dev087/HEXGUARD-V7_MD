// HEXGUARD V3 — Sistema de logs (últimos 200) + diagnóstico
const fs = require("fs");
const path = require("path");

const MAX = 200;
const logs = [];
const LOG_FILE = path.join(__dirname, "..", "data", "hexguard.log");

function nowIso() {
  return new Date().toLocaleString("pt-PT", { hour12: false });
}

function record(entry) {
  logs.push(entry);
  if (logs.length > MAX) logs.shift();
  try {
    fs.appendFileSync(
      LOG_FILE,
      `[${entry.time}] ${entry.status} ${entry.cmd || "-"} | ${entry.user || "-"} | ${entry.reason || "ok"}\n`
    );
  } catch {}
}

function log(cmd, sender, status, reason = "", extra = {}) {
  record({
    time: nowIso(),
    cmd,
    user: sender?.split("@")[0] || "?",
    status,                    // ok | err | denied | warn
    reason,
    ...extra,
  });
}

function recent(n = 15, filter) {
  let arr = logs;
  if (filter) arr = arr.filter(l => l.cmd?.includes(filter) || l.user?.includes(filter) || l.status === filter);
  return arr.slice(-n);
}

function stats() {
  const ok = logs.filter(l => l.status === "ok").length;
  const err = logs.filter(l => l.status === "err").length;
  const den = logs.filter(l => l.status === "denied").length;
  return { total: logs.length, ok, err, denied: den };
}

function lastError(forCmd) {
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].status !== "ok" && (!forCmd || logs[i].cmd === forCmd)) return logs[i];
  }
  return null;
}

module.exports = { log, recent, stats, lastError, logs };
