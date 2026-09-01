const fs = require("fs");
const path = require("path");

const { readFile, writeFile } = fs.promises;

const repoRoot = process.cwd();
const docsDataPath = path.join(repoRoot, "data", "docsData.json");
const versionDir = path.join(repoRoot, "docs", "version");

const checkLinkConcurrency = 8;
const checkLinkTimeoutMs = 10000;
const checkLinkMaxAttempts = 3;
const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

async function requestLink(url, method) {
  try {
    const resp = await fetch(url, {
      method,
      headers: method === "GET" ? { Range: "bytes=0-0" } : undefined,
      signal: AbortSignal.timeout(checkLinkTimeoutMs),
    });
    if (method === "GET") {
      await resp.body?.cancel();
    }
    return { ok: resp.ok, status: resp.status, method };
  } catch (error) {
    return { ok: false, error: error.message, method };
  }
}

async function checkLink(url) {
  let result;
  for (let attempt = 1; attempt <= checkLinkMaxAttempts; attempt += 1) {
    result = await requestLink(url, "HEAD");
    if (result.ok) return { ...result, attempt };

    result = await requestLink(url, "GET");
    if (result.ok) return { ...result, attempt };
    if (result.status && !retryableStatuses.has(result.status)) break;
  }
  return result;
}

async function checkLinks(apps) {
  const urls = apps.flatMap(({ versions }) => versions.map(({ url }) => url));
  const results = new Map();
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex];
      nextIndex += 1;
      results.set(url, await checkLink(url));
    }
  }
  const workerCount = Math.min(checkLinkConcurrency, urls.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function renderPage(app, results) {
  const lines = [
    "---",
    "layout: home",
    "",
    "hero:",
    `  name: ${JSON.stringify(app.hero.name)}`,
    `  text: ${JSON.stringify(app.hero.text)}`,
    `  tagline: ${app.hero.tagline}`,
    "",
    "features:",
  ];
  for (const version of app.versions) {
    const status = results.get(version.url)?.ok ? "" : "[Invalid]";
    const detail = [status, version.detail].filter(Boolean).join(" ");
    lines.push(
      `  - title: ${version.name}`,
      `    details:${detail ? ` ${JSON.stringify(detail)}` : ""}`,
      "    linkText: Download",
      `    link: ${version.url}`,
      "",
    );
  }
  lines.pop();
  lines.push("---", "");
  return lines.join("\n");
}

function renderIndex(data) {
  const lines = [
    "---",
    "layout: home",
    "",
    "hero:",
    `  name: ${JSON.stringify(data.index.hero.name)}`,
    `  text: ${JSON.stringify(data.index.hero.text)}`,
    `  tagline: ${data.index.hero.tagline}`,
    "",
    "features:",
  ];
  for (const app of data.apps) {
    const pageName = app.hero.name;
    const detail =
      app.versions.length > 0
        ? `${app.versions[0].name} ~ ${app.versions.at(-1).name}`
        : "";
    lines.push(
      `  - title: ${pageName}`,
      `    details:${detail ? ` ${JSON.stringify(detail)}` : ""}`,
      "    linkText: Open",
      `    link: /version/${pageName}`,
      "",
    );
  }
  lines.pop();
  lines.push("---", "");
  return lines.join("\n");
}

async function main() {
  const docsData = JSON.parse(await readFile(docsDataPath, "utf8"));
  const checkResults = await checkLinks(docsData.apps);
  await Promise.all([
    ...docsData.apps.map((app) =>
      writeFile(
        path.join(versionDir, `${app.hero.name}.md`),
        renderPage(app, checkResults),
        "utf8",
      ),
    ),
    writeFile(
      path.join(repoRoot, "docs", "index.md"),
      renderIndex(docsData),
      "utf8",
    ),
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
