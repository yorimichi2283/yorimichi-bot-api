import nodemailer from "nodemailer";

export default async function handler(req, res) {
  const ORIGIN = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")  return res.status(405).json({ error: "method not allowed" });

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (token !== process.env.SITE_PUBLIC_TOKEN) return res.status(401).json({ error: "unauthorized" });

  try {
    const { kind = "inquiry", name = "", email = "", tel = "", topic = "", budget = "", message = "", url = "" } = req.body || {};
    console.log("LEAD:", { kind, name, email, tel, topic, budget, message, url, at: new Date().toISOString() });

    // Gmail通知（任意）
    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
      });
      await transporter.sendMail({
        from: `"Yorimichi Bot" <${process.env.GMAIL_USER}>`,
        to: process.env.MAIL_TO || process.env.GMAIL_USER,
        subject: `📩 新しい${kind === "download" ? "資料DL" : "お問い合わせ"}`,
        text:
`お名前: ${name}
メール: ${email}
電話: ${tel}
トピック: ${topic}
予算: ${budget}
内容: ${message}
ページ: ${url}
日時: ${new Date().toLocaleString("ja-JP")}`
      });
    }

    // Googleスプレッドシート（Apps Script Webアプリ）
    if (process.env.GAS_URL) {
      await fetch(process.env.GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name, email, tel, topic, budget, message, url })
      });
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "failed" });
  }
}
