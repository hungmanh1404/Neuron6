import fs from "fs";
import path from "path";
import { createWorker } from "tesseract.js";

const SRC_DIR = process.env.QUOTES_DIR || "/Users/manh.nguyen/Desktop/nono";
const OUT_PATH = process.env.QUOTES_OUT || path.join(process.cwd(), "quotes.json");

function listImages(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => /\.(png|jpg|jpeg|webp)$/i.test(n))
    .sort((a, b) => a.localeCompare(b));
}

function normalizeText(raw) {
  return raw
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractQuoteCandidates(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Heuristic: keep lines that look like quotes/insights, drop IDE/UI noise.
  const blacklist = [
    /gradle/i,
    /android/i,
    /build/i,
    /settings/i,
    /current version/i,
    /difference/i,
    /resource manager/i,
    /commit/i
  ];

  const good = lines.filter((l) => !blacklist.some((re) => re.test(l)));

  // Prefer medium-length lines (not a single word, not huge paragraphs).
  return good
    .filter((l) => l.length >= 18 && l.length <= 220)
    .slice(0, 8);
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error("QUOTES_DIR not found:", SRC_DIR);
    process.exit(1);
  }

  const files = listImages(SRC_DIR);
  if (!files.length) {
    console.error("No images found in:", SRC_DIR);
    process.exit(1);
  }

  const worker = await createWorker("eng+vie");
  const out = [];

  for (let i = 0; i < files.length; i++) {
    const name = files[i];
    const full = path.join(SRC_DIR, name);
    console.log(`[OCR] ${i + 1}/${files.length} ${name}`);

    const { data } = await worker.recognize(full);
    const text = normalizeText(data.text || "");
    const candidates = extractQuoteCandidates(text);

    out.push({
      file: name,
      path: full,
      text,
      quotes: candidates
    });
  }

  await worker.terminate();

  fs.writeFileSync(OUT_PATH, JSON.stringify({ sourceDir: SRC_DIR, generatedAt: new Date().toISOString(), items: out }, null, 2));
  console.log("Wrote:", OUT_PATH);
}

main().catch((e) => {
  console.error("OCR error:", e);
  process.exit(1);
});

