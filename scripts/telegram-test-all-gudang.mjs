import "dotenv/config";

const raw = process.env.TELEGRAM_GUDANG_CHAT_IDS?.trim();
const token = process.env.TELEGRAM_BOT_TOKEN?.trim().replace(/^"|"$/g, "");
if (!raw || !token) {
  console.error("Missing TELEGRAM_GUDANG_CHAT_IDS or TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

const map = JSON.parse(raw);

for (const [gudang, chatId] of Object.entries(map)) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: `Tes koneksi GBC — ${gudang}` }),
  });
  const d = await res.json();
  console.log(`${gudang}: ${d.ok ? "OK" : d.description}`);
}