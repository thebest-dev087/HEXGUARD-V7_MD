const config = require("../config");
const db = require("../database");
const utils = require("./utils");
const { box, header, badge, now, uptime, isOwner, fmtNum, pickRandom, rand, jidOf, react, FX } = utils;
const { boreal, bold, small, mono } = require("./fonts");
const { resolve, totalAliases, totalCanonical, ALIASES } = require("./aliases");
const menus = require("./menus");
const { askAI } = require("./ai");
const jdv = require("./jdv");
const data = require("./data");
const logos = require("./logos");
const logger = require("./logger");
const media = require("./media");
const help = require("./help");
const dl = require("./download");
const ff = require("./freefire");
const { askAI: askAIv4, wendel } = require("./ai");
const axios = require("axios");
const os = require("os");
const fs = require("fs");
const path = require("path");

let totalMessagesProcessed = 0;
const MENU_IMG = path.join(__dirname, "..", "assets", "menu.jpg");

// 🔢 Extrai apenas dígitos do JID — corrige bug de comparação @lid vs @s.whatsapp.net
function digits(jid) { return (jid || "").split("@")[0].split(":")[0].replace(/\D/g, ""); }


// Detector de links MAIS forte
const LINK_RX = /(https?:\/\/|www\.|\.com|\.net|\.org|\.io|\.dev|\.app|\.xyz|\.me|\.gg|\.tv|\.co|chat\.whatsapp\.com|wa\.me|t\.me|bit\.ly|tinyurl|youtu\.|instagram\.|facebook\.|tiktok\.|telegram\.|discord\.gg|onlyfans\.)/i;

// Helper p/ enviar com imagem do menu
async function sendMenuImg(sock, from, msg, caption, mentions = []) {
  try {
    return await sock.sendMessage(from, { image: fs.readFileSync(MENU_IMG), caption, mentions }, { quoted: msg });
  } catch {
    return sock.sendMessage(from, { text: caption, mentions }, { quoted: msg });
  }
}

// 🚫 Buttons removidos no V7-MD — usa texto puro sempre
async function sendButtons(sock, from, msg, text, footer, buttons) {
  const list = buttons?.length ? "\n\n" + buttons.map(b => `• ${b.text}`).join("\n") : "";
  return sock.sendMessage(from, { text: `${text}${footer ? "\n\n" + footer : ""}${list}` }, { quoted: msg });
}

// Levenshtein simples p/ sugestão de comando
function lev(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1},()=>new Array(n+1).fill(0));
  for (let i=0;i<=m;i++) dp[i][0]=i; for (let j=0;j<=n;j++) dp[0][j]=j;
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}
function bestMatch(input, pool) {
  if (!input) return null;
  let best = null, score = 99;
  for (const c of pool) { const d = lev(input, c); if (d < score) { score = d; best = c; } }
  return score <= Math.max(2, Math.floor(input.length/2)) ? best : null;
}


// ════════════════════════════════════════════════════════════
async function handler(sock, msg, ctx = {}) {
  const startTime = ctx.startTime || Date.now();
  try {
    totalMessagesProcessed++;
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const sender = isGroup ? msg.key.participant : from;
    if (!sender) return;
    const senderNum = sender.split("@")[0];
    const m = msg.message;
    if (!m) return;

    const body =
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.buttonsResponseMessage?.selectedButtonId ||
      m.listResponseMessage?.singleSelectReply?.selectedRowId ||
      "";

    const user = db.getUser(sender);
    user.name = msg.pushName || user.name;
    user.msgCount = (user.msgCount || 0) + 1;

    // ─── XP por mensagem + level up bonito ───
    const lvlUp = db.addXP(sender, config.xpPerMessage * (user.boostXpUntil > Date.now() ? 2 : 1));
    if (lvlUp) {
      const bonus = config.saldoPerLevel * user.level;
      db.addSaldo(sender, bonus);
      await sock.sendMessage(from, {
        text: `╭━━〔 ${bold("LEVEL UP")} 〕━━╮
┃ 🎉 Parabéns @${senderNum}!
┃ 📈 Subiste para ${bold("Lvl " + user.level)}
┃ 💰 +${fmtNum(bonus)} de saldo
┃ ⭐ XP atual: ${fmtNum(user.xp)}
╰━━━━━━━━━━━━━━━━━╯`,
        mentions: [sender],
      });
    }

    // ═══ ANTIS ═══
    if (isGroup) {
      const g = db.getGroup(from);
      const txtLow = body.toLowerCase();
      // Antiban DONO sempre (não bani dono em situação nenhuma)
      const isSenderOwner = isOwner(sender);

      if (g.antilink && LINK_RX.test(body) && !isSenderOwner) {
        await sock.sendMessage(from, { delete: msg.key }).catch(()=>{});
        return sock.sendMessage(from, { text: `╭━〔 🚫 ${bold("ANTILINK")} 〕━╮\n┃ @${senderNum} link detectado e apagado!\n╰━━━━━━━━━━━━━━━━╯`, mentions: [sender] });
      }
      if (g.antifoto && m.imageMessage && !isSenderOwner) {
        await sock.sendMessage(from, { delete: msg.key }).catch(()=>{});
        return sock.sendMessage(from, { text: `🚫 @${senderNum} fotos proibidas!`, mentions:[sender] });
      }
      if (g.antivideo && m.videoMessage && !isSenderOwner) {
        await sock.sendMessage(from, { delete: msg.key }).catch(()=>{});
        return sock.sendMessage(from, { text: `🚫 @${senderNum} vídeos proibidos!`, mentions:[sender] });
      }
      if (g.antisticker && m.stickerMessage && !isSenderOwner) {
        await sock.sendMessage(from, { delete: msg.key }).catch(()=>{});
        return sock.sendMessage(from, { text: `🚫 @${senderNum} stickers proibidos!`, mentions:[sender] });
      }
      // Antiaudio (m.audioMessage)
      if (g.antiaudio && m.audioMessage && !isSenderOwner) {
        await sock.sendMessage(from, { delete: msg.key }).catch(()=>{});
        return sock.sendMessage(from, { text: `🚫 @${senderNum} áudios proibidos!`, mentions:[sender] });
      }
      if (g.antipalavrao && g.palavroes.some(p => txtLow.includes(p)) && !isSenderOwner) {
        await sock.sendMessage(from, { delete: msg.key }).catch(()=>{});
        return sock.sendMessage(from, { text: `🤬 @${senderNum} sem palavrões!`, mentions:[sender] });
      }
      // ANTISPAM novo: 5 msgs iguais = aviso, 7 = ban (usando hash do body)
      if (g.antispam && body && !isSenderOwner) {
        g._lastMsg = g._lastMsg || {};
        const prev = g._lastMsg[sender];
        if (prev && prev.text === body) {
          prev.count++;
          if (prev.count === 5) {
            await sock.sendMessage(from, { text: `⚠️ @${senderNum} ${prev.count}× a mesma mensagem. Aviso!`, mentions:[sender] });
          } else if (prev.count >= 7) {
            try {
              await sock.groupParticipantsUpdate(from, [sender], "remove");
              await sock.sendMessage(from, { text: `🚫 @${senderNum} banido por spam (${prev.count}×).`, mentions:[sender] });
            } catch {
              await sock.sendMessage(from, { text: `⚠️ Não consegui banir @${senderNum} — bot precisa ser admin.`, mentions:[sender] });
            }
            delete g._lastMsg[sender];
          }
        } else {
          g._lastMsg[sender] = { text: body, count: 1 };
        }
      }
      if (g.antifake && !isSenderOwner) {
        const ok = ["258","244","239","351","238","245","670","27","55"];
        if (!ok.some(p => senderNum.startsWith(p))) {
          await sock.groupParticipantsUpdate(from, [sender], "remove").catch(()=>{});
          return sock.sendMessage(from, { text: `🚫 Antifake removeu @${senderNum}`, mentions:[sender] });
        }
      }
    }

    // ════════ AUTORESPONDER ════════
    {
      const ar = db.findAutoResp(body);
      if (ar && !body.startsWith(config.prefix)) {
        return sock.sendMessage(from, { text: ar }, { quoted: msg });
      }
    }

    // ════════ ANTI-PV NÍVEIS ════════
    if (!isGroup && !isOwner(sender)) {
      const lvl = config.antiPvLevel || 0;
      if (lvl === 1) return; // ignora silenciosamente
      if (lvl === 2 && body.startsWith(config.prefix)) {
        await sock.sendMessage(from, { text: `⚠️ ${bold("ANTI-PV ATIVO")}\nFala com o dono: wa.me/${config.ownerWa}` }, { quoted: msg });
        return;
      }
      if (lvl === 3) {
        try { await sock.updateBlockStatus(from, "block"); } catch {}
        return;
      }
    }

    // ════════ MODO BOT ════════
    const senderIsOwnerEarly = isOwner(sender);
    const mode = db.global.mode;
    if (mode === "privado" && !senderIsOwnerEarly) return;
    if (mode === "aluguel" && isGroup && !db.isRented(from) && !senderIsOwnerEarly && !db.global.parceria.includes(from)) {
      if (body.startsWith(config.prefix)) {
        return sock.sendMessage(from, { text: `╭━━〔 💳 ${bold("MODO ALUGUEL")} 〕━━╮\n┃ ${config.botName} ${config.version}\n┃ ${config.tagline}\n┃\n┃ Este grupo *não está ativo*.\n┃ Fala com o dono para alugar:\n┃ 📲 wa.me/${config.ownerWa}\n┃ 🌐 ${config.site}\n╰━━━━━━━━━━━━━━━━━╯` }, { quoted: msg });
      }
      return;
    }
    if (mode === "parceria" && isGroup && !db.global.parceria.includes(from) && !senderIsOwnerEarly) return;
    if (mode === "listanegra" && isGroup && db.global.listaNegra.includes(from)) return;

    // ════════ SALDO MÍNIMO p/ usar comandos ════════
    if (body.startsWith(config.prefix) && !senderIsOwnerEarly) {
      const u = db.getUser(sender);
      if (u.saldo < (config.minSaldoToUse || 1)) {
        return sock.sendMessage(from, { text: `💸 Sem saldo!\nUsa *${config.prefix}daily* ou pede ao dono.` }, { quoted: msg });
      }
    }

    const reply = (t, opts = {}) => sock.sendMessage(from, { text: t, ...opts }, { quoted: msg });

    // ═══ Gatilhos SEM prefixo (sempre disponíveis) ═══
    const trimLow = body.trim().toLowerCase();
    if (["prefix","prefixo","prefíxo"].includes(trimLow)) {
      return reply(`╭━━〔 ${bold("PREFIXO ATUAL")} 〕━━╮\n┃ Prefixo: ${mono(config.prefix)}\n┃ Ex: ${config.prefix}menu\n┃ ${config.botName} ${config.version}\n╰━━━━━━━━━━━━━━━━━╯`);
    }
    if (trimLow === "dono") {
      return reply(`╭━━〔 👑 ${bold("DONO")} 〕━━╮\n┃ ${config.ownerName}\n┃ 📲 wa.me/${config.ownerWa}\n┃ 🌐 ${config.site}\n┃ 💻 ${config.ownerGit}\n┃ ${config.ownerBio}\n╰━━━━━━━━━━━━━━━━━╯`);
    }

    // 🔇 Mute por utilizador (per-grupo) — apaga e avisa
    if (isGroup && !isOwner(sender)) {
      const g = db.getGroup(from);
      if (g.mutedUsers?.includes(sender)) {
        await sock.sendMessage(from, { delete: msg.key }).catch(()=>{});
        return;
      }
    }

    // ─── Verifica se é comando ───
    if (!body.startsWith(config.prefix)) return;
    const args = body.slice(config.prefix.length).trim().split(/\s+/);
    const rawCmd = (args.shift() || "").toLowerCase();
    const cmd = resolve(rawCmd);
    const text = args.join(" ");
    const target = jidOf(msg);


    // metadados grupo — FIX V3: comparação por número puro (resolve @lid vs @s.whatsapp.net)
    let meta = null, isAdmin = false, isBotAdmin = false;
    let lastDenyReason = null;
    if (isGroup) {
      try {
        meta = await sock.groupMetadata(from);
        const meNum = digits(sock.user?.id || "");
        const meLidNum = digits(sock.user?.lid || "");
        const senderNumD = digits(sender);
        const part = meta.participants.find(p => digits(p.id) === senderNumD);
        const botPart = meta.participants.find(p => {
          const d = digits(p.id);
          return d === meNum || d === meLidNum;
        });
        isAdmin = !!(part && (part.admin === "admin" || part.admin === "superadmin"));
        isBotAdmin = !!(botPart && (botPart.admin === "admin" || botPart.admin === "superadmin"));
      } catch (e) { lastDenyReason = "groupMetadata: " + e.message; }
    }

    // 🛡️ ANTIBAN DONO
    const targetIsOwner = target && isOwner(target);

    await react(sock, msg, "⏳");

    // ─── Comando custom ───
    const custom = db.getCmd(rawCmd) || db.getCmd(cmd);
    if (custom) { await react(sock, msg, "💬"); logger.log(rawCmd, sender, "ok", "custom"); return reply(custom); }

    // helper pra erros admin reais (com log)
    const tryAdmin = async (fn, okMsg) => {
      try {
        await fn();
        logger.log(cmd, sender, "ok");
        return reply(okMsg);
      } catch (e) {
        const em = (e?.message || "").toLowerCase();
        let reason = e.message;
        let userMsg;
        if (em.includes("forbidden") || em.includes("not-authorized") || em.includes("403")) {
          reason = "bot sem permissão de admin";
          userMsg = `❌ O bot precisa ser ${bold("admin")} para esta acção.\n💡 Promove o bot e tenta de novo.`;
        } else if (em.includes("not in group")) {
          reason = "bot não está no grupo";
          userMsg = "❌ Bot não está no grupo.";
        } else {
          userMsg = `❌ Falhou: ${e.message}\n💡 Usa *.diag* para ver detalhes.`;
        }
        logger.log(cmd, sender, "err", reason);
        return reply(userMsg);
      }
    };


    // ════════════════════════════════════════════════
    switch (cmd) {

      // ╔═══════════ MENUS (com imagem + branding) ═══════════╗
      case "menu":
      case "menucompleto": {
        await react(sock, msg, "📜");
        // 🔊 Áudio robótico antes do menu
        if (config.enableAudio) {
          media.sendVoice(sock, from, "O HexGuard está trazendo o menu, aguarde um instante.", { quoted: msg }).catch(()=>{});
        }
        const cap = menus.menuCompleto(user);
        logger.log("menu", sender, "ok");
        return sendMenuImg(sock, from, msg, cap);
      }
      case "menuia":          { await react(sock,msg,"🤖"); return sendMenuImg(sock, from, msg, menus.menuIA(user)); }
      case "menugp":          { await react(sock,msg,"👥"); return sendMenuImg(sock, from, msg, menus.menuGP(user)); }
      case "menujogos":       { await react(sock,msg,"🎮"); return sendMenuImg(sock, from, msg, menus.menuJogos(user)); }
      case "menuacoes":       { await react(sock,msg,"😜"); return sendMenuImg(sock, from, msg, menus.menuAcoes(user)); }
      case "menubrincadeiras":{ await react(sock,msg,"🎉"); return sendMenuImg(sock, from, msg, menus.menuBrincadeiras(user)); }
      case "menuanti":        { await react(sock,msg,"🛡️"); return sendMenuImg(sock, from, msg, menus.menuAnti(user)); }
      case "menuutil":        { await react(sock,msg,"🧰"); return sendMenuImg(sock, from, msg, menus.menuUtil(user)); }
      case "menueco":         { await react(sock,msg,"💰"); return sendMenuImg(sock, from, msg, menus.menuEco(user)); }
      case "menuadm":         { await react(sock,msg,"⚔️"); return sendMenuImg(sock, from, msg, menus.menuAdm(user)); }
      case "menudono": {
        if (!isOwner(sender)) return reply("👑 Apenas o DONO.");
        await react(sock,msg,"👑"); return sendMenuImg(sock, from, msg, menus.menuDono(user));
      }
      case "menuvip":         { await react(sock,msg,"✨"); return sendMenuImg(sock, from, msg, menus.menuVip(user)); }
      case "menupremium":     { await react(sock,msg,"💎"); return sendMenuImg(sock, from, msg, menus.menuPremium(user)); }
      case "menudownload":    { await react(sock,msg,"⬇️"); return sendMenuImg(sock, from, msg, menus.menuDownload(user)); }
      case "menulogos":       { await react(sock,msg,"🎨"); return sendMenuImg(sock, from, msg, menus.menuLogos(user)); }
      case "menurank":        { await react(sock,msg,"🏆"); return sendMenuImg(sock, from, msg, menus.menuRank(user)); }

      // ╔═══════════ SISTEMA / INFO ═══════════╗
      case "prefix": {
        await react(sock,msg,"🔧");
        return sendButtons(sock, from, msg,
          `╭━━〔 ${bold("PREFIX")} 〕━━╮\n┃ Atual: ${mono(config.prefix)}\n┃ Ex: ${config.prefix}menu\n╰━━━━━━━━━━━━━━━━━╯`,
          `${config.botName} ${config.version}`,
          [{ id:"copy", text:`📋 Copiar: ${config.prefix}` }, { id:"menu", text:"📜 Menu completo" }]
        );
      }
      case "totalcomandos": {
        await react(sock,msg,"📊");
        return reply(`╭━━〔 ${bold("COMANDOS")} 〕━━╮
┃ 📦 Canónicos: ${totalCanonical()}
┃ 🔁 Aliases (PT+EN): ${totalAliases()}
┃ 🛒 Custom: ${Object.keys(db.global.customCmds).length}
┃ 📂 Categorias menu: 16
┃ 🧮 Listados em .menu: ${menus.totalCmdsCount()}
╰━━━━━━━━━━━━━━━━━╯`);
      }
      case "ping": {
        const t0 = Date.now();
        const sent = await reply("🏓 Pinging...");
        const lat = Date.now() - t0;
        const memMb = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const totalMem = (os.totalmem()/1024/1024).toFixed(0);
        const freeMem  = (os.freemem()/1024/1024).toFixed(0);
        await react(sock,msg,"🏓");
        const txt = `╭━━〔 ${bold("HEXGUARD V3 PING")} 〕━━╮
┃ ⚡ Latência: ${lat} ms
┃ 🧠 RAM bot: ${memMb} MB
┃ 💽 RAM sys: ${totalMem - freeMem}/${totalMem} MB
┃ ⏱️ Uptime: ${uptime(startTime)}
┃ 🖥️ ${os.platform()} ${os.arch()}
┃ 🌐 ${os.hostname()}
┃ 🧮 CPUs: ${os.cpus().length}
┃ 📨 Msgs: ${fmtNum(totalMessagesProcessed)}
┃ 👥 Users DB: ${Object.keys(db.users).length}
┃ 👬 Grupos DB: ${Object.keys(db.groups).length}
┃ 📡 ${config.status}
┃ 🛡️ Modo: ${db.global.mode}
┃ ⌨️ Typing: ${db.global.typingEffect?"🟢":"🔴"}
┃ 🤖 Bot: ${db.global.botOn?"🟢 ON":"🔴 OFF"}
┃ 🔊 API Shizuko: ${config.api?.enabled?"🟢":"🔴"}
┃ 👑 Dono: ${config.ownerName}
╰━━━━━━━━━━━━━━━━━╯`;
        await sock.sendMessage(from, { text: txt, edit: sent.key });
        if (config.enableAudio) {
          media.sendVoice(sock, from, `Olá! HexGuard V3 está online com latência de ${lat} milissegundos. Tudo funcionando perfeitamente!`, { quoted: msg }).catch(()=>{});
        }
        logger.log("ping", sender, "ok", `${lat}ms`);
        return;
      }
      // 🔍 DIAGNÓSTICO V3 — explica porque um comando falhou
      case "diag": case "diagnostico": {
        const focus = (text || "").toLowerCase().trim();
        const last = logger.lastError(focus || null);
        const st = logger.stats();
        const recentLogs = logger.recent(8).map(l => `${l.status==="ok"?"✅":l.status==="denied"?"🚫":"❌"} ${l.cmd} (${l.user}) ${l.reason||""}`).join("\n");
        let groupInfo = "";
        if (isGroup) {
          groupInfo = `┃ 👥 Grupo: ${meta?.subject || "?"}\n┃ 🤖 Bot é admin: ${isBotAdmin?"✅ SIM":"❌ NÃO — não consigo banir/fechar/etc"}\n┃ 👤 Tu és admin: ${isAdmin?"✅":"❌"}\n┃ 🔒 Grupo fechado: ${meta?.announce?"✅ sim (só admins)":"❌ aberto"}\n`;
        }
        return reply(`╭━━〔 🔍 ${bold("DIAGNÓSTICO V3")} 〕━━╮
┃ 📊 Logs: ${st.total} (✅${st.ok} ❌${st.err} 🚫${st.denied})
┃ 🆔 Teu nº: ${digits(sender)}
┃ 👑 És dono: ${isOwner(sender)?"✅":"❌"}
┃ ✨ VIP: ${db.isVip(sender)?"✅":"❌"} • 💎 Premium: ${db.isPremium(sender)?"✅":"❌"}
┃ 🤖 Bot ON: ${db.global.botOn?"✅":"❌"} • Modo: ${db.global.mode}
┃ 📡 Online-only: ${config.onlineOnly?"✅":"❌"} (msgs offline ignoradas)
${groupInfo}┃
┃ ${bold("Último erro" + (focus?" de ."+focus:""))}:
┃ ${last? `.${last.cmd} → ${last.reason} [${last.time}]` : "nenhum 🎉"}
┃
┃ ${bold("Últimas 8 acções")}:
${recentLogs.split("\n").map(l=>"┃ "+l).join("\n")}
╰━━━━━━━━━━━━━━━━━╯
💡 *.logs* histórico • *.diag <cmd>* filtrar`);
      }
      case "logs": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const n = parseInt(text) || 20;
        const arr = logger.recent(n);
        if (!arr.length) return reply("📭 Sem logs ainda.");
        return reply(`📜 *ÚLTIMOS ${arr.length} LOGS*\n\n` +
          arr.map(l=>`${l.status==="ok"?"✅":l.status==="denied"?"🚫":"❌"} [${l.time.split(", ")[1]||l.time}] .${l.cmd} ${l.user} ${l.reason?"— "+l.reason:""}`).join("\n"));
      }
      case "limparlogs": case "clearlogs": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        logger.logs.length = 0;
        return reply("🧹 Logs limpos.");
      }
      case "audio": case "tts": {
        if (!text) return reply("🔊 Uso: .audio <texto>");
        await react(sock,msg,"🎙️");
        const sent = await media.sendVoice(sock, from, text, { quoted: msg });
        if (!sent) return reply("❌ TTS falhou.");
        return;
      }
      case "gif": {
        if (!text) return reply(`🖼️ Uso: .gif <categoria>\nDisponíveis: ${Object.keys(media.GIF_MAP).join(", ")}`);
        await react(sock,msg,"🎞️");
        const url = await media.fetchGif(text);
        if (!url) return reply("❌ Sem gif.");
        return sock.sendMessage(from, { video:{url}, caption:`🎞️ ${text}`, gifPlayback:true }, { quoted: msg });
      }
      case "status": return reply(`╭━━〔 ${bold("STATUS")} 〕━━╮
┃ ${bold(config.botName)} ${config.version}
┃ 📡 ${config.status}
┃ ⏱️ Uptime: ${uptime(startTime)}
┃ 👑 Dono: ${config.ownerName}
┃ 📦 Comandos: ${menus.totalCmdsCount()}+ (${totalAliases()} aliases)
╰━━━━━━━━━━━━━━━━━╯`);
      case "runtime": return reply(`⏱️ Uptime: *${uptime(startTime)}*`);
      case "speed": {
        const t0 = Date.now(); const s = await reply("⚡ A medir...");
        return sock.sendMessage(from, { text: `⚡ ${Date.now()-t0} ms`, edit: s.key });
      }
      case "owner":
      case "bot":
        await react(sock,msg,"👑");
        return sendButtons(sock, from, msg,
          `╭━━〔 ${bold("INFO")} 〕━━╮\n┃ 🤖 ${bold(config.botName)} ${config.version}\n┃ 👑 Dono: ${config.ownerName}\n┃ 📞 Bot: +${config.botNumber}\n┃ 📡 ${config.status}\n╰━━━━━━━━━━━━━━━━╯`,
          "Toca para conversar com o dono",
          [
            { id: `tel_${config.ownerWa}`, text: `💬 Conversar c/ DONO (${config.ownerWa.slice(-9)})` },
            { id: "menu", text: "📜 Ver menus" },
          ]);

      case "lidme": case "myjid":
        return reply(`🆔 Teu JID: ${mono(sender)}\n📞 Número: +${senderNum}`);
      case "lidgp": case "jidgp":
        if (!isGroup) return reply("⚠️ Só em grupos.");
        return reply(`🆔 JID grupo: ${mono(from)}`);
      case "jid":
        return reply(`🆔 Chat: ${mono(from)}\n👤 Sender: ${mono(sender)}`);

      // ╔═══════════ LOGOS (sem API) ═══════════╗
      case "logo": case "logoneon": return reply(logos.neonLogo(text || "HEXGUARD"));
      case "logofire":  return reply(logos.fireLogo(text || "HEXGUARD"));
      case "logoice":   return reply(logos.iceLogo(text || "HEXGUARD"));
      case "logoshadow":return reply(logos.shadowLogo(text || "HEXGUARD"));
      case "logostyle": return reply(logos.styleLogo(text || "HEXGUARD"));
      case "logobig":   return reply(logos.bigBlock(text || "HEXGUARD"));

      // ╔═══════════ IA ═══════════╗
      case "ia": {
        if (!text) return reply("🤖 Uso: .ia <pergunta>");
        await react(sock,msg,"🧠");
        return reply("🤖 " + await askAI(text));
      }
      case "traduz":    return reply(await askAI(text, "Traduz fielmente. Se não disser idioma, traduz para português."));
      case "resumo":    return reply(await askAI(text, "Resume curto e claro."));
      case "ideia":     return reply(await askAI(text, "Dá 5 ideias criativas."));
      case "corrigir":  return reply(await askAI(text, "Corrige ortografia/gramática."));
      case "explica":   return reply(await askAI(text, "Explica como se eu tivesse 12 anos."));
      case "codigo":    return reply(await askAI(text, "Escreve código limpo em markdown."));
      case "debug":     return reply(await askAI(text, "Identifica bugs e propõe correção."));
      case "regex":     return reply(await askAI(text, "Cria regex e explica."));
      case "sql":       return reply(await askAI(text, "Cria SQL e explica."));
      case "email":     return reply(await askAI(text, "Escreve email profissional."));
      case "carta":     return reply(await askAI(text, "Carta formal."));
      case "poema":     return reply(await askAI(text, "Poema bonito."));
      case "historia":  return reply(await askAI(text, "História envolvente 200-300 palavras."));
      case "piada":     return reply("😂 " + pickRandom(data.piadas));
      case "cantada":   return reply("💘 " + pickRandom(data.cantadas));
      case "meme":      return reply(pickRandom(data.memes));
      case "fato":
      case "curiosidade": return reply(pickRandom(data.random_facts));
      case "conselho":  return reply("🌟 " + pickRandom(data.conselhos));
      case "rima":      return reply(await askAI(text, "10 palavras que rimam."));
      case "letra":     return reply(await askAI(text, "Letra de música original."));
      case "receita":   return reply(await askAI(text, "Receita prática."));
      case "dieta":     return reply(await askAI(text, "Plano alimentar 1 dia."));
      case "treino":    return reply(await askAI(text || "treino full body", "Plano de treino casa."));
      case "motivacao": return reply(await askAI("frase motivacional", "Só a frase."));
      case "frase":     return reply(await askAI("frase do dia", "Frase célebre com autor."));
      case "horoscopo": return reply(await askAI(text, "Horóscopo do dia."));
      case "sonho":     return reply(await askAI(text, "Interpreta sonho."));
      case "bio":       return reply(await askAI(text, "Bio curta para redes."));
      case "nick":      return reply(await askAI(text, "10 nicknames criativos."));
      case "noticia":   return reply(await askAI(text || "tecnologia", "Resume notícia recente."));
      case "definir":   return reply(await askAI(text, "Define como dicionário."));
      case "sinonimo":  return reply(await askAI(text, "10 sinónimos."));
      case "antonimo":  return reply(await askAI(text, "10 antónimos."));
      case "argumento": return reply(await askAI(text, "Tese, prós, contras, conclusão."));
      case "comparar":  return reply(await askAI(text, "Compara em tabela."));

      // ╔═══════════ GRUPO / ADMIN ═══════════╗
      case "grupoinfo": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        return reply(`╭━━〔 ${bold("GRUPO")} 〕━━╮
┃ 📛 ${meta.subject}
┃ 👥 Membros: ${meta.participants.length}
┃ 🆔 ${meta.id}
╰━━━━━━━━━━━━━━━━╯`);
      }
      case "admins": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        const a = meta.participants.filter(p => p.admin).map(p => `• @${p.id.split("@")[0]}`).join("\n");
        return reply(`👑 ADMINS:\n${a}`, { mentions: meta.participants.filter(p=>p.admin).map(p=>p.id) });
      }
      case "listar": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        const list = meta.participants.map((p,i) => `${i+1}. @${p.id.split("@")[0]}`).join("\n");
        return reply(`👥 *Membros:*\n${list}`, { mentions: meta.participants.map(p=>p.id) });
      }
      case "tagall": case "hidetag": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!isAdmin && !isOwner(sender)) return reply("⚔️ Só admins.");
        const mentions = meta.participants.map(p => p.id);
        if (cmd === "hidetag") return sock.sendMessage(from, { text: text || "📢 Atenção!", mentions });
        const list = mentions.map(j => `• @${j.split("@")[0]}`).join("\n");
        return sock.sendMessage(from, { text: `📣 *${text || "TAG ALL"}*\n\n${list}`, mentions });
      }
      case "ban": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!target) return reply("👤 Marca/responde alguém.");
        if (targetIsOwner) { await react(sock,msg,"🛡️"); return reply(`🛡️ ${bold("ANTIBAN DONO")} — não posso banir o meu dono.`); }
        if (!isBotAdmin) return reply("🤖 O bot precisa ser admin.");
        const targetIsAdmin = meta.participants.find(p => p.id === target)?.admin;
        if (targetIsAdmin && !isOwner(sender)) {
          await react(sock,msg,"🛡️");
          return reply(`🛡️ *Antiban Admin*\nApenas o DONO ${config.ownerName} bani admins.`);
        }
        if (!isAdmin && !isOwner(sender)) {
          if (!db.useItem(sender, "ban-token") && !db.useItem(sender, "katana"))
            return reply(`⚔️ Sem permissão.\n💡 Compra *ban-token* ou 🗡️ *katana* na .loja.`);
          await reply(`🎟️ token usado por @${senderNum}`, { mentions:[sender] });
        }
        return tryAdmin(
          () => sock.groupParticipantsUpdate(from, [target], "remove"),
          `🗡️ Banido @${target.split("@")[0]}`
        );
      }
      case "add": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!isAdmin && !isOwner(sender)) return reply("⚔️ Só admins.");
        if (!isBotAdmin) return reply("🤖 Bot tem de ser admin.");
        let num = (text || "").replace(/\D/g, "");
        if (!num) return reply(`📝 .add 8XXXXXXXX | 2588XXXXXXXX | +2588XXXXXXXX`);
        if (num.length === 9 && /^[28]/.test(num)) num = "258" + num; // moçambique sem código
        return tryAdmin(
          () => sock.groupParticipantsUpdate(from, [num + "@s.whatsapp.net"], "add"),
          `✅ Adicionado +${num}`
        );
      }
      case "promover": {
        if (!isGroup||!target) return reply("👤 Marca alguém.");
        if (!isBotAdmin) return reply("🤖 Bot precisa ser admin.");
        if (!isAdmin && !isOwner(sender)) {
          if (!db.useItem(sender,"promote-token")) return reply("⚔️ Só admins ou *promote-token*.");
        }
        return tryAdmin(
          () => sock.groupParticipantsUpdate(from,[target],"promote"),
          `👑 @${target.split("@")[0]} promovido!`
        );
      }
      case "despromover": {
        if (!isGroup||!target) return reply("👤 Marca alguém.");
        if (targetIsOwner) return reply("🛡️ Antiban DONO — não posso despromover o dono.");
        if (!isBotAdmin) return reply("🤖 Bot precisa ser admin.");
        if (!isAdmin && !isOwner(sender)) return reply("⚔️ Só admins.");
        return tryAdmin(
          () => sock.groupParticipantsUpdate(from,[target],"demote"),
          `📉 @${target.split("@")[0]} despromovido!`
        );
      }
      case "silenciar": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!isBotAdmin) return reply("🤖 O bot precisa ser admin para fechar o grupo.");
        if (!isAdmin && !isOwner(sender)) {
          if (!db.useItem(sender,"mute-token")) return reply("⚔️ Só admins ou *mute-token*.");
        }
        return tryAdmin(
          () => sock.groupSettingUpdate(from,"announcement"),
          "🔒 Grupo fechado (só admins falam)."
        );
      }
      case "desmutar": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!isBotAdmin) return reply("🤖 O bot precisa ser admin para abrir o grupo.");
        if (!isAdmin && !isOwner(sender)) {
          if (!db.useItem(sender,"unmute-token")) return reply("⚔️ Só admins ou *unmute-token*.");
        }
        return tryAdmin(
          () => sock.groupSettingUpdate(from,"not_announcement"),
          "🔓 Grupo aberto."
        );
      }
      case "linkgrupo": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!isBotAdmin) return reply("🤖 Bot precisa ser admin.");
        try { const code = await sock.groupInviteCode(from); return reply(`🔗 https://chat.whatsapp.com/${code}`); }
        catch (e) { return reply("❌ "+e.message); }
      }
      case "resetlink": {
        if (!isGroup||(!isAdmin&&!isOwner(sender))) return reply("⚔️ Só admins.");
        if (!isBotAdmin) return reply("🤖 Bot precisa ser admin.");
        return tryAdmin(()=>sock.groupRevokeInviteCode(from), "🔄 Link revogado.");
      }
      case "apagar": case "delete": case "del": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        const ctx2 = msg.message?.extendedTextMessage?.contextInfo;
        if (!ctx2?.stanzaId) return reply("↩️ Responde à mensagem para apagar.");
        if (!isBotAdmin && ctx2.participant !== sender) return reply("🤖 Bot precisa ser admin para apagar de outros.");
        return tryAdmin(
          () => sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: ctx2.stanzaId, participant: ctx2.participant }}),
          "🗑️ Apagada."
        );
      }
      case "adv": case "advertir": {
        if (!isGroup||!target) return reply("👤 Marca alguém.");
        if (!isAdmin && !isOwner(sender)) return reply("⚔️ Só admins.");
        const u = db.getUser(target); u.advs = (u.advs||0) + 1;
        if (u.advs >= 3 && isBotAdmin) {
          await sock.groupParticipantsUpdate(from, [target], "remove").catch(()=>{});
          u.advs = 0;
          return reply(`🚫 @${target.split("@")[0]} 3 advertências → BANIDO.`, { mentions:[target] });
        }
        return reply(`⚠️ @${target.split("@")[0]} advertência ${u.advs}/3.`, { mentions:[target] });
      }
      case "mudarnome": {
        if (!isGroup||(!isAdmin&&!isOwner(sender))) return reply("⚔️ Só admins.");
        return tryAdmin(()=>sock.groupUpdateSubject(from, text), `✅ Nome: ${text}`);
      }
      case "mudardesc": {
        if (!isGroup||(!isAdmin&&!isOwner(sender))) return reply("⚔️ Só admins.");
        return tryAdmin(()=>sock.groupUpdateDescription(from, text), "✅ Descrição alterada.");
      }
      case "banword": {
        if (!isGroup||(!isAdmin&&!isOwner(sender))) return reply("⚔️ Só admins.");
        const g=db.getGroup(from); if(!text) return reply("📝 .banword <palavra>");
        g.palavroes.push(text.toLowerCase()); return reply(`✅ "${text}" adicionada.`);
      }
      case "desbanword": {
        if (!isGroup||(!isAdmin&&!isOwner(sender))) return reply("⚔️ Só admins.");
        const g=db.getGroup(from); g.palavroes=g.palavroes.filter(p=>p!==text.toLowerCase());
        return reply(`✅ "${text}" removida.`);
      }
      case "limpar": {
        const blank = "ㅤ\n".repeat(60);
        return reply(`🧹 *Limpeza visual...*\n${blank}\n✅ Limpo.`);
      }

      // ═══════ ANTIS toggle ═══════
      case "antilink": case "antifoto": case "antivideo": case "antisticker":
      case "antistatus": case "antipv": case "antifake": case "antipalavrao":
      case "antispam": case "antiaudio": case "welcome": case "goodbye": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!isAdmin && !isOwner(sender)) return reply("⚔️ Só admins.");
        const g = db.getGroup(from);
        const v = (text || "").toLowerCase();
        if (v !== "on" && v !== "off") return reply(`📝 .${cmd} on/off — atual: ${g[cmd] ? "🟢 ON":"🔴 OFF"}`);
        g[cmd] = v === "on";
        return reply(`${g[cmd]?"🟢":"🔴"} *${cmd}* agora: ${v.toUpperCase()}`);
      }
      case "setwelcome": {
        if (!isGroup||(!isAdmin&&!isOwner(sender))) return reply("⚔️ Só admins.");
        db.getGroup(from).welcomeMsg = text; return reply("✅ Welcome msg actualizada.");
      }
      case "setgoodbye": {
        if (!isGroup||(!isAdmin&&!isOwner(sender))) return reply("⚔️ Só admins.");
        db.getGroup(from).goodbyeMsg = text; return reply("✅ Goodbye msg actualizada.");
      }

      // ╔═══════════ UTILIDADES ═══════════╗
      case "horas": return reply(`🕒 ${now()}`);
      case "data":  return reply(`📅 ${now().split(" ")[0]}`);
      case "calc": {
        try { return reply(`🧮 ${text} = *${Function('"use strict";return ('+text+')')()}*`); }
        catch { return reply("❌ Expressão inválida."); }
      }
      case "qr": return reply(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`);
      case "encurtar": {
        try { const r = await axios.get("https://tinyurl.com/api-create.php?url=" + encodeURIComponent(text)); return reply(`🔗 ${r.data}`); }
        catch { return reply("❌ Erro encurtar."); }
      }
      case "ip": {
        try { const r = await axios.get(`http://ip-api.com/json/${text}`); return reply("🌍\n" + JSON.stringify(r.data,null,2)); }
        catch { return reply("❌"); }
      }
      case "github": {
        try { const r = await axios.get(`https://api.github.com/users/${text}`);
          return reply(`👨‍💻 ${r.data.name}\nRepos: ${r.data.public_repos}\nFollowers: ${r.data.followers}\n${r.data.html_url}`);
        } catch { return reply("❌ Não encontrado."); }
      }
      case "binario": return reply([...text].map(c=>c.charCodeAt(0).toString(2).padStart(8,"0")).join(" "));
      case "morse": {
        const M={A:".-",B:"-...",C:"-.-.",D:"-..",E:".",F:"..-.",G:"--.",H:"....",I:"..",J:".---",K:"-.-",L:".-..",M:"--",N:"-.",O:"---",P:".--.",Q:"--.-",R:".-.",S:"...",T:"-",U:"..-",V:"...-",W:".--",X:"-..-",Y:"-.--",Z:"--..",0:"-----",1:".----",2:"..---",3:"...--",4:"....-",5:".....",6:"-....",7:"--...",8:"---..",9:"----."};
        return reply([...text.toUpperCase()].map(c=>M[c]||c).join(" "));
      }
      case "base64":   return reply(Buffer.from(text).toString("base64"));
      case "debase64": return reply(Buffer.from(text,"base64").toString("utf-8"));
      case "uuid":     return reply(require("crypto").randomUUID());
      case "random": { const [a,b]=text.split(" ").map(Number); return reply("🎲 " + rand(a||1,b||100)); }
      case "senha": {
        const n = parseInt(text)||12;
        const s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
        let p=""; for (let i=0;i<n;i++) p+=s[rand(0,s.length-1)];
        return reply("🔐 " + p);
      }
      case "reverse": return reply(text.split("").reverse().join(""));
      case "wiki": {
        try { const r=await axios.get(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`);
          return reply(`📚 *${r.data.title}*\n${r.data.extract}`);
        } catch { return reply("❌ Não encontrado."); }
      }

      // Sticker removido no V7-MD (a pedido do dono)


      // ╔═══════════ ECONOMIA ═══════════╗
      case "saldo": return reply(`💵 Saldo: *${fmtNum(user.saldo)}*`);
      // (case "perfil" tratado abaixo na versão V7-MD completa)

      case "top": {
        const arr = Object.values(db.users).sort((a,b)=>b.saldo-a.saldo).slice(0,10);
        return reply("🏆 *TOP SALDO*\n"+arr.map((u,i)=>`${i+1}. ${u.name||u.jid.split("@")[0]} — ${fmtNum(u.saldo)}💵`).join("\n"));
      }
      case "topxp": case "toplevel": {
        const arr = Object.values(db.users).sort((a,b)=>b.level-a.level||b.xp-a.xp).slice(0,10);
        return reply("⭐ *TOP NÍVEL*\n"+arr.map((u,i)=>`${i+1}. ${u.name||u.jid.split("@")[0]} — Lvl ${u.level}`).join("\n"));
      }
      case "daily": {
        const cd = 24*3600*1000;
        if (Date.now()-user.lastDaily < cd) return reply(`⏳ Faltam ${Math.ceil((cd-(Date.now()-user.lastDaily))/3600000)}h`);
        let v = config.dailyReward;
        if (db.isVip(sender)||db.isPremium(sender)) v *= 2;
        db.addSaldo(sender, v); user.lastDaily = Date.now();
        return reply(`╭━━〔 🎁 ${bold("DAILY")} 〕━━╮\n┃ +${fmtNum(v)} 💵\n┃ Volta em 24h\n╰━━━━━━━━━━━━━━━╯`);
      }
      case "trabalhar": {
        const cd = 30*60*1000;
        if (Date.now()-user.lastWork < cd) return reply(`⏳ Espera ${Math.ceil((cd-(Date.now()-user.lastWork))/60000)}min`);
        const v = rand(config.workMin,config.workMax); db.addSaldo(sender,v); user.lastWork=Date.now();
        return reply(`💼 Ganhaste ${fmtNum(v)}💵`);
      }
      case "crime": {
        const cd = 60*60*1000;
        if (Date.now()-user.lastCrime<cd) return reply(`⏳ ${Math.ceil((cd-(Date.now()-user.lastCrime))/60000)}min`);
        user.lastCrime=Date.now();
        if (Math.random()<0.5) { const v=rand(500,3000); db.addSaldo(sender,v); return reply(`🦹 Crime sucedido! +${v}💵`); }
        const v=rand(200,1200); db.addSaldo(sender,-v); return reply(`👮 Apanhado! -${v}💵`);
      }
      case "roubar": {
        if (!target) return reply("👤 Marca alguém.");
        const t = db.getUser(target);
        if (t.shield) { t.shield=false; return reply("🛡️ Vítima tinha shield!"); }
        const v = Math.floor(t.saldo*0.1);
        if (v<10) return reply("😅 Pobre demais.");
        t.saldo-=v; user.saldo+=v;
        return reply(`💰 Roubaste ${v}💵 de @${target.split("@")[0]}`,{mentions:[target]});
      }
      case "loja": {
        const list = Object.entries(config.shop).map(([k,v])=>`• *${k}* — ${fmtNum(v.preco)}💵\n   ${v.desc}`).join("\n");
        return reply(`╭━━〔 🛒 ${bold("LOJA")} 〕━━╮\n${list}\n╰━━━━━━━━━━━━━━━━━╯\nUso: ${config.prefix}comprar <item>`);
      }
      case "comprar": {
        const it = config.shop[text]; if (!it) return reply("❌ Item inexistente. Vê *.loja*");
        if (user.saldo < it.preco) return reply(`💸 Sem saldo. Precisas ${fmtNum(it.preco-user.saldo)}💵 a mais.`);
        user.saldo -= it.preco;
        if (text==="vip") { db.setVip(sender,30); return reply("✨ VIP por 30 dias!"); }
        if (text==="premium") { db.setPremium(sender,30); return reply("💎 PREMIUM por 30 dias!"); }
        db.addItem(sender,text,it.usos);
        return reply(`✅ Compraste *${text}* por ${fmtNum(it.preco)}💵\n🎒 Vê em ${config.prefix}items`);
      }
      case "items": {
        const it = Object.entries(user.items);
        if (!it.length) return reply("🎒 Vazio.");
        return reply("🎒 *Inventário:*\n"+it.map(([k,v])=>`• ${k}: ${v}`).join("\n"));
      }
      case "usar": {
        if (!db.useItem(sender, text)) return reply("❌ Não tens esse item.");
        if (text==="xp-boost") user.boostXpUntil = Date.now()+3600000;
        if (text==="saldo-boost") user.boostMoneyUntil = Date.now()+86400000;
        if (text==="shield") user.shield = true;
        if (text==="rank-up") { user.level++; }
        if (text==="loot-box") { const v=rand(1000,5000); db.addSaldo(sender,v); return reply(`🎁 Loot: ${v}💵`); }
        if (text==="elite-loot"){ const v=rand(5000,15000); db.addSaldo(sender,v); return reply(`💎 Elite: ${v}💵`); }
        if (text==="mega-loot") { const v=rand(15000,50000); db.addSaldo(sender,v); return reply(`🏆 Mega: ${v}💵`); }
        if (text==="lottery-ticket") { const w = Math.random()<0.05; if(w){db.addSaldo(sender,50000); return reply("🎟️ JACKPOT 50000💵!");} return reply("🎟️ Não foi desta."); }
        if (text==="scratch-card") { const v=[0,0,0,500,1000,5000][rand(0,5)]; db.addSaldo(sender,v); return reply(`🎫 Raspaste: ${v}💵`); }
        if (text==="magic-wand") { user.lastDaily=0; user.lastWork=0; user.lastCrime=0; return reply("✨ Cooldowns resetados!"); }
        return reply(`✅ Usaste *${text}*`);
      }
      case "pay": {
        if (!target) return reply("👤 Marca alguém.");
        const v = parseInt(text.split(" ").pop()); if (!v||v<1) return reply("💵 Valor inválido.");
        if (user.saldo<v) return reply("💸 Sem saldo.");
        db.addSaldo(sender,-v); db.addSaldo(target,v);
        return reply(`💸 ${v}💵 → @${target.split("@")[0]}`,{mentions:[target]});
      }
      case "trocar": {
        const v=parseInt(text)||100;
        if (user.xp<v) return reply("⭐ XP insuficiente.");
        user.xp-=v; db.addSaldo(sender,v*2);
        return reply(`🔁 ${v}xp → ${v*2}💵`);
      }
      case "banco": return reply(`🏦 Saldo: ${fmtNum(user.saldo)}\n⭐ XP: ${fmtNum(user.xp)}\n🏆 Pontos: ${fmtNum(user.pontos)}`);

      // ╔═══════════ JOGOS ═══════════╗
      case "ppt": {
        const op=["pedra","papel","tesoura"]; const u=text.toLowerCase(); const b=pickRandom(op);
        if (!op.includes(u)) return reply("✊✋✌️ .ppt pedra/papel/tesoura");
        const win = (u==="pedra"&&b==="tesoura")||(u==="papel"&&b==="pedra")||(u==="tesoura"&&b==="papel");
        const tie = u===b;
        if (win) db.addSaldo(sender, 200);
        return reply(`🤖 ${b}\n${tie?"🤝 Empate":win?`🎉 Ganhaste! +200💵`:"😅 Perdeste!"}`);
      }
      case "cc": case "caracoroa": {
        const u = text.toLowerCase(); const r = Math.random()<0.5?"cara":"coroa";
        if (!["cara","coroa"].includes(u)) return reply("🪙 .cc cara/coroa");
        if (u===r) { db.addSaldo(sender,150); return reply(`🪙 ${r} — Ganhaste! +150💵`); }
        return reply(`🪙 ${r} — Perdeste!`);
      }
      case "dado":     return reply(`🎲 ${rand(1,6)}`);
      case "moeda":    return reply(Math.random()<0.5?"🪙 Cara":"🪙 Coroa");
      case "sorte":    return reply(`🍀 ${rand(0,100)}% sorte hoje`);
      case "numero":   return reply(`🔢 ${rand(0,parseInt(text)||100)}`);
      case "roleta":   { const v=parseInt(text)||100; if(user.saldo<v) return reply("💸 Sem saldo."); const w=Math.random()<0.45; if(w){db.addSaldo(sender,v);return reply(`🎰 +${v}💵`);} db.addSaldo(sender,-v); return reply(`💸 -${v}💵`); }
      case "cacaniquel": {
        const s=["🍒","🍋","🍇","🔔","💎","7️⃣"];
        const r=[pickRandom(s),pickRandom(s),pickRandom(s)];
        const win=r[0]===r[1]&&r[1]===r[2];
        const v=parseInt(text)||100;
        if(user.saldo<v) return reply("💸 Sem saldo.");
        if (win){db.addSaldo(sender,v*5);return reply(`🎰 ${r.join("|")} JACKPOT! +${v*5}💵`);}
        db.addSaldo(sender,-v); return reply(`🎰 ${r.join("|")} -${v}💵`);
      }
      case "8ball": case "oitobola":
        return reply(`🎱 ${pickRandom(data.bola8)}`);
      case "russa": return reply(rand(1,6)===1?"💀 BANG! Morreste":"🔫 Click... safo!");
      case "loteria": return reply(`🎟️ Nº: ${rand(0,9)}${rand(0,9)}${rand(0,9)}${rand(0,9)}`);
      case "advinhanum": case "advinha": {
        const n = rand(1,10); return reply(`🤔 Pensei em 1-10. Era *${n}*.`);
      }
      case "maiormenor": { const a=rand(1,100),b=rand(1,100); return reply(`A=${a} B=${b} → ${a>b?"A":"B"} maior`); }
      case "parimpar": { const n=rand(1,100); return reply(`${n} é ${n%2?"ímpar":"par"}`); }
      case "duelo": {
        if (!target) return reply("⚔️ Marca alguém.");
        const w = Math.random()<0.5?sender:target;
        db.addSaldo(w, 300);
        return reply(`⚔️ Duelo!\n🏆 Vencedor: @${w.split("@")[0]} +300💵`,{mentions:[sender,target]});
      }
      case "quiz": case "trivia": {
        const q = pickRandom(data.quizzes);
        user.pendingQuiz = q;
        return reply(`🧠 *QUIZ*\n${q.q}\n\nResponde com .resp <texto>`);
      }
      case "resp": case "resposta": {
        if (!user.pendingQuiz) return reply("❓ Sem quiz ativo. Usa .quiz");
        const ok = text.toLowerCase().trim() === user.pendingQuiz.a;
        const ans = user.pendingQuiz.a;
        delete user.pendingQuiz;
        if (ok) { db.addSaldo(sender,500); return reply(`✅ Certo! +500💵`); }
        return reply(`❌ Errado. Era: ${ans}`);
      }
      case "forca": return reply("🪢 Forca em desenvolvimento — usa .quiz por agora.");
      case "blackjack": case "bj": {
        const c = () => rand(1,11);
        const u1=c(),u2=c(),b1=c(),b2=c();
        const us=u1+u2, bs=b1+b2;
        const win = us<=21 && (us>bs || bs>21);
        if (win) db.addSaldo(sender,400);
        return reply(`🃏 *BLACKJACK*\nTu: ${u1}+${u2}=${us}\nBot: ${b1}+${b2}=${bs}\n${win?"🎉 +400💵":"😅 Perdeste"}`);
      }
      case "pokemon":  return reply(`🐾 ${pickRandom(["Pikachu","Charmander","Bulbasaur","Squirtle","Eevee","Mewtwo","Snorlax","Gengar","Lucario","Dragonite"])}`);
      case "gato":     try { return reply((await axios.get("https://api.thecatapi.com/v1/images/search")).data[0].url); } catch { return reply("🐱"); }
      case "cachorro": try { return reply((await axios.get("https://dog.ceo/api/breeds/image/random")).data.message); } catch { return reply("🐶"); }

      // ─── JdV / Tic-Tac-Toe (vs bot por defeito + tutorial) ───
      case "jdv": case "velha": {
        // Se sem target → contra bot direto + tutorial
        if (!target) {
          const g = jdv.start(from, sender, "bot", true);
          return reply(
`╭━━〔 🎮 ${bold("JOGO DA VELHA — vs BOT")} 〕━━╮
┃ ${bold("Tutorial")}:
┃ 1) Escolhe um número da casa (1-9):
┃    1 ┃ 2 ┃ 3
┃    4 ┃ 5 ┃ 6
┃    7 ┃ 8 ┃ 9
┃ 2) Joga com: ${config.prefix}jdvjogar <n°>
┃ 3) Tu = ❌  Bot = ⭕
┃ 4) Vencedor leva +${config.jdvWinReward}💵
┃ 5) Para terminar: ${config.prefix}jdvfim
╰━━━━━━━━━━━━━━━━━━━━━╯

${jdv.render(g.board)}

Vez de ❌ (TU). Joga: ${config.prefix}jdvjogar 1-9`
          );
        }
        const g = jdv.start(from, sender, target, false);
        return sock.sendMessage(from,{text:`🎮 *JOGO DA VELHA*\n@${senderNum}(❌) vs @${target.split("@")[0]}(⭕)\n\n${jdv.render(g.board)}\n\nVez de @${senderNum}\nUsa ${config.prefix}jdvjogar 1-9`,mentions:[sender,target]});
      }
      case "jdvbot": case "velhabot": {
        const g = jdv.start(from, sender, "bot", true);
        return reply(`🎮 *JOGO DA VELHA vs BOT*\nTu(❌) vs 🤖(⭕)\n\n${jdv.render(g.board)}\n\nUsa ${config.prefix}jdvjogar 1-9`);
      }
      case "jdvjogar": {
        const pos = parseInt(text);
        const r = jdv.play(from, sender, pos);
        if (r.err) return reply("❌ " + r.err);
        let msg2 = r.board;
        if (r.winner) {
          if (r.winner==="E") msg2 += "\n🤝 Empate!";
          else { db.addSaldo(sender, config.jdvWinReward); msg2 += `\n🏆 Vitória de ${r.winner}! +${config.jdvWinReward}💵`; }
        } else if (r.botPlayed) {
          msg2 += `\n🤖 Bot jogou ${r.botPlayed}. Tua vez.`;
        } else {
          msg2 += `\nVez de ${r.turn}`;
        }
        return reply(msg2);
      }
      case "jdvfim": case "resetjogo": jdv.end(from); return reply("🛑 Jogo terminado.");

      // ╔═══════════ AÇÕES ═══════════╗
      case "abraco": case "beijo": case "tapa": case "soco": case "mata": case "matar":
      case "morder": case "comer": case "afagar": case "cutucar": case "acenar": case "highfive": case "cuddle":
      case "reza":   case "casar": case "ship": case "amizade": case "odio": case "iq":
      case "gay": case "burro": case "lindo": case "feio": case "gostosa": case "fofoqueiro":
      {
        const emo = { abraco:"🤗",beijo:"💋",tapa:"👋",soco:"👊",mata:"💀",matar:"💀",morder:"😬",
                      comer:"🍴",afagar:"🥰",cutucar:"👉",acenar:"👋",highfive:"🙌",cuddle:"🤗",
                      reza:"🙏",casar:"💍",ship:"💕",amizade:"🤝",odio:"💢",iq:"🧠",
                      gay:"🏳️‍🌈",burro:"🤡",lindo:"😍",feio:"🥴",gostosa:"🔥",fofoqueiro:"🗣️" }[cmd];
        if (!target) return reply(`${emo} Marca alguém! Ex: ${config.prefix}${cmd} @user`);
        // Percentuais (sem gif)
        if (["iq","amizade","odio","ship","burro","lindo","feio","gostosa"].includes(cmd))
          return reply(`${emo} ${cmd.toUpperCase()}: *${rand(0,100)}%*\n@${senderNum} → @${target.split("@")[0]}`,{mentions:[sender,target]});
        // 📝 Texto romântico/bonito por ação
        const tnum = target.split("@")[0];
        const FRASES = {
          abraco: [`🤗 @${senderNum} deu um abraço apaixonante em @${tnum} — o tempo parou por um instante 💞`,
                   `🤗 @${senderNum} envolveu @${tnum} num abraço quentinho que aqueceu até a alma 🌹`,
                   `🤗 Olha só! @${senderNum} agarrou @${tnum} como se nunca quisesse soltar 💫`],
          beijo:  [`💋 @${senderNum} deu um beijo em @${tnum} — alguém ficou com ciúmes 😳`,
                   `💋 Beijo de cinema! @${senderNum} surpreendeu @${tnum} e o grupo todo ficou em silêncio 🎬`,
                   `💋 @${senderNum} encheu @${tnum} de beijos — o amor está no ar 💕`],
          tapa:   [`👋 PÁ! @${senderNum} deu um tapa estaladiço em @${tnum} 🌪️`,
                   `👋 @${senderNum} estalou a cara de @${tnum} — doeu até em mim 😬`],
          soco:   [`👊 BAM! @${senderNum} acertou um soco em @${tnum} — KO 💥`,
                   `👊 @${senderNum} mandou @${tnum} para o chão com um golpe de mestre 🥊`],
          mata:   [`💀 @${senderNum} acabou com @${tnum} — RIP 🪦`,
                   `💀 @${senderNum} mandou @${tnum} para o além — F no chat ⚰️`],
          matar:  [`💀 @${senderNum} eliminou @${tnum} com um golpe lendário ⚔️`],
          morder: [`😬 @${senderNum} mordeu @${tnum} — vampiro detectado! 🧛`],
          comer:  [`🍴 @${senderNum} devorou @${tnum} num banquete — alguém estava com fome 😋`,
                   `🍴 @${senderNum} serviu @${tnum} ao prato — bom apetite! 🍽️`],
          afagar: [`🥰 @${senderNum} fez um carinho ternurento em @${tnum} 💕`],
          cutucar:[`👉 @${senderNum} cutucou @${tnum} — tá querendo atenção né? 😏`],
          acenar: [`👋 @${senderNum} acena para @${tnum} de longe — saudades já? 💫`],
          highfive:[`🙌 @${senderNum} e @${tnum} fecharam um high-five épico ⚡`],
          cuddle: [`🤗 @${senderNum} aconchegou @${tnum} num cafuné cinematográfico 💖`],
          reza:   [`🙏 @${senderNum} está a rezar pela alma de @${tnum} 🕯️`],
          casar:  [`💍 @${senderNum} pediu @${tnum} em casamento — alguém disse SIM! 💒`],
          gay:    [`🏳️‍🌈 @${tnum} foi detectado(a) ${rand(0,100)}% LGBTQIA+ pelo gay-meter 📡`],
          fofoqueiro:[`🗣️ @${tnum} foi flagrado(a) espalhando fofoca pelo grupo 👀`],
        };
        const arr = FRASES[cmd] || [`${emo} @${senderNum} ${cmd} @${tnum}`];
        const cap = pickRandom(arr);
        if (config.enableGifs && media.GIF_MAP[cmd]) {
          await react(sock,msg,emo);
          return media.sendActionGif(sock, from, cmd, cap, [sender,target], msg);
        }
        return reply(cap,{mentions:[sender,target]});
      }

      case "chorar": case "rir": case "dancar": case "dormir": case "blush": case "sorrir": {
        const emo = {chorar:"😭",rir:"🤣",dancar:"💃",dormir:"😴",blush:"☺️",sorrir:"😊"}[cmd];
        const cap = `${emo} @${senderNum}`;
        if (config.enableGifs && media.GIF_MAP[cmd]) {
          return media.sendActionGif(sock, from, cmd, cap, [sender], msg);
        }
        return reply(cap,{mentions:[sender]});
      }
      case "divorciar": user.married=null; return reply("💔 Divórcio concluído.");


      // ╔═══════════ DOWNLOAD ═══════════╗
      // (case "play"/"playvid"/"tiktok" tratado abaixo na versão V7-MD)

      case "ig": case "fb":
        return reply(`📥 ${cmd.toUpperCase()}: API pode falhar. Tenta:\nhttps://snapsave.app/?url=${encodeURIComponent(text)}`);
      case "imgsearch": case "img":
        return reply(`🖼️ https://www.google.com/search?tbm=isch&q=${encodeURIComponent(text)}`);
      case "lyrics":
        return reply(await askAI(text,"Letra completa da música."));

      // ╔═══════════ VIP ═══════════╗
      case "vipinfo": {
        const t = db.global.vip[sender];
        return reply(`✨ *VIP*\n${db.isVip(sender)?`🟢 Até ${new Date(t).toLocaleString("pt-PT")}`:"🔴 Inativo"}\nCompra: ${config.prefix}comprarvip`);
      }
      case "comprarvip": {
        if (user.saldo<config.shop.vip.preco) return reply("💸 Sem saldo.");
        user.saldo-=config.shop.vip.preco; db.setVip(sender,30);
        return reply("✨ VIP por 30 dias!");
      }
      case "ia2": case "megaia":
        if (!db.isVip(sender)&&!db.isPremium(sender)&&!isOwner(sender)) return reply("✨ Só VIP+");
        return reply("✨ " + await askAI(text,"Resposta detalhada e profunda."));
      case "ttsvip": return reply("🎙️ TTS em desenvolvimento.");
      case "stickervip": return reply("✨ Sticker VIP em desenvolvimento.");

      // ╔═══════════ PREMIUM ═══════════╗
      case "premiuminfo": {
        const t=db.global.premium[sender];
        return reply(`💎 *PREMIUM*\n${db.isPremium(sender)?`🟢 Até ${new Date(t).toLocaleString("pt-PT")}`:"🔴 Inativo"}`);
      }
      case "comprarpremium": {
        if (user.saldo<config.shop.premium.preco) return reply("💸 Sem saldo.");
        user.saldo-=config.shop.premium.preco; db.setPremium(sender,30);
        return reply("💎 PREMIUM por 30 dias!");
      }
      case "unlimitia":
        if (!db.isPremium(sender)&&!isOwner(sender)) return reply("💎 Só PREMIUM.");
        return reply("💎 " + await askAI(text,"Resposta sem limites."));

      // ╔═══════════ DONO ═══════════╗
      case "on": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        db.global.botOn = true; return reply("🟢 Bot ON.");
      }
      case "off": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        db.global.botOn = false; return reply("🔴 Bot OFF (só responde a .on do dono).");
      }
      case "typing": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const v = (text || "").toLowerCase();
        if (v!=="on"&&v!=="off") return reply(`📝 .typing on/off — atual: ${db.global.typingEffect?"🟢":"🔴"}`);
        db.global.typingEffect = v==="on"; return reply(`${v==="on"?"🟢":"🔴"} Efeito digitando.`);
      }
      case "join": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const code = (text.match(/chat\.whatsapp\.com\/([\w-]+)/)||[])[1];
        if (!code) return reply("📝 .join <link grupo>");
        try { await sock.groupAcceptInvite(code); return reply("✅ Entrei!"); }
        catch (e) { return reply("❌ "+e.message); }
      }
      case "sairgrupo": case "leave": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!isGroup) return reply("⚠️ Só em grupos.");
        await reply(`╭━━〔 👋 ${bold("ATÉ SEMPRE")} 〕━━╮\n┃ ${config.botName} a sair...\n╰━━━━━━━━━━━━━━━━━╯`);
        return sock.groupLeave(from);
      }
      case "autosair": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!isGroup) return reply("⚠️ Só em grupos.");
        // .autosair 60 (segundos) ou .autosair 5m
        let n = parseInt(text); const unit = (text.match(/[smh]/i)||["s"])[0].toLowerCase();
        if (!n || n<1) return reply("📝 .autosair <segundos|m|h>  Ex: .autosair 60 ou .autosair 5m");
        const mult = unit==="h"?3600000:unit==="m"?60000:1000;
        db.global.autoSair[from] = Date.now() + n*mult;
        return reply(`⏳ Vou sair em ${n}${unit} com mensagem de despedida.`);
      }
      case "broadcast": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const chats = Array.from(new Set([...Object.keys(db.groups), ...Object.keys(db.users)]));
        let n=0;
        for (const c of chats) {
          try { await sock.sendMessage(c,{text:`📢 *BROADCAST*\n\n${text}`}); n++; await new Promise(r=>setTimeout(r,500)); } catch {}
        }
        return reply(`📡 Enviado para ${n} chats.`);
      }
      case "setbotname": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        await sock.updateProfileName(text); return reply(`✅ Nome do bot: ${text}`);
      }
      // (case "modo" tratado abaixo na versão V7-MD completa)

      case "resetdb": case "limpezahd": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        db.resetAll(); return reply("🧨 *LIMPEZA HD*: base de dados zerada.");
      }
      case "addsaldo": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!target) return reply("👤 Marca.");
        const v=parseInt(text.split(" ").pop())||0; db.addSaldo(target,v);
        return reply(`✅ +${v}💵 a @${target.split("@")[0]}`,{mentions:[target]});
      }
      case "remsaldo": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!target) return reply("👤 Marca.");
        const v=parseInt(text.split(" ").pop())||0; db.addSaldo(target,-v);
        return reply(`✅ -${v}💵`);
      }
      case "addxp": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!target) return reply("👤 Marca.");
        const v=parseInt(text.split(" ").pop())||0; db.addXP(target,v);
        return reply(`✅ +${v}xp`);
      }
      case "banuser": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!target) return reply("👤 Marca.");
        if (isOwner(target)) return reply("🛡️ Não posso banir outro DONO.");
        if (!db.global.banned.includes(target)) db.global.banned.push(target);
        return reply("🚫 Banido globalmente.");
      }
      case "desbanuser": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        db.global.banned = db.global.banned.filter(j=>j!==target);
        return reply("✅ Desbanido.");
      }
      case "setvip": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const days = parseInt(text.split(" ").pop()) || 30;
        const tgt = target || sender;
        db.setVip(tgt, days);
        return reply(`✨ VIP a @${tgt.split("@")[0]} por ${days} dias`,{mentions:[tgt]});
      }
      case "unvip": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const tgt = target || sender;
        db.unsetVip(tgt); return reply(`✅ VIP removido a @${tgt.split("@")[0]}`,{mentions:[tgt]});
      }
      case "setpremium": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const days = parseInt(text.split(" ").pop())||30;
        const tgt = target || sender;
        db.setPremium(tgt, days);
        return reply(`💎 PREMIUM a @${tgt.split("@")[0]} por ${days} dias`,{mentions:[tgt]});
      }
      case "unpremium": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const tgt = target || sender;
        db.unsetPremium(tgt); return reply(`✅ PREMIUM removido a @${tgt.split("@")[0]}`,{mentions:[tgt]});
      }
      case "listgrupos": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const all = await sock.groupFetchAllParticipating();
        const list = Object.values(all).map((g,i)=>`${i+1}. ${g.subject} (${g.participants.length})`).join("\n");
        return reply("📋 *GRUPOS*\n"+list);
      }
      case "reiniciar": case "restart": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        await reply("🔄 Reiniciando...");
        process.exit(0);
      }
      case "exec": case "eval": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        try { let r=await eval("(async()=>{"+text+"})()"); return reply("> "+String(r)); }
        catch (e) { return reply("❌ "+e.message); }
      }
      case "addcomando": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const [name,...rest] = text.split(" ");
        if (!name||!rest.length) return reply("📝 .addcomando <nome> <resposta>");
        db.addCmd(name, rest.join(" "));
        return reply(`✅ Comando *${name}* criado.`);
      }
      case "delcomando": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        db.delCmd(text); return reply(`✅ Comando *${text}* removido.`);
      }

      // ╔═══════════ NOVOS DONO V3 ═══════════╗
      case "donobiz": case "donoinfo": {
        return reply(`╭━━〔 👑 ${bold("DONO HEXGUARD V3")} 〕━━╮
┃ Nome: ${config.ownerName}
┃ Número: wa.me/${config.ownerWa}
┃ Bot: ${config.botName} ${config.version}
┃ Status: ${config.status}
╰━━━━━━━━━━━━━━━━━━╯`);
      }
      case "setstatus": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        try { await sock.updateProfileStatus(text); return reply("✅ Status atualizado."); }
        catch (e) { return reply("❌ "+e.message); }
      }
      case "setpp": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const im = q?.imageMessage || m.imageMessage;
        if (!im) return reply("📸 Responde a uma imagem.");
        try {
          const buf = await sock.downloadMediaMessage({ key: msg.key, message: q ? { imageMessage: q.imageMessage } : m });
          await sock.updateProfilePicture(sock.user.id, buf);
          return reply("✅ PP do bot atualizada.");
        } catch (e) { return reply("❌ "+e.message); }
      }
      case "block": case "bloquear": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!target) return reply("👤 Marca.");
        if (isOwner(target)) return reply("🛡️ Antiban DONO.");
        try { await sock.updateBlockStatus(target, "block"); return reply("🚫 Bloqueado."); }
        catch (e) { return reply("❌ "+e.message); }
      }
      case "unblock": case "desbloquear": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!target) return reply("👤 Marca.");
        try { await sock.updateBlockStatus(target, "unblock"); return reply("✅ Desbloqueado."); }
        catch (e) { return reply("❌ "+e.message); }
      }
      case "donogp": case "donoadd": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!isBotAdmin) return reply("🤖 Bot precisa ser admin.");
        const meId = sock.user.id;
        return tryAdmin(()=>sock.groupParticipantsUpdate(from,[config.owner[0]+"@s.whatsapp.net"],"add"), `✅ Dono adicionado.`);
      }
      case "shizuko": case "apistatus": {
        return reply(`╭━━〔 🌐 ${bold("SHIZUKO API")} 〕━━╮
┃ Habilitada: ${config.api?.enabled?"🟢":"🔴"}
┃ URL: ${config.api?.apiUrl || "-"}
┃ Key: ${config.api?.apiKey ? "✅ definida" : "❌"}
┃ Timeout: ${config.api?.timeout || "-"}ms
┃ Retries: ${config.api?.maxRetries || "-"}
┃ Endpoints: ${Object.keys(config.api?.endpoints||{}).join(", ")}
╰━━━━━━━━━━━━━━━━━╯
💡 Editar em bot/api.json`);
      }

      // ════════ V4 — NOVOS COMANDOS ════════
      case "help": {
        await react(sock,msg,"❓");
        const what = (text || "").toLowerCase().trim();
        if (!what) return reply(`╭━━〔 ❓ ${bold("HELP")} 〕━━╮\n┃ Usa: *${config.prefix}help <comando>*\n┃ Ex: *${config.prefix}help play*\n┃ Lista total: *${config.prefix}menu*\n╰━━━━━━━━━━━━━━━━╯`);
        const h = help[what] || help[resolve(what)];
        if (!h) return reply(`❌ Sem help para *${what}*. Tenta *${config.prefix}menu*.`);
        return reply(`╭━━〔 📖 ${bold("HELP — " + what.toUpperCase())} 〕━━╮\n┃ 📝 ${h.desc}\n┃ 💡 Uso: ${mono(h.use)}\n┃ ${config.botName} ${config.version}\n╰━━━━━━━━━━━━━━━━━╯`);
      }

      case "dono": {
        await react(sock,msg,"👑");
        const cap = `╭━━━━━〔 👑 ${bold("DONO")} 〕━━━━━╮
┃ 🌐 ${config.site}
┃ 💀 ${config.tagline}
┃
┃ 👤 Nome: ${config.ownerName}
┃ 📲 WhatsApp: wa.me/${config.ownerWa}
┃ 📝 ${config.ownerBio}
┃
┃ 🤖 Bot: ${config.botName} ${config.version}
┃ 📞 Bot WA: +${config.botNumber}
╰━━━━━━━━━━━━━━━━━━━━━╯`;
        return reply(cap);
      }

      case "perfil": {
        await react(sock,msg,"🪪");
        const u = db.getUser(sender);
        let img = null;
        try { img = await sock.profilePictureUrl(sender, "image"); } catch {}
        const cap = `╭━━〔 🪪 ${bold("PERFIL")} 〕━━╮
┃ 👤 ${u.name || senderNum}
┃ 🏷️ ${badge(sender, db)}
┃ 💵 Saldo: ${fmtNum(u.saldo)} $UST
┃ 📊 Lvl ${u.level} • ⭐ ${fmtNum(u.xp)} xp
┃ 🏆 Pontos: ${fmtNum(u.pontos)}
┃ 📨 Msgs: ${fmtNum(u.msgCount)}
┃ ⚙️ Cmds: ${fmtNum(u.cmdCount || 0)}
┃ 🎒 Items: ${Object.keys(u.items).length}
┃ ⚠️ Adv: ${u.adv || 0}
╰━━━━━━━━━━━━━━━━━╯`;
        if (img) return sock.sendMessage(from, { image: { url: img }, caption: cap }, { quoted: msg });
        return reply(cap);
      }

      case "modo": {
        if (!isOwner(sender)) return reply("👑 Apenas o DONO.");
        const m = (text || "").toLowerCase().trim();
        const allowed = ["publico","privado","aluguel","parceria","listanegra"];
        if (!allowed.includes(m)) return reply(`Modos: ${allowed.join(" | ")}`);
        db.global.mode = m;
        return reply(`✅ Modo definido: *${m}*`);
      }

      case "ativarbot": {
        if (!isOwner(sender)) return reply("👑 Apenas o DONO.");
        if (!isGroup) return reply("Só em grupo.");
        const dias = parseInt(text) || 30;
        db.rentGroup(from, dias);
        return reply(`✅ Grupo ativado por ${dias} dias (aluguel).`);
      }

      case "ativargrupo": {
        if (!isOwner(sender)) return reply("👑 Apenas o DONO.");
        if (!isGroup) return reply("Só em grupo.");
        const tipo = (text || "parceria").toLowerCase();
        if (tipo === "parceria") {
          if (!db.global.parceria.includes(from)) db.global.parceria.push(from);
          return reply("✅ Grupo adicionado à lista de PARCERIA.");
        }
        return reply("Tipos: parceria");
      }

      case "addautoresponder":
      case "addautoresp": {
        if (!isOwner(sender) && !isAdmin) return reply("Só admins.");
        const [trig, ...resp] = text.split("|");
        if (!trig || !resp.length) return reply(`Uso: ${config.prefix}addautoresponder gatilho | resposta`);
        db.addAutoResp(trig.trim(), resp.join("|").trim());
        return reply(`✅ Autoresponder criado: "${trig.trim()}"`);
      }
      case "delautoresp": {
        if (!isOwner(sender) && !isAdmin) return reply("Só admins.");
        db.delAutoResp(text.trim());
        return reply("✅ Removido.");
      }
      case "listautoresp": {
        const list = db.listAutoResp();
        if (!list.length) return reply("📭 Nenhum autoresponder.");
        return reply(`╭━〔 📋 ${bold("AUTORESPONDERS")} 〕━╮\n` + list.map(([k,v]) => `┃ • ${k} → ${v.slice(0,40)}`).join("\n") + "\n╰━━━━━━━━━━━━━━━━━╯");
      }

      // (case "audio" já tratado acima)


      case "wendel": {
        await react(sock,msg,"💬");
        if (!text) return reply("Diz alguma coisa, mano.");
        const r = await wendel(text);
        return reply(r);
      }

      case "play":
      case "ytmp3": {
        if (!text) return reply(`Uso: ${config.prefix}play <música>`);
        await react(sock,msg,"🎵");
        const search = await dl.ytSearch(text);
        if (!search) return reply("❌ Nada encontrado.");
        const cap = `╭━━〔 🎵 ${bold("ENCONTRADO")} 〕━━╮\n┃ 🎼 ${search.title}\n┃ 👤 ${search.author}\n┃ ⏱️ ${search.duration}\n┃ 👁️ ${search.views}\n┃ ⬇️ A baixar a música...\n╰━━━━━━━━━━━━━━━╯`;
        try { await sock.sendMessage(from, { image: { url: search.thumb }, caption: cap }, { quoted: msg }); }
        catch { await reply(cap); }
        const r = await dl.ytmp3(text);
        if (!r?.audio) return reply("❌ Erro a baixar áudio: " + (r?.error||""));
        return sock.sendMessage(from, {
          audio: { url: r.audio }, mimetype: "audio/mpeg", ptt: false,
          fileName: `${r.title}.mp3`,
        }, { quoted: msg });
      }

      case "playvid":
      case "ytmp4": {
        if (!text) return reply(`Uso: ${config.prefix}playvid <vídeo>`);
        await react(sock,msg,"🎬");
        const search = await dl.ytSearch(text);
        if (!search) return reply("❌ Nada encontrado.");
        const cap = `╭━━〔 🎬 ${bold("ENCONTRADO")} 〕━━╮\n┃ 🎞️ ${search.title}\n┃ 👤 ${search.author}\n┃ ⏱️ ${search.duration}\n┃ 📥 Baixando o vídeo em mp4, aguarde...\n╰━━━━━━━━━━━━━━━╯`;
        try { await sock.sendMessage(from, { image: { url: search.thumb }, caption: cap }, { quoted: msg }); }
        catch { await reply(cap); }
        const r = await dl.ytmp4(text);
        if (!r?.video) return reply("❌ Erro a baixar vídeo: " + (r?.error||""));
        const size = await dl.getSize(r.video);
        const sizeMB = size / 1024 / 1024;
        if (sizeMB > (config.videoMaxMB || 100)) {
          return sock.sendMessage(from, {
            document: { url: r.video }, mimetype: "video/mp4",
            fileName: `${r.title}.mp4`, caption: `📦 Vídeo grande (${sizeMB.toFixed(1)} MB) — enviado como documento.`,
          }, { quoted: msg });
        }
        return sock.sendMessage(from, {
          video: { url: r.video }, mimetype: "video/mp4",
          caption: `🎬 ${r.title}`,
        }, { quoted: msg });
      }

      case "tiktok":
      case "tt": {
        if (!text) return reply("Manda o link do TikTok.");
        await react(sock,msg,"🎵");
        const r = await dl.tiktok(text);
        if (r?.error || !r?.video) return reply("❌ " + (r?.error || "Falhou."));
        return sock.sendMessage(from, {
          video: { url: r.video }, caption: `🎬 ${r.title}\n👤 @${r.author}\n👁️ ${r.plays} plays`,
        }, { quoted: msg });
      }

      case "pinterest":
      case "pin": {
        if (!text) return reply("Pesquisa o quê?");
        await react(sock,msg,"📌");
        const imgs = await dl.pinterest(text);
        if (!imgs.length) return reply("❌ Sem resultados.");
        const pick = imgs[Math.floor(Math.random() * imgs.length)];
        return sock.sendMessage(from, { image: { url: pick }, caption: `📌 Pinterest: ${text}` }, { quoted: msg });
      }

      case "ffid": {
        if (!text) return reply("Uso: .ffid <id>");
        await react(sock,msg,"🎮");
        const i = await ff.info(text);
        if (i?.error) return reply("❌ " + i.error);
        return reply(`╭━━〔 🎮 ${bold("FREE FIRE")} 〕━━╮\n┃ ${JSON.stringify(i, null, 2).slice(0, 800)}\n╰━━━━━━━━━━━━━━━╯`);
      }
      case "ffpp": {
        if (!text) return reply("Uso: .ffpp <id>");
        const u = await ff.pp(text);
        if (!u) return reply("❌ Sem foto.");
        return sock.sendMessage(from, { image: { url: u }, caption: `🖼️ FF #${text}` }, { quoted: msg });
      }
      case "fflike": {
        if (!text) return reply("Uso: .fflike <id>");
        await react(sock,msg,"👍");
        const r = await ff.likes(text);
        return reply("❤️ " + JSON.stringify(r).slice(0, 500));
      }

      // ╔═══════════ V7-MD — NOVOS COMANDOS ═══════════╗
      case "fix": case "fixar": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!isAdmin && !isOwner(sender)) return reply("⚔️ Só admins.");
        const g = db.getGroup(from);
        const ctx2 = msg.message?.extendedTextMessage?.contextInfo;
        const fixedText = ctx2?.quotedMessage?.conversation
          || ctx2?.quotedMessage?.extendedTextMessage?.text
          || text;
        if (!fixedText) return reply(`📌 Uso: responde uma mensagem com ${config.prefix}fix  OU  ${config.prefix}fix <texto>`);
        g.fixedMsg = fixedText;
        return reply(`╭━━〔 📌 ${bold("MENSAGEM FIXADA")} 〕━━╮\n┃ ${fixedText}\n┃\n┃ 👤 Por: @${senderNum}\n┃ ⏰ ${now()}\n╰━━━━━━━━━━━━━━━━━╯`, { mentions: [sender] });
      }
      case "unfix": case "desfixar": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!isAdmin && !isOwner(sender)) return reply("⚔️ Só admins.");
        db.getGroup(from).fixedMsg = null;
        return reply("📌 Mensagem desfixada.");
      }
      case "vermsg": case "fixmsg": case "fixed": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        const g = db.getGroup(from);
        if (!g.fixedMsg) return reply("📭 Nenhuma mensagem fixada.");
        return reply(`📌 *MENSAGEM FIXADA*\n\n${g.fixedMsg}`);
      }
      case "muteuser": case "silenciaruser": {
        if (!isGroup || !target) return reply(`🔇 Marca alguém. Ex: ${config.prefix}muteuser @user`);
        if (!isAdmin && !isOwner(sender)) return reply("⚔️ Só admins.");
        if (isOwner(target)) return reply("🛡️ Antiban DONO — não posso silenciar o dono.");
        const g = db.getGroup(from);
        if (!g.mutedUsers.includes(target)) g.mutedUsers.push(target);
        return reply(`🔇 @${target.split("@")[0]} foi silenciado(a). As mensagens dele(a) serão apagadas.`, { mentions: [target] });
      }
      case "desmuteuser": case "unmuteuser": {
        if (!isGroup || !target) return reply(`🔊 Marca alguém. Ex: ${config.prefix}desmuteuser @user`);
        if (!isAdmin && !isOwner(sender)) return reply("⚔️ Só admins.");
        const g = db.getGroup(from);
        g.mutedUsers = g.mutedUsers.filter(j => j !== target);
        return reply(`🔊 @${target.split("@")[0]} pode falar de novo.`, { mentions: [target] });
      }
      case "listmuted": case "listmute": case "muted": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        const g = db.getGroup(from);
        if (!g.mutedUsers?.length) return reply("📭 Ninguém silenciado.");
        return reply(`╭━━〔 🔇 ${bold("SILENCIADOS")} 〕━━╮\n${g.mutedUsers.map((j,i)=>`┃ ${i+1}. @${j.split("@")[0]}`).join("\n")}\n╰━━━━━━━━━━━━━━━━━╯`, { mentions: g.mutedUsers });
      }
      case "listadv": case "advs": case "advlist": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        const arr = Object.values(db.users).filter(u => (u.advs||0) > 0);
        if (!arr.length) return reply("📭 Nenhuma advertência ativa.");
        return reply(`╭━━〔 ⚠️ ${bold("ADVERTÊNCIAS")} 〕━━╮\n${arr.map(u=>`┃ • @${u.jid.split("@")[0]} → ${u.advs}/3`).join("\n")}\n╰━━━━━━━━━━━━━━━━━╯`, { mentions: arr.map(u=>u.jid) });
      }
      case "limparadv": case "clearadv": {
        if (!isGroup || (!isAdmin && !isOwner(sender))) return reply("⚔️ Só admins.");
        if (target) { db.getUser(target).advs = 0; return reply(`✅ Advertências de @${target.split("@")[0]} zeradas.`, { mentions:[target] }); }
        for (const u of Object.values(db.users)) u.advs = 0;
        return reply("✅ Todas as advertências foram limpas.");
      }
      case "statusanti": case "antistatus2": case "antistatus": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        const g = db.getGroup(from);
        const items = ["antilink","antifoto","antivideo","antisticker","antiaudio","antipv","antifake","antipalavrao","antispam","welcome","goodbye"];
        const list = items.map(k => `┃ ${g[k]?"🟢":"🔴"} ${k}`).join("\n");
        return reply(`╭━━〔 🛡️ ${bold("STATUS DOS ANTIS")} 〕━━╮\n${list}\n┃\n┃ 📊 Limites:\n┃   • link: ${g.limites.link}\n┃   • audio: ${g.limites.audio}\n┃   • palavrão: ${g.limites.palavrao}\n┃   • spam: ${g.limites.spam}\n╰━━━━━━━━━━━━━━━━━╯`);
      }
      case "statusagenda": case "agenda": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        const ag = db.global.agenda?.[from];
        const aut = db.global.autoSair?.[from];
        let out = `╭━━〔 ⏰ ${bold("AGENDA DO GRUPO")} 〕━━╮\n`;
        out += ag ? `┃ 🔒 ${ag.action} em ${new Date(ag.when).toLocaleString("pt-PT")}\n` : "┃ 🔒 Sem fechar/abrir agendado.\n";
        out += aut ? `┃ 👋 AutoSair em ${new Date(aut).toLocaleString("pt-PT")}\n` : "┃ 👋 Sem autosair agendado.\n";
        out += "╰━━━━━━━━━━━━━━━━━╯";
        return reply(out);
      }
      case "statusaluguel": case "aluguel": case "rentstatus": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        const t = db.global.rented?.[from];
        const isRent = db.isRented(from);
        const isParc = db.global.parceria.includes(from);
        return reply(`╭━━〔 💳 ${bold("ALUGUEL DO GRUPO")} 〕━━╮
┃ 🤖 Modo global: ${db.global.mode}
┃ 💳 Alugado: ${isRent ? `🟢 até ${new Date(t).toLocaleString("pt-PT")}` : "🔴 NÃO"}
┃ 🤝 Parceria: ${isParc ? "🟢 SIM" : "🔴 NÃO"}
┃
┃ Para alugar: fala com o dono
┃ 📲 wa.me/${config.ownerWa}
╰━━━━━━━━━━━━━━━━━╯`);
      }
      case "removeraluguel": case "delaluguel": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!isGroup) return reply("⚠️ Só em grupos.");
        delete db.global.rented[from];
        return reply("✅ Aluguel removido deste grupo.");
      }
      case "renovaraluguel": case "renovar": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!isGroup) return reply("⚠️ Só em grupos.");
        const dias = parseInt(text) || 30;
        const cur = db.global.rented[from] || Date.now();
        db.global.rented[from] = Math.max(cur, Date.now()) + dias * 86400000;
        return reply(`♻️ Aluguel renovado por +${dias} dias.`);
      }
      case "antibanadm": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!isAdmin && !isOwner(sender)) return reply("⚔️ Só admins.");
        const g = db.getGroup(from);
        const v = (text || "").toLowerCase();
        if (v !== "on" && v !== "off") return reply(`📝 .antibanadm on/off — atual: ${g.antibanadm?"🟢":"🔴"}`);
        g.antibanadm = v === "on";
        return reply(`${g.antibanadm?"🟢":"🔴"} Antiban ADM agora: ${v.toUpperCase()}`);
      }
      case "setlimite": case "limite": {
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!isAdmin && !isOwner(sender)) return reply("⚔️ Só admins.");
        const [tipo, valor] = text.split(/\s+/);
        const g = db.getGroup(from);
        if (!tipo || !g.limites[tipo]) return reply(`📝 .setlimite <link|audio|palavrao|spam> <n>\nAtuais: ${JSON.stringify(g.limites)}`);
        g.limites[tipo] = parseInt(valor) || g.limites[tipo];
        return reply(`✅ Limite de *${tipo}* = ${g.limites[tipo]}`);
      }
      case "bangrupo": case "bangp": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        if (!isGroup) return reply("⚠️ Só em grupos.");
        if (!db.global.listaNegra.includes(from)) db.global.listaNegra.push(from);
        return reply("🚫 Grupo adicionado à *LISTA NEGRA*. Bot ignora aqui.");
      }
      case "desbangrupo": case "desbangp": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        db.global.listaNegra = db.global.listaNegra.filter(g => g !== from);
        return reply("✅ Grupo removido da lista negra.");
      }
      case "setprefix": case "setprefixo": {
        if (!isOwner(sender)) return reply("👑 Só DONO.");
        const np = (text || "").trim().slice(0,2);
        if (!np) return reply(`📝 .setprefix <novo>  ex: .setprefix !`);
        config.prefix = np;
        return reply(`✅ Prefixo agora: ${mono(np)}\n💡 Sobrevive até reiniciar — para persistir, edita bot/config.js`);
      }
      case "menustatus": case "status2": {
        return reply(`╭━━〔 📊 ${bold("STATUS GERAL V7-MD")} 〕━━╮
┃ 🤖 ${config.botName} ${config.version}
┃ 🟢 Bot: ${db.global.botOn?"ON":"OFF"}
┃ 📡 Modo: ${db.global.mode}
┃ ⏱️ Uptime: ${uptime(startTime)}
┃ ⌨️ Typing: ${db.global.typingEffect?"🟢":"🔴"}
┃ 🛡️ Online-only: ${config.onlineOnly?"🟢":"🔴"} (${config.onlineWindowMs}ms)
┃ 🚫 PV nível: ${config.antiPvLevel}
┃ 👥 Grupos DB: ${Object.keys(db.groups).length}
┃ 👤 Users DB: ${Object.keys(db.users).length}
┃ 🎁 Autorespond: ${Object.keys(db.global.autoResp).length}
┃ 🛒 Custom cmds: ${Object.keys(db.global.customCmds).length}
┃ 💳 Alugados: ${Object.keys(db.global.rented).length}
┃ 🤝 Parcerias: ${db.global.parceria.length}
┃ 🚫 Lista negra: ${db.global.listaNegra.length}
┃ 🔇 Mutados: ${Object.values(db.groups).reduce((s,g)=>s+(g.mutedUsers?.length||0),0)}
┃ 📌 Fixadas: ${Object.values(db.groups).filter(g=>g.fixedMsg).length}
╰━━━━━━━━━━━━━━━━━╯`);
      }
      case "tutorial": case "ajudacmd": {
        return reply(`╭━━〔 📖 ${bold("TUTORIAL — ADD COMANDOS")} 〕━━╮
┃ ${bold("Comando custom")}: ${config.prefix}addcomando <nome> <resposta>
┃   Ex: ${config.prefix}addcomando regras Leiam as regras!
┃
┃ ${bold("Auto-responder")} (separa com ${mono("||")}):
┃   ${config.prefix}addautoresponder gatilho || resposta
┃   Ex: ${config.prefix}addautoresponder bom dia || ☀️ Bom dia @user!
┃
┃ ${bold("Funções dinâmicas")}:
┃   @user      — menciona quem chamou
┃   @group     — nome do grupo
┃   [hora]     — hora atual
┃   [data]     — data atual
┃   [membros]  — nº de membros
┃
┃ ${bold("Listar/remover")}:
┃   ${config.prefix}listautoresp
┃   ${config.prefix}delautoresp <gatilho>
┃   ${config.prefix}delcomando <nome>
╰━━━━━━━━━━━━━━━━━╯`);
      }

      default:
        await react(sock, msg, "❓");
        logger.log(rawCmd || "<vazio>", sender, "denied", "comando inexistente");
        // 🔍 Sugestão por proximidade (Levenshtein)
        const pool = [...new Set([...Object.keys(ALIASES || {}), ...Object.keys(help || {})])];
        const sug = bestMatch(rawCmd, pool);
        return reply(`╭━〔 ❓ ${bold("COMANDO NÃO EXISTE")} 〕━╮\n┃ ${mono(config.prefix + rawCmd)} não foi encontrado.\n${sug ? `┃ 💡 Quis dizer: ${mono(config.prefix + sug)}\n` : ""}┃ 📜 ${config.prefix}menu  •  ❓ ${config.prefix}help <cmd>\n╰━━━━━━━━━━━━━━━━━╯`);

    }
  } catch (e) {
    console.error("handler err:", e);
    logger.log("FATAL", msg?.key?.participant || msg?.key?.remoteJid, "err", e.message);
    try { await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Erro: "+e.message+"\n💡 .diag para detalhes." }, { quoted: msg }); } catch {}
  }
}


module.exports = handler;
