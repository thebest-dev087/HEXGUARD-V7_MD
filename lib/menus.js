const config = require("../config");
const db = require("../database");
const { now, badge, header, fmtNum } = require("./utils");
const { boreal, bold, small } = require("./fonts");
const { totalAliases, totalCanonical, ALIASES } = require("./aliases");

const P = config.prefix;

function topBlock(title, user) {
  return `╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃ ${bold(config.botName)} ${config.version}
┃ ${boreal(title)}
┃ ${small("─────────────────────")}
┃ 👤 ${user.name || "User"}
┃ 🏷️ ${badge(user.jid, db)}
┃ 📊 𝐋𝐯𝐥 ${user.level} • ⭐ ${fmtNum(user.xp)} xp
┃ 💵 ${fmtNum(user.saldo)} • 🏆 ${fmtNum(user.pontos)}
┃ 🕒 ${now()}
┃ 📡 ${config.status}
┃ 👑 Dono: ${config.ownerName}
┃ 💻 ${config.ownerGit}
╰━━━━━━━━━━━━━━━━━━━━━━━╯`;
}

function section(title, cmds) {
  const top = `\n┏━━━━〔 ${bold(title)} 〕━━━━━`;
  const body = cmds.map(c => `┃ ✦  ${P}${c}`).join("\n");
  const bot = `\n┗━━━━━━━━━━━━━━━━━━━━━`;
  return top + "\n" + body + bot;
}

const ALL = {
  IA: ["ia <p>","traduz <t>","resumo <t>","ideia <t>","corrigir <t>","explica <t>","codigo <t>","debug <t>","regex <t>","sql <t>","email <t>","carta <t>","poema <t>","historia <t>","piada","conselho","rima <t>","letra <t>","receita <t>","dieta <t>","treino","motivacao","frase","horoscopo <signo>","sonho <t>","bio <t>","nick <t>","fato","noticia","definir <p>","sinonimo <p>","antonimo <p>","argumento <t>","comparar <a> <b>","curiosidade","wendel <t>"],
  GRUPO: ["grupoinfo","admins","listar","tagall <m>","hidetag <m>","ban @","add <num>","promover @","despromover @","silenciar / fechar","desmutar / abrir","linkgrupo","resetlink","apagar / d","mudarnome <n>","mudardesc <d>","banword <p>","desbanword <p>","limpar","fix (responde)","unfix","vermsg","muteuser @","desmuteuser @","listmuted","adv @","listadv","limparadv [@]"],
  ANTIS: ["antilink on/off","antifoto on/off","antivideo on/off","antisticker on/off","antiaudio on/off","antistatus on/off","antipv on/off","antifake on/off","antipalavrao on/off","antispam on/off","antibanadm on/off","welcome on/off","goodbye on/off","setwelcome <m>","setgoodbye <m>","setlimite <tipo> <n>","statusanti"],
  UTIL: ["ping","status","menustatus","runtime","speed","prefix","totalcomandos","jid","lidme","lidgp","qr <t>","calc <c>","horas","data","wiki <t>","reverse <t>","encurtar <url>","ip <ip>","github <user>","binario <t>","morse <t>","base64 <t>","debase64 <t>","uuid","random <a> <b>","senha <n>","audio <t>","gif <cat>","diag","logs <n>","limparlogs","shizuko","tutorial"],
  ECONOMIA: ["saldo","perfil","top","topxp","daily","trabalhar","crime","roubar @","loja","comprar <i>","items","usar <i>","pay @ <v>","trocar <xp>","banco"],
  JOGOS: ["ppt <op>","cc <cara|coroa>","dado","moeda","sorte","numero <n>","roleta <v>","cacaniquel <v>","blackjack","quiz","resp <t>","8ball <p>","duelo @","russa","loteria","advinha","maiormenor","parimpar","pokemon","gato","cachorro","jdv [@user]","jdvbot","jdvjogar <1-9>","jdvfim"],
  ACOES: ["abraco @","beijo @","tapa @","soco @","mata @","morder @","comer @","afagar @","cutucar @","acenar @","highfive @","cuddle @","casar @","divorciar","ship @ @","reza @","chorar","rir","dancar","dormir","blush","sorrir","amizade @","odio @","iq @"],
  BRINCADEIRAS: ["gay @","burro @","lindo @","feio @","gostosa @","fofoqueiro @","8ball <p>","piada","cantada","meme","fato","conselho"],
  DOWNLOAD: ["play <m>","playvid <v>","ytmp3 <url>","ytmp4 <url>","tiktok <url>","pinterest <q>","ig <url>","fb <url>","img <q>","lyrics <m>"],
  LOGOS: ["logo <t>","logoneon <t>","logofire <t>","logoice <t>","logoshadow <t>","logostyle <t>","logobig <t>"],
  FREEFIRE: ["ffid <id>","fflike <id>","ffpp <id>"],
  VIP: ["vipinfo","comprarvip","ia2 <p>","megaia <p>","ttsvip <t>"],
  PREMIUM: ["premiuminfo","comprarpremium","unlimitia <p>"],
  ALUGUEL: ["statusaluguel","ativarbot <dias>","ativargrupo parceria","renovaraluguel <dias>","removeraluguel","bangrupo","desbangrupo","statusagenda"],
  ADMIN: ["limpar","banword","desbanword","tagall","hidetag","ban","add","silenciar","desmutar","linkgrupo","resetlink","apagar","mudarnome","adv @","fix","muteuser @","setlimite"],
  DONO: ["on","off","typing on/off","join <link>","sairgrupo","autosair <tempo>","broadcast <m>","setbotname <n>","setstatus <s>","setpp (responde img)","setprefix <p>","modo <publico|privado|aluguel|parceria|listanegra>","resetdb / limpezahd","addsaldo @ <v>","remsaldo @ <v>","addxp @ <v>","banuser @","desbanuser @","block @","unblock @","setvip @ <d>","unvip @","setpremium @ <d>","unpremium @","listgrupos","reiniciar / restart","exec <js>","addcomando <n> <r>","delcomando <n>","addautoresponder g || r","delautoresp <g>","logs <n>","limparlogs","donogp"],
};

function totalCmdsCount() {
  return Object.values(ALL).reduce((s, a) => s + a.length, 0);
}

function menuCompleto(user) {
  let out = topBlock("MENU COMPLETO", user);
  for (const [k, v] of Object.entries(ALL)) out += section(k, v);
  out += `\n\n╭━━━━━━━━━━━━━━━━━╮
┃ 📦 Total comandos: ${totalCmdsCount()}
┃ 🔁 Aliases ativos: ${totalAliases()}
┃ 🥷 ${bold(config.botName)} ${config.version}
┃ by ${config.ownerName} • ${config.ownerGit}
╰━━━━━━━━━━━━━━━━━╯`;
  return out;
}

function sub(title, list, user) {
  return topBlock(title, user) + section(title, list) +
    `\n\n💡 ${small("Usa")} *${P}menu* ${small("para ver tudo.")}`;
}

module.exports = {
  badge,
  totalCmdsCount,
  menuCompleto,
  menuIA:           u => sub("MENU IA 🧠", ALL.IA, u),
  menuGP:           u => sub("MENU GRUPO 👥", ALL.GRUPO, u),
  menuJogos:        u => sub("MENU JOGOS 🎮", ALL.JOGOS, u),
  menuAcoes:        u => sub("MENU AÇÕES 💞", ALL.ACOES, u),
  menuBrincadeiras: u => sub("BRINCADEIRAS 🎉", ALL.BRINCADEIRAS, u),
  menuAnti:         u => sub("MENU ANTIS 🛡️", ALL.ANTIS, u),
  menuUtil:         u => sub("MENU UTIL 🧰", ALL.UTIL, u),
  menuEco:          u => sub("MENU ECONOMIA 💰", ALL.ECONOMIA, u),
  menuAdm:          u => sub("MENU ADMIN ⚔️", ALL.ADMIN, u),
  menuDono:         u => sub("MENU DONO 👑", ALL.DONO, u),
  menuVip:          u => sub("MENU VIP ✨", ALL.VIP, u),
  menuPremium:      u => sub("MENU PREMIUM 💎", ALL.PREMIUM, u),
  menuDownload:     u => sub("MENU DOWNLOAD ⬇️", ALL.DOWNLOAD, u),
  menuLogos:        u => sub("MENU LOGOS 🎨", ALL.LOGOS, u),
  menuFF:           u => sub("MENU FREE FIRE 🎮", ALL.FREEFIRE, u),
  menuAluguel:      u => sub("MENU ALUGUEL 💳", ALL.ALUGUEL, u),
  menuRank:         u => topBlock("RANKING 🏆", u) + "\n\n💡 Sobe de level para subir de rank!",
};
