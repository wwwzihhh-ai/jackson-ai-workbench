import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requiredFiles = [
  "index.html",
  "src/styles.css",
  "src/app.js",
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/apple-touch-icon.png",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "vercel.json",
  ".env.example",
  ".gitignore",
  "README.md"
];

for (const relativePath of requiredFiles) {
  const info = await stat(resolve(root, relativePath)).catch(() => null);
  if (!info?.isFile()) throw new Error(`缺少必需文件：${relativePath}`);
}

const html = await readFile(resolve(root, "index.html"), "utf8");
const app = await readFile(resolve(root, "src/app.js"), "utf8");
const styles = await readFile(resolve(root, "src/styles.css"), "utf8");
const serviceWorker = await readFile(resolve(root, "public/sw.js"), "utf8");
const manifest = JSON.parse(await readFile(resolve(root, "public/manifest.webmanifest"), "utf8"));

new Function(app);
new Function(serviceWorker);

const requiredHtmlFragments = [
  "width=device-width",
  "viewport-fit=cover",
  "apple-mobile-web-app-capable",
  "apple-touch-icon",
  "manifest.webmanifest"
];
for (const fragment of requiredHtmlFragments) {
  if (!html.includes(fragment)) throw new Error(`首页缺少配置：${fragment}`);
}

if (manifest.name !== "Jackson 工作台" || manifest.display !== "standalone") {
  throw new Error("PWA manifest 的应用名称或 display 配置不正确");
}
if (!styles.includes("safe-area-inset-bottom") || !styles.includes("overflow-x: hidden")) {
  throw new Error("iPhone 安全区域或横向滚动保护缺失");
}

const productionSource = `${html}\n${app}`;
if (/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(productionSource)) {
  throw new Error("生产代码中存在写死的本地地址");
}
if (/(?:api[_-]?key|password|secret|token)\s*[:=]\s*["'][^"']{8,}["']/i.test(productionSource)) {
  throw new Error("生产代码中疑似存在硬编码敏感信息");
}

console.log("Check complete: JavaScript、PWA、iPhone 和敏感信息检查均通过。");
