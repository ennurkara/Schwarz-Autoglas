# Design: Automatische wöchentliche Blog-Posts via n8n + Claude

**Datum:** 2026-04-19
**Status:** Approved
**Ziel:** Wöchentliche SEO-Blog-Posts vollautomatisch generieren und publizieren, ohne manuellen Eingriff.

---

## Kontext

Die Website `schwarz-autoglas.de` nutzt eine statische `public/data/blog.json` als einziges Content-Backend. `blog.html` liest diese Datei per `fetch()` und rendert die Posts clientseitig. Netlify deployed automatisch bei jedem Push auf `main`.

---

## Architektur

```
n8n (wöchentlich)
  → GitHub API: blog.json lesen
  → Claude API: neuen Post generieren
  → GitHub API: blog.json committen
  → GitHub API: sitemap.xml committen
  → Netlify: auto-deploy (kein Eingriff nötig)
```

Kein neuer Server, keine Datenbank, keine Änderung der Website-Infrastruktur.

---

## n8n Workflow (8 Nodes)

### Node 1: Schedule Trigger
- Jeden Montag, 08:00 Uhr
- Timezone: Europe/Berlin

### Node 2: HTTP Request — GitHub GET blog.json
- Method: `GET`
- URL: `https://api.github.com/repos/[OWNER]/schwarz-autoglas/contents/public/data/blog.json`
- Headers: `Authorization: Bearer [GITHUB_PAT]`, `Accept: application/vnd.github+json`
- Speichert: `content` (Base64), `sha` (für späteren PUT)

### Node 3: Code Node — Parse & Vorbereitung
```javascript
const decoded = Buffer.from($input.first().json.content, 'base64').toString('utf-8');
const data = JSON.parse(decoded);
const existingTitles = data.posts.map(p => p.title);
const postCount = data.posts.length;
const categories = ['ratgeber', 'lokal', 'saisonal', 'news'];
const nextCategory = categories[postCount % categories.length];
const currentMonth = new Date().toLocaleString('de-DE', { month: 'long' });
const today = new Date().toISOString().split('T')[0]; // z.B. "2026-04-21"
return [{ json: { data, existingTitles, nextCategory, currentMonth, today, sha: $input.first().json.sha } }];
```

### Node 4: HTTP Request — Claude API
- Method: `POST`
- URL: `https://api.anthropic.com/v1/messages`
- Headers: `x-api-key: [ANTHROPIC_API_KEY]`, `anthropic-version: 2023-06-01`
- Body:
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 2000,
  "system": "Du bist ein SEO-Texter für Schwarz Autoglas Rosenheim, einen mobilen Autoglas-Service im Raum Rosenheim (Bayern). Du schreibst präzise, hilfreiche Blog-Posts auf Deutsch, die lokal und saisonal relevant sind. Wichtige SEO-Keywords: 'Autoglas Rosenheim', 'Steinschlag', 'Windschutzscheibe reparieren', 'mobiler Autoglas-Service', 'Scheibentausch', 'ADAS-Kalibrierung', 'Teilkasko'. Gib IMMER nur valides JSON zurück, kein Fließtext davor oder danach.",
  "messages": [{
    "role": "user",
    "content": "Schreibe einen neuen Blog-Post für Schwarz Autoglas. Kategorie: {{nextCategory}}. Aktueller Monat: {{currentMonth}}. Bereits vorhandene Titel (nicht wiederholen): {{existingTitles}}. Der Content soll 400-600 Wörter haben, Überschriften als <h2> Tags, Absätze als <p> Tags. Gib das Ergebnis als JSON zurück mit diesen Feldern: id (kebab-case slug, einzigartig), title, date (heute: {{today}}), category, excerpt (max. 160 Zeichen, Fließtext ohne HTML), content (HTML), imageAlt (beschreibender Alt-Text), tags (Array mit 3-5 deutschen Keywords)."
  }]
}
```

### Node 5: Code Node — Merge & blog.json aufbauen
```javascript
const claudeText = $input.first().json.content[0].text;
const newPost = JSON.parse(claudeText);
const { data, sha } = $('Node 3').first().json;
data.posts.unshift(newPost); // neueste Posts zuerst
const MAX_POSTS = 52; // max. 1 Jahr History
if (data.posts.length > MAX_POSTS) data.posts = data.posts.slice(0, MAX_POSTS);
const updatedContent = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
return [{ json: { updatedContent, sha, newPostId: newPost.id, newPostDate: newPost.date } }];
```

### Node 6: HTTP Request — GitHub PUT blog.json
- Method: `PUT`
- URL: `https://api.github.com/repos/[OWNER]/schwarz-autoglas/contents/public/data/blog.json`
- Headers: wie Node 2
- Body:
```json
{
  "message": "content: add weekly blog post {{newPostId}}",
  "content": "{{updatedContent}}",
  "sha": "{{sha}}"
}
```

### Node 7: HTTP Request — GitHub GET sitemap.xml
- Method: `GET`
- URL: `https://api.github.com/repos/[OWNER]/schwarz-autoglas/contents/sitemap.xml`
- Speichert: `content` (Base64), `sha`

### Node 8: HTTP Request — GitHub PUT sitemap.xml
- Dekodiert sitemap.xml, fügt neue URL ein:
  ```xml
  <url>
    <loc>https://schwarz-autoglas.de/blog.html#{{newPostId}}</loc>
    <lastmod>{{newPostDate}}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  ```
- Committet aktualisierte sitemap.xml mit SHA aus Node 7

---

## Website-Anpassungen (blog.html)

### 1. Pagination ("Mehr laden")
Aktuell werden alle Posts auf einmal gerendert. Nach mehreren Monaten wächst die Liste.

- Initial: **6 Posts** anzeigen
- Button "Weitere Artikel laden" → nächste 6 Posts einblenden
- Rein clientseitig im bestehenden JS, kein Framework nötig

### 2. Keine weiteren Änderungen
Die `blog.html` liest `blog.json` bereits dynamisch via `fetch()`. Das Schema des neuen Posts entspricht exakt dem bestehenden Format.

---

## Claude Prompt-Strategie

| Parameter | Wert |
|-----------|------|
| Modell | `claude-sonnet-4-6` |
| Sprache | Deutsch |
| Länge | 400–600 Wörter |
| Kategorie-Rotation | ratgeber → lokal → saisonal → news (basierend auf `postCount % 4`) |
| Saisonaler Kontext | Aktueller Monat wird mitgegeben |
| Duplikat-Schutz | Bestehende Titel werden im Prompt übergeben |
| Output-Format | Striktes JSON (kein Fließtext) |

---

## Credentials in n8n

| Variable | Beschreibung |
|----------|-------------|
| `GITHUB_PAT` | GitHub Personal Access Token (Scope: `contents:write`) |
| `ANTHROPIC_API_KEY` | Anthropic API Key |

---

## Limits & Sicherheit

- **Max. Posts:** 52 (1 Jahr) — älteste werden automatisch entfernt
- **Fehlerbehandlung:** n8n Error-Node bei fehlgeschlagenem Claude/GitHub Call → E-Mail-Benachrichtigung
- **Kosten:** ~$0.01–0.03 pro Post (Claude Sonnet) + GitHub API (kostenlos)

---

## Was NICHT enthalten ist

- Kein Bild-Upload (imageAlt beschreibt das Bild, das Rendering nutzt einen CSS-Platzhalter)
- Kein manuelles Review
- Kein CMS-Interface
