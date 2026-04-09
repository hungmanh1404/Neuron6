import axios from "axios";
import { buildDailyForecast } from "./forecast.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  process.exit(1);
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
  forecast: buildDailyForecast({
    now: new Date(),
    birth: { year: 2001, month: 4, day: 14 },
    altBirth: { year: 2001, month: 3, day: 14 },
    astroMonthTheme: 10
  }).text
};

const ORDER = [
  "wake",
  "prime",
  "deepwork1",
  "walkbreakfast",
  "work",
  "forecast",
  "shutdown",
  "connection",
  "training",
  "deepwork2",
  "winddown",
  "sleep"
];

function parseArgs(argv) {
  const out = { slot: null, all: false, delayMs: 650 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") out.all = true;
    else if (a === "--slot") out.slot = argv[i + 1] || null;
    else if (a === "--delay") out.delayMs = Number(argv[i + 1] || out.delayMs);
  }
  return out;
}

async function send(text) {
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: CHAT_ID, text });
}

function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.all) {
    for (const slot of ORDER) {
      await send(messages[slot]);
      await sleepMs(args.delayMs);
    }
    console.log("Sent all slots:", ORDER.join(", "));
    return;
  }

  const slot = args.slot || "wake";
  if (!messages[slot]) {
    console.error("Unknown slot:", slot);
    console.error("Available slots:", Object.keys(messages).join(", "));
    process.exit(1);
  }
  await send(messages[slot]);
  console.log("Sent slot:", slot);
}

main().catch((err) => {
  console.error("Send error:", err.response?.data || err.message);
  process.exit(1);
});

