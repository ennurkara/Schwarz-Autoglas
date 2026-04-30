#!/usr/bin/env node
// Scrapes Google reviews via Firecrawl v4 and updates public/data/reviews.json
// + the LocalBusiness JSON-LD review[] block in index.html.
//
// Required env (or CLI args):
//   FIRECRAWL_API_KEY   = fc-xxxxxxxx
//   GBP_REVIEWS_URL     = https://www.google.com/maps/place/...
//
// Optional:
//   PLACE_ID            = CU_EnW35gHmZEAE
//   ABBREVIATE_NAMES    = '1' (default; "Marlene Eberle" → "Marlene E." for DSGVO)
//
// Usage:
//   FIRECRAWL_API_KEY=fc-... GBP_REVIEWS_URL='https://...' node scripts/sync-reviews.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Firecrawl from '@mendable/firecrawl-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
}

const API_KEY = arg('key') || process.env.FIRECRAWL_API_KEY;
const URL_IN = arg('url') || process.env.GBP_REVIEWS_URL;
const PLACE_ID = arg('place-id') || process.env.PLACE_ID || 'CU_EnW35gHmZEAE';
const ABBREV = (process.env.ABBREVIATE_NAMES ?? '1') !== '0';
const DEBUG = process.env.DEBUG === '1';

if (!API_KEY || !URL_IN) {
  console.log('[sync-reviews] FIRECRAWL_API_KEY and GBP_REVIEWS_URL not set — skipping (existing reviews.json kept).');
  process.exit(0);
}

console.log('[sync-reviews] Scraping:', URL_IN.slice(0, 100) + (URL_IN.length > 100 ? '…' : ''));

const fc = new Firecrawl({ apiKey: API_KEY });

const SCHEMA = {
  type: 'object',
  required: ['reviews'],
  properties: {
    placeName: { type: 'string', description: 'Business name' },
    aggregateRating: {
      type: 'object',
      properties: {
        ratingValue: { type: 'number', description: 'Average rating (e.g. 4.9)' },
        reviewCount: { type: 'integer', description: 'Total number of reviews' }
      }
    },
    reviews: {
      type: 'array',
      description: 'All visible Google reviews on the page (every single one, do not skip any)',
      items: {
        type: 'object',
        required: ['author', 'rating', 'text'],
        properties: {
          author: { type: 'string', description: 'Reviewer full name as shown on Google' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          text: { type: 'string', description: 'Full original review text in original language including emojis. Empty string if no text.' },
          datePublished: { type: 'string', description: 'ISO 8601 date YYYY-MM-DD. Convert relative dates ("vor 3 Monaten") to absolute relative to today: ' + new Date().toISOString().slice(0, 10) }
        }
      }
    }
  }
};

let result;
try {
  result = await fc.scrape(URL_IN, {
    formats: [
      {
        type: 'json',
        prompt: 'Extract EVERY visible Google review on this place page. Capture the reviewer\'s name, the star rating (1-5), the full review text (including emojis), and the publication date. If only relative dates ("vor 3 Monaten", "letzte Woche") are visible, convert to absolute ISO 8601 dates relative to today. Do not skip any review even if the text is short. Also capture the aggregate rating value and total review count if shown.',
        schema: SCHEMA
      }
    ],
    onlyMainContent: false,
    waitFor: 5000,
    timeout: 180000,
    actions: [
      { type: 'wait', milliseconds: 3000 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 1500 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 1500 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 1500 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 1500 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 2000 }
    ],
    proxy: 'auto'
  });
} catch (err) {
  console.error('[sync-reviews] Firecrawl scrape failed:', err.message || err);
  if (DEBUG) console.error(err);
  process.exit(2);
}

if (DEBUG) {
  writeFileSync(resolve(ROOT, '.firecrawl-debug.json'), JSON.stringify(result, null, 2));
  console.log('[sync-reviews] Debug response written to .firecrawl-debug.json');
}

const json = result?.json;
if (!json) {
  console.error('[sync-reviews] No JSON in response. Top keys:', Object.keys(result || {}));
  console.error('[sync-reviews] First 500 chars of result:', JSON.stringify(result).slice(0, 500));
  process.exit(2);
}

const raw = (json.reviews || []).filter(r => r && r.author && (r.text || r.rating));
console.log(`[sync-reviews] Got ${raw.length} reviews from Firecrawl.`);
if (json.aggregateRating) {
  console.log(`[sync-reviews] Aggregate: ${json.aggregateRating.ratingValue} stars / ${json.aggregateRating.reviewCount} reviews.`);
}

if (raw.length === 0) {
  console.error('[sync-reviews] Zero reviews extracted — URL may not display reviews directly. Try a different Google Maps URL.');
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
  return name.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('') || '–';
}

function slugify(name, date) {
  const base = name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base}-${date.slice(0, 10)}`;
}

const today = new Date().toISOString().slice(0, 10);

// Deduplicate (sometimes the API duplicates rows)
const seen = new Set();
const normalized = [];
for (const r of raw) {
  const fullName = (r.author || '').trim();
  if (!fullName) continue;
  const display = abbreviateName(fullName);
  const text = (r.text || '').trim();
  const dedupKey = display + '|' + text.slice(0, 50);
  if (seen.has(dedupKey)) continue;
  seen.add(dedupKey);
  const date = ((r.datePublished || today) + '').slice(0, 10);
  normalized.push({
    id: slugify(display, date),
    author: display,
    initials: initialsFor(display),
    rating: Math.max(1, Math.min(5, parseInt(r.rating, 10) || 5)),
    datePublished: date,
    language: 'de',
    text,
    source: 'google'
  });
}

// Sort newest first
normalized.sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));

const ratings = normalized.map(r => r.rating);
const ratingValue = json.aggregateRating?.ratingValue
  ?? (ratings.length ? Number((ratings.reduce((a, c) => a + c, 0) / ratings.length).toFixed(1)) : 5.0);
const reviewCount = json.aggregateRating?.reviewCount ?? normalized.length;

const out = {
  _comment: 'Auto-generated by scripts/sync-reviews.mjs from Google Maps via Firecrawl. Last names abbreviated for DSGVO compliance.',
  source: 'google',
  placeId: PLACE_ID,
  lastSynced: today,
  aggregate: {
    ratingValue,
    ratingCount: reviewCount,
    reviewCount,
    bestRating: 5,
    worstRating: 1
  },
  reviews: normalized
};

writeFileSync(resolve(ROOT, 'public/data/reviews.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`[sync-reviews] Wrote public/data/reviews.json (${normalized.length} unique reviews, avg ${ratingValue}).`);

// ── Update LocalBusiness JSON-LD review[] in index.html ──
try {
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
  console.log('[sync-reviews] Updated index.html JSON-LD aggregateRating + review[].');
} catch (err) {
  console.warn('[sync-reviews] index.html JSON-LD update skipped:', err.message);
}

console.log('[sync-reviews] Done.');
