import http from "http";
import axios from "axios";
import { buildDailyForecast } from "./forecast.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PORT = process.env.PORT || 10000;

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
  console.warn(
    "[WARN] TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID chưa được set – server sẽ không gửi được lời nhắc."
  );
}

const messages = {
  wake: `🪂 [DROP 05:00] WAKE + WATER + LIGHT (05:00–05:20)
LOADOUT:
• Uống nước + ra ánh sáng
• Không phone 30'
MISSION: vào ngày mới bằng hành động (không cảm xúc).`,

  prime: `🧠 [WARMUP 05:20] PRIME (05:20–06:00)
• Thở/thiền/viết
• 1 trang: mục tiêu hôm nay + 1 nỗi lo → 1 hành động
MISSION: clear đầu óc, khóa North Star.`,

  deepwork1: `🎯 [RANKED 06:00] DEEP WORK #1 (06:00–07:00)
RULE: Chỉ 1 việc — North Star task.
TIP: mở đúng 1 tab/1 file, không loot thêm.`,

  walkbreakfast: `🚶 [RESET 07:00] ĂN SÁNG + ĐI BỘ (07:00–07:30)
RULE: Podcast chỉ khi đi bộ.
MISSION: nạp stamina.`,

  work: `🏢 [SHIFT 09:00] WORK (09:00–18:00)
RULE: nếu có thể chèn 1 block deep work trong giờ.
MISSION: làm chắc, tránh drama.`,

  shutdown: `🧾 [EXTRACT 18:00] SHUTDOWN + REVIEW (18:00–18:45)
3 dòng: DONE / LEARNED / NEXT
MISSION: đóng game sạch — mai vào trận nhẹ.`,

  connection: `🍽️ [SAFE ZONE 18:45] WALK + DINNER (18:45–21:10)
• Đi bộ nhẹ trước/hoặc sau ăn
• Không màn hình khi ăn
MISSION: connection + hồi năng lượng.`,

  training: `🏋️ [GYM 21:10] TRAINING + TẮM (21:10–22:10)
RULE: Tập đủ là thắng, không đòi hoàn hảo.
MISSION: hạ tầng (sleep + train) không mặc cả.`,

  deepwork2: `🎮 [BUILD 22:10] DEEP WORK #2 / SHIP (22:10–23:40)
RULE: Ship 1 phần nhỏ (commit/draft/demo).
MISSION: progress > perfection.`,

  winddown: `🌙 [LOW LIGHT 23:40] WIND-DOWN (23:40–00:30)
• Giảm ánh sáng
• Đọc sách giấy
MISSION: hạ nhịp để ngủ sâu.`,

  sleep: `🛡️ [SLEEP 00:30] SLEEP PROTOCOL (00:30–01:30)
RULE: Đi ngủ cố định, ưu tiên hơn mọi thứ.
MISSION: não “save game” qua đêm.`
  ,
  forecast: "" // generated at runtime by buildDailyForecast()
};

const schedules = [
  { hour: 5, minute: 0, slot: "wake" },
  { hour: 5, minute: 20, slot: "prime" },
  { hour: 6, minute: 0, slot: "deepwork1" },
  { hour: 7, minute: 0, slot: "walkbreakfast" },
  { hour: 9, minute: 0, slot: "work" },
  { hour: 18, minute: 0, slot: "shutdown" },
  { hour: 18, minute: 45, slot: "connection" },
  { hour: 20, minute: 0, slot: "forecast" },
  { hour: 21, minute: 10, slot: "training" },
  { hour: 22, minute: 10, slot: "deepwork2" },
  { hour: 23, minute: 40, slot: "winddown" },
  { hour: 0, minute: 30, slot: "sleep" }
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_PATH = path.join(__dirname, "sent-state.json");

function vnNow(date = new Date()) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + 7 * 60 * 60 * 1000);
}

function vnDayKey(date = new Date()) {
  return vnNow(date).toISOString().slice(0, 10);
}

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { sent: {} };
    if (!parsed.sent || typeof parsed.sent !== "object") return { sent: {} };
    return parsed;
  } catch {
    return { sent: {} };
  }
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error("[STATE] write error:", e.message);
  }
}

function pruneState(state, keepDays = 7) {
  const keys = Object.keys(state.sent || {});
  keys.sort();
  const cutoffIdx = Math.max(0, keys.length - keepDays);
  for (let i = 0; i < cutoffIdx; i++) delete state.sent[keys[i]];
}

async function sendTelegram(slot) {
  if (!TOKEN || !CHAT_ID) return;
  const text =
    slot === "forecast"
      ? buildDailyForecast({
          now: new Date(),
          birth: { year: 2001, month: 4, day: 14 },
          altBirth: { year: 2001, month: 3, day: 14 },
          astroMonthTheme: 10
        }).text
      : messages[slot];
  if (!text) return;

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: CHAT_ID, text });
  console.log(`[REMINDER] Sent slot "${slot}" at`, new Date().toISOString());
}

function checkAndSendLoop() {
  const state = loadState();
  pruneState(state);
  saveState(state);

  function tick() {
    const vn = vnNow();

    const h = vn.getHours();
    const m = vn.getMinutes();
    const dayKey = vnDayKey(vn);
    if (!state.sent[dayKey]) state.sent[dayKey] = {};

    schedules.forEach(({ hour, minute, slot }) => {
      const inWindow = h === hour && (m === minute || m === (minute + 1) % 60);

      if (inWindow && !state.sent[dayKey][slot]) {
        state.sent[dayKey][slot] = true;
        pruneState(state);
        saveState(state);
        sendTelegram(slot).catch((err) => {
          console.error("[REMINDER] Send error:", err.response?.data || err.message);
        });
      }
    });
  }

  tick();
  setInterval(tick, 60 * 1000);
}

async function sendAllNow({ delayMs = 450 } = {}) {
  const order = [
    "wake",
    "prime",
    "deepwork1",
    "walkbreakfast",
    "work",
    "shutdown",
    "connection",
    "forecast",
    "training",
    "deepwork2",
    "winddown",
    "sleep"
  ];
  for (const slot of order) {
    await sendTelegram(slot);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/test-noti") {
    const slot = url.searchParams.get("slot") || "wake";
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

  if (url.pathname === "/test-all") {
    const delayMs = Number(url.searchParams.get("delayMs") || "450");
    sendAllNow({ delayMs })
      .then(() => {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Đã bắn test toàn bộ lịch.\n");
      })
      .catch((err) => {
        console.error("[TEST-ALL] error:", err.response?.data || err.message);
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Lỗi khi bắn test toàn bộ.\n");
      });
    return;
  }

  if (url.pathname === "/forecast") {
    const forecast = buildDailyForecast({
      now: new Date(),
      birth: { year: 2001, month: 4, day: 14 },
      altBirth: { year: 2001, month: 3, day: 14 },
      astroMonthTheme: 10
    });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(forecast, null, 2));
    return;
  }

  if (url.pathname === "/slots") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify(
        {
          slots: Object.keys(messages),
          schedules
        },
        null,
        2
      )
    );
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Focus-Flow reminder server is running.\n");
});

server.listen(PORT, () => {
  console.log("Server listening on port", PORT);
  checkAndSendLoop();
});


