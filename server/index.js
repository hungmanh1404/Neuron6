import http from "http";
import axios from "axios";

const PORT = process.env.PORT || 10000;

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
  console.warn(
    "[WARN] TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID chưa được set – server sẽ không gửi được lời nhắc."
  );
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
Giảm màn hình, chuẩn bị ngủ. Ưu tiên ngủ để não "chép file" sau vòng học tối nay.`
};

const schedules = [
  { hour: 4, minute: 44, slot: "mini-morning" },
  { hour: 6, minute: 55, slot: "morning" },
  { hour: 18, minute: 0, slot: "recovery" },
  { hour: 20, minute: 0, slot: "evening-cycle" },
  { hour: 22, minute: 0, slot: "sleep" }
];

async function sendTelegram(slot) {
  if (!TOKEN || !CHAT_ID) return;
  const text = messages[slot];
  if (!text) return;

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: CHAT_ID, text });
  console.log(`[REMINDER] Sent slot "${slot}" at`, new Date().toISOString());
}

function checkAndSendLoop() {
  const sentToday = new Set();

  function tick() {
    const now = new Date();

    // Chuyển sang giờ Việt Nam (UTC+7)
    const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const vn = new Date(utc + 7 * 60 * 60 * 1000);

    const h = vn.getHours();
    const m = vn.getMinutes();
    const dayKey = vn.toISOString().slice(0, 10); // YYYY-MM-DD theo giờ VN

    schedules.forEach(({ hour, minute, slot }) => {
      const key = `${dayKey}-${slot}`;

      const inWindow = h === hour && (m === minute || m === (minute + 1) % 60);

      if (inWindow && !sentToday.has(key)) {
        sentToday.add(key);
        sendTelegram(slot).catch((err) => {
          console.error("[REMINDER] Send error:", err.response?.data || err.message);
        });
      }
    });
  }

  tick();
  setInterval(tick, 60 * 1000);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/test-noti") {
    const slot = url.searchParams.get("slot") || "evening-cycle";
    sendTelegram(slot)
      .then(() => {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Đã gửi test noti cho slot "${slot}".\n`);
      })
      .catch((err) => {
        console.error("[TEST] Send error:", err.response?.data || err.message);
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Lỗi khi gửi test noti.\n");
      });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Focus-Flow reminder server is running.\n");
});

server.listen(PORT, () => {
  console.log("Server listening on port", PORT);
  checkAndSendLoop();
});


