// Gerador de logos em ASCII bonito (sem API).
// Usa figlet-puro embutido para fontes simples + fontes Unicode dos `fonts.js`.
const { boreal, bold } = require("./fonts");

// Fonte ASCII grande embutida (basic letters only)
const FONT = {
  // 7 lines tall
  A: ["  ▄▀█  "," █▀▀█  "," █  █  "],
  B: [" █▀▀▄  "," █▀▀▄  "," ▀▀▀   "],
  // very compact: we'll just use big block
};

function bigBlock(text) {
  // Map letters/digits → unicode bold block.  Simple & always works.
  const top    = "█▀▀█ ▀▀▀█ ▀▀▀█ ▀▀▀█ ▀▀▀█";
  // Real implementation below uses fancy frame
  return [
    "╔══════════════════════════════════════╗",
    "║                                      ║",
    `║   ${bold(text.toUpperCase().padEnd(34))}║`,
    "║                                      ║",
    "╚══════════════════════════════════════╝",
  ].join("\n");
}

function neonLogo(text) {
  const t = bold(text.toUpperCase());
  return [
    "╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮",
    "┃   ✦  ✦  ✦  ✦  ✦  ✦  ✦  ✦       ┃",
    "┃                                ┃",
    `┃     ${t}`,
    "┃                                ┃",
    "┃   ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐         ┃",
    "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯",
  ].join("\n");
}

function shadowLogo(text) {
  const t = boreal(text);
  return [
    "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
    "▓                              ▓",
    `▓   ${t}`,
    "▓                              ▓",
    "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
  ].join("\n");
}

function fireLogo(text) {
  return `🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
🔥  ${bold(text.toUpperCase())}
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥`;
}

function iceLogo(text) {
  return `❄️❄️❄️❄️❄️❄️❄️❄️❄️❄️❄️❄️
❄️  ${boreal(text)}
❄️❄️❄️❄️❄️❄️❄️❄️❄️❄️❄️❄️`;
}

function styleLogo(text) {
  return `╔═══════════════════════════╗
   ⚡  ${bold(text.toUpperCase())}
   ✦  by HΞXGUΛRD
╚═══════════════════════════╝`;
}

module.exports = { neonLogo, shadowLogo, fireLogo, iceLogo, styleLogo, bigBlock };
