import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

function sumDigits(n) {
  const s = String(Math.abs(n)).replace(/\D/g, "");
  let total = 0;
  for (const ch of s) total += Number(ch);
  return total;
}

function reduceTo1to9(n) {
  let x = Math.abs(Number(n)) || 0;
  while (x > 9) x = sumDigits(x);
  return x === 0 ? 9 : x;
}

function ymdKeyVN(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const vn = new Date(utc + 7 * 60 * 60 * 1000);
  const y = vn.getFullYear();
  const m = String(vn.getMonth() + 1).padStart(2, "0");
  const d = String(vn.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ymdKeyVNOffset(date, offsetDays) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const vn = new Date(utc + 7 * 60 * 60 * 1000);
  vn.setDate(vn.getDate() + offsetDays);
  const y = vn.getFullYear();
  const m = String(vn.getMonth() + 1).padStart(2, "0");
  const d = String(vn.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function pickN(rand, arr, n) {
  const copy = arr.slice();
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function starsFromScore10(score10) {
  const s = clamp(Math.round(score10 / 2), 1, 5);
  return { stars: s, text: "★".repeat(s) + "☆".repeat(5 - s) };
}

function sunSignFor(month, day) {
  // Tropical, simplified. Only need Mar 14 vs Apr 14 here.
  if (month === 3 && day === 14) return "Pisces (Song Ngư)";
  if (month === 4 && day === 14) return "Aries (Bạch Dương)";
  // fallback
  return "Unknown";
}

const MAJOR_ARCANA = [
  "The Fool",
  "The Magician",
  "The High Priestess",
  "The Empress",
  "The Emperor",
  "The Hierophant",
  "The Lovers",
  "The Chariot",
  "Strength",
  "The Hermit",
  "Wheel of Fortune",
  "Justice",
  "The Hanged Man",
  "Death",
  "Temperance",
  "The Devil",
  "The Tower",
  "The Star",
  "The Moon",
  "The Sun",
  "Judgement",
  "The World"
];

const HUD_LINES = [
  "MISSION: hành động nhỏ > cảm xúc lớn.",
  "RULE: 1 task. Không loot thêm.",
  "SAFE ZONE: tập + ngủ là hạ tầng.",
  "EXTRACT: ship 1 phần nhỏ trước khi nghỉ.",
  "ANTI-DRAMA: pause 90s → viết ra → làm 1 bước.",
  "NOISE CUT: tắt thông báo, giữ aim.",
  "LOCK-IN: 50 phút — không thương lượng.",
  "ONE BULLET: bắn một phát trúng (1 việc), đừng xả băng.",
  "MICRO-WIN: thắng nhỏ 5 phút để kéo momentum.",
  "STAMINA: nếu đuối — đi bộ 10', rồi quay lại.",
  "DON'T CHASE MOOD: làm trước, cảm hứng theo sau.",
  "CLEAN LOOT: dọn bàn/desktop 2 phút rồi vào trận.",
  "HARD RESET: uống nước + thở chậm 10 hơi.",
  "NEVER MISS TWICE: trượt 1 ngày, mai chạy 80/20."
];

const BOOSTS = [
  {
    by: "Gia Cát Lượng",
    line: "Giữ tĩnh, giữ trục. Một bước đúng hướng hơn ngàn bước vội."
  },
  {
    by: "Lưu Bá Ôn",
    line: "Thế cục mạnh nhất là kỷ luật đều. Đừng cược vào cảm hứng."
  },
  {
    by: "Gia Cát Lượng",
    line: "Thắng là do thế và do nhẫn. Hôm nay chỉ cần đúng nhịp."
  },
  {
    by: "Lưu Bá Ôn",
    line: "Biết bỏ đúng lúc là trí tuệ. Cắt 1 việc để giữ trục."
  },
  {
    by: "Einstein",
    line: "Đơn giản hóa cho tới khi còn đúng bản chất — rồi làm ngay."
  },
  {
    by: "Einstein",
    line: "Không phải làm nhiều hơn; là làm đúng điều quan trọng hơn."
  },
  {
    by: "Tesla",
    line: "Năng lượng theo sự chú ý. Khóa tần số vào một mục tiêu."
  },
  {
    by: "Tesla",
    line: "Nhịp ổn định tạo ra công suất. Bắt đầu trước, tinh chỉnh sau."
  },
  {
    by: "Một quân sư giỏi",
    line: "Kỷ luật là vũ khí. Cảm xúc là thời tiết. Bạn là người lái."
  }
];

function loadQuoteBank() {
  try {
    // Optional file generated from OCR. If missing, we fall back gracefully.
    // Keep it local so deploy bundles it.
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const p = path.join(__dirname, "quotes-bank.json");
    if (!fs.existsSync(p)) return null;
    const bank = JSON.parse(fs.readFileSync(p, "utf8"));
    const quotes = Array.isArray(bank.quotes) ? bank.quotes : [];
    return quotes.filter((q) => typeof q === "string" && q.trim().length >= 12);
  } catch {
    return null;
  }
}

export function buildDailyForecast({
  now = new Date(),
  birth = { year: 2001, month: 4, day: 14 },
  altBirth = { year: 2001, month: 3, day: 14 },
  astroMonthTheme = 10
} = {}) {
  // 20:00 hôm nay => dự báo cho NGÀY MAI (VN time).
  const generatedAtKey = ymdKeyVN(now);
  const key = ymdKeyVNOffset(now, 1); // forecast-for date
  const seed = hashSeed(`${key}|${birth.year}-${birth.month}-${birth.day}|theme:${astroMonthTheme}`);
  const rand = mulberry32(seed);

  const lifePath = reduceTo1to9(birth.year + birth.month + birth.day);
  const personalYear = reduceTo1to9(Number(key.slice(0, 4)) + birth.month + birth.day);
  const [y, m, d] = key.split("-").map(Number);
  const personalDay = reduceTo1to9(personalYear + m + d);

  const sign = sunSignFor(birth.month, birth.day);
  const altSign = sunSignFor(altBirth.month, altBirth.day);

  const tarot = pickN(rand, MAJOR_ARCANA, 3);
  const hud = pick(rand, HUD_LINES);
  const boost = pick(rand, BOOSTS);
  const quoteBank = loadQuoteBank();
  const quote = quoteBank && quoteBank.length ? quoteBank[Math.floor(rand() * quoteBank.length)] : null;

  const nextRun = ymdKeyVNOffset(now, 1);

  const freq = pick(rand, ["528Hz", "432Hz", "396Hz", "963Hz"]);
  const action = pick(rand, [
    "Chốt 1 North Star cho ngày mai (1 dòng).",
    "Chuẩn bị loadout: task đầu ngày + đồ tập.",
    "Xóa 1 việc khỏi danh sách (1 việc bỏ đi).",
    "Đặt timer 50m và tắt thông báo trước khi bắt đầu.",
    "Viết 3 dòng shutdown: done / learned / next."
  ]);

  const risk = pick(rand, [
    "Loot quá nhiều tab → mất aim.",
    "Cảm xúc cao → bấm gửi tin nhắn vội.",
    "Lướt màn hình khi ăn → tụt stamina.",
    "Perfecting quá lâu → không ship.",
    "Ngủ muộn → mai lag."
  ]);

  const theme = astroMonthTheme === 10 ? "Tháng 10 (Libra/Scorpio season vibe)" : `Theme tháng ${astroMonthTheme}`;

  // Overall score for tomorrow (deterministic): combine personalDay + a tiny RNG jitter.
  // Goal: quick glance, not "truth".
  const jitter = Math.round((rand() - 0.5) * 4); // -2..2
  const score10 = clamp(6 + (personalDay - 5) + jitter, 1, 10);
  const star = starsFromScore10(score10);

  const text =
    `🎮 DAILY FORECAST · ${key} (FOR TOMORROW)\n` +
    `⭐ Overall: ${star.text}  (${score10}/10)\n` +
    `—\n` +
    `🔢 Numerology\n` +
    `• Life Path: ${lifePath}\n` +
    `• Personal Year: ${personalYear}\n` +
    `• Personal Day: ${personalDay}\n` +
    `\n` +
    `🪐 Astrology (giải trí)\n` +
    `• Sun sign: ${sign}\n` +
    `• Theme: ${theme}\n` +
    `• Note: nếu bạn sinh 14/03/2001 thì sun sign sẽ là ${altSign}.\n` +
    `\n` +
    `🃏 Tarot (1 draw / 3 cards)\n` +
    `• Past: ${tarot[0]}\n` +
    `• Present: ${tarot[1]}\n` +
    `• Action: ${tarot[2]}\n` +
    `\n` +
    `📡 Frequency drill (nghe 8–12')\n` +
    `• ${freq} + thở chậm, mắt nhắm, 10 hơi.\n` +
    `\n` +
    `✅ Tomorrow mission\n` +
    `• ${action}\n` +
    `• Tránh: ${risk}\n` +
    `• ${hud}\n` +
    `\n` +
    `🧠 Boost (inspired by ${boost.by})\n` +
    `${boost.line}\n` +
    (quote ? `\n💬 Quote drop (from your vault)\n${quote}\n` : "") +
    `—\n` +
    `Generated at: ${generatedAtKey} 20:00 (VN)\n` +
    `Next run: ${nextRun} 20:00 (VN)`;

  return {
    key,
    text,
    meta: { lifePath, personalYear, personalDay, sign, tarot, freq, theme, score10, stars: star.stars, starsText: star.text }
  };
}

