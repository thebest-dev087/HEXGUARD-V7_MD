// Jogo da Velha (Tic-tac-toe) — vs jogador e vs bot, com tabuleiro bonito.
// Estado por chat (groupID/chat). Persistente em memória.
const games = {}; // { chatJid: {board:[9], turn:'X'|'O', xJid, oJid, vsBot:bool, started:Date} }

const EMOJIS = {
  X: "❌", O: "⭕", e: ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"],
};

function render(board) {
  const c = (i) => board[i] === "X" ? EMOJIS.X : board[i] === "O" ? EMOJIS.O : EMOJIS.e[i];
  return `╭━━━〔 🎮 𝐉𝐝𝐕 〕━━━╮
┃   ${c(0)} ┃ ${c(1)} ┃ ${c(2)}
┃   ━━━╋━━━╋━━━
┃   ${c(3)} ┃ ${c(4)} ┃ ${c(5)}
┃   ━━━╋━━━╋━━━
┃   ${c(6)} ┃ ${c(7)} ┃ ${c(8)}
╰━━━━━━━━━━━━━━━╯`;
}

const WIN = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function winner(b) {
  for (const [a,c,d] of WIN) if (b[a] && b[a]===b[c] && b[a]===b[d]) return b[a];
  if (b.every(Boolean)) return "E"; // empate
  return null;
}

function botMove(b) {
  // 1. ganhar 2. bloquear 3. centro 4. canto 5. lado
  const empty = b.map((v,i) => v ? -1 : i).filter(i => i >= 0);
  for (const i of empty) { const t=[...b]; t[i]="O"; if (winner(t)==="O") return i; }
  for (const i of empty) { const t=[...b]; t[i]="X"; if (winner(t)==="X") return i; }
  if (!b[4]) return 4;
  for (const i of [0,2,6,8]) if (!b[i]) return i;
  return empty[Math.floor(Math.random() * empty.length)];
}

function start(chat, xJid, oJid, vsBot=false) {
  games[chat] = { board: Array(9).fill(null), turn: "X", xJid, oJid, vsBot, started: Date.now() };
  return games[chat];
}

function get(chat) { return games[chat]; }
function end(chat) { delete games[chat]; }

function play(chat, jid, pos) {
  const g = games[chat];
  if (!g) return { err: "Nenhuma partida em curso. Usa *.jdv @user* ou *.jdvbot*." };
  if (pos < 1 || pos > 9) return { err: "Posição inválida (1–9)." };
  const idx = pos - 1;
  if (g.board[idx]) return { err: "Casa ocupada." };
  const expected = g.turn === "X" ? g.xJid : g.oJid;
  if (jid !== expected && !(g.vsBot && g.turn === "O")) {
    return { err: "Não é a tua vez!" };
  }
  g.board[idx] = g.turn;
  let w = winner(g.board);
  if (w) { const out = { board: render(g.board), winner: w, game: g }; end(chat); return out; }
  g.turn = g.turn === "X" ? "O" : "X";

  // bot joga automaticamente
  if (g.vsBot && g.turn === "O") {
    const bi = botMove(g.board);
    g.board[bi] = "O";
    w = winner(g.board);
    if (w) { const out = { board: render(g.board), winner: w, botPlayed: bi+1, game: g }; end(chat); return out; }
    g.turn = "X";
  }
  return { board: render(g.board), turn: g.turn, game: g };
}

module.exports = { start, get, end, play, render };
