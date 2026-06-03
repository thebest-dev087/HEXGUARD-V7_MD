// HEXGUARD V7-MD — config principal
let apiCfg = { enabled: false };
try { apiCfg = require("./api.json"); } catch {}

module.exports = {
  prefix: ".",
  botName: "🥷 HΞXGUΛRD",
  version: "V7-MD ⚡ BIZARRE NINJA",
  tagline: "💀 O BOT MAIS BIZARRO E COMPLETO DO WHATSAPP 💀",
  site: "https://hexguard.lovable.app",

  // 📲 NÚMEROS
  botNumber: "258858725314",            // WhatsApp do BOT (pareamento automático)
  ownerNumber: "29369590374428",        // ID interno do DONO (usado em comandos)
  ownerWa: "258848881576",              // WhatsApp REAL do dono (chat)
  owner: ["29369590374428", "258848881576", "258858725314"], // antiban TOTAL
  ownerName: "TheBest",
  ownerGit: "https://github.com/thebest-dev087",
  ownerBio: "Criador do HEXGUARD V7-MD • Configs VPN • Developer de bots WhatsApp",

  status: "🥷 HEXGUARD V7-MD — Bizarre Ninja Edition",
  api: apiCfg,
  enableAudio: true,
  enableGifs: true,
  timezone: "Africa/Maputo",

  // 🔐 LOGIN — pairing automático sem terminal
  loginMode: "pairing",
  autoPairing: true,

  // 🌐 IA GEMINI (funciona — modelo 1.5-flash)
  geminiKey: "AIzaSyDn8fkbQd2UKoaPfhQoEXK8bq-Of1shNvM",
  geminiModel: "gemini-1.5-flash-latest",

  // 🛡️ FILTROS
  defaultMode: "publico",               // publico | privado | aluguel | parceria | listanegra
  typingEffect: true,
  onlineOnly: true,
  onlineWindowMs: 5000,
  antibanDonoTotal: true,
  antibanAdmDefault: true,

  // 💰 ECONOMIA
  ownerBaseSaldo: 999999999999,
  ownerRefillThreshold: 100000,
  minSaldoToUse: 1,
  freeStarterSaldo: 500,
  xpPerMessage: 8,
  xpToLevel: (lvl) => 120 + lvl * 60,
  saldoPerLevel: 250,
  dailyReward: 1500,
  workMin: 150,
  workMax: 800,
  jdvWinReward: 800,
  gameWinBase: 500,
  levelUpItemChance: 0.25,              // 25% chance dum item grátis ao subir nível

  // 📥 DOWNLOAD
  videoMaxMB: 100,
  ytApi: "https://api.vreden.my.id/api/ytplaymp3",
  ytVideoApi: "https://api.vreden.my.id/api/ytplaymp4",
  ytSearch: "https://api.vreden.my.id/api/ytsearch",
  ttApi: "https://tikwm.com/api",

  // 🛡️ ANTI-PV NÍVEIS: 1 ignora • 2 avisa • 3 bloqueia
  antiPvLevel: 2,

  // 🛒 LOJA
  shop: {
    "ban-token":     { preco: 2500,  desc: "Banir 1× sem ser admin",            usos: 1 },
    "kick-token":    { preco: 1800,  desc: "Kick 1× sem ser admin",             usos: 1 },
    "mute-token":    { preco: 1200,  desc: "Fechar grupo 1×",                   usos: 1 },
    "unmute-token":  { preco: 1200,  desc: "Abrir grupo 1×",                    usos: 1 },
    "promote-token": { preco: 6000,  desc: "Promover alguém a admin",           usos: 1 },
    "vip":           { preco: 25000, desc: "✨ VIP por 30 dias",                 usos: 999 },
    "premium":       { preco: 60000, desc: "💎 PREMIUM por 30 dias",            usos: 999 },
    "xp-boost":      { preco: 1000,  desc: "Dobra XP por 1 hora",               usos: 1 },
    "saldo-boost":   { preco: 1500,  desc: "Dobra saldo do daily 1 dia",        usos: 1 },
    "shield":        { preco: 3000,  desc: "Bloqueia 1 roubo",                  usos: 1 },
    "lucky-charm":   { preco: 2000,  desc: "+10% sorte em jogos por 1 dia",     usos: 1 },
    "loot-box":      { preco: 1500,  desc: "Caixa misteriosa",                  usos: 1 },
    "elite-loot":    { preco: 5000,  desc: "Caixa elite",                       usos: 1 },
    "mega-loot":     { preco: 12000, desc: "Caixa mega",                        usos: 1 },
    "rev-token":     { preco: 4000,  desc: "Vingar 1× roubo",                   usos: 1 },
    "katana":        { preco: 30000, desc: "🗡️ Katana — bani 1× admin",         usos: 1 },
    "sword":         { preco: 8000,  desc: "Espada — duelos +20%",              usos: 1 },
    "armor":         { preco: 9000,  desc: "Armadura — defesa +20%",            usos: 1 },
    "wedding-ring":  { preco: 9000,  desc: "Aliança de casamento",              usos: 1 },
    "divorce-paper": { preco: 3000,  desc: "Papel de divórcio",                 usos: 1 },
    "pet-cat":       { preco: 4000,  desc: "Adotar gato 🐱",                    usos: 1 },
    "pet-dog":       { preco: 4500,  desc: "Adotar cão 🐶",                     usos: 1 },
    "pet-dragon":    { preco: 25000, desc: "Adotar dragão 🐉",                  usos: 1 },
    "skip-cd":       { preco: 2000,  desc: "Pula 1 cooldown",                   usos: 1 },
    "lottery-ticket":{ preco: 500,   desc: "Bilhete loteria",                   usos: 1 },
    "magic-wand":    { preco: 7000,  desc: "Reseta o teu cooldown",             usos: 1 },
    "gem-blue":      { preco: 5000,  desc: "Gema azul",                         usos: 999 },
    "gem-red":       { preco: 8000,  desc: "Gema vermelha",                     usos: 999 },
    "gem-purple":    { preco: 15000, desc: "Gema roxa rara",                    usos: 999 },
    "gem-rainbow":   { preco: 50000, desc: "Gema arco-íris MITICA",             usos: 999 },
    "rich":          { preco: 50000, desc: "Status 💰 RICO 7 dias",             usos: 999 },
    "ghost":         { preco: 7000,  desc: "Imune ao antispam 1 dia",           usos: 1 },
    "stealth":       { preco: 4500,  desc: "Esconde de roubos 12h",             usos: 1 },
    "spy-glass":     { preco: 2500,  desc: "Vê saldo de outros",                usos: 1 },
    "hacker-kit":    { preco: 18000, desc: "+30% sucesso em crime",             usos: 1 },
    "lawyer":        { preco: 6000,  desc: "Reduz multa de crime",              usos: 1 },
    "vip-badge":     { preco: 12000, desc: "Badge ✨ no perfil",                 usos: 999 },
    "champ-badge":   { preco: 30000, desc: "🏆 Campeão",                        usos: 999 },
    "ninja-mask":    { preco: 13000, desc: "🥷 Máscara ninja (cosmético)",      usos: 999 },
    "shuriken":      { preco: 4500,  desc: "Shuriken — +15% duelo",             usos: 1 },
  },

  // 🏆 RANKS (auto pelo level)
  ranks: [
    { lvl: 1,   nome: "🌱 Novato" },
    { lvl: 5,   nome: "🥋 Aprendiz" },
    { lvl: 10,  nome: "🥷 Ninja" },
    { lvl: 20,  nome: "🗡️ Samurai" },
    { lvl: 35,  nome: "⚔️ Guerreiro" },
    { lvl: 50,  nome: "🛡️ Cavaleiro" },
    { lvl: 75,  nome: "🐉 Dragão" },
    { lvl: 100, nome: "👑 Imortal" },
    { lvl: 150, nome: "🌌 Lendário" },
    { lvl: 200, nome: "💀 BIZARRE" },
  ],
};
