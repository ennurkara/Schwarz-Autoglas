# Weekly Blog Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatisch jeden Montag einen SEO-optimierten Blog-Post via Claude generieren und in das GitHub-Repo committen, so dass Netlify ihn direkt deployed.

**Architecture:** n8n (wöchentlicher Cron) → Claude API (Post generieren) → GitHub API (blog.json + sitemap.xml aktualisieren) → Netlify auto-deploy. Website bekommt eine clientseitige Pagination (6 Posts initial, "Mehr laden").

**Tech Stack:** Vanilla JS (blog.html), n8n Workflow JSON, GitHub Contents API, Anthropic Claude API (claude-sonnet-4-6)

---

## File Structure

| Datei | Aktion | Verantwortung |
|-------|--------|---------------|
| `blog.html` | Modify (JS-Block ~397-430) | Pagination: 6 Posts initial + "Mehr laden" Button |
| `docs/n8n/weekly-blog-workflow.json` | Create | Importierbares n8n-Workflow JSON (8 Nodes) |
| `docs/n8n/SETUP.md` | Create | Schritt-für-Schritt Einrichtungsanleitung |

---

## Task 1: Blog Pagination in blog.html

**Files:**
- Modify: `blog.html` (JS-Block, Funktionen `renderListing` und Filter-Click-Handler)

### Was sich ändert

Aktuell rendert `renderListing()` alle Posts auf einmal. Wir fügen zwei State-Variablen hinzu (`POSTS_PER_PAGE = 6`, `visibleCount`) und einen "Mehr laden" Button.

- [ ] **Schritt 1.1: State-Variablen ergänzen**

In `blog.html`, im `<script>`-Block, direkt unter `let allPosts = [];` (Zeile ~301) folgenden Code einfügen:

```javascript
let allPosts = [];
const POSTS_PER_PAGE = 6;
let visibleCount = POSTS_PER_PAGE;
```

- [ ] **Schritt 1.2: CSS für "Mehr laden" Button ergänzen**

Im `<style>`-Block (vor dem schließenden `</style>`) ergänzen:

```css
.load-more-btn { background: transparent; border: 1px solid var(--gray-600); color: var(--white); padding: .75rem 2rem; font-size: .9rem; font-weight: 500; cursor: pointer; transition: border-color .2s, background .2s; font-family: inherit; }
.load-more-btn:hover { border-color: var(--accent); background: rgba(200,169,110,.08); }
```

- [ ] **Schritt 1.3: renderListing() anpassen**

Die bestehende `renderListing()` Funktion (Zeile ~397) durch diese Version ersetzen:

```javascript
function renderListing() {
  removeArticleSchema();
  setMeta(
    'Blog | Schwarz Autoglas Rosenheim',
    'Tipps, Ratgeber und News rund um Autoglas, Windschutzscheiben und mobilen Service im Raum Rosenheim.',
    'https://schwarz-autoglas.de/blog.html'
  );
  const filtered = activeCategory === 'all'
    ? allPosts
    : allPosts.filter(p => p.category === activeCategory);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const gridHTML = visible.length
    ? `<div class="blog-grid">${visible.map(renderCardHTML).join('')}</div>`
    : `<div class="blog-empty"><p>Keine Beiträge in dieser Kategorie.</p></div>`;

  const loadMoreHTML = hasMore
    ? `<div style="text-align:center;margin-top:2.5rem;">
        <button class="load-more-btn" id="loadMoreBtn">Weitere Artikel laden (${filtered.length - visibleCount} verbleibend)</button>
       </div>`
    : '';

  document.getElementById('blog-main').innerHTML = `
    <div class="blog-header">
      <div class="container">
        <p class="section-label">Wissen &amp; Aktuelles</p>
        <h1>Blog</h1>
        <p class="blog-header-sub">Tipps, Ratgeber und News rund um Autoglas im Raum Rosenheim</p>
      </div>
    </div>
    <div class="container" style="padding-bottom:5rem;">
      <div class="blog-filters" id="blogFilters">${renderFilters()}</div>
      ${gridHTML}
      ${loadMoreHTML}
    </div>`;

  document.getElementById('blogFilters').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    activeCategory = btn.dataset.category;
    visibleCount = POSTS_PER_PAGE;
    renderListing();
  });

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      visibleCount += POSTS_PER_PAGE;
      renderListing();
    });
  }
}
```

- [ ] **Schritt 1.4: Manuell im Browser testen**

```bash
npx serve .
```

Browser öffnen: `http://localhost:3000/blog.html`

Prüfen:
- Maximal 6 Posts werden initial angezeigt (derzeit nur 4 Posts → kein Button sichtbar, das ist korrekt)
- Nach Hinzufügen von 3+ weiteren Test-Posts in `blog.json`: "Weitere Artikel laden" erscheint
- Nach Klick: 6 weitere Posts erscheinen, Zähler im Button aktualisiert sich
- Kategorie-Filter-Klick: `visibleCount` wird auf 6 zurückgesetzt

- [ ] **Schritt 1.5: Commit**

```bash
git add blog.html
git commit -m "feat(blog): add load-more pagination (6 posts initial)"
```

---

## Task 2: n8n Workflow JSON erstellen

**Files:**
- Create: `docs/n8n/weekly-blog-workflow.json`

Dieses JSON kann direkt in n8n importiert werden (Workflows → Import from file).

- [ ] **Schritt 2.1: Workflow-Datei erstellen**

Datei `docs/n8n/weekly-blog-workflow.json` mit folgendem Inhalt anlegen:

```json
{
  "name": "Schwarz Autoglas – Wöchentlicher Blog-Post",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [{ "field": "weeks", "weeksInterval": 1, "triggerAtDay": [1], "triggerAtHour": 8, "triggerAtMinute": 0 }]
        }
      },
      "id": "node-1",
      "name": "Montags 08:00",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [240, 300]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "https://api.github.com/repos/={{ $vars.GITHUB_OWNER }}/schwarz-autoglas/contents/public/data/blog.json",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "options": {
          "headers": {
            "values": [
              { "name": "Accept", "value": "application/vnd.github+json" },
              { "name": "X-GitHub-Api-Version", "value": "2022-11-28" }
            ]
          }
        }
      },
      "id": "node-2",
      "name": "GitHub: blog.json lesen",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [460, 300],
      "credentials": { "httpHeaderAuth": { "id": "github-pat", "name": "GitHub PAT" } }
    },
    {
      "parameters": {
        "jsCode": "const raw = $input.first().json;\nconst decoded = Buffer.from(raw.content, 'base64').toString('utf-8');\nconst data = JSON.parse(decoded);\nconst existingTitles = data.posts.map(p => p.title);\nconst postCount = data.posts.length;\nconst categories = ['ratgeber', 'lokal', 'saisonal', 'news'];\nconst nextCategory = categories[postCount % categories.length];\nconst currentMonth = new Date().toLocaleString('de-DE', { month: 'long' });\nconst today = new Date().toISOString().split('T')[0];\nreturn [{ json: { data, existingTitles, nextCategory, currentMonth, today, sha: raw.sha } }];"
      },
      "id": "node-3",
      "name": "Parse blog.json",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [680, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.anthropic.com/v1/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "contentType": "json",
        "body": {
          "values": [
            { "name": "model", "value": "claude-sonnet-4-6" },
            { "name": "max_tokens", "value": 2000 },
            { "name": "system", "value": "Du bist ein SEO-Texter für Schwarz Autoglas Rosenheim, einen mobilen Autoglas-Service im Raum Rosenheim (Bayern). Du schreibst präzise, hilfreiche Blog-Posts auf Deutsch. Wichtige SEO-Keywords: 'Autoglas Rosenheim', 'Steinschlag', 'Windschutzscheibe reparieren', 'mobiler Autoglas-Service', 'Scheibentausch', 'ADAS-Kalibrierung', 'Teilkasko'. Gib IMMER nur valides JSON zurück — kein Text davor oder danach, keine Markdown-Codeblöcke." },
            { "name": "messages", "value": "={{ JSON.stringify([{ role: 'user', content: 'Schreibe einen neuen Blog-Post für Schwarz Autoglas. Kategorie: ' + $json.nextCategory + '. Aktueller Monat: ' + $json.currentMonth + '. Bereits vorhandene Titel (bitte nicht wiederholen): ' + JSON.stringify($json.existingTitles) + '. Der Content soll 400–600 Wörter haben, Abschnitte als <h2> Tags, Absätze als <p> Tags. Datum heute: ' + $json.today + '. Gib exakt dieses JSON-Objekt zurück (keine weiteren Keys): { \"id\": \"kebab-case-slug\", \"title\": \"Titel\", \"date\": \"' + $json.today + '\", \"category\": \"' + $json.nextCategory + '\", \"excerpt\": \"Max. 160 Zeichen, kein HTML\", \"content\": \"<p>...</p><h2>...</h2>...\", \"imageAlt\": \"Beschreibender Alt-Text\", \"tags\": [\"keyword1\", \"keyword2\", \"keyword3\"] }' }]) }}"
          ]
        },
        "options": {
          "headers": {
            "values": [
              { "name": "anthropic-version", "value": "2023-06-01" }
            ]
          }
        }
      },
      "id": "node-4",
      "name": "Claude: Post generieren",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [900, 300],
      "credentials": { "httpHeaderAuth": { "id": "anthropic-key", "name": "Anthropic API Key" } }
    },
    {
      "parameters": {
        "jsCode": "const claudeResponse = $input.first().json;\nconst text = claudeResponse.content[0].text.trim();\nconst newPost = JSON.parse(text);\nconst { data, sha, newPostId: _ignore } = $('Parse blog.json').first().json;\ndata.posts.unshift(newPost);\nconst MAX_POSTS = 52;\nif (data.posts.length > MAX_POSTS) data.posts = data.posts.slice(0, MAX_POSTS);\nconst updatedContent = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');\nreturn [{ json: { updatedContent, sha, newPostId: newPost.id, newPostDate: newPost.date } }];"
      },
      "id": "node-5",
      "name": "Merge: blog.json aufbauen",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1120, 300]
    },
    {
      "parameters": {
        "method": "PUT",
        "url": "https://api.github.com/repos/={{ $vars.GITHUB_OWNER }}/schwarz-autoglas/contents/public/data/blog.json",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "contentType": "json",
        "body": {
          "values": [
            { "name": "message", "value": "=content: add weekly blog post {{ $json.newPostId }}" },
            { "name": "content", "value": "={{ $json.updatedContent }}" },
            { "name": "sha", "value": "={{ $json.sha }}" }
          ]
        },
        "options": {
          "headers": {
            "values": [
              { "name": "Accept", "value": "application/vnd.github+json" },
              { "name": "X-GitHub-Api-Version", "value": "2022-11-28" }
            ]
          }
        }
      },
      "id": "node-6",
      "name": "GitHub: blog.json committen",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1340, 300],
      "credentials": { "httpHeaderAuth": { "id": "github-pat", "name": "GitHub PAT" } }
    },
    {
      "parameters": {
        "method": "GET",
        "url": "https://api.github.com/repos/={{ $vars.GITHUB_OWNER }}/schwarz-autoglas/contents/sitemap.xml",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "options": {
          "headers": {
            "values": [
              { "name": "Accept", "value": "application/vnd.github+json" },
              { "name": "X-GitHub-Api-Version", "value": "2022-11-28" }
            ]
          }
        }
      },
      "id": "node-7",
      "name": "GitHub: sitemap.xml lesen",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1560, 300],
      "credentials": { "httpHeaderAuth": { "id": "github-pat", "name": "GitHub PAT" } }
    },
    {
      "parameters": {
        "jsCode": "const sitemapRaw = $input.first().json;\nconst sitemapXml = Buffer.from(sitemapRaw.content, 'base64').toString('utf-8');\nconst { newPostId, newPostDate } = $('Merge: blog.json aufbauen').first().json;\nconst newEntry = `  <url>\\n    <loc>https://schwarz-autoglas.de/blog.html#${newPostId}</loc>\\n    <lastmod>${newPostDate}</lastmod>\\n    <changefreq>weekly</changefreq>\\n    <priority>0.7</priority>\\n  </url>`;\nconst updated = sitemapXml.replace('</urlset>', newEntry + '\\n</urlset>');\nconst updatedContent = Buffer.from(updated).toString('base64');\nreturn [{ json: { updatedContent, sha: sitemapRaw.sha } }];"
      },
      "id": "node-8-code",
      "name": "Sitemap: URL einfügen",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1780, 300]
    },
    {
      "parameters": {
        "method": "PUT",
        "url": "https://api.github.com/repos/={{ $vars.GITHUB_OWNER }}/schwarz-autoglas/contents/sitemap.xml",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "contentType": "json",
        "body": {
          "values": [
            { "name": "message", "value": "=seo: update sitemap with new blog post" },
            { "name": "content", "value": "={{ $json.updatedContent }}" },
            { "name": "sha", "value": "={{ $json.sha }}" }
          ]
        },
        "options": {
          "headers": {
            "values": [
              { "name": "Accept", "value": "application/vnd.github+json" },
              { "name": "X-GitHub-Api-Version", "value": "2022-11-28" }
            ]
          }
        }
      },
      "id": "node-8",
      "name": "GitHub: sitemap.xml committen",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [2000, 300],
      "credentials": { "httpHeaderAuth": { "id": "github-pat", "name": "GitHub PAT" } }
    }
  ],
  "connections": {
    "Montags 08:00": { "main": [[{ "node": "GitHub: blog.json lesen", "type": "main", "index": 0 }]] },
    "GitHub: blog.json lesen": { "main": [[{ "node": "Parse blog.json", "type": "main", "index": 0 }]] },
    "Parse blog.json": { "main": [[{ "node": "Claude: Post generieren", "type": "main", "index": 0 }]] },
    "Claude: Post generieren": { "main": [[{ "node": "Merge: blog.json aufbauen", "type": "main", "index": 0 }]] },
    "Merge: blog.json aufbauen": { "main": [[{ "node": "GitHub: blog.json committen", "type": "main", "index": 0 }]] },
    "GitHub: blog.json committen": { "main": [[{ "node": "GitHub: sitemap.xml lesen", "type": "main", "index": 0 }]] },
    "GitHub: sitemap.xml lesen": { "main": [[{ "node": "Sitemap: URL einfügen", "type": "main", "index": 0 }]] },
    "Sitemap: URL einfügen": { "main": [[{ "node": "GitHub: sitemap.xml committen", "type": "main", "index": 0 }]] }
  },
  "active": false,
  "settings": { "executionOrder": "v1" },
  "tags": [{ "name": "seo" }, { "name": "automation" }]
}
```

- [ ] **Schritt 2.2: Commit**

```bash
git add docs/n8n/weekly-blog-workflow.json
git commit -m "feat(n8n): add importable weekly blog automation workflow"
```

---

## Task 3: n8n Setup-Dokumentation

**Files:**
- Create: `docs/n8n/SETUP.md`

- [ ] **Schritt 3.1: SETUP.md erstellen**

```markdown
# n8n Einrichtung: Wöchentlicher Blog-Post

## Voraussetzungen

- n8n-Instanz (selbst gehostet oder n8n Cloud)
- GitHub Personal Access Token (PAT)
- Anthropic API Key

## Schritt 1: GitHub PAT erstellen

1. GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens
2. **Repository access:** Nur `schwarz-autoglas`
3. **Permissions:** Contents → Read and Write
4. Token kopieren

## Schritt 2: Credentials in n8n anlegen

### GitHub PAT
- n8n → Credentials → New → HTTP Header Auth
- Name: `GitHub PAT`
- Header Name: `Authorization`
- Header Value: `Bearer <DEIN_TOKEN>`

### Anthropic API Key
- n8n → Credentials → New → HTTP Header Auth
- Name: `Anthropic API Key`
- Header Name: `x-api-key`
- Header Value: `<DEIN_ANTHROPIC_KEY>`

## Schritt 3: GITHUB_OWNER Variable setzen

- n8n → Settings → Variables → New
- Name: `GITHUB_OWNER`
- Value: GitHub-Username oder Organisation (z.B. `ennurkara`)

## Schritt 4: Workflow importieren

1. n8n → Workflows → Import from file
2. Datei wählen: `docs/n8n/weekly-blog-workflow.json`
3. Workflow öffnen → Credentials in Nodes prüfen (GitHub PAT + Anthropic Key müssen zugewiesen sein)

## Schritt 5: Testlauf

1. Workflow öffnen → oben rechts "Test workflow" klicken
2. Node-Outputs einzeln prüfen:
   - Node 2: Gibt `content` (base64) und `sha` zurück ✓
   - Node 3: Gibt `existingTitles`, `nextCategory`, `today` zurück ✓
   - Node 4: Claude gibt valides JSON zurück ✓
   - Node 5: `updatedContent` ist base64-encoded ✓
   - Node 6: GitHub antwortet mit `commit.sha` ✓
   - Node 8: sitemap.xml enthält neue URL ✓

## Schritt 6: Aktivieren

- Workflow → Toggle "Active" → On
- Läuft ab sofort jeden Montag 08:00 Uhr (Europe/Berlin)

## Fehlerbehandlung

In n8n unter Workflow Settings → Error Workflow einen Error-Workflow einrichten, der per E-Mail benachrichtigt (n8n-nodes-base.emailSend oder ein Slack-Node).
```

- [ ] **Schritt 3.2: Commit**

```bash
git add docs/n8n/SETUP.md
git commit -m "docs(n8n): add setup guide for weekly blog automation"
```

---

## Task 4: Abschluss-Verifikation

- [ ] **Schritt 4.1: Lokalen Server starten und Blog testen**

```bash
npx serve .
```

`http://localhost:3000/blog.html` öffnen und prüfen:
- Blog-Listing lädt korrekt
- Kategorie-Filter funktioniert
- Pagination-State wird bei Kategorie-Wechsel zurückgesetzt

- [ ] **Schritt 4.2: n8n Testlauf ausführen**

In n8n Workflow manuell triggern (Test-Button). Danach in GitHub prüfen:
- `public/data/blog.json` hat einen neuen Commit mit einem frischen Post
- `sitemap.xml` enthält die neue Blog-URL
- Netlify deployed automatisch

- [ ] **Schritt 4.3: Workflow aktivieren**

In n8n: Workflow-Toggle auf "Active" setzen.

- [ ] **Schritt 4.4: Finaler Push**

```bash
git push origin main
```
