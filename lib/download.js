// HEXGUARD V4 — Downloads (YT, TikTok, Pinterest) com thumbnails
const axios = require("axios");
const config = require("../config");

async function ytSearch(query) {
  try {
    const r = await axios.get(`${config.ytSearch}?query=${encodeURIComponent(query)}`, { timeout: 25000 });
    const v = r.data?.result?.[0] || r.data?.data?.[0];
    if (!v) return null;
    return {
      title: v.title, duration: v.timestamp || v.duration?.timestamp || "?",
      author: v.author?.name || "?", views: v.views || "?",
      thumb: v.thumbnail || v.image, url: v.url || v.link,
    };
  } catch { return null; }
}

async function ytmp3(query) {
  try {
    const r = await axios.get(`${config.ytApi}?query=${encodeURIComponent(query)}`, { timeout: 60000 });
    const d = r.data?.result || r.data?.data || r.data;
    return {
      title: d?.metadata?.title || d?.title || query,
      duration: d?.metadata?.timestamp || "?",
      thumb: d?.metadata?.image || d?.thumbnail,
      audio: d?.download?.url || d?.url || d?.audio,
    };
  } catch (e) { return { error: e.message }; }
}

async function ytmp4(query) {
  try {
    const r = await axios.get(`${config.ytVideoApi}?query=${encodeURIComponent(query)}`, { timeout: 90000 });
    const d = r.data?.result || r.data?.data || r.data;
    return {
      title: d?.metadata?.title || d?.title || query,
      duration: d?.metadata?.timestamp || "?",
      thumb: d?.metadata?.image || d?.thumbnail,
      video: d?.download?.url || d?.url || d?.video,
    };
  } catch (e) { return { error: e.message }; }
}

async function tiktok(url) {
  try {
    const r = await axios.get(`${config.ttApi}/?url=${encodeURIComponent(url)}`, { timeout: 25000 });
    const d = r.data?.data;
    if (!d) return { error: "TikTok não encontrado" };
    return {
      title: d.title || "TikTok", thumb: d.cover, video: d.play, music: d.music,
      author: d.author?.unique_id, plays: d.play_count,
    };
  } catch (e) { return { error: e.message }; }
}

async function pinterest(query) {
  try {
    const r = await axios.get(`https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/pins/?q=${encodeURIComponent(query)}&data={"options":{"query":"${query}","scope":"pins"},"context":{}}`, { headers: { "X-Pinterest-AppState": "active", "Accept": "application/json" }, timeout: 20000 });
    const items = r.data?.resource_response?.data?.results || [];
    return items.slice(0, 10).map(it => it.images?.orig?.url || it.images?.["474x"]?.url).filter(Boolean);
  } catch {
    // fallback simples
    try {
      const r = await axios.get(`https://api.lolhuman.xyz/api/pinterest?apikey=GataDios&query=${encodeURIComponent(query)}`, { timeout: 15000 });
      return r.data?.result || [];
    } catch { return []; }
  }
}

async function getSize(url) {
  try {
    const r = await axios.head(url, { timeout: 15000 });
    return parseInt(r.headers["content-length"] || "0", 10);
  } catch { return 0; }
}

module.exports = { ytSearch, ytmp3, ytmp4, tiktok, pinterest, getSize };
