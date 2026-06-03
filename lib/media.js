// HEXGUARD V3 — TTS (audio robótico/PT-BR) + GIFs anime para ações
const axios = require("axios");
const config = require("../config");

// ─── TTS — voz MACHO REBÓTICA (StreamElements Brian) ───
async function tts(text, voice = "Ricardo") {
  // Brian = macho robotico inglês; Ricardo = macho PT-BR
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text.slice(0, 300))}`;
  try {
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return Buffer.from(r.data);
  } catch {
    return null;
  }
}

async function sendVoice(sock, jid, text, opts = {}) {
  // tenta voz macho PT-BR (Ricardo), fallback Brian (rebotico EN)
  let buf = await tts(text, opts.voice || "Ricardo");
  if (!buf) buf = await tts(text, "Brian");
  if (!buf) return null;
  return sock.sendMessage(jid, {
    audio: buf,
    mimetype: "audio/mp4",
    ptt: false,            // false = abre como áudio normal (não nota de voz)
    ...opts.extra,
  }, opts.quoted ? { quoted: opts.quoted } : {});
}

// ─── GIFs anime via waifu.pics (gratuito) + nekos.best fallback ───
const GIF_MAP = {
  abraco:   "hug",
  beijo:    "kiss",
  tapa:     "slap",
  soco:     "punch",
  morder:   "bite",
  comer:    "feed",
  afagar:   "pat",
  cutucar:  "poke",
  acenar:   "wave",
  sorrir:   "smile",
  rir:      "happy",
  chorar:   "cry",
  dancar:   "dance",
  dormir:   "sleep",
  blush:    "blush",
  highfive: "highfive",
  cuddle:   "cuddle",
  yeet:     "yeet",
  matar:    "kill",
  mata:     "kill",
};

async function fetchGif(cat) {
  const key = GIF_MAP[cat] || cat;
  // 1) waifu.pics
  try {
    const r = await axios.get(`https://api.waifu.pics/sfw/${key}`, { timeout: 10000 });
    if (r.data?.url) return r.data.url;
  } catch {}
  // 2) nekos.best
  try {
    const r = await axios.get(`https://nekos.best/api/v2/${key}`, { timeout: 10000 });
    if (r.data?.results?.[0]?.url) return r.data.results[0].url;
  } catch {}
  return null;
}

async function sendActionGif(sock, jid, action, caption, mentions = [], quoted) {
  const url = await fetchGif(action);
  if (!url) {
    return sock.sendMessage(jid, { text: caption, mentions }, quoted ? { quoted } : {});
  }
  // .gif do waifu/nekos vêm como mp4 normalmente — envia como vídeo gifPlayback
  try {
    return await sock.sendMessage(jid, {
      video: { url },
      caption,
      mentions,
      gifPlayback: true,
    }, quoted ? { quoted } : {});
  } catch {
    return sock.sendMessage(jid, { image: { url }, caption, mentions }, quoted ? { quoted } : {});
  }
}

// ─── Shizuko-like AI gateway (config-driven, opcional) ───
async function shizuko(endpoint, params = {}) {
  const c = config.api || {};
  if (!c.enabled) return null;
  const url = `${c.apiUrl}${c.endpoints?.[endpoint] || "/" + endpoint}`;
  const headers = { "x-api-key": c.apiKey, Authorization: `Bearer ${c.apiKey}` };
  for (let i = 0; i < (c.maxRetries || 1); i++) {
    try {
      const r = await axios.get(url, { params, headers, timeout: c.timeout || 30000 });
      return r.data;
    } catch (e) {
      if (i === (c.maxRetries || 1) - 1) return { error: e.message };
    }
  }
  return null;
}

module.exports = { tts, sendVoice, sendActionGif, fetchGif, shizuko, GIF_MAP };
