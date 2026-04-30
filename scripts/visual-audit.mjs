// Multi-viewport visual audit — runs Playwright against the live site
// and captures screenshots for review.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'screenshots', 'audit-2026-04-30');
mkdirSync(OUT, { recursive: true });

const BASE = 'https://schwarz-autoglas.de';
const VIEWPORTS = [
  { name: 'mobile',  width: 375,  height: 812 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];
const PAGES = [
  { name: 'home',         path: '/' },
  { name: 'blog-index',   path: '/blog.html' },
  { name: 'blog-post',    path: '/blog/steinschlag-reparieren-oder-tauschen.html' },
  { name: 'blog-spring',  path: '/blog/fruehjahrs-check-windschutzscheibe-rosenheim.html' },
  { name: 'sa-prien',     path: '/autoglas-prien-am-chiemsee.html' },
  { name: 'sa-endorf',    path: '/autoglas-bad-endorf.html' },
  { name: 'impressum',    path: '/impressum.html' },
  { name: 'datenschutz',  path: '/datenschutz.html' }
];

const issues = [];

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  // Listen for console errors
  page.on('pageerror', err => issues.push(`[${vp.name}] pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') issues.push(`[${vp.name}] console.error: ${msg.text()}`);
  });

  for (const p of PAGES) {
    const file = `${OUT}/${vp.name}-${p.name}.png`;
    try {
      const resp = await page.goto(BASE + p.path, { waitUntil: 'networkidle', timeout: 30000 });
      const status = resp ? resp.status() : 0;
      if (status !== 200) issues.push(`[${vp.name}] ${p.path} → HTTP ${status}`);

      // small wait for any post-load JS (blog cards)
      await page.waitForTimeout(800);

      // Check for horizontal overflow (most common mobile bug)
      const overflow = await page.evaluate(() => {
        const body = document.documentElement;
        return {
          docW: body.scrollWidth,
          viewW: window.innerWidth,
          overflowing: body.scrollWidth > window.innerWidth + 1
        };
      });
      if (overflow.overflowing) {
        issues.push(`[${vp.name}] ${p.path} → horizontal overflow: doc=${overflow.docW}px, viewport=${overflow.viewW}px`);
      }

      await page.screenshot({ path: file, fullPage: true });
      console.log(`✓ ${vp.name}/${p.name} (${status}) ${overflow.overflowing ? 'OVERFLOW' : ''}`);
    } catch (err) {
      issues.push(`[${vp.name}] ${p.path} → ERROR: ${err.message}`);
      console.log(`✗ ${vp.name}/${p.name}: ${err.message}`);
    }
  }
  await ctx.close();
}
await browser.close();

console.log('\n=== ISSUES ===');
if (issues.length === 0) {
  console.log('None.');
} else {
  for (const i of issues) console.log(i);
}
