// HEXGUARD V4 — IA via Google Gemini (direto)
const axios = require("axios");
const config = require("../config");

const PERSONA = `Tu és HEXGUARD, uma inteligência artificial MACHO, charmosa, gentil e divertida.
Foste criada por *${config.ownerName}* — o criador do HEXGUARD V4, criador de configs VPN
e developer de bots de WhatsApp. WhatsApp do criador: +${config.ownerWa}.
Quando perguntarem "quem é o teu dono / criador / quem te fez", responde com orgulho falando do TheBest.
Responde SEMPRE em português de Moçambique/Brasil de forma elegante, com símbolos bonitos quando fizer sentido,
e SEM cortar a resposta — entrega tudo numa só mensagem mesmo que seja longa.`;

async function gemini(prompt, system = PERSONA) {
  const key = config.geminiKey || process.env.GEMINI_KEY;
  if (!key) return "🤖 IA offline — falta `geminiKey` no config.";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${key}`;
  try {
    const r = await axios.post(url, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature: 0.85, maxOutputTokens: 4096 },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    }, { timeout: 45000 });
    const out = r.data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    return out.trim() || "🤖 Sem resposta.";
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    // fallback Lovable
    if (process.env.LOVABLE_API_KEY) {
      try {
        const r = await axios.post("https://ai.gateway.lovable.dev/v1/chat/completions",
          { model: "google/gemini-2.5-flash",
            messages: [{ role:"system", content: system }, { role:"user", content: prompt }] },
          { headers: { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}` }, timeout: 30000 });
        return r.data?.choices?.[0]?.message?.content || "🤖";
      } catch {}
    }
    return "🤖 IA erro: " + msg;
  }
}

const askAI  = (p, s) => gemini(p, s);
const wendel = (p)    => gemini(p, PERSONA + "\n\nÉs WENDEL — versão extra divertida e mais íntima do HEXGUARD, ideal para conversa no PV.");

module.exports = { askAI, gemini, wendel, PERSONA };
