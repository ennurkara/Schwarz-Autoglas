# Schwarz Autoglas – Website Improvements Design

**Datum:** 2026-04-15  
**Status:** Approved  
**Scope:** Vollständige Überarbeitung der statischen Seite in 5 Phasen

---

## Überblick

Die bestehende `index.html` (Static Site, kein Framework) wird in 5 priorisierten Phasen verbessert. Die Seite ist auf Netlify deployed, Domain läuft über Strato.

---

## Phase 1 — Kritische Bugs

### 1.1 Mobile Slide-in Menü: geblurrt & nicht anklickbar

**Problem:** Das `backdrop-filter: blur(2px)` auf `.nav-backdrop` überlagert das Menüpanel (`.nav-links`) auf bestimmten mobilen Browsern — das Panel erscheint geblurrt und Klicks landen auf dem Backdrop statt auf den Links.

**Fix:** `backdrop-filter: blur(2px)` aus `.nav-backdrop` entfernen. Das Filter erzeugt einen neuen Stacking Context der das Panel auf bestimmten mobilen Browsern visuell einschließt und Klicks abfängt. Ersatz: nur `background: rgba(0,0,0,0.55)` ohne Filter. Das Blur-Effekt war nur dekorativ — die Funktion bleibt vollständig erhalten.

### 1.2 Hero-Video: letzte Sekunden zu hell → Text unlesbar

**Problem:** Das Video `hero.mp4` hellt in den letzten Sekunden auf. Der darüberliegende Overlay-Gradient reicht nicht aus.

**Fix:** Dynamisches Overlay via JavaScript — kurz vor Video-Ende (`timeupdate`-Event) Overlay-Deckkraft sanft erhöhen:
```js
heroVideo.addEventListener('timeupdate', () => {
  const remaining = heroVideo.duration - heroVideo.currentTime;
  if (remaining < 2) {
    heroOverlay.style.background = 'rgba(8,8,8,0.85)';
  } else {
    heroOverlay.style.background = ''; // zurück zum CSS-Wert
  }
});
```
Alternativ: CSS-Overlay-Gradient verstärken (Fallback wenn JS nicht greift).

### 1.3 Mobile Hero Section: Video zu groß

**Problem:** Auf kleinen Displays (< 560px) nimmt das Hintergrundvideo die volle Viewport-Höhe ein, was überdimensioniert wirkt und die Performance belastet.

**Fix:**
- `min-height` der `.hero` Section auf mobil reduzieren: `min-height: 100svh` statt `100vh` (berücksichtigt Browser-Chrome)
- Optional: Auf Mobile das Video durch ein Standbild (`poster`-Attribut) ersetzen, Video nur bei `prefers-reduced-data: no-preference` laden

---

## Phase 2 — Echte Inhalte

### 2.1 Kontaktdaten befüllen

Folgende Platzhalter in `index.html` ersetzen:
- Telefonnummer: `+49 (0) 000 000 000` → echte Nummer (nav, contact, footer)
- E-Mail: `info@schwarz-autoglas.de` → bestätigen oder korrigieren
- Adresse: im Footer ergänzen
- Öffnungszeiten: aktuell `Mo–Fr 07:30–18:00 Uhr` → bestätigen oder anpassen

### 2.2 Foto „Warum wir"-Sektion

Die `.why-img-wrap` enthält aktuell einen Placeholder-Div. Ein echtes Foto (z.B. Werkstatt, Monteur bei der Arbeit) wird als `<img>`-Tag eingebaut:
```html
<img src="public/images/why-us.jpg" alt="Monteur bei der Arbeit" loading="lazy" />
```
Bildgröße: min. 800×600px, Format JPG oder WebP.

### 2.3 Echte Google-Rezensionen

Die drei Dummy-Testimonials werden durch echte Kundenbewertungen ersetzt. Datenquelle: Google Business Profil des Unternehmens.

Umsetzung: Statisch — Texte, Autorname und Fahrzeug manuell aus Google Maps kopieren und in die bestehenden `<article class="testimonial-card">`-Elemente eintragen. Kein API-Call, kein Datenschutzproblem.

### 2.4 Google-Rezension-Button

Ein neuer CTA-Button unterhalb der Testimonials-Sektion:
```html
<div style="text-align:center;margin-top:2.5rem;">
  <a href="https://g.page/r/[PLACE_ID]/review" target="_blank" rel="noopener" class="btn-secondary">
    ⭐ Jetzt Bewertung abgeben
  </a>
</div>
```
Benötigt: Google Place ID des Unternehmens (aus Google Business Profil abrufbar).

---

## Phase 3 — Features

### 3.1 Kontaktformular: Netlify Function + Strato SMTP

**Anforderung:** DSGVO-konform, Daten gehen nicht an US-Dienste, kein Drittanbieter.

**Architektur:**
```
Browser → POST /api/contact → Netlify Function → Strato SMTP → Posteingang
```

**Neue Dateien:**
```
netlify/
  functions/
    contact.js     — serverlose Funktion (Node.js)
netlify.toml       — Netlify-Konfiguration
package.json       — nodemailer als Dependency
```

**`netlify/functions/contact.js`:**
- Empfängt JSON-Body (name, phone, email, car, service, message)
- Validiert Pflichtfelder (name, phone, email)
- Sendet E-Mail via Strato SMTP (`smtp.strato.de:587`, STARTTLS) mit `nodemailer`
- Gibt `200 { success: true }` oder `400/500` zurück

**Strato SMTP-Konfiguration (Netlify Env Vars):**
- `STRATO_HOST` = `smtp.strato.de`
- `STRATO_PORT` = `587`
- `STRATO_USER` = vollständige E-Mail-Adresse
- `STRATO_PASS` = Strato E-Mail-Passwort
- `CONTACT_RECIPIENT` = Empfänger-E-Mail

**Frontend (in `index.html`):**
- Formular-Submit-Handler ersetzt durch `fetch('/.netlify/functions/contact', { method: 'POST', body: JSON.stringify(formData) })`
- Erfolgsstate: Button-Text → „Anfrage gesendet ✓", Button deaktiviert
- Fehlerstate: Button-Text → „Fehler – bitte erneut versuchen", Button wieder aktiv

**DSGVO-Aspekt:** Strato ist ein deutsches Unternehmen, Server in Deutschland. Daten werden nicht gespeichert, nur weitergeleitet. In der Datenschutzerklärung: Strato als Auftragsverarbeiter nennen.

### 3.2 Impressum

Neue Seite `impressum.html` mit Pflichtangaben nach § 5 TMG:
- Unternehmensname, Inhaber
- Anschrift
- Telefon, E-Mail
- Handelsregister (falls vorhanden) oder Gewerbeanmeldung
- USt-IdNr. (falls vorhanden)
- Links im Footer (`href="impressum.html"`) aktualisieren

### 3.3 Datenschutzerklärung

Neue Seite `datenschutz.html` nach DSGVO Art. 13:
- Verantwortlicher
- Hosting: Netlify (US, SCCs vorhanden) — Hinweis erforderlich
- Domain/E-Mail: Strato (DE)
- Kontaktformular: Strato SMTP, Zweck, Rechtsgrundlage (Art. 6 Abs. 1 lit. b DSGVO)
- Google Fonts: aktuell extern geladen → **Hinweis oder lokal hosten**
- Betroffenenrechte (Auskunft, Löschung, etc.)
- Links im Footer aktualisieren

> **Hinweis:** Google Fonts wird aktuell von `fonts.googleapis.com` geladen — das ist ein US-Datentransfer ohne explizite Einwilligung. Empfehlung: Schrift lokal hosten (`public/fonts/`) und `<link>` aus `<head>` entfernen.

---

## Phase 4 — SEO & Performance

### 4.1 Meta-Tags & Open Graph

In `<head>` ergänzen:
- `<meta property="og:title">`, `og:description`, `og:image`, `og:url`
- `<meta name="twitter:card" content="summary_large_image">`
- `<link rel="canonical" href="https://www.schwarz-autoglas.de/">`

### 4.2 LocalBusiness Schema (JSON-LD)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  "name": "Schwarz Autoglas",
  "telephone": "...",
  "address": { ... },
  "openingHours": "Mo-Fr 07:30-18:00",
  "priceRange": "€€"
}
</script>
```

### 4.3 Sitemap & robots.txt

- `sitemap.xml` mit `index.html`, `impressum.html`, `datenschutz.html`
- `robots.txt`: `Sitemap:` Direktive

### 4.4 Performance

- Google Fonts lokal hosten (auch DSGVO-Vorteil, siehe Phase 3)
- Hero-Video: `poster`-Attribut mit Standbild für mobil
- Bilder: WebP-Format, `loading="lazy"` für alle nicht-hero Bilder

---

## Phase 5 — Design & UI-Feinschliff

Konkrete Maßnahmen werden nach Abschluss der Phasen 1–4 gemeinsam definiert. Mögliche Bereiche:
- Scroll-Animationen (Intersection Observer, CSS transitions)
- Testimonials-Sektion: Slider/Karussell für mehr Bewertungen
- Hover-Effekte auf Service-Cards verfeinern
- Typography-Feintuning (Zeilenabstand, Laufweite)

---

## Offene Informationen (vom Kunden benötigt)

Bevor Phase 2 und 3 umgesetzt werden können:

| Information | Benötigt für |
|---|---|
| Echte Telefonnummer | Phase 2.1 |
| Echte Adresse | Phase 2.1, 3.2, 3.3 |
| Öffnungszeiten bestätigen | Phase 2.1 |
| Foto für „Warum wir" | Phase 2.2 |
| 3 echte Kundenbewertungen | Phase 2.3 |
| Google Place ID | Phase 2.4 |
| Strato E-Mail-Zugangsdaten | Phase 3.1 (als Env Vars) |
| Inhaber-Daten für Impressum | Phase 3.2 |

---

## Dateistruktur nach Umsetzung

```
index.html
impressum.html              (neu)
datenschutz.html            (neu)
netlify.toml                (neu)
package.json                (neu)
robots.txt                  (neu)
sitemap.xml                 (neu)
netlify/
  functions/
    contact.js              (neu)
public/
  video/
    hero.mp4
  images/
    logo.png
    why-us.jpg              (neu)
  fonts/                    (neu, für lokale Google Fonts)
```
