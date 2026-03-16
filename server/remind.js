import axios from "axios";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SLOT = process.env.REMINDER_SLOT || "test";

if (!TOKEN || !CHAT_ID) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  process.exit(1);
}

const messages = {
  "mini-morning": `⏰ 04:44–06:55 · Mini Focus
Thức sớm (thỉnh thoảng). Nếu dậy được & tỉnh: 15–20' Focus nhẹ cho 1 chủ đề.`,

  morning: `🌅 06:55–08:30 · Focus → Flow sáng
1 vòng nhỏ trước khi đi làm: 25' Focus 1 chủ đề + 30–45' Flow bài tương tự.`,

  recovery: `🌇 18:00–20:00 · Hồi sức
Ăn, tắm, đi bộ ngắn. Không vội học. Chuẩn bị năng lượng cho vòng tối.`,

  "evening-cycle": `🎯 20:00–21:30 · Vòng tối Focus → Flow → Diffuse
20:00–20:30: Focus 1 chủ đề, 3–5 bài.
20:30–21:15: Flow nhiều bài tương tự.
21:15–21:30: Diffuse – đi bộ/tắm, không cầm điện thoại.`,

  sleep: `🌙 22:00–01:00 · Sleep
Giảm màn hình, chuẩn bị ngủ. Ưu tiên ngủ để não "chép file" sau vòng học tối nay.`,

  test: `🔔 TEST · Nếu bạn thấy tin này là Render server đã bắn được Telegram.`
};

const text = messages[SLOT] || messages.test;

async function send() {
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: CHAT_ID,
    text
  });
  console.log("Sent reminder slot:", SLOT);
}

send().catch((err) => {
  console.error("Send error:", err.response?.data || err.message);
  process.exit(1);
});

