import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "public", "news.json");
const endpoint = "https://api.gdeltproject.org/api/v2/doc/doc";
const refreshMinutes = 30;

export const NEWS_QUERIES = [
  { category: "A股", query: "(A股 OR 沪指 OR 深证 OR 上证 OR 科创板) sourcelang:Chinese" },
  { category: "美股", query: "(美股 OR 纳斯达克 OR 标普500 OR 道琼斯) sourcelang:Chinese" },
  { category: "宏观", query: "(宏观经济 OR 央行 OR 利率 OR 通胀 OR GDP) sourcelang:Chinese" }
];

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

export function parseGdeltDate(value) {
  if (typeof value !== "string") return null;
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  const date = compact
    ? new Date(`${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}Z`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizedTitle(value) {
  return String(value || "")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .slice(0, 160);
}

function stableId(category, url, title) {
  let hash = 2166136261;
  for (const character of `${category}|${url}|${title}`) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${category}-${(hash >>> 0).toString(36)}`;
}

export function normalizeArticles(category, payload, globalTitles = new Set(), globalUrls = new Set()) {
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  const normalized = [];

  for (const article of articles) {
    const title = typeof article?.title === "string" ? article.title.trim() : "";
    const titleKey = normalizedTitle(title);
    const publishedAt = parseGdeltDate(article?.seendate);
    let parsedUrl;
    try {
      parsedUrl = new URL(article?.url);
    } catch {
      continue;
    }

    if (!title || title.length < 6 || !publishedAt || parsedUrl.protocol !== "https:") continue;
    if (globalTitles.has(titleKey) || globalUrls.has(parsedUrl.href)) continue;

    const domain = typeof article?.domain === "string" && article.domain.trim()
      ? article.domain.trim().replace(/^www\./i, "")
      : parsedUrl.hostname.replace(/^www\./i, "");

    globalTitles.add(titleKey);
    globalUrls.add(parsedUrl.href);
    normalized.push({
      id: stableId(category, parsedUrl.href, title),
      category,
      title,
      url: parsedUrl.href,
      domain,
      publishedAt,
      language: "Chinese"
    });

    if (normalized.length === 5) break;
  }

  return normalized;
}

async function requestCategory({ category, query }) {
  const params = new URLSearchParams({
    query,
    mode: "artlist",
    maxrecords: "50",
    timespan: "48h",
    sort: "datedesc",
    format: "json"
  });

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${endpoint}?${params}`, {
        signal: controller.signal,
        headers: { "user-agent": "jackson-ai-workbench-news/1.2" }
      });
      if (!response.ok) throw new Error(`${category} 请求返回 HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload?.articles)) throw new Error(`${category} 返回格式不正确`);
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(8000 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

export async function buildNewsFeed(fetchCategory = requestCategory) {
  const items = [];
  const titles = new Set();
  const urls = new Set();

  for (let index = 0; index < NEWS_QUERIES.length; index += 1) {
    if (index > 0) await wait(6500);
    const config = NEWS_QUERIES[index];
    const payload = await fetchCategory(config);
    const categoryItems = normalizeArticles(config.category, payload, titles, urls);
    if (categoryItems.length === 0) throw new Error(`${config.category} 没有可用的中文 HTTPS 新闻`);
    items.push(...categoryItems);
  }

  return {
    generatedAt: new Date().toISOString(),
    source: "GDELT DOC 2.0",
    refreshMinutes,
    items: items.sort((left, right) => new Date(right.publishedAt) - new Date(left.publishedAt))
  };
}

async function main() {
  const feed = await buildNewsFeed();
  await writeFile(outputPath, `${JSON.stringify(feed, null, 2)}\n`, "utf8");
  console.log(`News updated: ${feed.items.length} items -> ${outputPath}`);
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`News update failed: ${error.message}`);
    process.exitCode = 1;
  });
}
