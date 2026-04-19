# n8n Einrichtung: Wöchentlicher Blog-Post

## Voraussetzungen

- n8n-Instanz (selbst gehostet oder n8n Cloud)
- GitHub Personal Access Token (PAT)
- OpenAI API Key

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

### OpenAI API Key
- n8n → Credentials → New → HTTP Header Auth
- Name: `OpenAI API Key`
- Header Name: `Authorization`
- Header Value: `Bearer <DEIN_OPENAI_KEY>`

## Schritt 3: GITHUB_OWNER Variable setzen

- n8n → Settings → Variables → New
- Name: `GITHUB_OWNER`
- Value: GitHub-Username oder Organisation (z.B. `ennurkara`)

## Schritt 4: Workflow importieren

1. n8n → Workflows → Import from file
2. Datei wählen: `docs/n8n/weekly-blog-workflow.json`
3. Workflow öffnen → Credentials in Nodes prüfen (GitHub PAT + OpenAI Key müssen zugewiesen sein)

## Schritt 5: Testlauf

1. Workflow öffnen → oben rechts "Test workflow" klicken
2. Node-Outputs einzeln prüfen:

| Node | Erwartet | Hinweis |
|------|----------|---------|
| GitHub: blog.json lesen | `content` (base64), `sha` | GET ohne Body |
| Parse blog.json | `existingTitles`, `nextCategory`, `today` | Code Node |
| ChatGPT: Post generieren | `choices[0].message.content` = JSON | `imageAlt` in English für DALL-E |
| Parse ChatGPT Post | `newPost`, `imagePrompt` | Code Node |
| DALL-E: Bild generieren | `data[0].b64_json` | ~10–20s, 1792×1024 PNG |
| GitHub: Bild committen | `commit.sha` | Erstellt `public/images/blog/{id}.png` |
| Merge: blog.json aufbauen | `updatedContent`, `sha`, `newPostId` | Fügt `image` Feld hinzu |
| GitHub: blog.json committen | `commit.sha` | Blog-Post + Bild-Pfad gespeichert |
| GitHub: sitemap.xml lesen | `content` (base64), `sha` | GET ohne Body |
| Sitemap: URL einfügen | `updatedContent` | Neue URL eingefügt |
| GitHub: sitemap.xml committen | `commit.sha` | Sitemap aktualisiert |

## Schritt 6: Aktivieren

- Workflow → Toggle "Active" → On
- Läuft ab sofort jeden Montag 08:00 Uhr (Europe/Berlin)

## Fehlerbehandlung

In n8n unter Workflow Settings → Error Workflow einen Error-Workflow einrichten, der per E-Mail benachrichtigt (n8n-nodes-base.emailSend oder ein Slack-Node).
