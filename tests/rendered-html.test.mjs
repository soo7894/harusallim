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
  assert.match(html, /<title>하루살림 앱 — 쉬운 돈 관리<\/title>/i);
  assert.match(html, /property="og:image"/i);
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/i);
  assert.match(html, /rel="apple-touch-icon"/i);
  assert.match(html, /src="\.\/assets\//i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("ships an installable PWA shell", async () => {
  const [manifestText, serviceWorker, installCard] = await Promise.all([
    readFile(new URL("../dist/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../dist/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../app/components/install-app-card.tsx", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
  assert.match(serviceWorker, /harusallim-app-v1/);
  assert.match(installCard, /beforeinstallprompt/);
  assert.match(installCard, /홈 화면에 하루살림 설치/);
});

test("ships the finished app without internal hosting or server-only code", async () => {
  const bundles = await readBuiltJavascript();
  const [page, model, packageJson, viteConfig] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/finance/model.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /하루살림/);
  assert.match(page, /useStockPrices/);
  assert.match(model, /localStorage/);
  assert.match(bundles.join("\n"), /구글 계정으로/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|cloudflare/i);
  assert.doesNotMatch(viteConfig, /hosting\.json|sites\(\)/i);
});
