import fs from "fs";
import path from "path";

const IN_PATH = process.env.QUOTES_IN || path.join(process.cwd(), "quotes.json");
const OUT_PATH = process.env.QUOTES_BANK_OUT || path.join(process.cwd(), "quotes-bank.json");

function normalizeLine(s) {
  return s
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .trim();
}

const BLACKLIST = [
  /gradle/i,
  /android/i,
  /compiler/i,
  /jvm/i,
  /kotlin/i,
  /java/i,
  /activity/i,
  /fragment/i,
  /viewmodel/i,
  /sharedpreferences/i,
  /listof|setof|mapof|flatmap|groupby|asSequence/i,
  /screenshot/i,
  /http/i,
  /build/i,
  /tradingview|usdt|btc|pnl|okx/i
];

function looksLikeQuote(line) {
  if (line.length < 24) return false;
  if (line.length > 220) return false;
  if (/^[-*•!«®@#&+$¬=]/.test(line)) return false;
  if (BLACKLIST.some((re) => re.test(line))) return false;
  // Drop noisy lines (too many digits/symbols).
  const chars = line.replace(/\s/g, "");
  const digits = (chars.match(/[0-9]/g) || []).length;
  const letters = (chars.match(/[A-Za-zÀ-ỹà-ỹ]/g) || []).length;
  const symbols = chars.length - digits - letters;
  if (digits / Math.max(1, chars.length) > 0.18) return false;
  if (symbols / Math.max(1, chars.length) > 0.35) return false;
  if (letters / Math.max(1, chars.length) < 0.55) return false;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;
  const uppers = (chars.match(/[A-ZÀ-Ỹ]/g) || []).length;
  if (uppers / Math.max(1, letters) > 0.55) return false;
  // prefer lines with punctuation / structure
  const hasPunct = /[—–:;,.!?]/.test(line);
  const hasMeaningWords = /kỷ luật|hệ thống|thị trường|giàu|không|mua|bán|đúng|sai|tĩnh|trục|năng lượng|tần số|dao động|chu kỳ|hành động|tốc độ|hoàn hảo|cấu trúc|không thương lượng|mission|rule|focus|flow|industrial revolution/i.test(
    line
  );
  return hasMeaningWords && (hasPunct || line.length >= 32);
}

function main() {
  if (!fs.existsSync(IN_PATH)) {
    console.error("Missing quotes.json at", IN_PATH);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(IN_PATH, "utf8"));
  const items = raw.items || [];

  const set = new Set();
  for (const it of items) {
    const arr = Array.isArray(it.quotes) ? it.quotes : [];
    for (const q of arr) {
      const line = normalizeLine(String(q || ""));
      if (!line) continue;
      if (!looksLikeQuote(line)) continue;
      set.add(line);
    }
  }

  const quotes = Array.from(set);
  quotes.sort((a, b) => a.localeCompare(b, "vi"));

  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: quotes.length,
        quotes
      },
      null,
      2
    )
  );
  console.log("Wrote", OUT_PATH, "count:", quotes.length);
}

main();

