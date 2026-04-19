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
