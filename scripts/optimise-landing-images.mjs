/**
 * Re-encodes the landing-page PNGs that Lighthouse flags under
 * "Improve image delivery". Sources are never modified — WebP siblings are
 * written next to them, sized for how they actually render on the page.
 *
 * Usage:  node scripts/optimise-landing-images.mjs
 */
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const landing = join(root, "public", "images", "landing");

/** @type {{ src: string, out: string, width: number, quality?: number }[]} */
const JOBS = [
  // Hero / download mockup — ~420css px, 2x for retina
  { src: "hero-phone.png", out: "hero-phone.webp", width: 840, quality: 78 },
  { src: "hero-phone.png", out: "hero-phone-420.webp", width: 420, quality: 78 },
  // Features phone screen is 1533×3317 but shown ~465css wide
  { src: "features-phone-screen.png", out: "features-phone-screen.webp", width: 600, quality: 72 },
  { src: "features-phone-frame.png", out: "features-phone-frame.webp", width: 518, quality: 80 },
  { src: "platform-phones.png", out: "platform-phones.webp", width: 1200, quality: 78 },
  { src: "bento-pos.png", out: "bento-pos.webp", width: 900, quality: 78 },
  { src: "bento-reports.png", out: "bento-reports.webp", width: 900, quality: 78 },
];

function kb(path) {
  return (statSync(path).size / 1024).toFixed(1);
}

for (const job of JOBS) {
  const input = join(landing, job.src);
  const output = join(landing, job.out);
  await sharp(input)
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: job.quality ?? 78, effort: 6 })
    .toFile(output);
  console.log(`${job.src} ${kb(input)}KB → ${job.out} ${kb(output)}KB (w=${job.width})`);
}
