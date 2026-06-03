#!/data/data/com.termux/files/usr/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║  🥷  HΞXGUΛRD V7-MD  •  install.sh  •  Termux Edition   ║
# ║  by TheBest  •  github.com/thebest-dev087                ║
# ╚══════════════════════════════════════════════════════════╝

set -e
B='\033[1;36m'; G='\033[1;32m'; Y='\033[1;33m'; R='\033[1;31m'; N='\033[0m'

echo -e "${B}"
echo "╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
echo "┃  🥷  HΞXGUΛRD V7-MD  •  INSTALADOR  ┃"
echo "┃     by TheBest  •  Termux/Linux     ┃"
echo "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"
echo -e "${N}"

echo -e "${Y}➤ A actualizar pacotes...${N}"
pkg update -y && pkg upgrade -y

echo -e "${Y}➤ A instalar dependências do sistema...${N}"
pkg install -y nodejs git ffmpeg python termux-api wget curl

echo -e "${Y}➤ A instalar pacotes npm...${N}"
npm install --no-audit --no-fund

echo -e "${G}"
echo "╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
echo "┃  ✅  INSTALAÇÃO CONCLUÍDA                  ┃"
echo "┃                                            ┃"
echo "┃  ▶  node index.js   ← iniciar o bot        ┃"
echo "┃  📲 Pareamento automático com 258858725314 ┃"
echo "┃  📜 .menu  •  🔧 .diag  •  ❓ .help <cmd>  ┃"
echo "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"
echo -e "${N}"
