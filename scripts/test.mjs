import { spawn } from "node:child_process";
import { normalizeArticles, parseGdeltDate } from "./fetch-news.mjs";

const port = 43000 + Math.floor(Math.random() * 1000);
const host = "127.0.0.1";
const child = spawn(process.execPath, ["scripts/dev.mjs"], {
  env: { ...process.env, HOST: host, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

async function waitForServer() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/`);
      if (response.ok) return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 150));
    }
  }
  throw new Error("开发服务器未能按时启动");
}

try {
  await waitForServer();
  const [home, manifestResponse, worker, icon, newsResponse] = await Promise.all([
    fetch(`http://${host}:${port}/`),
    fetch(`http://${host}:${port}/manifest.webmanifest`),
    fetch(`http://${host}:${port}/sw.js`),
    fetch(`http://${host}:${port}/icons/icon-192.png`),
    fetch(`http://${host}:${port}/news.json`)
  ]);

  const homeText = await home.text();
  const manifest = await manifestResponse.json();
  const news = await newsResponse.json();

  if (!homeText.includes("Jackson 工作台")) throw new Error("首页内容不正确");
  if (!homeText.includes('id="sidebarToggle"') || !homeText.includes('aria-controls="primarySidebar"')) throw new Error("侧栏折叠控件不可用");
  if (manifest.display !== "standalone") throw new Error("manifest 未启用 standalone");
  if (!worker.ok || !icon.ok) throw new Error("PWA 静态资源无法访问");
  if (!Array.isArray(news.items) || news.refreshMinutes !== 30) throw new Error("新闻数据文件不可用");

  const normalized = normalizeArticles("A股", {
    articles: [
      {
        title: "测试中文财经新闻标题",
        url: "https://example.com/finance/1",
        domain: "example.com",
        seendate: "20260802T123456Z"
      },
      {
        title: "测试中文财经新闻标题",
        url: "https://example.com/finance/2",
        domain: "example.com",
        seendate: "20260802T123457Z"
      },
      {
        title: "不安全链接应被忽略",
        url: "http://example.com/finance/3",
        seendate: "20260802T123458Z"
      }
    ]
  });

  if (parseGdeltDate("20260802T123456Z") !== "2026-08-02T12:34:56.000Z") {
    throw new Error("GDELT 日期转换失败");
  }
  if (normalized.length !== 1) throw new Error("新闻 HTTPS 校验或标题去重失败");

  console.log("Test complete: 本地服务、PWA 资源和新闻数据校验均通过。");
} finally {
  child.kill("SIGTERM");
}
