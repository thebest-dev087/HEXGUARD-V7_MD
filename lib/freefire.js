// HEXGUARD V4 — Free Fire utilidades (info, likes, foto)
const axios = require("axios");

async function info(id) {
  try {
    const r = await axios.get(`https://api-info-fofx.vercel.app/info?uid=${id}`, { timeout: 15000 });
    return r.data;
  } catch (e) { return { error: e.message }; }
}
async function pp(id) {
  try {
    const r = await axios.get(`https://aditya-ff-api.vercel.app/profile?uid=${id}`, { timeout: 15000 });
    return r.data?.image || r.data?.profile || null;
  } catch { return null; }
}
async function likes(id, region = "br") {
  try {
    const r = await axios.get(`https://api-likes-ff-pi.vercel.app/like?uid=${id}&region=${region}`, { timeout: 25000 });
    return r.data;
  } catch (e) { return { error: e.message }; }
}

module.exports = { info, pp, likes };
