import { cp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = join(root, "dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await cp(join(root, "index.html"), join(output, "index.html"));
await cp(join(root, "src"), join(output, "src"), { recursive: true });

for (const entry of await readdir(join(root, "public"))) {
  await cp(join(root, "public", entry), join(output, entry), { recursive: true });
}

const requiredOutputs = [
  "index.html",
  "src/styles.css",
  "src/app.js",
  "manifest.webmanifest",
  "sw.js",
  "apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

for (const relativePath of requiredOutputs) {
  const file = join(output, relativePath);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) {
    throw new Error(`构建缺少文件：${relativePath}`);
  }
}

const builtHtml = await readFile(join(output, "index.html"), "utf8");
if (!builtHtml.includes("manifest.webmanifest") || !builtHtml.includes("apple-touch-icon")) {
  throw new Error("构建后的首页缺少 PWA 或 iOS 图标配置");
}

console.log(`Build complete: ${output}`);
