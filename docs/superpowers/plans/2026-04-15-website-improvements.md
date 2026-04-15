# Website Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Schwarz Autoglas website verbessern in 5 priorisierten Phasen: Bugs fixen, echte Inhalte, DSGVO-konformes Kontaktformular, SEO & Performance, Design-Feinschliff.

**Architecture:** Alles in einer einzigen `index.html` (HTML + CSS + JS inline). Phase 3 fügt eine Netlify Function (`netlify/functions/contact.js`) hinzu, die per Strato SMTP E-Mails verschickt. Keine Frameworks, kein Build-Step für HTML — nur `package.json` für die Netlify Function.

**Tech Stack:** Vanilla HTML/CSS/JS, Netlify Functions (Node.js), nodemailer 6.9.14, Strato SMTP

---

## Daten-Abhängigkeiten

Folgende Tasks können **sofort** umgesetzt werden (kein User-Input nötig):
- Task 1, 2, 3 (Bugs), Task 7 (Form-Backend-Code), Task 10 (Fonts), Task 12 (robots.txt)

Folgende Tasks warten auf **Daten vom Kunden** — diese erst anfassen wenn die Daten vorliegen:
- Task 4 (Kontaktdaten), Task 5 (Foto), Task 6 (Rezensionen + Place ID), Task 8 (Impressum), Task 9 (Datenschutz), Task 11 (Schema braucht echte Adresse)

---

## Phase 1 — Kritische Bugs

---

### Task 1: Mobile Menü — Backdrop-Filter entfernen

**Files:**
- Modify: `index.html` — CSS-Block, `.nav-backdrop`-Regel (ca. Zeile 896–905)

**Hintergrund:** `backdrop-filter: blur(2px)` auf `.nav-backdrop` erzeugt einen neuen Stacking Context. Auf bestimmten mobilen Browsern (Safari iOS, Chrome Android) werden dadurch Klicks auf das Panel (z-index 120) vom Backdrop (z-index 110) abgefangen und das Panel erscheint geblurrt.

- [ ] **Schritt 1: CSS-Regel anpassen**

Suche in `index.html` den Block:
```css
.nav-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 110;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}
```

Ersetze mit:
```css
.nav-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 110;
}
```

- [ ] **Schritt 2: Testen**

Browser öffnen → DevTools → Gerät auf iPhone SE (375px) stellen → Burger-Menü öffnen → auf jeden Link klicken. Erwartetes Ergebnis: Links sind anklickbar, Menü schließt sich, kein Blur-Effekt auf dem Panel.

- [ ] **Schritt 3: Commit**

```bash
git add index.html
git commit -m "fix: remove backdrop-filter from nav-backdrop to fix mobile menu click blocking"
```

---

### Task 2: Hero-Video — Overlay bei hellem Video-Ende verstärken

**Files:**
- Modify: `index.html` — JS-Block am Ende von `<body>` (nach `closeMenu`-Funktion)

**Hintergrund:** Das Video `hero.mp4` hellt in den letzten ~2 Sekunden auf. Der statische CSS-Gradient reicht dann nicht aus und der Hero-Text wird unlesbar.

- [ ] **Schritt 1: Variablen am Anfang des JS-Blocks ergänzen**

Suche in `index.html` nach:
```js
// ── Navbar scroll effect
const navbar = document.getElementById('navbar');
```

Füge davor ein:
```js
// ── Hero video overlay fade
const heroVideo = document.querySelector('.hero-video');
const heroOverlay = document.querySelector('.hero-overlay');

if (heroVideo && heroOverlay) {
  heroVideo.addEventListener('timeupdate', () => {
    if (!heroVideo.duration) return;
    const remaining = heroVideo.duration - heroVideo.currentTime;
    if (remaining < 2) {
      heroOverlay.style.background = 'rgba(8,8,8,0.85)';
    } else {
      heroOverlay.style.background = '';
    }
  });
}
```

- [ ] **Schritt 2: Testen**

Browser öffnen → Hero-Sektion sichtbar → Video bis zum Ende abspielen lassen (oder DevTools → Network → Video-URL kopieren, im Tab öffnen, Länge notieren, dann currentTime via Konsole setzen: `document.querySelector('.hero-video').currentTime = duration - 1.5`). Erwartetes Ergebnis: Overlay wird dunkler, Text bleibt lesbar.

- [ ] **Schritt 3: CSS-Fallback verstärken (zusätzliche Sicherheit)**

Suche in `index.html` den `.hero-overlay`-Block:
```css
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(8,8,8,0.35) 0%,
    rgba(8,8,8,0.2) 40%,
    rgba(8,8,8,0.65) 80%,
    rgba(8,8,8,1) 100%
  );
  z-index: 1;
}
```

Ersetze mit:
```css
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(8,8,8,0.45) 0%,
    rgba(8,8,8,0.3) 40%,
    rgba(8,8,8,0.75) 80%,
    rgba(8,8,8,1) 100%
  );
  z-index: 1;
  transition: background 0.5s ease;
}
```

- [ ] **Schritt 4: Commit**

```bash
git add index.html
git commit -m "fix: darken hero overlay on video end to keep text readable"
```

---

### Task 3: Mobile Hero — Höhe mit 100svh korrigieren

**Files:**
- Modify: `index.html` — CSS-Block, `@media (max-width: 560px)`-Breakpoint (ca. Zeile 991–998)

**Hintergrund:** `100vh` auf mobilen Browsern (besonders iOS Safari) schließt die Browser-Adressleiste ein, was die Hero-Section überhöht darstellt. `100svh` (Small Viewport Height) nutzt die tatsächlich sichtbare Höhe.

- [ ] **Schritt 1: Mobile Breakpoint ergänzen**

Suche in `index.html` den Block:
```css
@media (max-width: 560px) {
  .hero-actions { flex-direction: column; align-items: center; }
  .process-steps { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .footer-top { grid-template-columns: 1fr; }
  .trust-bar-inner { justify-content: center; }
}
```

Ersetze mit:
```css
@media (max-width: 560px) {
  .hero { min-height: 100svh; }
  .hero-actions { flex-direction: column; align-items: center; }
  .process-steps { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .footer-top { grid-template-columns: 1fr; }
  .trust-bar-inner { justify-content: center; }
}
```

- [ ] **Schritt 2: Testen**

DevTools → iPhone SE (375×667) → Hero-Section prüfen. Erwartetes Ergebnis: Hero füllt genau den sichtbaren Viewport ohne Überlappung mit der Browser-Chrome. Scroll-Indikator am unteren Rand ist sichtbar.

- [ ] **Schritt 3: Commit**

```bash
git add index.html
git commit -m "fix: use 100svh for mobile hero to account for browser chrome"
```

---

## Phase 2 — Echte Inhalte

> **Hinweis:** Diese Tasks erfordern echte Daten vom Kunden. Nicht anfangen bis die Daten vorliegen (siehe Tabelle am Anfang des Plans).

---

### Task 4: Echte Kontaktdaten einpflegen

**Files:**
- Modify: `index.html` — Navigation, Contact-Sektion, Footer

**Benötigte Daten:** Telefonnummer, E-Mail-Adresse, Straße + Hausnummer + PLZ + Stadt, Öffnungszeiten (bestätigen oder korrigieren)

- [ ] **Schritt 1: Telefonnummer ersetzen (3 Stellen)**

Suche `+49 (0) 000 000 000` — kommt an 2+ Stellen vor. Alle ersetzen mit der echten Nummer.
Dabei: `href="tel:+49000000000"` ebenfalls mit der korrekten internationalen Nummer aktualisieren (nur Ziffern, kein Leerzeichen).

Beispiel: `href="tel:+4917612345678"` und Anzeige `+49 (0) 176 1234 5678`

- [ ] **Schritt 2: E-Mail bestätigen**

Suche `info@schwarz-autoglas.de` — falls die tatsächliche Adresse anders lautet, alle Vorkommen ersetzen.

- [ ] **Schritt 3: Adresse in Footer ergänzen**

Suche in `index.html` den Footer-Brand-Block:
```html
<div class="footer-brand">
  <a href="#" class="nav-logo" ...>
  <p>Professioneller Windschutzscheibenservice ...</p>
</div>
```

Füge nach dem `<p>` ein:
```html
<p style="font-size:0.8rem;color:var(--gray-600);margin-top:.5rem;line-height:1.6;">
  Musterstraße 1 · 12345 Musterstadt<br>
  Tel: <a href="tel:+49XXXXXXXXX" style="color:inherit;text-decoration:none;">+49 (0) XXX XXX XXX</a>
</p>
```
(Echte Adresse + Nummer eintragen)

- [ ] **Schritt 4: Öffnungszeiten in Contact-Sektion prüfen**

Suche `Mo–Fr 07:30–18:00 Uhr` — wenn abweichend, korrigieren.

- [ ] **Schritt 5: Commit**

```bash
git add index.html
git commit -m "content: fill in real contact details (phone, email, address, hours)"
```

---

### Task 5: Foto für „Warum wir"-Sektion

**Files:**
- Modify: `index.html` — `.why-img-wrap`-Block
- Create: `public/images/why-us.jpg` (oder `.webp`) — vom Kunden bereitstellen

**Anforderungen ans Foto:** Min. 800×600px, Format JPG oder WebP, Motiv: Monteur bei der Arbeit / Werkstatt / Fahrzeug bei der Montage.

- [ ] **Schritt 1: Foto in `public/images/` ablegen**

Dateiname: `why-us.jpg` (oder `why-us.webp`).

- [ ] **Schritt 2: Placeholder-Div ersetzen**

Suche in `index.html`:
```html
<div class="why-img-wrap" aria-hidden="true">
  <div class="why-img-placeholder">
    <svg width="64" height="64" ...>
      <path d="M3 10h18M3 14h18M10 3v18M14 3v18"/>
    </svg>
  </div>
</div>
```

Ersetze mit:
```html
<div class="why-img-wrap">
  <img
    src="public/images/why-us.jpg"
    alt="Schwarz Autoglas – Monteur bei der Arbeit"
    loading="lazy"
    style="width:100%;height:100%;object-fit:cover;"
  />
</div>
```

- [ ] **Schritt 3: `aria-hidden` von `why-img-wrap` entfernen** (Schritt 2 hat das bereits getan — Foto ist kein dekoratives Element mehr)

- [ ] **Schritt 4: Testen**

Browser öffnen → „Warum wir"-Sektion aufrufen → Foto sollte im 4:3-Bereich erscheinen, vollständig ausgefüllt, kein Beschnitt-Fehler.

- [ ] **Schritt 5: Commit**

```bash
git add index.html public/images/why-us.jpg
git commit -m "content: add real photo to why-us section"
```

---

### Task 6: Echte Google-Rezensionen + Bewertungs-Button

**Files:**
- Modify: `index.html` — Testimonials-Sektion, unterhalb der Testimonials-Grid

**Benötigte Daten:** 3 echte Bewertungstexte (Name, Fahrzeug/Beruf, Text), Google Place ID (aus Google Business Profil: `google.com/maps` → Dein Unternehmen → Teilen → Link kopieren → Place ID darin finden oder via [Place ID Finder](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder))

- [ ] **Schritt 1: Dummy-Testimonials durch echte ersetzen**

Die drei `<article class="testimonial-card">`-Elemente ersetzen. Struktur bleibt identisch:

```html
<article class="testimonial-card" role="listitem">
  <div class="stars" aria-label="5 von 5 Sternen">
    <!-- 5× star-SVG — bestehenden Code unverändert kopieren -->
  </div>
  <p class="testimonial-text">„[ECHTER BEWERTUNGSTEXT]"</p>
  <div class="testimonial-author">
    <div class="author-avatar" aria-hidden="true">[INITIALEN]</div>
    <div>
      <p class="author-name">[VORNAME NACHNAME INITIAL]</p>
      <p class="author-car">[FAHRZEUG ODER BERUF]</p>
    </div>
  </div>
</article>
```

Initialen = erste Buchstaben von Vor- und Nachname (z.B. „Anna M." → „AM").

- [ ] **Schritt 2: Google-Bewertungs-Button unterhalb des Grids einfügen**

Suche in `index.html`:
```html
      </div><!-- end testimonials-grid -->
    </div><!-- end container -->
  </section><!-- end testimonials -->
```

Füge vor dem schließenden `</div>` (container) ein:
```html
<div style="text-align:center;margin-top:3rem;">
  <a
    href="https://g.page/r/[DEINE_PLACE_ID]/review"
    target="_blank"
    rel="noopener noreferrer"
    class="btn-secondary"
    aria-label="Jetzt Bewertung bei Google abgeben"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="margin-right:.4rem;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V18c0-.55-.45-1-1-1s-1 .45-1 1v1.93C7.06 19.43 4.57 16.94 4.07 14H6c.55 0 1-.45 1-1s-.45-1-1-1H4.07C4.57 7.06 7.06 4.57 10 4.07V6c0 .55.45 1 1 1s1-.45 1-1V4.07c2.94.5 5.43 2.99 5.93 5.93H16c-.55 0-1 .45-1 1s.45 1 1 1h1.93c-.5 2.94-2.99 5.43-5.93 5.93z"/></svg>
    Jetzt Bewertung abgeben
  </a>
</div>
```

`[DEINE_PLACE_ID]` durch die echte Place ID ersetzen.

- [ ] **Schritt 3: Testen**

Browser → Testimonials-Sektion → 3 echte Bewertungen prüfen → Button anklicken → öffnet Google-Bewertungsseite im neuen Tab.

- [ ] **Schritt 4: Commit**

```bash
git add index.html
git commit -m "content: replace dummy testimonials with real reviews, add Google review button"
```

---

## Phase 3 — Features

---

### Task 7: Netlify Function + Strato SMTP für Kontaktformular

**Files:**
- Create: `netlify/functions/contact.js`
- Create: `netlify.toml`
- Create: `package.json`
- Modify: `index.html` — Form-Submit-Handler im JS-Block

**Hintergrund:** Die serverlose Funktion empfängt das Formular, validiert Pflichtfelder und sendet die Daten per Strato SMTP (`smtp.strato.de:587`) als E-Mail. Strato ist DE-basiert → DSGVO-konform. Zugangsdaten kommen als Netlify Env Vars — nie in den Code.

- [ ] **Schritt 1: `package.json` erstellen**

```json
{
  "name": "schwarz-autoglas",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "nodemailer": "6.9.14"
  }
}
```

- [ ] **Schritt 2: `netlify.toml` erstellen**

```toml
[build]
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"
```

- [ ] **Schritt 3: Verzeichnis anlegen und `contact.js` erstellen**

```bash
mkdir -p netlify/functions
```

Inhalt von `netlify/functions/contact.js`:

```js
const nodemailer = require('nodemailer');

const SERVICE_LABELS = {
  tausch: 'Scheibenaustausch',
  reparatur: 'Steinschlagreparatur',
  adas: 'ADAS-Kalibrierung',
  mobil: 'Mobile Montage',
  sonstig: 'Sonstiges',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Ungültiges Format' }),
    };
  }

  const { name, phone, email, car, service, message } = body;

  if (!name || !phone || !email) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Pflichtfelder fehlen: Name, Telefon, E-Mail' }),
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.STRATO_HOST,
    port: parseInt(process.env.STRATO_PORT, 10),
    secure: false,
    auth: {
      user: process.env.STRATO_USER,
      pass: process.env.STRATO_PASS,
    },
  });

  const serviceLabel = SERVICE_LABELS[service] || service || 'Nicht angegeben';

  const mailOptions = {
    from: process.env.STRATO_USER,
    to: process.env.CONTACT_RECIPIENT,
    replyTo: email,
    subject: `Neue Anfrage: ${name} – ${serviceLabel}`,
    text: [
      'Neue Kontaktanfrage über schwarz-autoglas.de',
      '',
      `Name:     ${name}`,
      `Telefon:  ${phone}`,
      `E-Mail:   ${email}`,
      `Fahrzeug: ${car || 'Nicht angegeben'}`,
      `Leistung: ${serviceLabel}`,
      '',
      'Nachricht:',
      message || '(keine Nachricht)',
    ].join('\n'),
  };

  try {
    await transporter.sendMail(mailOptions);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('SMTP error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'E-Mail konnte nicht gesendet werden' }),
    };
  }
};
```

- [ ] **Schritt 4: Form-Submit-Handler in `index.html` ersetzen**

Suche den bestehenden Handler:
```js
// ── Form submission (placeholder)
document.querySelector('.contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Anfrage gesendet';
  btn.disabled = true;
  btn.style.opacity = '0.6';
  btn.style.cursor = 'default';
});
```

Ersetze mit:
```js
// ── Form submission via Netlify Function
document.querySelector('.contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalHTML = btn.innerHTML;

  btn.textContent = 'Wird gesendet …';
  btn.disabled = true;
  btn.style.cursor = 'default';

  const formData = {
    name: e.target.name.value.trim(),
    phone: e.target.phone.value.trim(),
    email: e.target.email.value.trim(),
    car: e.target.car.value.trim(),
    service: e.target.service.value,
    message: e.target.message.value.trim(),
  };

  try {
    const res = await fetch('/.netlify/functions/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      btn.textContent = 'Anfrage gesendet ✓';
      btn.style.opacity = '0.6';
    } else {
      throw new Error('Server error');
    }
  } catch {
    btn.innerHTML = originalHTML;
    btn.disabled = false;
    btn.style.cursor = '';
    btn.style.opacity = '';
    btn.style.background = '#8b2020';
    btn.textContent = 'Fehler – bitte erneut versuchen';
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
    }, 4000);
  }
});
```

- [ ] **Schritt 5: Netlify Env Vars setzen**

Im Netlify Dashboard → Site → Environment Variables → folgende hinzufügen:

| Variable | Wert |
|---|---|
| `STRATO_HOST` | `smtp.strato.de` |
| `STRATO_PORT` | `587` |
| `STRATO_USER` | Strato E-Mail-Adresse (z.B. `info@schwarz-autoglas.de`) |
| `STRATO_PASS` | Strato E-Mail-Passwort |
| `CONTACT_RECIPIENT` | Empfänger-Adresse (kann dieselbe sein) |

Diese Werte **niemals** in den Code oder ins Git-Repository eintragen.

- [ ] **Schritt 6: Lokal testen (optional, erfordert Netlify CLI)**

```bash
npm install
npx netlify dev
```

Browser → `http://localhost:8888` → Formular ausfüllen → Absenden → Posteingang prüfen.

- [ ] **Schritt 7: Commit & deployen**

```bash
git add netlify/ netlify.toml package.json index.html
git commit -m "feat: add Netlify Function contact form with Strato SMTP (DSGVO-compliant)"
git push origin main
```

Nach dem Push: Netlify baut automatisch. Danach im Live-Deployment testen.

---

### Task 8: Impressum-Seite

**Files:**
- Create: `impressum.html`
- Modify: `index.html` — Footer-Links

**Benötigte Daten:** Vollständiger Name des Inhabers, Firmenname, Adresse, Telefon, E-Mail, ggf. Handelsregisternummer, ggf. USt-IdNr.

- [ ] **Schritt 1: `impressum.html` erstellen**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Impressum – Schwarz Autoglas</title>
  <meta name="robots" content="noindex, follow" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #080808; color: #e5e5e5; line-height: 1.7; padding: 6rem 2rem 4rem; }
    .container { max-width: 680px; margin: 0 auto; }
    h1 { font-size: 2rem; font-weight: 800; margin-bottom: 2.5rem; color: #fff; }
    h2 { font-size: 1rem; font-weight: 700; margin: 2rem 0 .5rem; color: #c8a96e; letter-spacing: .06em; text-transform: uppercase; font-size: .75rem; }
    p, address { font-size: .95rem; color: #aaa; font-style: normal; }
    a { color: #c8a96e; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .back { display: inline-flex; align-items: center; gap: .4rem; color: #888; font-size: .85rem; margin-bottom: 3rem; text-decoration: none; }
    .back:hover { color: #fff; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      Zurück zur Startseite
    </a>
    <h1>Impressum</h1>

    <h2>Angaben gemäß § 5 TMG</h2>
    <address>
      [FIRMENNAME]<br>
      [INHABER VOLLSTÄNDIGER NAME]<br>
      [STRAßE HAUSNUMMER]<br>
      [PLZ ORT]
    </address>

    <h2>Kontakt</h2>
    <p>
      Telefon: <a href="tel:[TEL_INTERNATIONAL]">[TEL_ANZEIGE]</a><br>
      E-Mail: <a href="mailto:[EMAIL]">[EMAIL]</a>
    </p>

    <h2>Umsatzsteuer-ID</h2>
    <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br>
    [UST-ID oder: Nicht vorhanden]</p>

    <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
    <address>
      [INHABER VOLLSTÄNDIGER NAME]<br>
      [STRAßE HAUSNUMMER]<br>
      [PLZ ORT]
    </address>

    <h2>Streitschlichtung</h2>
    <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
    <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener">https://ec.europa.eu/consumers/odr/</a>.<br>
    Unsere E-Mail-Adresse finden Sie oben im Impressum.<br>
    Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
  </div>
</body>
</html>
```

Alle `[PLATZHALTER]` durch echte Daten ersetzen.

- [ ] **Schritt 2: Footer-Links in `index.html` aktualisieren**

Suche alle Vorkommen von `href="#">Impressum` und ersetze mit `href="impressum.html">Impressum`.
Es gibt 2 Stellen (Footer-Spalte + Footer-Bottom).

- [ ] **Schritt 3: Testen**

Browser → Footer → „Impressum" klicken → Seite lädt, Inhalt stimmt, „Zurück"-Link funktioniert.

- [ ] **Schritt 4: Commit**

```bash
git add impressum.html index.html
git commit -m "feat: add Impressum page (§ 5 TMG)"
```

---

### Task 9: Datenschutzerklärung

**Files:**
- Create: `datenschutz.html`
- Modify: `index.html` — Footer-Links

**Hinweis:** Google Fonts wird aktuell extern geladen (US-Datentransfer). Task 10 behebt das. Bis dahin muss die Datenschutzerklärung Google Fonts als externen Dienst aufführen. Nach Task 10 diesen Abschnitt entfernen.

- [ ] **Schritt 1: `datenschutz.html` erstellen**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Datenschutz – Schwarz Autoglas</title>
  <meta name="robots" content="noindex, follow" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #080808; color: #e5e5e5; line-height: 1.7; padding: 6rem 2rem 4rem; }
    .container { max-width: 680px; margin: 0 auto; }
    h1 { font-size: 2rem; font-weight: 800; margin-bottom: 2.5rem; color: #fff; }
    h2 { font-size: .75rem; font-weight: 700; margin: 2rem 0 .5rem; color: #c8a96e; letter-spacing: .06em; text-transform: uppercase; }
    p { font-size: .95rem; color: #aaa; margin-bottom: .75rem; }
    a { color: #c8a96e; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .back { display: inline-flex; align-items: center; gap: .4rem; color: #888; font-size: .85rem; margin-bottom: 3rem; text-decoration: none; }
    .back:hover { color: #fff; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      Zurück zur Startseite
    </a>
    <h1>Datenschutzerklärung</h1>

    <h2>1. Verantwortlicher</h2>
    <p>[FIRMENNAME], [INHABER], [ADRESSE], [EMAIL]</p>

    <h2>2. Hosting</h2>
    <p>Diese Website wird gehostet von <strong>Netlify, Inc.</strong>, 44 Montgomery Street, Suite 300, San Francisco, CA 94104, USA. Netlify verarbeitet beim Aufruf der Website technisch notwendige Daten (IP-Adresse, Zeitstempel, aufgerufene URL). Grundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse). Netlify hat EU-Standardvertragsklauseln (SCCs) unterzeichnet. Weitere Informationen: <a href="https://www.netlify.com/privacy/" target="_blank" rel="noopener">netlify.com/privacy</a>.</p>

    <h2>3. Domain & E-Mail</h2>
    <p>Domain und E-Mail werden betrieben von <strong>Strato AG</strong>, Pascalstraße 10, 10587 Berlin. Strato verarbeitet Daten auf Servern in Deutschland. Datenschutzinformationen: <a href="https://www.strato.de/datenschutz/" target="_blank" rel="noopener">strato.de/datenschutz</a>.</p>

    <h2>4. Kontaktformular</h2>
    <p>Wenn Sie das Kontaktformular nutzen, werden Ihre Angaben (Name, Telefon, E-Mail, Fahrzeug, Leistung, Nachricht) per verschlüsselter Verbindung an unseren E-Mail-Server bei Strato weitergeleitet. Die Daten werden nicht gespeichert, sondern ausschließlich zur Bearbeitung Ihrer Anfrage genutzt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung).</p>

    <h2>5. Google Web Fonts</h2>
    <p>Diese Website lädt Schriftarten von Google Fonts (Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA). Dabei wird Ihre IP-Adresse an Google übermittelt. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Wir werden Google Fonts zeitnah lokal hosten, um diesen Datentransfer zu eliminieren.</p>

    <h2>6. Ihre Rechte</h2>
    <p>Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO). Beschwerderecht bei der zuständigen Aufsichtsbehörde (Art. 77 DSGVO).</p>

    <h2>7. Kontakt Datenschutz</h2>
    <p>Bei Fragen zum Datenschutz: <a href="mailto:[EMAIL]">[EMAIL]</a></p>
  </div>
</body>
</html>
```

Alle `[PLATZHALTER]` durch echte Daten ersetzen.

- [ ] **Schritt 2: Footer-Links in `index.html` aktualisieren**

Suche alle `href="#">Datenschutz` und ersetze mit `href="datenschutz.html">Datenschutz`.
Es gibt 2 Stellen.

- [ ] **Schritt 3: Testen**

Browser → Footer → „Datenschutz" klicken → Seite lädt, alle Abschnitte lesbar, Links funktionieren.

- [ ] **Schritt 4: Commit**

```bash
git add datenschutz.html index.html
git commit -m "feat: add Datenschutzerklaerung (DSGVO Art. 13)"
```

---

## Phase 4 — SEO & Performance

---

### Task 10: Google Fonts lokal hosten

**Files:**
- Modify: `index.html` — `<head>` (externe Links entfernen, @font-face hinzufügen)
- Create: `public/fonts/inter-300.woff2`, `inter-400.woff2`, `inter-500.woff2`, `inter-600.woff2`, `inter-700.woff2`, `inter-800.woff2`

**Warum:** Externe Google Fonts = US-Datentransfer ohne Einwilligung = DSGVO-Problem + Ladezeit-Overhead.

- [ ] **Schritt 1: Inter-Schrift herunterladen**

```bash
mkdir -p public/fonts
```

Dann die woff2-Dateien über das `@fontsource`-Paket extrahieren:

```bash
npm install --save-dev @fontsource/inter
# Dateien liegen danach in node_modules/@fontsource/inter/files/
cp node_modules/@fontsource/inter/files/inter-latin-300-normal.woff2 public/fonts/inter-300.woff2
cp node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2 public/fonts/inter-400.woff2
cp node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2 public/fonts/inter-500.woff2
cp node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2 public/fonts/inter-600.woff2
cp node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2 public/fonts/inter-700.woff2
cp node_modules/@fontsource/inter/files/inter-latin-800-normal.woff2 public/fonts/inter-800.woff2
npm uninstall @fontsource/inter
```

Danach `node_modules/` nicht committen (steht bereits in `.gitignore` oder dort eintragen).
Benötigte Dateien danach in `public/fonts/`: `inter-300.woff2`, `inter-400.woff2`, `inter-500.woff2`, `inter-600.woff2`, `inter-700.woff2`, `inter-800.woff2`.

- [ ] **Schritt 2: Externe Links aus `<head>` entfernen**

Suche und entferne diese 3 Zeilen in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
```

- [ ] **Schritt 3: @font-face Regeln in `<style>` einfügen**

Füge am Anfang des `<style>`-Blocks (vor `*, *::before`) ein:

```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url('/public/fonts/inter-300.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/public/fonts/inter-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/public/fonts/inter-500.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/public/fonts/inter-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/public/fonts/inter-700.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url('/public/fonts/inter-800.woff2') format('woff2');
}
```

- [ ] **Schritt 4: Google Fonts auch aus `impressum.html` und `datenschutz.html` entfernen**

In beiden Dateien die 3 externen `<link>`-Tags entfernen:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
```

Und am Anfang des jeweiligen `<style>`-Blocks dieselben 6 `@font-face`-Regeln wie in `index.html` einfügen (Font-Pfade identisch: `/public/fonts/inter-XXX.woff2`).

- [ ] **Schritt 5: Datenschutzerklärung aktualisieren**

In `datenschutz.html` den Google-Fonts-Abschnitt (§ 5) ersetzen mit:
```html
<h2>5. Schriftarten</h2>
<p>Diese Website verwendet die Schriftart Inter, die lokal auf unserem Server gespeichert ist. Es findet keine Verbindung zu externen Schriftart-Diensten statt.</p>
```

- [ ] **Schritt 7: Testen**

Browser → DevTools → Network → Filter: `font` → alle 3 Seiten (`/`, `/impressum.html`, `/datenschutz.html`) neu laden → Keine Requests an `fonts.googleapis.com` oder `fonts.gstatic.com`. Schrift sieht identisch aus.

- [ ] **Schritt 8: Commit**

```bash
git add index.html impressum.html datenschutz.html public/fonts/
git commit -m "perf: host Inter font locally, remove Google Fonts external dependency (DSGVO)"
```

---

### Task 11: SEO — Meta-Tags, Open Graph & LocalBusiness Schema

**Files:**
- Modify: `index.html` — `<head>` und vor `</body>`

**Voraussetzung:** Task 4 muss abgeschlossen sein (echte Kontaktdaten).

- [ ] **Schritt 1: Open Graph & Twitter Meta-Tags in `<head>` ergänzen**

Suche:
```html
<meta name="description" content="Schwarz Autoglas – Professioneller Windschutzscheiben-Service..." />
```

Füge danach ein:
```html
<meta property="og:type" content="website" />
<meta property="og:url" content="https://www.schwarz-autoglas.de/" />
<meta property="og:title" content="Schwarz Autoglas – Windschutzscheibenservice" />
<meta property="og:description" content="Präziser Scheibenaustausch, Reparatur und ADAS-Kalibrierung – zertifiziert, mit Garantie, Versicherungsabrechnung direkt." />
<meta property="og:image" content="https://www.schwarz-autoglas.de/public/images/og-image.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="https://www.schwarz-autoglas.de/" />
```

Hinweis: `og-image.jpg` sollte 1200×630px sein. Falls noch kein OG-Bild vorhanden ist, `public/images/logo.png` als Fallback nutzen und `og:image` entsprechend anpassen.

- [ ] **Schritt 2: LocalBusiness JSON-LD Schema vor `</body>` einfügen**

Suche `</body>` und füge davor ein:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  "name": "Schwarz Autoglas",
  "url": "https://www.schwarz-autoglas.de/",
  "logo": "https://www.schwarz-autoglas.de/public/images/logo.png",
  "image": "https://www.schwarz-autoglas.de/public/images/og-image.jpg",
  "description": "Professioneller Windschutzscheibenservice – Austausch, Reparatur und ADAS-Kalibrierung für alle Fahrzeugklassen.",
  "telephone": "[ECHTE TELEFONNUMMER]",
  "email": "[ECHTE EMAIL]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[STRAßE HAUSNUMMER]",
    "addressLocality": "[ORT]",
    "postalCode": "[PLZ]",
    "addressCountry": "DE"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "07:30",
      "closes": "18:00"
    }
  ],
  "priceRange": "€€",
  "currenciesAccepted": "EUR",
  "paymentAccepted": "Cash, Credit Card",
  "areaServed": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": "[BREITENGRAD]",
      "longitude": "[LÄNGENGRAD]"
    },
    "geoRadius": "60000"
  }
}
</script>
```

Alle `[PLATZHALTER]` durch echte Daten ersetzen. Breitengrad/Längengrad via Google Maps ermitteln (Rechtsklick auf Standort → Koordinaten kopieren).

- [ ] **Schritt 3: Testen**

[Google Rich Results Test](https://search.google.com/test/rich-results) → URL eingeben oder Code einfügen → keine Fehler.

- [ ] **Schritt 4: Commit**

```bash
git add index.html
git commit -m "seo: add Open Graph tags, canonical URL, LocalBusiness JSON-LD schema"
```

---

### Task 12: Sitemap & robots.txt

**Files:**
- Create: `sitemap.xml`
- Create: `robots.txt`

- [ ] **Schritt 1: `sitemap.xml` erstellen**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.schwarz-autoglas.de/</loc>
    <lastmod>2026-04-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.schwarz-autoglas.de/impressum.html</loc>
    <lastmod>2026-04-15</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.1</priority>
  </url>
  <url>
    <loc>https://www.schwarz-autoglas.de/datenschutz.html</loc>
    <lastmod>2026-04-15</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.1</priority>
  </url>
</urlset>
```

- [ ] **Schritt 2: `robots.txt` erstellen**

```
User-agent: *
Allow: /
Disallow:

Sitemap: https://www.schwarz-autoglas.de/sitemap.xml
```

- [ ] **Schritt 3: Testen**

Nach Deploy: `https://www.schwarz-autoglas.de/robots.txt` im Browser aufrufen → Inhalt sichtbar. `https://www.schwarz-autoglas.de/sitemap.xml` aufrufen → XML valide.

- [ ] **Schritt 4: Commit**

```bash
git add sitemap.xml robots.txt
git commit -m "seo: add sitemap.xml and robots.txt"
```

---

## Dateistruktur nach Abschluss

```
index.html              ← vielfach modifiziert
impressum.html          ← neu (Task 8)
datenschutz.html        ← neu (Task 9)
netlify.toml            ← neu (Task 7)
package.json            ← neu (Task 7)
robots.txt              ← neu (Task 12)
sitemap.xml             ← neu (Task 12)
netlify/
  functions/
    contact.js          ← neu (Task 7)
public/
  video/
    hero.mp4
  images/
    logo.png
    why-us.jpg          ← neu (Task 5)
  fonts/                ← neu (Task 10)
    inter-v13-latin-300.woff2
    inter-v13-latin-regular.woff2
    inter-v13-latin-500.woff2
    inter-v13-latin-600.woff2
    inter-v13-latin-700.woff2
    inter-v13-latin-800.woff2
```
