const moment = require("moment-timezone");
const config = require("../config");
const { boreal, bold, small } = require("./fonts");

const LINE_TOP   = "╭━━━━━━━━━━━━━━━━━━━━━━━━━╮";
const LINE_MID   = "┣━━━━━━━━━━━━━━━━━━━━━━━━━┫";
const LINE_BOT   = "╰━━━━━━━━━━━━━━━━━━━━━━━━━╯";
const SOFT       = "─────────────────────────";

function header(title, subtitle = "") {
  return `${LINE_TOP}
┃  ${bold(config.botName)}
┃  ${boreal(title)}
${subtitle ? "┃  " + small(subtitle) + "\n" : ""}${LINE_BOT}`;
}

function box(title, lines = []) {
  const top = `╭━━〔 ${bold(title)} 〕━━━━⊷`;
  const body = lines.map(l => `┃  ${l}`).join("\n");
  const bot = `╰━━━━━━━━━━━━━━━━━━⊷❍`;
  return `${top}\n${body}\n${bot}`;
}

function badge(jid, db) {
  const tags = [];
  const num = jid.split("@")[0].replace(/\D/g, "");
  if (config.owner.includes(num)) tags.push("👑 𝐃𝐎𝐍𝐎");
  if (db.isPremium(jid)) tags.push("💎 𝐏𝐑𝐄𝐌𝐈𝐔𝐌");
  if (db.isVip(jid))     tags.push("✨ 𝐕𝐈𝐏");
  if (!tags.length) tags.push("👤 𝐔𝐒𝐄𝐑");
  return tags.join(" • ");
}

function now() {
  return moment().tz(config.timezone).format("DD/MM/YYYY HH:mm:ss");
}

function uptime(t) {
  const s = Math.floor((Date.now() - t) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

function isOwner(jid) {
  if (!jid) return false;
  const num = jid.split("@")[0].replace(/\D/g, "");
  return config.owner.includes(num);
}

function fmtNum(n) { return new Intl.NumberFormat("pt-PT").format(n || 0); }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function jidOf(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  return ctx?.mentionedJid?.[0] || ctx?.participant || null;
}

// Reaction helper
async function react(sock, msg, emoji) {
  try {
    await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
  } catch {}
}

const FX = {
  ok:   "✅", err:  "❌", warn: "⚠️", info: "ℹ️",
  load: "⏳", money: "💵", xp: "⭐", crown: "👑",
  vip:  "✨", prem: "💎", fire: "🔥", lock: "🔒",
  unlock:"🔓", trash:"🗑️", magic:"✨", shield:"🛡️",
  sword:"⚔️", bot:"🤖", heart:"❤️", star:"🌟",
};

module.exports = {
  LINE_TOP, LINE_MID, LINE_BOT, SOFT,
  header, box, badge, now, uptime,
  isOwner, fmtNum, pickRandom, rand, jidOf, react,
  FX,
};
