import OpenAI from "openai";

export default async function handler(req, res) {
  const ORIGIN = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (token !== process.env.SITE_PUBLIC_TOKEN) return res.status(401).json({ error: "unauthorized" });

  try {
    const { message = "" } = req.body || {};
    if (!message.trim()) return res.status(400).json({ answer: "質問を入力してください。" });

    const quick = [
      { re: /(料金|費用|いくら)/, ans: "ショート動画運用は月◯万円〜、撮影付きは◯万円〜です。" },
      { re: /(納期|スケジュール|いつまで)/, ans: "内容によりますが、最短2週間で初稿をご提出可能です。" }
    ];
    const hit = quick.find(q => q.re.test(message));
    if (hit) return res.status(200).json({ answer: hit.ans });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const system = `
あなたは横浜のSNS動画制作会社「Yorimichi」のカスタマーアシスタントです。
・敬語で簡潔に回答
・不確かな場合は推測せず、追加で1つ質問する
・ブランドカラー #48a33d を意識
`;
    const completion = await openai.responses.create({
      model: process.env.MODEL || "gpt-4o-mini",
      input: [
        { role: "system", content: system },
        { role: "user", content: message }
      ]
    });

    const answer =
      completion.output_text?.trim() ||
      completion?.output?.[0]?.content?.[0]?.text?.trim() ||
      "ただいま混み合っています。";

    console.log("CHAT:", { q: message, a: answer, at: new Date().toISOString() });
    res.status(200).json({ answer });
  } catch (e) {
    console.error(e);
    res.status(500).json({ answer: "エラーが発生しました。" });
  }
}
