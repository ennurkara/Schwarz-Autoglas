# Blog Design: Schwarz Autoglas

**Date:** 2026-04-17  
**Status:** Approved  
**Author:** Claude Code

## Ziel

Einen JSON-getriebenen Blog hinzufügen, der SEO-relevante Inhalte (Ratgeber, Lokal, Saisonal, News) liefert, ohne den statischen Charakter der Website zu verändern. Der Blog ist von Anfang an für N8N-Automatisierung ausgelegt.

## Architektur

```
public/
  data/
    blog.json          ← Einzige Datenquelle für alle Beiträge
  images/
    blog/              ← Blog-Bilder (WebP)
blog.html              ← Blog-Übersicht + Einzelartikelansicht
index.html             ← Neue "Aktuelles"-Sektion (3 neueste Beiträge)
```

**Technologie:** Vanilla JS, kein Build-Step, kein Framework. Gleiche Design-Tokens wie `index.html`.

## Datenstruktur: `public/data/blog.json`

```json
{
  "posts": [
    {
      "id": "steinschlag-reparieren-oder-tauschen",
      "title": "Steinschlag: Reparieren oder tauschen?",
      "date": "2026-04-17",
      "category": "ratgeber",
      "excerpt": "Kurze Beschreibung für Teaser (max. 160 Zeichen).",
      "content": "<p>Volltext als HTML-String.</p>",
      "image": "public/images/blog/steinschlag.webp",
      "imageAlt": "Nahaufnahme Steinschlag in Windschutzscheibe",
      "tags": ["steinschlag", "rosenheim", "windschutzscheibe"]
    }
  ]
}
```

**Kategorien:** `ratgeber` | `lokal` | `saisonal` | `news`

**Pflichtfelder:** `id`, `title`, `date`, `category`, `excerpt`, `content`  
**Optionale Felder:** `image`, `imageAlt`, `tags`

**ID-Format:** kebab-case, einzigartig, URL-safe (z.B. `autoglas-rosenheim-kosten-2026`)

## Seiten

### `blog.html` — Blog-Übersicht + Einzelartikel

Eine Datei, zwei Ansichten gesteuert über URL-Hash:

- `blog.html` oder `blog.html#` → Übersicht aller Beiträge (neueste zuerst)
- `blog.html#steinschlag-reparieren-oder-tauschen` → Einzelartikelansicht

**Übersicht:**
- Header/Footer identisch zu `index.html`
- Grid mit Blog-Cards: Bild (optional), Kategorie-Badge, Titel, Datum, Excerpt, "Weiterlesen"-Link
- Kategorie-Filter (alle | ratgeber | lokal | saisonal | news)
- `<title>` und Meta Description werden dynamisch gesetzt

**Einzelartikel:**
- Zurück-Link zur Übersicht
- Artikel-Header: Kategorie-Badge, Titel, Datum
- Hero-Bild (wenn vorhanden)
- Volltext (`content` HTML)
- CTA-Block am Ende: Kontaktformular-Link
- `<title>` und Meta Description werden auf Artikeldaten gesetzt
- `<link rel="canonical">` wird dynamisch gesetzt

### `index.html` — "Aktuelles"-Sektion

Neue Sektion nach den Google Reviews, vor dem Kontaktformular:

- Überschrift: "Tipps & Aktuelles"
- 3 neueste Beiträge als horizontale Cards (responsive: 1 Spalte mobile, 3 Desktop)
- Jede Card: Kategorie-Badge, Titel, Excerpt, Datum
- "Alle Beiträge ansehen →" Link zu `blog.html`
- Beiträge werden via `fetch('public/data/blog.json')` geladen

## URL-Hash Navigation

```js
// Beim Laden + hashchange
window.addEventListener('hashchange', renderBlog);

function renderBlog() {
  const postId = window.location.hash.slice(1);
  postId ? renderPost(postId) : renderListing();
}
```

Hash-basierte Navigation funktioniert ohne Server-Konfiguration und ist direkt verlinkbar — wichtig für N8N-generierte Social-Media-Posts.

## N8N Integration

N8N aktualisiert `public/data/blog.json` via GitHub Contents API:

### Schritte

1. **GET** `GET /repos/{owner}/{repo}/contents/public/data/blog.json`  
   → Aktuelle Datei laden + `sha` merken

2. **Transform** Neuen Post-Objekt erstellen (alle Pflichtfelder befüllen)

3. **PUT** `PUT /repos/{owner}/{repo}/contents/public/data/blog.json`  
   ```json
   {
     "message": "feat(blog): add post 'TITEL'",
     "content": "<base64-encoded updated JSON>",
     "sha": "<sha from step 1>"
   }
   ```

4. **Netlify Auto-Deploy** wird automatisch durch den GitHub-Push ausgelöst

### Netlify Deploy Hook (optional)

Falls kein GitHub-Trigger aktiv: Netlify Build-Hook URL als N8N-Schritt am Ende.

## Design-Tokens

Gleiche CSS-Variablen wie `index.html`:

```css
--accent: #c8a96e;
--gray-950: #0d0d0d;
--gray-800: #1a1a1a;
/* etc. */
```

**Kategorie-Badges:**
- `ratgeber` → Accent-Farbe (`--accent`)
- `lokal` → Blau
- `saisonal` → Grün
- `news` → Grau

## SEO

- `<title>` dynamisch: `{Artikeltitel} | Schwarz Autoglas Rosenheim`
- `<meta name="description">` dynamisch aus `excerpt`
- `<link rel="canonical">` dynamisch gesetzt
- Structured Data (`Article` Schema) per Artikel als JSON-LD injiziert
- Sitemap muss nach Blog-Erstellung um `blog.html` erweitert werden

## Erstes Beitrags-Set (Beispiele)

1. **Ratgeber:** "Steinschlag: Reparieren oder tauschen? — Der große Guide"
2. **Lokal:** "Autoglas Service in Rosenheim — was du wissen musst"
3. **Saisonal:** "Wintervorbereitung: Windschutzscheibe checken & schützen"
4. **News:** "Schwarz Autoglas — Ihr mobiler Glaserservice im Raum Rosenheim"

## Offene Punkte

- Google Maps Embed im Kontaktbereich (separates Task)
- Sitemap-Update nach Blog-Implementierung
- N8N Workflow gemeinsam aufsetzen (nach Blog-Implementierung)
