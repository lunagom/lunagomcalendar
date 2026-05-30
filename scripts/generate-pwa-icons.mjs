// scripts/generate-pwa-icons.mjs
// public/lunabear.png (1024x1024 RGBA) 마스터에서 PWA / iOS / shortcut 아이콘 생성.
// 실행: pnpm gen:icons

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "public", "lunabear.png");
const PUBLIC = join(ROOT, "public");
const ICONS_DIR = join(PUBLIC, "icons");

await mkdir(ICONS_DIR, { recursive: true });

async function transparentResize(size, outName) {
  await sharp(SRC).resize(size, size).png({ compressionLevel: 9 }).toFile(join(PUBLIC, outName));
  console.log(`  ✓ ${outName} (${size}×${size}, transparent)`);
}

async function paddedIcon({ size, innerRatio, bg, outPath, label }) {
  const innerSize = Math.round(size * innerRatio);
  const inner = await sharp(SRC).resize(innerSize, innerSize).png().toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { ...bg, alpha: 1 },
    },
  })
    .composite([{ input: inner, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`  ✓ ${label}`);
}

console.log("PWA 아이콘 생성 중...");

await transparentResize(192, "icon-192.png");
await transparentResize(512, "icon-512.png");

// Maskable — 안드로이드 적응형 아이콘. 80% 안전영역, 흰 배경.
await paddedIcon({
  size: 512,
  innerRatio: 0.8,
  bg: { r: 255, g: 255, b: 255 },
  outPath: join(PUBLIC, "icon-maskable-512.png"),
  label: "icon-maskable-512.png (512×512, white bg, 80% safe area)",
});

// Apple touch icon — iOS 홈화면. 흰 배경 강제 (iOS 알파 처리 못함).
await paddedIcon({
  size: 180,
  innerRatio: 0.88,
  bg: { r: 255, g: 255, b: 255 },
  outPath: join(PUBLIC, "apple-touch-icon.png"),
  label: "apple-touch-icon.png (180×180, white bg)",
});

// PWA shortcuts (96×96) — 색 톤으로 카테고리 구분.
await paddedIcon({
  size: 96,
  innerRatio: 0.78,
  bg: { r: 254, g: 226, b: 226 }, // light red (지출)
  outPath: join(ICONS_DIR, "shortcut-expense.png"),
  label: "icons/shortcut-expense.png (96×96, red tint)",
});

await paddedIcon({
  size: 96,
  innerRatio: 0.78,
  bg: { r: 209, g: 250, b: 229 }, // light green (수입)
  outPath: join(ICONS_DIR, "shortcut-income.png"),
  label: "icons/shortcut-income.png (96×96, green tint)",
});

console.log("✓ 완료");
