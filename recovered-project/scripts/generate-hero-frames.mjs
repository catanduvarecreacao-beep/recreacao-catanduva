import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);
const publicDir = path.resolve("public");
const source = path.join(publicDir, "hero.mp4");
const outputDir = path.join(publicDir, "hero-frames");
const frameCount = 60;

if (!ffmpegPath) throw new Error("Binário FFmpeg não disponível nesta plataforma.");
if (!existsSync(source)) throw new Error(`Vídeo de origem não encontrado: ${source}`);

let duration = 0;
try {
  await execFileAsync(ffmpegPath, ["-hide_banner", "-i", source], { maxBuffer: 1024 * 1024 });
} catch (error) {
  const details = String(error.stderr || "");
  const match = details.split("Duration:")[1]?.trim().match(/^([0-9]{2}):([0-9]{2}):([0-9]+([.][0-9]+)?)/);
  if (match) duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}
if (!duration || !Number.isFinite(duration)) {
  throw new Error("Não foi possível identificar a duração de hero.mp4.");
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
const fps = frameCount / duration;
const pattern = path.join(outputDir, "frame-%03d.webp");
await execFileAsync(ffmpegPath, [
  "-hide_banner", "-loglevel", "error", "-y",
  "-i", source,
  "-vf", `fps=${fps.toFixed(8)},scale='min(1280,iw)':-2:flags=lanczos`,
  "-frames:v", String(frameCount),
  "-c:v", "libwebp", "-quality", "72", "-compression_level", "5",
  "-start_number", "1",
  pattern
], { maxBuffer: 8 * 1024 * 1024 });

const generated = readdirSync(outputDir).filter((name) => name.endsWith(".webp"));
if (generated.length !== frameCount) {
  throw new Error(`Esperados ${frameCount} quadros, gerados ${generated.length}.`);
}
console.log(`Sequência hero pronta: ${generated.length} quadros WebP, duração ${duration.toFixed(2)}s.`);
