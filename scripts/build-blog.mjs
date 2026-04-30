#!/usr/bin/env node
// Static blog renderer — generates /blog/[slug].html and an updated sitemap.xml
// from public/data/blog.json. Run at build time on Netlify.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BLOG_DIR = join(ROOT, 'blog');
const SITE_URL = 'https://schwarz-autoglas.de';

const data = JSON.parse(readFileSync(join(ROOT, 'public/data/blog.json'), 'utf8'));
const posts = data.posts.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

const CATEGORY_LABELS = {
  ratgeber: 'Ratgeber',
  lokal: 'Lokal',
  saisonal: 'Saisonal',
  news: 'News'
};

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

function formatDateDe(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
}

function postUrl(post) {
  return `${SITE_URL}/blog/${post.id}.html`;
}

function postSchema(post) {
  const image = post.image
    ? (post.image.startsWith('http') ? post.image : `${SITE_URL}${post.image}`)
    : `${SITE_URL}/public/images/og-image.jpg`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image,
    datePublished: post.date,
    dateModified: post.dateModified || post.date,
    inLanguage: 'de',
    url: postUrl(post),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl(post)
    },
    author: {
      '@type': 'Person',
      name: post.author || 'Burak Kara',
      url: `${SITE_URL}/impressum.html`
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#business`,
      name: 'Schwarz Autoglas',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/public/images/logo.png`,
        width: 1000,
        height: 250
      }
    },
    keywords: (post.tags || []).join(', ')
  };
}

function breadcrumbSchema(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Start', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog.html` },
      { '@type': 'ListItem', position: 3, name: post.title, item: postUrl(post) }
    ]
  };
}

function blogIndexBreadcrumb() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Start', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog.html` }
    ]
  };
}

function renderPostPage(post) {
  const url = postUrl(post);
  const title = `${post.title} | Schwarz Autoglas Rosenheim`;
  const description = post.excerpt;
  const ogImage = post.image
    ? (post.image.startsWith('http') ? post.image : `${SITE_URL}${post.image}`)
    : `${SITE_URL}/public/images/og-image.jpg`;
  const categoryLabel = CATEGORY_LABELS[post.category] || post.category;
  const categoryClass = CATEGORY_LABELS[post.category] ? post.category : 'news';
  const heroImg = post.image
    ? `<img class="post-hero-img" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt || post.title)}" width="1200" height="675">`
    : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="de" href="${url}">
  <link rel="alternate" hreflang="x-default" href="${url}">
  <link rel="icon" type="image/png" sizes="32x32" href="/public/images/favicon-32.png">
  <link rel="apple-touch-icon" href="/public/images/apple-touch-icon.png">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Schwarz Autoglas">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:locale" content="de_DE">
  <meta property="article:published_time" content="${post.date}">
  <meta property="article:modified_time" content="${post.dateModified || post.date}">
  <meta property="article:author" content="${escapeHtml(post.author || 'Burak Kara')}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">

  <link rel="preload" href="/public/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/public/fonts/inter-600.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/public/fonts/inter-700.woff2" as="font" type="font/woff2" crossorigin>

  <style>
    @font-face { font-family:'Inter'; src:url('/public/fonts/inter-300.woff2') format('woff2'); font-weight:300; font-display:swap; }
    @font-face { font-family:'Inter'; src:url('/public/fonts/inter-400.woff2') format('woff2'); font-weight:400; font-display:swap; }
    @font-face { font-family:'Inter'; src:url('/public/fonts/inter-500.woff2') format('woff2'); font-weight:500; font-display:swap; }
    @font-face { font-family:'Inter'; src:url('/public/fonts/inter-600.woff2') format('woff2'); font-weight:600; font-display:swap; }
    @font-face { font-family:'Inter'; src:url('/public/fonts/inter-700.woff2') format('woff2'); font-weight:700; font-display:swap; }
    @font-face { font-family:'Inter'; src:url('/public/fonts/inter-800.woff2') format('woff2'); font-weight:800; font-display:swap; }

    :root {
      --black:#080808; --gray-950:#0d0d0d; --gray-800:#1a1a1a; --gray-700:#2a2a2a;
      --gray-600:#3a3a3a; --gray-500:#555; --gray-400:#888; --gray-300:#aaa;
      --gray-200:#ccc; --gray-100:#e5e5e5; --white:#fff; --accent:#c8a96e;
      --accent-dark:#a8893e; --nav-height:64px;
    }
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    html { scroll-behavior:smooth; -webkit-text-size-adjust:100%; }
    body { font-family:'Inter',system-ui,sans-serif; background:var(--black); color:var(--white); line-height:1.6; min-height:100vh; display:flex; flex-direction:column; }
    a { color:inherit; text-decoration:none; }
    img { max-width:100%; height:auto; display:block; }
    ul, ol { list-style:none; }
    h1, h2, h3 { line-height:1.2; }

    nav { position:fixed; top:0; left:0; right:0; height:var(--nav-height); display:flex; align-items:center; justify-content:space-between; padding:0 2rem; z-index:140; transition:background .3s, border-bottom .3s; background:transparent; border-bottom:1px solid transparent; }
    nav.scrolled { background:var(--gray-950); border-bottom:1px solid var(--gray-700); }
    .nav-logo { display:flex; align-items:center; gap:.5rem; font-weight:700; font-size:1.1rem; }
    .nav-logo-img { height:32px; width:auto; }
    .nav-links { display:flex; align-items:center; gap:2rem; }
    .nav-links a { font-size:.9rem; font-weight:500; color:var(--gray-200); transition:color .2s; }
    .nav-links a:hover { color:var(--white); }
    .nav-active { color:var(--white) !important; }
    .nav-cta { background:var(--white); color:var(--black) !important; padding:.5rem 1.25rem; border-radius:4px; font-weight:600 !important; transition:background .2s, transform .15s !important; }
    .nav-cta:hover { background:var(--gray-100); transform:translateY(-1px); }
    .nav-burger { display:none; flex-direction:column; gap:5px; background:none; border:none; cursor:pointer; padding:.5rem; }
    .nav-burger span { display:block; width:24px; height:2px; background:var(--white); border-radius:2px; }
    @media (max-width:768px) {
      .nav-burger { display:flex; }
      .nav-links { position:fixed; top:0; right:-280px; width:280px; height:100vh; background:var(--gray-950); padding:calc(var(--nav-height) + 1rem) 1.5rem 2rem; flex-direction:column; align-items:flex-start; gap:0; transition:right .3s cubic-bezier(.4,0,.2,1); border-left:1px solid var(--gray-700); z-index:150; }
      .nav-links.open { right:0; }
      .nav-links li { width:100%; list-style:none; }
      .nav-links a { display:block; padding:.875rem 0; border-bottom:1px solid var(--gray-800); font-size:1rem; }
      .nav-cta { text-align:center; border-radius:6px !important; padding:.875rem 0 !important; }
    }

    .post-wrapper { max-width:740px; margin:0 auto; padding:calc(var(--nav-height) + 3rem) 2rem 4rem; }
    @media (max-width:768px) { .post-wrapper { padding-left:1.25rem; padding-right:1.25rem; } }
    .post-back { display:inline-flex; align-items:center; gap:.4rem; color:var(--gray-400); font-size:.875rem; margin-bottom:2rem; transition:color .2s; }
    .post-back:hover { color:var(--white); }
    .post-back svg { width:16px; height:16px; }
    .breadcrumbs { font-size:.8rem; color:var(--gray-400); margin-bottom:1.5rem; }
    .breadcrumbs a { color:var(--gray-300); transition:color .2s; }
    .breadcrumbs a:hover { color:var(--white); }
    .breadcrumbs span { margin:0 .4rem; color:var(--gray-600); }
    .post-hero-img { width:100%; aspect-ratio:16/9; object-fit:cover; margin-bottom:2rem; border-radius:6px; }
    .post-title { font-size:clamp(1.5rem,3.5vw,2.25rem); font-weight:700; letter-spacing:-.03em; line-height:1.2; margin-bottom:1rem; }
    .post-meta { display:flex; flex-wrap:wrap; align-items:center; gap:1rem; margin-bottom:2rem; padding-bottom:1.5rem; border-bottom:1px solid var(--gray-800); }
    .post-date, .post-author { font-size:.875rem; color:var(--gray-400); }
    .post-author strong { color:var(--gray-200); font-weight:600; }
    .category-badge { display:inline-block; font-size:.7rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:.2rem .6rem; border-radius:4px; }
    .category-ratgeber { background:rgba(200,169,110,.15); color:var(--accent); }
    .category-lokal { background:rgba(59,130,246,.15); color:#60a5fa; }
    .category-saisonal { background:rgba(34,197,94,.15); color:#4ade80; }
    .category-news { background:rgba(170,170,170,.15); color:var(--gray-300); }
    .post-content { color:var(--gray-200); line-height:1.8; font-size:1rem; }
    .post-content h2 { font-size:1.25rem; font-weight:700; color:var(--white); margin:2rem 0 .75rem; letter-spacing:-.02em; }
    .post-content p { margin-bottom:1.25rem; }
    .post-content ul { list-style:disc; padding-left:1.5rem; margin-bottom:1.25rem; }
    .post-content ol { list-style:decimal; padding-left:1.5rem; margin-bottom:1.25rem; }
    .post-content li { margin-bottom:.4rem; }
    .post-content strong { color:var(--white); font-weight:600; }
    .post-cta { margin-top:3rem; padding:2rem; background:var(--gray-950); border:1px solid var(--gray-700); text-align:center; border-radius:6px; }
    .post-cta h3 { font-size:1.1rem; font-weight:700; margin-bottom:.5rem; }
    .post-cta p { color:var(--gray-300); font-size:.9rem; margin-bottom:1.25rem; }
    .btn-primary { display:inline-block; background:var(--white); color:var(--black); font-weight:700; font-size:.95rem; padding:.75rem 1.75rem; border-radius:4px; transition:background .2s, transform .15s; }
    .btn-primary:hover { background:var(--gray-100); transform:translateY(-1px); }

    footer { margin-top:auto; background:var(--gray-950); border-top:1px solid var(--gray-800); padding:3rem 0 1.5rem; }
    .footer-inner { max-width:1200px; margin:0 auto; padding:0 2rem; }
    .footer-top { display:grid; grid-template-columns:2fr 1fr 1fr; gap:3rem; margin-bottom:2rem; }
    .footer-brand p { color:var(--gray-400); font-size:.875rem; line-height:1.7; margin-top:.5rem; }
    .footer-col-title { font-size:.75rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--gray-400); margin-bottom:1rem; }
    .footer-links { list-style:none; }
    .footer-links li { margin-bottom:.5rem; }
    .footer-links a { color:var(--gray-300); font-size:.875rem; transition:color .2s; }
    .footer-links a:hover { color:var(--white); }
    .footer-bottom { display:flex; justify-content:space-between; align-items:center; padding-top:1.5rem; border-top:1px solid var(--gray-800); }
    .footer-copy { color:var(--gray-500); font-size:.8rem; }
    .footer-legal { display:flex; gap:1.5rem; }
    .footer-legal a { color:var(--gray-500); font-size:.8rem; transition:color .2s; }
    .footer-legal a:hover { color:var(--gray-300); }
    @media (max-width:768px) {
      .footer-top { grid-template-columns:1fr; gap:1.5rem; }
      .footer-bottom { flex-direction:column; gap:.75rem; text-align:center; }
    }
    @media (prefers-reduced-motion:reduce) {
      *, *::before, *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
    }
  </style>

  ${jsonLd(postSchema(post))}
  ${jsonLd(breadcrumbSchema(post))}
</head>
<body>
  <nav id="navbar" aria-label="Hauptnavigation">
    <a href="/" class="nav-logo" aria-label="Schwarz Autoglas Startseite">
      <img src="/public/images/logo.png" alt="Schwarz Autoglas" class="nav-logo-img" width="128" height="32" loading="eager">
    </a>
    <ul class="nav-links" id="navLinks" role="list">
      <li><a href="/#services">Leistungen</a></li>
      <li><a href="/#process">Ablauf</a></li>
      <li><a href="/#testimonials">Bewertungen</a></li>
      <li><a href="/blog.html" class="nav-active" aria-current="page">Blog</a></li>
      <li><a href="/#contact" class="nav-cta">Termin buchen</a></li>
    </ul>
    <button class="nav-burger" id="navBurger" aria-label="Menü öffnen" aria-expanded="false" aria-controls="navLinks">
      <span></span><span></span><span></span>
    </button>
  </nav>

  <main>
    <article class="post-wrapper">
      <nav aria-label="Brotkrumen-Navigation" class="breadcrumbs">
        <a href="/">Start</a><span>/</span><a href="/blog.html">Blog</a><span>/</span><span>${escapeHtml(post.title)}</span>
      </nav>
      <a href="/blog.html" class="post-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Alle Beiträge
      </a>
      <span class="category-badge category-${categoryClass}">${escapeHtml(categoryLabel)}</span>
      <h1 class="post-title">${escapeHtml(post.title)}</h1>
      <div class="post-meta">
        <time class="post-date" datetime="${post.date}">${formatDateDe(post.date)}</time>
        <span class="post-author">Von <strong>${escapeHtml(post.author || 'Burak Kara')}</strong></span>
      </div>
      ${heroImg}
      <div class="post-content">${post.content}</div>
      <div class="post-cta">
        <h3>Scheibenschaden? Wir helfen sofort.</h3>
        <p>Kostenloser Kostenvoranschlag — wir kommen mobil zu Ihnen in Rosenheim und Umgebung.</p>
        <a href="/#contact" class="btn-primary">Jetzt Termin anfragen</a>
      </div>
    </article>
  </main>

  <footer>
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <a href="/" class="nav-logo" style="margin-bottom:.5rem;" aria-label="Schwarz Autoglas">
            <img src="/public/images/logo.png" alt="Schwarz Autoglas" class="nav-logo-img" width="128" height="32" loading="lazy">
          </a>
          <p>Professioneller Windschutzscheibenservice –<br>geschult, zuverlässig und mit Garantie für alle Fahrzeugklassen.</p>
          <p style="font-size:.8rem;color:var(--gray-600);margin-top:.5rem;line-height:1.6;">
            Waldfriedstraße 3a · 83024 Rosenheim<br>
            Tel: <a href="tel:+491735252175" style="color:inherit;">+49 (0) 173 5252175</a>
          </p>
        </div>
        <div>
          <p class="footer-col-title">Leistungen</p>
          <ul class="footer-links" role="list">
            <li><a href="/#services">Scheibenaustausch</a></li>
            <li><a href="/#services">Steinschlagreparatur</a></li>
            <li><a href="/#services">ADAS-Kalibrierung</a></li>
            <li><a href="/#services">Mobile Montage</a></li>
          </ul>
        </div>
        <div>
          <p class="footer-col-title">Unternehmen</p>
          <ul class="footer-links" role="list">
            <li><a href="/#why">Über uns</a></li>
            <li><a href="/#testimonials">Bewertungen</a></li>
            <li><a href="/#contact">Kontakt</a></li>
            <li><a href="/blog.html">Blog</a></li>
            <li><a href="/impressum.html">Impressum</a></li>
            <li><a href="/datenschutz.html">Datenschutz</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">&copy; 2026 Schwarz Autoglas. Alle Rechte vorbehalten.</p>
        <div class="footer-legal">
          <a href="/impressum.html">Impressum</a>
          <a href="/datenschutz.html">Datenschutz</a>
        </div>
      </div>
    </div>
  </footer>

  <script>
    const navbar = document.getElementById('navbar');
    const navBurger = document.getElementById('navBurger');
    const navLinks = document.getElementById('navLinks');
    window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 20));
    navBurger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navBurger.setAttribute('aria-expanded', String(open));
    });
  </script>
</body>
</html>
`;
}

function buildSitemap(posts) {
  const today = new Date().toISOString().split('T')[0];
  const entries = [
    { loc: `${SITE_URL}/`, lastmod: today },
    { loc: `${SITE_URL}/blog.html`, lastmod: today },
    { loc: `${SITE_URL}/autoglas-prien-am-chiemsee.html`, lastmod: today },
    { loc: `${SITE_URL}/autoglas-bad-endorf.html`, lastmod: today },
    ...posts.map(p => ({
      loc: postUrl(p),
      lastmod: p.dateModified || p.date
    }))
  ];

  const urls = entries.map(e => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildLlmsTxt(posts) {
  const postsList = posts
    .map(p => `- ${postUrl(p)}: ${p.title}`)
    .join('\n');

  return `# Schwarz Autoglas
> Professioneller Autoglasservice in Rosenheim und Umgebung (Bayern, Deutschland)

Schwarz Autoglas ist ein mobiler Fachbetrieb für Autoglas in Rosenheim. Gegründet von Burak Kara. Direktabrechnung mit Kfz-Versicherungen. Mobiler Service im 60-km-Radius.

## Services

- Windschutzscheibenaustausch (alle Fahrzeugklassen, OEM- und OEM-äquivalentes Glas)
- Steinschlagreparatur (unter 60 Minuten, bis 4 cm Schadendurchmesser)
- ADAS-Kalibrierung nach Scheibenwechsel (Fahrerassistenzsysteme)
- Mobile Autoglasmontage (zu Hause, Büro oder Firmenparkplatz)
- Versicherungsabwicklung (komplette Kommunikation mit der Kfz-Versicherung)

## Contact

- Telefon: +49 (0) 173 5252175
- E-Mail: info@schwarz-autoglas.de
- Adresse: Waldfriedstraße 3a, 83024 Rosenheim, Bayern, Deutschland

## Hours

- Montag bis Donnerstag: 08:00 – 20:00
- Freitag: geschlossen (Ruhetag)
- Samstag: 08:00 – 23:00
- Sonntag: 08:00 – 20:00

## Service Area

60-km-Radius um Rosenheim. Regelmäßig in: Rosenheim, Bad Endorf, Prien am Chiemsee, Kolbermoor, Brannenburg, Raubling, Wasserburg am Inn, Bad Aibling, Aschau im Chiemgau.

## Key Facts

- Gegründet von Burak Kara
- Same-Day-Termine möglich
- Direktabrechnung mit Kfz-Kaskoversicherungen
- Garantie auf alle Arbeiten
- Alle gängigen Fahrzeugmarken (VW, BMW, Mercedes, Audi, Ford, Opel, Toyota, Porsche, Tesla u.a.)

## Pages

- ${SITE_URL}/: Hauptseite mit Services, Infos und Kontaktformular
- ${SITE_URL}/blog.html: Ratgeber und Tipps rund um Autoglas
- ${SITE_URL}/autoglas-prien-am-chiemsee.html: Autoglas-Service für Prien am Chiemsee
- ${SITE_URL}/autoglas-bad-endorf.html: Autoglas-Service für Bad Endorf
- ${SITE_URL}/impressum.html: Impressum (Anbieterkennzeichnung)
- ${SITE_URL}/datenschutz.html: Datenschutzerklärung (DSGVO)

## Blog Posts

${postsList}

## Licensing

Inhalte dürfen unter Quellenangabe und Verlinkung auf schwarz-autoglas.de zitiert werden.
`;
}

// ── BUILD ──
console.log(`[build-blog] Generating ${posts.length} blog posts…`);

if (!existsSync(BLOG_DIR)) {
  mkdirSync(BLOG_DIR, { recursive: true });
} else {
  // Clean stale .html files in /blog/ (only ones we manage)
  const validIds = new Set(posts.map(p => p.id));
  for (const file of readdirSync(BLOG_DIR)) {
    if (file.endsWith('.html')) {
      const slug = file.replace(/\.html$/, '');
      if (!validIds.has(slug)) {
        unlinkSync(join(BLOG_DIR, file));
        console.log(`[build-blog] Removed stale: ${file}`);
      }
    }
  }
}

for (const post of posts) {
  const html = renderPostPage(post);
  writeFileSync(join(BLOG_DIR, `${post.id}.html`), html);
  console.log(`[build-blog] /blog/${post.id}.html`);
}

writeFileSync(join(ROOT, 'sitemap.xml'), buildSitemap(posts));
console.log('[build-blog] sitemap.xml');

writeFileSync(join(ROOT, 'llms.txt'), buildLlmsTxt(posts));
console.log('[build-blog] llms.txt');

console.log('[build-blog] Done.');
