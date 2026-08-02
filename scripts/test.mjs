import { spawn } from "node:child_process";

const port = 43000 + Math.floor(Math.random() * 1000);
const host = "0.0.0.0";
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
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("开发服务器未能按时启动");
}

try {
  await waitForServer();
  const [home, manifestResponse, worker, icon] = await Promise.all([
    fetch(`http://${host}:${port}/`),
    fetch(`http://${host}:${port}/manifest.webmanifest`),
    fetch(`http://${host}:${port}/sw.js`),
    fetch(`http://${host}:${port}/icons/icon-192.png`)
  ]);

  const homeText = await home.text();
  const manifest = await manifestResponse.json();

  if (!homeText.includes("Jackson 工作台")) throw new Error("首页内容不正确");
  if (manifest.display !== "standalone") throw new Error("manifest 未启用 standalone");
  if (!worker.ok || !icon.ok) throw new Error("PWA 静态资源无法访问");

  console.log("Test complete: 本地服务与关键 PWA 资源访问正常。");
} finally {
  child.kill("SIGTERM");
}
