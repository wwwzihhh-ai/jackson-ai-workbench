import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requiredFiles = [
  "index.html",
  "src/styles.css",
  "src/app.js",
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/news.json",
  "public/apple-touch-icon.png",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "scripts/fetch-news.mjs",
  ".github/workflows/deploy-pages.yml",
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
const news = JSON.parse(await readFile(resolve(root, "public/news.json"), "utf8"));
const workflow = await readFile(resolve(root, ".github/workflows/deploy-pages.yml"), "utf8");

new Function(app);
new Function(serviceWorker);

for (const fragment of [
  "width=device-width",
  "viewport-fit=cover",
  "apple-mobile-web-app-capable",
  "apple-touch-icon",
  "manifest.webmanifest"
]) {
  if (!html.includes(fragment)) throw new Error(`首页缺少配置：${fragment}`);
}

if (manifest.name !== "Jackson 工作台" || manifest.display !== "standalone") {
  throw new Error("PWA manifest 的应用名称或 display 配置不正确");
}
if (!Array.isArray(news.items) || news.refreshMinutes !== 30) {
  throw new Error("news.json 的数据结构不正确");
}
if (!styles.includes("safe-area-inset-bottom") || !styles.includes("overflow-x: hidden")) {
  throw new Error("iPhone 安全区域或横向滚动保护缺失");
}
if (!styles.includes("--sidebar-width") || !styles.includes("linear-gradient")) {
  throw new Error("侧栏缺少全页绿色背景或响应式宽度配置");
}
if (!app.includes('jackson.ai.workbench.v1.1') || !app.includes("weekSchedule") || !app.includes("lastWeights")) {
  throw new Error("训练数据迁移字段或原 localStorage 标识缺失");
}
if (!app.includes('version: "1.3"') || !app.includes("weightCheckins") || !app.includes("indexedDB.open") || !html.includes("weightForm")) {
  throw new Error("V1.3 体重照片日历、IndexedDB 或打卡表单缺失");
}
if (!serviceWorker.includes("jackson-workbench-v1.3.0") || !html.includes("v=1.3.0")) {
  throw new Error("PWA 缓存或页面资源版本尚未升级到 V1.3");
}
if (!workflow.includes("schedule:") || !workflow.includes("scripts/fetch-news.mjs")) {
  throw new Error("GitHub Actions 缺少定时新闻刷新配置");
}

const productionSource = `${html}\n${app}`;
if (/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(productionSource)) {
  throw new Error("生产代码中存在写死的本地地址");
}
if (/(?:api[_-]?key|password|secret|token)\s*[:=]\s*["'][^"']{8,}["']/i.test(productionSource)) {
  throw new Error("生产代码中疑似存在硬编码敏感信息");
}

console.log("Check complete: JavaScript、PWA、V1.3 体重照片日历、数据迁移和 iPhone 配置均通过。");
