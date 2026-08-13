import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the completed app shell and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ko">/i);
  assert.match(html, /<title>하루살림 — 쉬운 돈 관리<\/title>/i);
  assert.match(html, /내 살림을 불러오는 중이에요/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("includes a standalone GitHub Pages entry", async () => {
  const [html, entry, config] = await Promise.all([
    readFile(new URL("../pages/index.html", import.meta.url), "utf8"),
    readFile(new URL("../pages/main.tsx", import.meta.url), "utf8"),
    readFile(new URL("../vite.pages.config.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<html lang="ko">/i);
  assert.match(html, /id="root"/);
  assert.match(entry, /import Home from "\.\.\/app\/page"/);
  assert.match(entry, /createRoot/);
  assert.match(config, /base:\s*"\/harusallim\/"/);
  assert.match(config, /outDir:\s*"\.\.\/pages-dist"/);
});

