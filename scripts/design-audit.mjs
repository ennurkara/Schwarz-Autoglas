// Comprehensive design audit — Playwright across mobile/tablet/desktop.
// Visits every page, clicks through interactive elements, records all issues.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'screenshots', 'design-audit');
mkdirSync(OUT, { recursive: true });

const BASE = process.env.AUDIT_BASE || 'https://schwarz-autoglas.de';
const VIEWPORTS = [
  { name: 'mobile',  width: 375,  height: 812,  isMobile: true },
  { name: 'tablet',  width: 768,  height: 1024, isMobile: false },
  { name: 'desktop', width: 1440, height: 900,  isMobile: false }
];

const issues = [];
function log(severity, viewport, page, message) {
  issues.push({ severity, viewport, page, message });
  console.log(`[${severity}] [${viewport}] ${page} → ${message}`);
}

async function checkOverflow(page, viewport, label) {
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth;
    const viewW = window.innerWidth;
    if (docW <= viewW + 1) return null;
    // Find which element overflows
    const all = Array.from(document.querySelectorAll('body *'));
    const offenders = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.right > viewW + 1 && r.width < viewW + 200) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && typeof el.className === 'string' ? el.className.slice(0, 60) : ''),
          right: Math.round(r.right),
          width: Math.round(r.width)
        });
      }
    }
    return { docW, viewW, offenders: offenders.slice(0, 5) };
  });
  if (overflow) {
    const off = overflow.offenders.map(o => `${o.tag}.${o.cls}@${o.right}px`).join(' | ');
    log('HIGH', viewport, label, `H-overflow ${overflow.docW}px > ${overflow.viewW}px [${off}]`);
  }
}

async function checkConsoleErrors(page, viewport, label) {
  // Listen via attached handlers
}

async function checkTapTargets(page, viewport, label) {
  if (viewport !== 'mobile') return;
  const small = await page.evaluate(() => {
    const targets = Array.from(document.querySelectorAll('a, button, [role="button"], input, select, textarea'));
    const tooSmall = [];
    for (const el of targets) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // hidden
      if (r.width < 44 || r.height < 44) {
        // Skip inline links inside text content (exempted per WCAG 2.5.5 Note)
        const isInline = el.tagName === 'A' && el.closest('p, li, h1, h2, h3, h4, h5, h6, .breadcrumbs, .footer-bottom, .form-privacy, .map-consent-text');
        if (isInline) continue;
        tooSmall.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && typeof el.className === 'string' ? el.className.slice(0, 40) : ''),
          text: (el.textContent || '').trim().slice(0, 30),
          w: Math.round(r.width),
          h: Math.round(r.height)
        });
      }
    }
    return tooSmall.slice(0, 8);
  });
  for (const t of small) {
    log('MEDIUM', viewport, label, `tap-target <44px: ${t.tag}.${t.cls} "${t.text}" ${t.w}×${t.h}`);
  }
}

async function checkBrokenImages(page, viewport, label) {
  const broken = await page.evaluate(() => {
    return Array.from(document.images)
      .filter(img => img.complete && img.naturalWidth === 0)
      .map(img => img.currentSrc || img.src)
      .slice(0, 8);
  });
  for (const src of broken) {
    log('HIGH', viewport, label, `broken image: ${src}`);
  }
}

async function instrumentPage(page, viewport, label) {
  page.on('pageerror', err => log('HIGH', viewport, label, `pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      // Ignore expected noise
      if (t.includes('favicon') || t.includes('OTS parsing error')) return;
      log('MEDIUM', viewport, label, `console.error: ${t.slice(0, 200)}`);
    }
  });
  page.on('requestfailed', req => {
    const url = req.url();
    if (url.includes('googletagmanager') || url.includes('google-analytics')) return;
    // ERR_ABORTED happens when Playwright navigates while a long-poll/video/iframe is mid-flight.
    // Not a user-facing issue — happens for hero.mp4 + page.html on rapid navigation between viewports.
    if (req.failure()?.errorText?.includes('ERR_ABORTED')) return;
    log('MEDIUM', viewport, label, `request failed: ${url.slice(-80)} ${req.failure()?.errorText || ''}`);
  });
  page.on('response', resp => {
    const url = resp.url();
    const status = resp.status();
    if (status >= 400 && !url.includes('favicon')) {
      log('HIGH', viewport, label, `${status} on ${url.slice(-80)}`);
    }
  });
}

async function visitPage(ctx, vp, route, label) {
  const page = await ctx.newPage();
  await instrumentPage(page, vp.name, label);
  try {
    // Use 'load' instead of 'networkidle' — slideshow auto-rotate and 3p iframes
    // (Maps consent flow) keep the network busy beyond practical limits.
    const resp = await page.goto(BASE + route, { waitUntil: 'load', timeout: 30000 });
    if (resp.status() !== 200) {
      log('CRITICAL', vp.name, label, `HTTP ${resp.status()}`);
    }
    // Wait for fonts + lazy content
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1200);

    await checkOverflow(page, vp.name, label);
    await checkBrokenImages(page, vp.name, label);
    await checkTapTargets(page, vp.name, label);

    // Initial screenshot (full page)
    await page.screenshot({ path: `${OUT}/${vp.name}-${label}-initial.png`, fullPage: true });

    return page;
  } catch (err) {
    log('CRITICAL', vp.name, label, `navigation error: ${err.message}`);
    await page.close();
    return null;
  }
}

async function testHomepage(ctx, vp) {
  const page = await visitPage(ctx, vp, '/', 'home');
  if (!page) return;

  // Test: burger menu (mobile only)
  if (vp.isMobile) {
    const burger = page.locator('#navBurger');
    if (await burger.isVisible()) {
      await burger.click();
      await page.waitForTimeout(400);
      const open = await page.locator('#navLinks').evaluate(el => el.classList.contains('open'));
      if (!open) log('HIGH', vp.name, 'home', 'burger menu did not open');
      await page.screenshot({ path: `${OUT}/${vp.name}-home-burger-open.png` });
      await checkOverflow(page, vp.name, 'home (burger open)');
      // Check menu fully on screen
      const menuBox = await page.locator('#navLinks.open').boundingBox();
      if (menuBox && menuBox.x + menuBox.width > vp.width + 1) {
        log('HIGH', vp.name, 'home', `burger menu off-screen by ${Math.round(menuBox.x + menuBox.width - vp.width)}px`);
      }
      // Close again
      await page.locator('#navBackdropClick').click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    } else {
      log('HIGH', vp.name, 'home', 'burger button not visible on mobile');
    }
  } else {
    // Desktop: nav links should be visible
    const navVisible = await page.locator('#navLinks').isVisible();
    if (!navVisible) log('HIGH', vp.name, 'home', 'desktop nav not visible');
  }

  // Test: scroll to contact, verify Maps consent UI
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const consentBtn = page.locator('#mapConsentBtn');
  if (!(await consentBtn.isVisible())) {
    log('CRITICAL', vp.name, 'home', 'mapConsentBtn missing — Maps will auto-load (DSGVO violation)');
  } else {
    const wrapper = page.locator('#mapWrapper');
    await wrapper.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    try {
      await wrapper.screenshot({ path: `${OUT}/${vp.name}-home-maps-consent.png` });
    } catch (e) { /* element may be off-screen on tiny viewports */ }
    // Click and verify iframe is injected
    await consentBtn.click();
    await page.waitForTimeout(800);
    const iframeCount = await page.locator('#mapWrapper iframe').count();
    if (iframeCount === 0) log('HIGH', vp.name, 'home', 'Maps consent click did not inject iframe');
    const consentGone = await page.locator('#mapConsent').count();
    if (consentGone > 0) log('LOW', vp.name, 'home', 'consent panel still present after click');
  }

  // Test: form validation
  const submitBtn = page.locator('.contact-form button[type="submit"]');
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await page.waitForTimeout(400);
  const errorCount = await page.locator('.form-group.has-error').count();
  if (errorCount === 0) {
    log('MEDIUM', vp.name, 'home', 'form: no validation errors shown after empty submit');
  }
  await page.screenshot({ path: `${OUT}/${vp.name}-home-form-validation.png`, fullPage: false });

  // Test: rating badge shows a count of N echten Google-Bewertungen
  const badgeText = await page.locator('.rating-badge-text').textContent();
  if (!/\d+\s+echten\s+Google-Bewertungen/i.test(badgeText)) {
    log('MEDIUM', vp.name, 'home', `rating badge unexpected: "${badgeText}"`);
  }

  // Hero readability — text contrast over video
  const heroTextColor = await page.locator('.hero-title').evaluate(el => getComputedStyle(el).color);
  // Just record it; manual check needed
  log('INFO', vp.name, 'home', `hero title color: ${heroTextColor}`);

  await page.close();
}

async function testBlogIndex(ctx, vp) {
  const page = await visitPage(ctx, vp, '/blog.html', 'blog-index');
  if (!page) return;

  // Test: blog cards loaded
  await page.waitForTimeout(1500); // allow JS fetch
  const cardCount = await page.locator('.blog-card').count();
  if (cardCount === 0) {
    log('CRITICAL', vp.name, 'blog-index', 'no blog cards rendered');
  } else if (cardCount < 3) {
    log('HIGH', vp.name, 'blog-index', `only ${cardCount} cards rendered (expected ≥3)`);
  }

  // Test: filter buttons
  const filters = await page.locator('.filter-btn').count();
  if (filters < 2) log('MEDIUM', vp.name, 'blog-index', `only ${filters} filter buttons`);

  // Click second filter (e.g. "Ratgeber")
  const secondFilter = page.locator('.filter-btn').nth(1);
  if (await secondFilter.count()) {
    const label = await secondFilter.textContent();
    await secondFilter.click();
    await page.waitForTimeout(400);
    const filteredCount = await page.locator('.blog-card').count();
    if (filteredCount === 0) {
      log('MEDIUM', vp.name, 'blog-index', `filter "${label.trim()}" produced 0 cards`);
    }
    await page.screenshot({ path: `${OUT}/${vp.name}-blog-filter-${label.trim().toLowerCase()}.png` });
  }

  // Verify card links go to /blog/[slug].html (not #hash)
  const firstHref = await page.locator('.blog-card a').first().getAttribute('href');
  if (!firstHref || !firstHref.startsWith('/blog/')) {
    log('HIGH', vp.name, 'blog-index', `first card href not static: "${firstHref}"`);
  }

  await page.close();
}

async function testBlogPost(ctx, vp) {
  const page = await visitPage(ctx, vp, '/blog/steinschlag-reparieren-oder-tauschen.html', 'blog-post');
  if (!page) return;

  // Verify breadcrumb
  const crumbs = await page.locator('.breadcrumbs').count();
  if (crumbs === 0) log('MEDIUM', vp.name, 'blog-post', 'no breadcrumbs visible');

  // Verify title
  const h1 = await page.locator('h1').first().textContent();
  if (!h1 || h1.length < 5) log('HIGH', vp.name, 'blog-post', 'no <h1> or empty');

  // Verify author byline
  const author = await page.locator('.post-author').count();
  if (author === 0) log('MEDIUM', vp.name, 'blog-post', 'no author byline visible');

  // CTA at end visible
  const cta = page.locator('.post-cta');
  await cta.scrollIntoViewIfNeeded();
  if (!(await cta.isVisible())) log('HIGH', vp.name, 'blog-post', 'CTA card not visible');

  // Click "back to all posts" — Netlify pretty-URLs may strip .html so accept both
  const backHref = await page.locator('.post-back').first().getAttribute('href');
  if (backHref !== '/blog.html' && backHref !== '/blog') {
    log('LOW', vp.name, 'blog-post', `post-back href: "${backHref}" (expected /blog or /blog.html)`);
  }

  await page.close();
}

async function testServiceArea(ctx, vp, slug, label) {
  const page = await visitPage(ctx, vp, `/${slug}.html`, label);
  if (!page) return;

  // Check info-grid renders
  const infoCards = await page.locator('.info-card').count();
  if (infoCards < 3) log('MEDIUM', vp.name, label, `only ${infoCards} info cards (expected 3)`);

  // CTA buttons reachable
  const ctaPrimary = await page.locator('.btn-primary').count();
  const ctaSecondary = await page.locator('.btn-secondary').count();
  if (ctaPrimary === 0) log('HIGH', vp.name, label, 'no primary CTA button');
  if (ctaSecondary === 0) log('LOW', vp.name, label, 'no secondary CTA button');

  await page.close();
}

async function testLegal(ctx, vp, slug, label) {
  const page = await visitPage(ctx, vp, `/${slug}.html`, label);
  if (!page) return;

  // Verify noindex
  const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');
  if (!robotsMeta || !robotsMeta.includes('noindex')) {
    log('LOW', vp.name, label, `robots meta: "${robotsMeta || 'missing'}"`);
  }

  await page.close();
}

// ── MAIN ──
const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  console.log(`\n=== ${vp.name.toUpperCase()} (${vp.width}×${vp.height}) ===`);
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile
  });

  await testHomepage(ctx, vp);
  await testBlogIndex(ctx, vp);
  await testBlogPost(ctx, vp);
  await testServiceArea(ctx, vp, 'autoglas-prien-am-chiemsee', 'sa-prien');
  await testServiceArea(ctx, vp, 'autoglas-bad-endorf', 'sa-endorf');
  await testLegal(ctx, vp, 'impressum', 'impressum');
  await testLegal(ctx, vp, 'datenschutz', 'datenschutz');

  await ctx.close();
}
await browser.close();

// Aggregate
const bySev = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
for (const i of issues) bySev[i.severity] = (bySev[i.severity] || 0) + 1;

console.log('\n=== SUMMARY ===');
for (const [s, c] of Object.entries(bySev)) console.log(`  ${s}: ${c}`);
console.log(`  TOTAL: ${issues.length}`);

writeFileSync(`${OUT}/issues.json`, JSON.stringify({ base: BASE, issues, summary: bySev }, null, 2));
console.log(`\nFull report: ${OUT}/issues.json`);
