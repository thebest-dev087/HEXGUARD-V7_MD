const fs = require("fs-extra");
const path = require("path");
const config = require("./config");

const DB_DIR = path.join(__dirname, "data");
fs.ensureDirSync(DB_DIR);

const FILES = {
  users:  path.join(DB_DIR, "users.json"),
  groups: path.join(DB_DIR, "groups.json"),
  global: path.join(DB_DIR, "global.json"),
};

function load(file, def) {
  try { return fs.readJsonSync(file); }
  catch { fs.writeJsonSync(file, def); return def; }
}
function save(file, data) { fs.writeJsonSync(file, data, { spaces: 2 }); }

let users  = load(FILES.users,  {});
let groups = load(FILES.groups, {});
let global = load(FILES.global, {
  banned: [], premium: {}, vip: {}, mode: config.defaultMode || "publico", customCmds: {},
  botOn: true, typingEffect: true, autoSair: {}, autoResp: {}, agenda: {},
  rented: {}, parceria: [], listaNegra: [],
});

// Backfill
const defaults = {
  banned: [], premium: {}, vip: {}, mode: "publico", customCmds: {},
  botOn: true, typingEffect: true, autoSair: {}, autoResp: {}, agenda: {},
  rented: {}, parceria: [], listaNegra: [],
};
for (const [k, v] of Object.entries(defaults)) if (global[k] === undefined) global[k] = v;

function persist() {
  save(FILES.users,  users);
  save(FILES.groups, groups);
  save(FILES.global, global);
}
setInterval(persist, 12000);

// ================== USERS ==================
function getUser(jid) {
  if (!users[jid]) {
    users[jid] = {
      jid,
      saldo: isOwnerJid(jid) ? config.ownerBaseSaldo : config.freeStarterSaldo,
      xp: 0, level: 1, pontos: 0, items: {},
      lastDaily: 0, lastWork: 0, lastCrime: 0, lastSteal: 0,
      msgCount: 0, cmdCount: 0, registeredAt: Date.now(), name: "",
      married: null, shield: false, boostXpUntil: 0, boostMoneyUntil: 0,
      adv: 0,
    };
  }
  // Refill dono
  if (isOwnerJid(jid) && users[jid].saldo < config.ownerRefillThreshold) {
    users[jid].saldo = config.ownerBaseSaldo;
  }
  return users[jid];
}
function isOwnerJid(jid) {
  const d = (jid || "").split("@")[0].split(":")[0].replace(/\D/g, "");
  return config.owner.includes(d);
}
function addSaldo(jid, v) { const u=getUser(jid); u.saldo += v; if (u.saldo < 0) u.saldo = 0; }
function addXP(jid, v) {
  const u = getUser(jid); u.xp += v;
  let leveled = false;
  while (true) {
    const need = config.xpToLevel ? config.xpToLevel(u.level) : 120 + u.level * 60;
    if (u.xp >= need) { u.level++; u.xp -= need; leveled = true; } else break;
  }
  return leveled;
}
function addPontos(jid, v) { getUser(jid).pontos += v; }
function addItem(jid, name, qtd = 1) { const u=getUser(jid); u.items[name] = (u.items[name]||0)+qtd; }
function useItem(jid, name) {
  const u = getUser(jid);
  if (!u.items[name] || u.items[name] <= 0) return false;
  u.items[name]--; if (u.items[name] <= 0) delete u.items[name];
  return true;
}

// ================== VIP / PREMIUM ==================
function setVip(jid, days = 30)     { global.vip[jid] = Date.now() + days * 86400000; }
function unsetVip(jid)              { delete global.vip[jid]; }
function isVip(jid) { const t=global.vip[jid]; if(!t) return false; if(Date.now()>t){delete global.vip[jid]; return false;} return true; }
function setPremium(jid, days = 30) { global.premium[jid] = Date.now() + days * 86400000; }
function unsetPremium(jid)          { delete global.premium[jid]; }
function isPremium(jid) { const t=global.premium[jid]; if(!t) return false; if(Date.now()>t){delete global.premium[jid]; return false;} return true; }

// ================== ALUGUEL POR GRUPO ==================
function rentGroup(gid, days)  { global.rented[gid] = Date.now() + days * 86400000; }
function isRented(gid)         { const t=global.rented[gid]; if(!t) return false; if(Date.now()>t){delete global.rented[gid]; return false;} return true; }

// ================== GROUPS ==================
function getGroup(gid) {
  if (!groups[gid]) {
    groups[gid] = {
      gid, welcome: true, goodbye: true,
      antilink: false, antifoto: false, antivideo: false, antisticker: false,
      antistatus: false, antipv: false, antifake: false, antipalavrao: false, antispam: false,
      antiaudio: false, antibanadm: true,
      palavroes: ["puta","caralho","fdp","viado","cuzao","corno","arrombado","filho da puta","merda","porra"],
      welcomeMsg: "🌟 Bem-vindo @user ao grupo *@group*!\n\nLê as regras e diverte-te 🛡️",
      goodbyeMsg: "👋 @user saiu do grupo. Até breve!",
      spamCount: {}, limites: { link: 3, audio: 5, palavrao: 3, spam: 7 },
      mutedUsers: [], fixedMsg: null,
    };
  }
  const g = groups[gid];
  if (g.antibanadm === undefined) g.antibanadm = true;
  if (!g.limites) g.limites = { link: 3, audio: 5, palavrao: 3, spam: 7 };
  if (!g.mutedUsers) g.mutedUsers = [];
  if (g.fixedMsg === undefined) g.fixedMsg = null;
  return g;
}


// ================== CUSTOM CMDs / AUTORESP ==================
function addCmd(name, response) { global.customCmds[name.toLowerCase()] = response; }
function delCmd(name)           { delete global.customCmds[name.toLowerCase()]; }
function getCmd(name)           { return global.customCmds[name?.toLowerCase()]; }

function addAutoResp(trigger, response) { global.autoResp[trigger.toLowerCase()] = response; }
function delAutoResp(trigger)           { delete global.autoResp[trigger.toLowerCase()]; }
function listAutoResp()                  { return Object.entries(global.autoResp); }
function findAutoResp(text) {
  const low = (text || "").toLowerCase();
  for (const [k, v] of Object.entries(global.autoResp)) if (low.includes(k)) return v;
  return null;
}

function resetAll() {
  users = {}; groups = {}; global = { ...defaults, mode: config.defaultMode || "publico" };
  persist();
}

module.exports = {
  users, groups, global,
  getUser, addSaldo, addXP, addPontos, addItem, useItem, isOwnerJid,
  getGroup, persist,
  setVip, unsetVip, isVip,
  setPremium, unsetPremium, isPremium,
  rentGroup, isRented,
  addCmd, delCmd, getCmd,
  addAutoResp, delAutoResp, listAutoResp, findAutoResp,
  resetAll,
};
