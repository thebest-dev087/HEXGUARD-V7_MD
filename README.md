<div align="center">

# 🥷 HΞXGUΛRD V7-MD
### ⚡ Bizarre Ninja Edition ⚡

<img src="./assets/menu.jpg" alt="HEXGUARD V7-MD banner" width="100%"/>

[![Version](https://img.shields.io/badge/version-V7--MD-00d4ff?style=for-the-badge&logo=ninja&logoColor=white)](#)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-339933?style=for-the-badge&logo=node.js&logoColor=white)](#)
[![Termux](https://img.shields.io/badge/Termux-ready-000?style=for-the-badge&logo=android&logoColor=white)](#)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](#)

**O bot de WhatsApp mais bizarro, completo e ninja do universo.**
Feito por **[TheBest](https://github.com/thebest-dev087)** • +280 comandos canónicos • +400 aliases

</div>

---

## ✨ Destaques V7-MD

- 🛡️ **Antiban TOTAL do dono** — em qualquer cenário, o dono nunca é banido
- 🔇 **Mute por utilizador** (`.muteuser`) — sem fechar o grupo todo
- 📌 **Fix de mensagem** (`.fix`) — fixa avisos importantes no grupo
- 🤖 **IA Gemini 1.5 Flash** — respostas longas, charmosas, sem corte
- 🎵 **Play / PlayVid** sem buttons — busca + thumbnail + áudio/vídeo entregue
- 🔊 **TTS macho PT-BR rebótica** (Ricardo / StreamElements) no `.audio` e `.ping`
- 🎞️ **GIFs anime** automáticos em ações (`.beijo`, `.abraco`, `.comer`…)
- 🥷 **Antis com níveis e limites** (`.antipv 1|2|3`, `.setlimite link 3`)
- 💳 **Modo aluguel** com renovar/remover e mensagem rebótica bonita
- 📊 **Diagnóstico avançado** (`.diag`) — explica EXACTAMENTE porque falhou
- 🪶 **Anticrash + autoreconnect** — o bot nunca crasha
- 📥 **Online-only 5s** — ignora todo o backlog offline (sem responder msgs antigas)
- 🌐 **Pareamento AUTOMÁTICO** com o número `258858725314` — sem prompts

---

## 🚀 Instalação no Termux (passo a passo)

Cola **uma linha de cada vez**:

```bash
pkg update -y && pkg upgrade -y
```
```bash
pkg install -y nodejs git ffmpeg python termux-api wget curl unzip
```
```bash
unzip hexguard-v7-md.zip
```
```bash
cd hexguard-v7-md
```
```bash
npm install
```
```bash
node index.js
```

> 💡 Alternativa rápida: `bash install.sh` faz tudo de uma vez.

### 📲 Pareamento

1. Ao iniciar, o bot pede o código de pareamento ao WhatsApp do número `258858725314` **automaticamente**.
2. No WhatsApp do bot:  `⚙️ Aparelhos conectados → Conectar com nº telefone`
3. Digita o código mostrado no terminal (8 caracteres no formato `XXXX-XXXX`).
4. ✅ Conectado!

---

## 🔑 Chaves (opcional)

| Chave | Para quê | Onde se obtém |
|------|---------|---------------|
| `geminiKey` | IA Gemini (já configurada) | https://aistudio.google.com/app/apikey |
| `LOVABLE_API_KEY` | Fallback IA | https://lovable.dev |

Editar em `bot/config.js` ou exportar no Termux:
```bash
export LOVABLE_API_KEY="cole_aqui"
```

---

## 🧠 Comandos principais

| Categoria | Exemplos |
|----------|----------|
| 🛡️ **Admin** | `.ban` `.add` `.promover` `.silenciar` `.muteuser` `.fix` `.adv` |
| 🤖 **IA**     | `.ia` `.wendel` `.traduz` `.codigo` `.historia` `.email` |
| 🎵 **Download** | `.play` `.playvid` `.tiktok` `.pinterest` `.lyrics` |
| 🎮 **Jogos**  | `.jdv` `.jdvbot` `.quiz` `.blackjack` `.duelo` `.cacaniquel` |
| 💞 **Ações**  | `.abraco` `.beijo` `.comer` `.casar` `.ship` `.cuddle` |
| 💰 **Economia** | `.saldo` `.daily` `.trabalhar` `.loja` `.comprar` `.pay` |
| 👑 **Dono** | `.on` `.off` `.modo` `.ativarbot` `.setprefix` `.setvip` `.broadcast` |
| 🔍 **Status** | `.menustatus` `.statusanti` `.statusagenda` `.statusaluguel` |
| 📌 **Sem prefixo** | `prefix` `prefixo` `dono` |

Lista completa: `.menu` • Ajuda: `.help <comando>` • Diagnóstico: `.diag`

---

## 🎮 Sistema de Ranks (auto pelo Level)

| Lvl | Rank |
|-----|------|
| 1   | 🌱 Novato |
| 5   | 🥋 Aprendiz |
| 10  | 🥷 Ninja |
| 20  | 🗡️ Samurai |
| 35  | ⚔️ Guerreiro |
| 50  | 🛡️ Cavaleiro |
| 75  | 🐉 Dragão |
| 100 | 👑 Imortal |
| 150 | 🌌 Lendário |
| 200 | 💀 BIZARRE |

---

## 🛠️ Adicionar comandos custom & autoresponders

```
.addcomando regras Leiam o /tutorial primeiro!
.addautoresponder bom dia || ☀️ Bom dia @user!
```

**Funções dinâmicas disponíveis**: `@user`  `@group`  `[hora]`  `[data]`  `[membros]`

Ver tutorial completo no WhatsApp: `.tutorial`

---

## 👤 Sobre o dono

> 👑 **TheBest** — criador do HEXGUARD, configs VPN e developer de bots WhatsApp.
>
> 🌐 GitHub: [github.com/thebest-dev087](https://github.com/thebest-dev087)
> 📲 WhatsApp: [wa.me/258848881576](https://wa.me/258848881576)

---

## 🆘 Suporte

- `.diag` → diagnóstico completo (porquê o último erro)
- `.logs 20` → últimos 20 logs
- `.menustatus` → status global do bot
- Erro persistente? Apaga `./session` e refaz pareamento.

---

<div align="center">

**Feito com 🖤 por TheBest**
*"Se não é bizarro, não é HEXGUARD"* 🥷

</div>
