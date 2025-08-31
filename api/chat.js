// api/chat.js
import OpenAI from "openai";

function allowCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim());
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  allowCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const message = body.message || "";
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) return res.status(400).json({ error: "message is required" });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.MODEL || "gpt-4o-mini"; // ←用意があれば gpt-5 に変更してOK

    const system =
      "あなたはYorimichiのサイトに来たお客様を丁寧に案内するアシスタントです。" +
      "会社概要、SNS運用、料金の概算、撮影スケジュール、問い合わせ誘導を簡潔に答えます。";

    const messages = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: message }
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 400
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || "";
    return res.status(200).json({ answer });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server_error" });
  }
}
