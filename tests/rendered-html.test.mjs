import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

async function readBuiltJavascript() {
  const assetUrl = new URL("../dist/assets/", import.meta.url);
  const names = await readdir(assetUrl);
  const javascript = names.filter((name) => name.endsWith(".js"));
  return Promise.all(javascript.map((name) => readFile(new URL(name, assetUrl), "utf8")));
}

test("builds a GitHub Pages-ready Korean document", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /<html lang="ko">/i);
  assert.match(html, /<title>하루살림 — 쉬운 돈 관리<\/title>/i);
  assert.match(html, /property="og:image"/i);
  assert.match(html, /src="\.\/assets\//i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("ships the public homepage with a separate app link", async () => {
  const bundles = await readBuiltJavascript();
  const [page, model, packageJson, viteConfig] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/finance/model.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /하루살림/);
  assert.match(page, /\.\/app\//);
  assert.match(model, /localStorage/);
  assert.match(bundles.join("\n"), /하루살림 앱 열기/);
  assert.doesNotMatch(bundles.join("\n"), /구글 계정으로 계속하기/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|cloudflare/i);
  assert.doesNotMatch(viteConfig, /hosting\.json|sites\(\)/i);
});
