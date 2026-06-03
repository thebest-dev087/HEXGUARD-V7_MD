// HEXGUARD V4 — bootstrap (pairing automático, online-only 5s, render-friendly)
const {
  default: makeWASocket, useMultiFileAuthState, DisconnectReason,
  fetchLatestBaileysVersion, Browsers,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const db = require("./database");
const handler = require("./lib/handler");
const { bold } = require("./lib/fonts");

const startTime = Date.now();
module.exports.startTime = startTime;

async function start() {
  console.log(chalk.cyan(`\n╭━━━━━━━━━━━━━━━━━━━━━━━━━━━╮`));
  console.log(chalk.cyan(`┃   ${bold(config.botName)} ${config.version}`));
  console.log(chalk.cyan(`┃   by ${config.ownerName}  •  ${config.tagline}`));
  console.log(chalk.cyan(`┃   ${config.site}`));
  console.log(chalk.cyan(`╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n`));

  const sessionDir = process.env.SESSION_DIR || "./session";
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();
  const usePairing = config.loginMode === "pairing" && !state.creds.registered;

  const sock = makeWASocket({
    version, logger: pino({ level: "silent" }),
    printQRInTerminal: !usePairing,
    auth: state, browser: Browsers.macOS("Safari"),
    syncFullHistory: false,
    markOnlineOnConnect: true,
  });
  sock.ev.on("creds.update", saveCreds);

  // 🔐 PAIRING AUTOMÁTICO — sem perguntar no terminal
  if (usePairing) {
    setTimeout(async () => {
      try {
        const num = (process.env.BOT_NUMBER || config.botNumber).replace(/\D/g, "");
        if (num.length < 10) { console.log(chalk.red("❌ botNumber inválido.")); return; }
        const code = await sock.requestPairingCode(num);
        const pretty = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(chalk.green(`\n╔══════════════════════════════════╗`));
        console.log(chalk.green(`║   📲 PAIRING CODE — ${num}`));
        console.log(chalk.yellow(`║      ➜  ${bold(pretty)}`));
        console.log(chalk.green(`╚══════════════════════════════════╝`));
        console.log(chalk.gray(`WhatsApp → ⚙️  Aparelhos conectados → Conectar com nº telefone\n`));
      } catch (e) { console.log(chalk.red("Erro pairing:"), e.message); }
    }, 3000);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr && !usePairing) qrcode.generate(qr, { small: true });
    if (connection === "open") {
      console.log(chalk.green(`\n✅ ${config.botName} ${config.version} ONLINE!`));
      console.log(chalk.gray(`   Modo: ${db.global.mode}  •  Online-only: ${config.onlineOnly}`));
    }
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log(chalk.red("⚠️ Desconectado:"), reason);
      if (reason !== DisconnectReason.loggedOut) start();
      else console.log(chalk.red("👋 Logged out. Apaga ./session e reinicia."));
    }
  });

  // ════════════ MENSAGENS ════════════
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    if (!db.global.botOn) return;
    const NOW = Date.now();
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      if (msg.key.remoteJid === "status@broadcast") continue;

      // ⏱️ ONLINE-ONLY 5s — ignora qualquer msg antiga (offline backlog)
      const ts = (msg.messageTimestamp || 0) * 1000;
      if (config.onlineOnly && ts) {
        if (ts < startTime) continue;                      // antes do boot
        if (NOW - ts > config.onlineWindowMs) continue;    // mais velha que janela
      }

      const isGroup = msg.key.remoteJid.endsWith("@g.us");
      const sender = isGroup ? msg.key.participant : msg.key.remoteJid;
      if (!sender) continue;
      if (db.global.banned.includes(sender)) continue;

      // 📥 Log bonito de mensagem recebida (Termux)
      try {
        const mm = msg.message;
        const body = mm.conversation || mm.extendedTextMessage?.text || mm.imageMessage?.caption || mm.videoMessage?.caption || "";
        const tipo = mm.imageMessage ? "🖼️ imagem"
                   : mm.videoMessage ? "🎬 vídeo"
                   : mm.audioMessage ? "🎵 áudio"
                   : mm.stickerMessage ? "✨ sticker"
                   : mm.documentMessage ? "📄 documento"
                   : mm.contactMessage ? "👤 contacto"
                   : mm.locationMessage ? "📍 localização"
                   : body ? "💬 texto" : "❔ outro";
        const isCmd = body.startsWith(config.prefix) ? chalk.greenBright(" [CMD]") : "";
        const grpName = isGroup ? chalk.magenta(` ${(await sock.groupMetadata(msg.key.remoteJid).catch(()=>({subject:"?"}))).subject}`) : chalk.gray(" (PV)");
        const preview = body ? body.slice(0, 60).replace(/\n/g, " ") : "";
        console.log(
          chalk.cyan("┌─") + chalk.yellow(` ${tipo}`) + isCmd + grpName + "\n" +
          chalk.cyan("├ 👤 ") + chalk.white(msg.pushName || "?") + chalk.gray(`  +${sender.split("@")[0]}`) + "\n" +
          chalk.cyan("└ 📝 ") + chalk.white(preview)
        );
      } catch {}

      if (db.global.typingEffect) {
        try { await sock.sendPresenceUpdate("composing", msg.key.remoteJid); } catch {}
      }
      try { await handler(sock, msg, { startTime }); }
      catch (e) { console.error(chalk.red("handler:"), e.message); }
      try { await sock.sendPresenceUpdate("paused", msg.key.remoteJid); } catch {}

    }
  });

  // ════════════ WELCOME / GOODBYE (online-only, ignora backlog) ════════════
  const defaultPp = path.join(__dirname, "assets", "default-pp.jpg");
  sock.ev.on("group-participants.update", async (ev) => {
    try {
      // Se o evento foi disparado antes do boot+5s, ignora
      if (Date.now() - startTime < 5000) return;
      const g = db.getGroup(ev.id);
      const meta = await sock.groupMetadata(ev.id);
      for (const jid of ev.participants) {
        const num = jid.split("@")[0];
        let imgPayload;
        try {
          const url = await sock.profilePictureUrl(jid, "image");
          imgPayload = { image: { url } };
        } catch {
          try { imgPayload = { image: fs.readFileSync(defaultPp) }; }
          catch { imgPayload = null; }
        }
        if (ev.action === "add" && g.welcome) {
          const txt = g.welcomeMsg.replace("@user", `@${num}`).replace("@group", meta.subject);
          const cap = `╭━━〔 🌟 ${bold("WELCOME")} 〕━━╮\n┃ ${txt}\n┃ 👥 Membro #${meta.participants.length}\n┃ 🛡️ ${config.botName} ${config.version}\n╰━━━━━━━━━━━━━━━━━━━━╯`;
          if (imgPayload) await sock.sendMessage(ev.id, { ...imgPayload, caption: cap, mentions: [jid] });
          else await sock.sendMessage(ev.id, { text: cap, mentions: [jid] });
        }
        if (ev.action === "remove" && g.goodbye) {
          const txt = g.goodbyeMsg.replace("@user", `@${num}`).replace("@group", meta.subject);
          const cap = `╭━〔 👋 ${bold("GOODBYE")} 〕━╮\n┃ ${txt}\n┃ ${config.botName}\n╰━━━━━━━━━━━━━━━━╯`;
          if (imgPayload) await sock.sendMessage(ev.id, { ...imgPayload, caption: cap, mentions: [jid] });
          else await sock.sendMessage(ev.id, { text: cap, mentions: [jid] });
        }
      }
    } catch (e) { console.error("welcome err:", e.message); }
  });

  // ════════════ AUTO-SAIR ════════════
  setInterval(async () => {
    const now = Date.now();
    for (const [gid, when] of Object.entries(db.global.autoSair || {})) {
      if (now >= when) {
        try {
          await sock.sendMessage(gid, { text: `╭━━〔 👋 ${bold("ATÉ SEMPRE")} 〕━━╮\n┃ Foi um prazer.\n┃ ${config.botName} ${config.version} a sair...\n╰━━━━━━━━━━━━━━━━━━━━╯` });
          await sock.groupLeave(gid);
        } catch {}
        delete db.global.autoSair[gid];
      }
    }
  }, 30000);

  // ════════════ AGENDAMENTOS (fechar/abrir grupo) ════════════
  setInterval(async () => {
    const now = Date.now();
    for (const [gid, ag] of Object.entries(db.global.agenda || {})) {
      if (now >= ag.when) {
        try {
          await sock.groupSettingUpdate(gid, ag.action === "fechar" ? "announcement" : "not_announcement");
          await sock.sendMessage(gid, { text: `⏰ Grupo *${ag.action === "fechar" ? "FECHADO" : "ABERTO"}* (agendado).` });
        } catch {}
        delete db.global.agenda[gid];
      }
    }
  }, 15000);

  // ════════════ AUTO-REFILL DONO ════════════
  setInterval(() => {
    for (const own of config.owner) {
      const jids = [own + "@s.whatsapp.net", own + "@lid"];
      for (const j of jids) {
        if (!db.users[j]) continue;
        if (db.users[j].saldo < config.ownerRefillThreshold) {
          db.users[j].saldo = config.ownerBaseSaldo;
        }
      }
    }
  }, 60000);
}

start().catch(e => console.error("Fatal:", e));
process.on("uncaughtException", e => console.error("uncaught:", e.message));
process.on("unhandledRejection", e => console.error("unhandled:", e?.message || e));

// 🌐 Health-check HTTP para Render.com (mantém o serviço acordado)
const http = require("http");
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    bot: config.botName,
    version: config.version,
    site: config.site,
    uptime: ((Date.now() - startTime) / 1000).toFixed(0) + "s",
  }));
}).listen(PORT, () => console.log(chalk.gray(`🌐 health-check http://0.0.0.0:${PORT}`)));
