// Fontes Unicode bonitas (estilo "Boreal" / negrito serif / cursiva)
// Usa-se em títulos e cabeçalhos.
const maps = {
  bold: { // 𝐁𝐎𝐋𝐃 SERIF
    A: "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙",
    a: "𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳",
    n: "𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗",
  },
  fancy: { // 𝓕𝓪𝓷𝓬𝔂 cursive (Boreal-ish)
    A: "𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩",
    a: "𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃",
    n: "0123456789",
  },
  small: { // sᴍᴀʟʟ ᴄᴀᴘs
    A: "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ",
    a: "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ",
    n: "0123456789",
  },
  mono: { // 𝙼𝚘𝚗𝚘
    A: "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉",
    a: "𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣",
    n: "𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿",
  },
};

// helper que percorre a string e mapeia A-Z, a-z, 0-9
function convert(text, style) {
  const map = maps[style];
  if (!map) return text;
  // Strings com surrogates: usar Array.from para iterar code points "normais" ASCII apenas
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90)        out += [...map.A][code - 65];
    else if (code >= 97 && code <= 122)  out += [...map.a][code - 97];
    else if (code >= 48 && code <= 57)   out += [...map.n][code - 48];
    else out += ch;
  }
  return out;
}

const boreal = (t) => convert(t, "fancy");
const bold   = (t) => convert(t, "bold");
const small  = (t) => convert(t, "small");
const mono   = (t) => convert(t, "mono");

module.exports = { boreal, bold, small, mono, convert };
