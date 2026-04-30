#!/usr/bin/env node
// Playwright-based Google Maps reviews scraper.
// Opens the place URL in headful Chromium, accepts cookies, clicks the
// reviews tab, scrolls the reviews panel until no more reviews load,
// then extracts every review.
//
// Required env (or args):
//   GBP_REVIEWS_URL   = full Google Maps place URL
//
// Optional:
//   PLACE_ID          = CU_EnW35gHmZEAE
//   ABBREVIATE_NAMES  = '1' (default; Marlene Eberle → Marlene E.)
//   HEADED            = '1' to show browser
//   DEBUG             = '1' for verbose logs + screenshot dump

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
function arg(n) { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; }

const URL_IN = arg('url') || process.env.GBP_REVIEWS_URL;
const PLACE_ID = arg('place-id') || process.env.PLACE_ID || 'CU_EnW35gHmZEAE';
const ABBREV = (process.env.ABBREVIATE_NAMES ?? '1') !== '0';
const HEADED = process.env.HEADED === '1';
const DEBUG = process.env.DEBUG === '1';

if (!URL_IN) {
  console.error('Usage: GBP_REVIEWS_URL=... node scripts/scrape-reviews-playwright.mjs');
  process.exit(1);
}

console.log('[scrape-reviews] Opening:', URL_IN.slice(0, 100));

const browser = await chromium.launch({
  headless: !HEADED,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process'
  ]
});

const ctx = await browser.newContext({
  locale: 'de-DE',
  timezoneId: 'Europe/Berlin',
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
});

// Hide webdriver flag
await ctx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});

const page = await ctx.newPage();

try {
  await page.goto(URL_IN, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);

  if (DEBUG) await page.screenshot({ path: resolve(ROOT, 'screenshots/scrape-1-loaded.png') });

  // Accept cookies (German consent dialog)
  for (const consent of ['Alle akzeptieren', 'Alle annehmen', 'Akzeptieren', 'Accept all', 'I agree', 'Zustimmen']) {
    const btn = page.getByRole('button', { name: consent }).first();
    if (await btn.count()) {
      await btn.click().catch(() => {});
      console.log(`[scrape-reviews] Accepted cookies via "${consent}"`);
      await page.waitForTimeout(2500);
      break;
    }
  }

  if (DEBUG) await page.screenshot({ path: resolve(ROOT, 'screenshots/scrape-2-after-cookies.png') });

  // Click the "Bewertungen" tab in the place panel
  // Try multiple strategies because Google rotates DOM frequently
  const tabSelectors = [
    'button[aria-label*="Bewertungen"]',
    'button[aria-label*="Reviews"]',
    'button[role="tab"][data-tab-index="1"]',
    'button:has-text("Bewertungen")',
    'div[role="tab"]:has-text("Bewertungen")'
  ];
  let tabClicked = false;
  for (const sel of tabSelectors) {
    const tab = page.locator(sel).first();
    if (await tab.count() && await tab.isVisible().catch(() => false)) {
      await tab.click().catch(() => {});
      console.log(`[scrape-reviews] Clicked reviews tab via selector ${sel}`);
      tabClicked = true;
      break;
    }
  }
  if (!tabClicked) console.warn('[scrape-reviews] No reviews tab found — page layout may have changed.');

  await page.waitForTimeout(3000);

  // Find the scrollable reviews panel
  const scrollerSel = 'div[role="main"] div[tabindex="-1"][aria-label]';
  await page.waitForSelector(scrollerSel, { timeout: 15000 }).catch(() => {});

  // Find all candidate scrollable panels and pick the one that scrolls
  const scrollers = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('div[tabindex="-1"]'));
    return all.filter(el => {
      const cs = getComputedStyle(el);
      return (cs.overflowY === 'scroll' || cs.overflowY === 'auto') && el.scrollHeight > el.clientHeight + 100;
    }).map((el, i) => ({ idx: i, h: el.scrollHeight, label: el.getAttribute('aria-label') }));
  });
  if (DEBUG) console.log('[scrape-reviews] Scrollable panels:', scrollers);

  // Scroll the reviews list — keep scrolling until no new reviews load
  let lastCount = 0;
  let stableRounds = 0;
  const MAX_ROUNDS = 30;
  for (let i = 0; i < MAX_ROUNDS; i++) {
    const counts = await page.evaluate(() => {
      // Find scrollable element with most content
      const scrollables = Array.from(document.querySelectorAll('div[tabindex="-1"]'))
        .filter(el => {
          const cs = getComputedStyle(el);
          return (cs.overflowY === 'scroll' || cs.overflowY === 'auto') && el.scrollHeight > el.clientHeight + 100;
        });
      if (scrollables.length === 0) return { count: 0, scrolled: false };
      // Pick the one most likely to be the reviews list (largest content)
      const target = scrollables.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
      target.scrollTop = target.scrollHeight;
      // Count review elements (data-review-id or role=article)
      const reviews = document.querySelectorAll('[data-review-id], div[jsaction*="review"]:has([role="img"])');
      return { count: reviews.length, scrollH: target.scrollHeight, top: target.scrollTop };
    });
    if (DEBUG) console.log(`[scrape-reviews] Round ${i + 1}: ${counts.count} reviews, scrollH=${counts.scrollH}`);
    if (counts.count === lastCount) {
      stableRounds++;
      if (stableRounds >= 3) break;
    } else {
      stableRounds = 0;
      lastCount = counts.count;
    }
    await page.waitForTimeout(1500);
  }

  if (DEBUG) await page.screenshot({ path: resolve(ROOT, 'screenshots/scrape-3-scrolled.png'), fullPage: true });

  // Click "Mehr" buttons to expand truncated reviews
  const moreButtons = page.locator('button:has-text("Mehr"), button:has-text("More")');
  const moreCount = await moreButtons.count();
  console.log(`[scrape-reviews] Expanding ${moreCount} truncated reviews…`);
  for (let i = 0; i < moreCount; i++) {
    await moreButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
  }
  await page.waitForTimeout(800);

  // Extract reviews
  const extracted = await page.evaluate(() => {
    function relativeToISO(rel) {
      if (!rel) return null;
      // German: "vor 3 Wochen", "vor einem Monat", "vor 2 Jahren", "vor einer Stunde"
      const m = rel.toLowerCase().match(/vor\s+(?:einer|einem|(\d+))\s+(stunde|tag|woche|monat|jahr)n?e?n?/i);
      if (m) {
        const n = m[1] ? parseInt(m[1], 10) : 1;
        const unit = m[2];
        const d = new Date();
        if (unit.startsWith('stunde')) d.setHours(d.getHours() - n);
        else if (unit.startsWith('tag')) d.setDate(d.getDate() - n);
        else if (unit.startsWith('woche')) d.setDate(d.getDate() - n * 7);
        else if (unit.startsWith('monat')) d.setMonth(d.getMonth() - n);
        else if (unit.startsWith('jahr')) d.setFullYear(d.getFullYear() - n);
        return d.toISOString().slice(0, 10);
      }
      // English fallback: "3 weeks ago"
      const e = rel.toLowerCase().match(/(?:a|an|(\d+))\s+(hour|day|week|month|year)s?\s+ago/i);
      if (e) {
        const n = e[1] ? parseInt(e[1], 10) : 1;
        const unit = e[2];
        const d = new Date();
        if (unit === 'hour') d.setHours(d.getHours() - n);
        else if (unit === 'day') d.setDate(d.getDate() - n);
        else if (unit === 'week') d.setDate(d.getDate() - n * 7);
        else if (unit === 'month') d.setMonth(d.getMonth() - n);
        else if (unit === 'year') d.setFullYear(d.getFullYear() - n);
        return d.toISOString().slice(0, 10);
      }
      return null;
    }

    const RELATIVE_RE = /vor\s+(?:einer|einem|\d+)\s+(?:stunde|tag|woche|monat|jahr)/i;

    function findRelativeDate(card) {
      // Walk all text nodes within the card; pick the first one that matches the relative-date pattern.
      const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.nodeValue.trim();
        if (RELATIVE_RE.test(t)) return t;
      }
      return '';
    }

    const out = [];
    const cards = document.querySelectorAll('[data-review-id]');
    for (const card of cards) {
      const reviewId = card.getAttribute('data-review-id');
      // Author
      let author = '';
      const nameEl = card.querySelector('[class*="d4r55"], div.d4r55');
      if (nameEl) author = nameEl.textContent.trim();
      // Rating from any star widget aria-label
      let rating = 5;
      const starEl = card.querySelector('[role="img"][aria-label*="Stern"], [aria-label*="Sternen"]');
      if (starEl) {
        const m = (starEl.getAttribute('aria-label') || '').match(/(\d)\s+\/?\s*5\s*Stern/);
        if (m) rating = parseInt(m[1], 10);
      }
      // Date (relative) - search whole card for relative-date pattern
      const dateText = findRelativeDate(card);
      // Body text - longest text node that isn't author or date
      let text = '';
      const bodyEl = card.querySelector('[class*="wiI7pd"], span[jsname="bN97Pc"]');
      if (bodyEl) text = bodyEl.textContent.trim();
      if (!author) continue;
      out.push({
        reviewId,
        author,
        rating,
        text,
        relativeDate: dateText,
        datePublished: relativeToISO(dateText) || ''
      });
    }
    return out;
  });

  console.log(`[scrape-reviews] Extracted ${extracted.length} reviews from DOM.`);
  if (DEBUG) {
    writeFileSync(resolve(ROOT, '.scrape-raw.json'), JSON.stringify(extracted, null, 2));
  }

  if (extracted.length === 0) {
    console.error('[scrape-reviews] Zero reviews — DOM selectors may have changed. Check screenshots/scrape-3-scrolled.png');
    await browser.close();
    process.exit(2);
  }

  // Normalize
  function abbreviateName(name) {
    if (!ABBREV) return name;
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    const first = parts[0];
    const lastInitial = parts[parts.length - 1][0]?.toUpperCase();
    return lastInitial ? `${first} ${lastInitial}.` : name;
  }

  function initialsFor(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '–';
  }

  function slugify(name, date) {
    return (name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) + '-' + (date || 'undated');
  }

  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();
  const normalized = [];
  for (const r of extracted) {
    const fullName = (r.author || '').trim();
    if (!fullName) continue;
    const display = abbreviateName(fullName);
    const text = (r.text || '').trim();
    const dedupKey = (r.reviewId || display + '|' + text.slice(0, 60));
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    const date = r.datePublished || today;
    normalized.push({
      id: slugify(display, date),
      author: display,
      initials: initialsFor(display),
      rating: r.rating,
      datePublished: date,
      language: 'de',
      text,
      source: 'google'
    });
  }
  normalized.sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));

  const ratings = normalized.map(r => r.rating);
  const ratingValue = ratings.length ? Number((ratings.reduce((a, c) => a + c, 0) / ratings.length).toFixed(1)) : 5.0;
  const reviewCount = normalized.length;

  const out = {
    _comment: 'Auto-generated by scripts/scrape-reviews-playwright.mjs from Google Maps. Last names abbreviated for DSGVO compliance.',
    source: 'google',
    placeId: PLACE_ID,
    lastSynced: today,
    aggregate: { ratingValue, ratingCount: reviewCount, reviewCount, bestRating: 5, worstRating: 1 },
    reviews: normalized
  };

  writeFileSync(resolve(ROOT, 'public/data/reviews.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`[scrape-reviews] Wrote public/data/reviews.json (${reviewCount} reviews, avg ${ratingValue}).`);

  // Update JSON-LD in index.html
  const indexPath = resolve(ROOT, 'index.html');
  let html = readFileSync(indexPath, 'utf8');
  const top = normalized.slice(0, 5).map(r => ({
    '@type': 'Review',
    datePublished: r.datePublished,
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
    author: { '@type': 'Person', name: r.author },
    reviewBody: r.text
  }));
  const aggBlock = `"aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": ${ratingValue},
      "bestRating": 5,
      "worstRating": 1,
      "ratingCount": ${reviewCount},
      "reviewCount": ${reviewCount}
    },`;
  html = html.replace(/"aggregateRating":\s*\{[^}]*\},/, aggBlock);
  const reviewBlock = '"review": ' + JSON.stringify(top, null, 6).replace(/\n/g, '\n    ') + ',';
  html = html.replace(/"review":\s*\[[\s\S]*?\],(?=\s*"sameAs")/, reviewBlock);
  writeFileSync(indexPath, html);
  console.log('[scrape-reviews] Updated index.html JSON-LD review[].');
} catch (err) {
  console.error('[scrape-reviews] Error:', err.message);
  if (DEBUG) console.error(err);
  await browser.close();
  process.exit(2);
}

await browser.close();
console.log('[scrape-reviews] Done.');
