# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static single-page website for **Schwarz Autoglas**, a German auto glass service business based in Rosenheim. No build step, no framework — vanilla HTML/CSS/JS with a Netlify Function for GDPR-compliant form handling.

## Commands

```bash
# Local development - serve static files
npx serve .

# Local testing of Netlify Function
npm install
npx netlify dev

# Deploy
git push origin main  # Netlify auto-deploys from main branch
```

## Structure

```
index.html              # Entire website (HTML + embedded CSS + embedded JS)
impressum.html          # Legal imprint page (§ 5 TMG)
datenschutz.html        # Privacy policy (DSGVO)
netlify.toml            # Netlify Functions config
package.json            # Dependencies for Netlify Function only
netlify/
  functions/
    contact.js          # Contact form handler via Strato SMTP
public/
  video/
    hero.mp4            # Full-screen hero background video
  images/
    logo.png            # Navigation logo
    why-us.jpg          # Photo in "Why us" section (pending)
  fonts/
    inter-*.woff2       # Locally hosted Inter font (6 weights)
```

## Architecture

### Single-File Frontend
All CSS in `<style>` block in `<head>`, all JS in `<script>` at end of `<body>`. No external libraries.

### Design Tokens
```css
--black: #080808      --gray-950: #0d0d0d    --gray-800: #1a1a1a
--gray-700: #2a2a2a   --gray-600: #3a3a3a    --gray-500: #555555
--gray-400: #888888   --gray-300: #aaaaaa    --gray-200: #cccccc
--gray-100: #e5e5e5   --white: #ffffff       --accent: #c8a96e
```

### Contact Form Backend (GDPR-compliant)
Browser → `POST /.netlify/functions/contact` → Strato SMTP (DE-based) → E-Mail

Environment variables (Netlify Dashboard → Site → Environment Variables):
- `STRATO_HOST` — smtp.strato.de
- `STRATO_PORT` — 587
- `STRATO_USER` — Strato E-Mail
- `STRATO_PASS` — Strato Passwort
- `CONTACT_RECIPIENT` — Empfänger-E-Mail

### Fonts
Inter font locally hosted in `public/fonts/` (6 weights: 300–800). No external Google Fonts requests.

## Content Status

| Section | Status | Notes |
|---------|--------|-------|
| Contact data | ✅ Real | +49 (0) 173 5252175, info@schwarz-autoglas.de, Waldfriedstraße 3a, 83024 Rosenheim |
| Testimonials | ✅ Real | 3 echte Google Reviews (Marlene E., Danijel Oguman, Samet I.) |
| Review button | ⚠️ Partial | Links to Google search; Place ID needed for direct review link |
| Why-us photo | ❌ Pending | `public/images/why-us.jpg` fehlt |

## Legal Pages

- `impressum.html` — § 5 TMG imprint, linked from footer
- `datenschutz.html` — DSGVO privacy policy, linked from footer
- Both use same design tokens and local fonts as main page

## SEO Status (Audit 2026-04-16)

**SEO Health Score: 72/100**

| Category | Score | Status |
|----------|-------|--------|
| Technical SEO | 78/100 | ✅ Gute Basis |
| Performance | 88/100 | ✅ Exzellent (77ms Load) |
| Content/E-E-A-T | 65/100 | ⚠️ Lücken bei Autorenprofil, Zertifikaten |
| On-Page SEO | 68/100 | ⚠️ Title zu kurz, keine Local-Keywords |
| Schema.org | 55/100 | ❌ Fehlende `aggregateRating`, `sameAs` (GBP) |
| Local SEO | 58/100 | ❌ Keine GBP-Verknüpfung, kein Maps Embed |

### Pending SEO-Implementierungen

- [ ] **Favicon** hinzufügen (32x32 + Apple Touch Icons)
- [ ] **Canonical-URL** setzen
- [ ] **Title-Tag** optimieren: "Autoglas Rosenheim" + USPs
- [ ] **Open Graph Tags** hinzufügen
- [ ] **Schema.org erweitern**: `aggregateRating`, `serviceType`, `sameAs`
- [ ] **Local-Keywords** integrieren: "Autoglas Rosenheim", "Windschutzscheibe [Stadt]"
- [ ] **Google Maps Embed** im Kontaktbereich
- [ ] **Service-Area-Städte** nennen (Rosenheim, Bad Endorf, Prien, Kolbermoor)
- [ ] **Live Review-Widget** einbinden

## Mobile Navigation (Burger Menu)

The mobile menu uses a slide-in panel with a backdrop overlay. Key implementation details:

- **z-index stacking**: Backdrop (110) → Backdrop-click (125) → Navbar (140) → Menu (150)
- **Backdrop**: Two-element approach — visual overlay (`nav-backdrop`) and clickable area (`nav-backdrop-click`) that only covers the area outside the menu panel (`right: 280px`)
- **Navbar when menu open**: Gets `.menu-open` class to become fully opaque (`var(--gray-950)`) and remove border-bottom, ensuring consistent appearance regardless of scroll state
