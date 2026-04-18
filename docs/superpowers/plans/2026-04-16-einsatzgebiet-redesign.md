# Einsatzgebiet Section Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the embedded Einsatzgebiet tag-cloud in the Contact section with a standalone, premium Mobil-Service Cards section between Testimonials and Contact.

**Architecture:** Single HTML file (`index.html`) with all CSS in `<style>` and JS in `<script>`. Add new CSS classes for the section, insert new HTML block, and remove old service-area markup/styles.

**Tech Stack:** Vanilla HTML/CSS/JS, no frameworks, no build step.

---

### Task 1: Remove old Einsatzgebiet markup and CSS

**Files:**
- Modify: `index.html` (lines ~900-928, ~1668-1687, ~1201)

- [ ] **Step 1: Remove `.service-area` and `.service-area-cities` CSS rules**

Delete lines ~901–928 (the `.service-area`, `.service-area-cities`, `.service-area-cities li`, `.service-area-cities li:hover` rules).

- [ ] **Step 2: Remove the mobile `.service-area-cities li` override**

Delete line ~1201 inside the `@media (max-width: 560px)` block:
```css
.service-area-cities li { font-size: 0.78rem; padding: 0.35rem 0.7rem; }
```

- [ ] **Step 3: Remove the Einsatzgebiet HTML from the Contact section**

Delete lines ~1668–1687 (the `<div class="service-area">...</div>` block containing "Einsatzgebiet" label, heading, paragraph, and city list).

- [ ] **Step 4: Verify locally**

Run: `npx serve .` and open in browser. Confirm Contact section no longer shows the old Einsatzgebiet area and the layout is not broken.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "refactor: remove old Einsatzgebiet section from Contact area"
```

---

### Task 2: Add new Einsatzgebiet CSS

**Files:**
- Modify: `index.html` (inside `<style>` block, before the `@media` queries)

- [ ] **Step 1: Add base CSS for the new section**

Insert the following CSS before the `@media (max-width: 900px)` rule (around line 1106):

```css
    /* ── SERVICE AREA ── */
    .service-area-section {
      background: var(--black);
      padding: 6rem 0;
    }

    .service-area-section .container {
      text-align: center;
    }

    .service-area-card {
      background: var(--gray-950);
      border: 1px solid var(--gray-800);
      border-radius: 12px;
      padding: 2.5rem;
      max-width: 720px;
      margin: 0 auto;
    }

    .service-area-hero {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .service-area-hero-icon {
      width: 48px;
      height: 48px;
      color: var(--accent);
      flex-shrink: 0;
    }

    .service-area-hero-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--white);
    }

    .service-area-hero-sub {
      font-size: 0.85rem;
      color: var(--accent);
      font-weight: 500;
    }

    .service-area-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .service-area-stat {
      background: var(--black);
      border: 1px solid var(--gray-700);
      border-radius: 8px;
      padding: 1.25rem;
      text-align: center;
    }

    .service-area-stat-label {
      font-size: 0.65rem;
      color: var(--gray-400);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .service-area-stat-value {
      font-size: 1rem;
      font-weight: 700;
      color: var(--white);
    }

    .service-area-stat-value--accent {
      color: var(--accent);
    }

    .service-area-cities-label {
      font-size: 0.7rem;
      color: var(--gray-400);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      margin-bottom: 0.75rem;
      text-align: left;
    }

    .service-area-cities {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0;
      margin: 0 0 2rem 0;
    }

    .service-area-cities li {
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 500;
      transition: border-color 0.2s, color 0.2s;
    }

    .service-area-cities li--primary {
      background: var(--gray-900);
      border: 1px solid var(--accent);
      color: var(--accent);
    }

    .service-area-cities li--secondary {
      background: var(--gray-900);
      border: 1px solid var(--gray-700);
      color: var(--gray-300);
    }

    .service-area-cities li--secondary:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    .service-area-cities li--more {
      background: var(--black);
      border: 1px dashed var(--gray-600);
      color: var(--gray-400);
    }

    .service-area-cta {
      display: flex;
      justify-content: center;
    }
```

- [ ] **Step 2: Add mobile responsive overrides**

Inside the `@media (max-width: 560px)` block, add:

```css
      .service-area-card { padding: 1.75rem; }
      .service-area-hero { flex-direction: column; text-align: center; }
      .service-area-grid { grid-template-columns: 1fr; }
```

- [ ] **Step 3: Verify CSS loads without errors**

Run: `npx serve .` and open in browser. No visual change yet (section HTML not added), but confirm no console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add Einsatzgebiet section CSS styles"
```

---

### Task 3: Add new Einsatzgebiet HTML section

**Files:**
- Modify: `index.html` (insert between Testimonials closing tag and Contact section, ~line 1574)

- [ ] **Step 1: Insert the new section HTML**

After line 1573 (`</section>` closing testimonials) and before line 1575 (the Contact comment `<!-- ── CONTACT ── -->`), insert:

```html

  <!-- ── SERVICE AREA ── -->
  <section class="service-area-section" id="service-area" aria-labelledby="service-area-title">
    <div class="container">
      <p class="section-label">Einsatzgebiet</p>
      <h2 class="section-title" id="service-area-title">Mobiler Autoglas-Service</h2>
      <p class="section-sub">Wir kommen zu Ihnen &ndash; innerhalb von 60 km um Rosenheim. Egal ob zu Hause, beim H&auml;ndler oder am Arbeitsplatz.</p>
      <div class="service-area-card">
        <div class="service-area-hero">
          <svg class="service-area-hero-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M1 12h15.5a2 2 0 012-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h1"/>
            <circle cx="7.5" cy="18" r="2.5"/>
            <circle cx="18.5" cy="18" r="2.5"/>
            <path d="M16 8h4l3 4v4h-7"/>
          </svg>
          <div>
            <div class="service-area-hero-title">Wir kommen zu Ihnen</div>
            <div class="service-area-hero-sub">Mobile Montage in Ihrem 60-km-Radius</div>
          </div>
        </div>
        <div class="service-area-grid">
          <div class="service-area-stat">
            <div class="service-area-stat-label">Hauptstandort</div>
            <div class="service-area-stat-value">Rosenheim</div>
          </div>
          <div class="service-area-stat">
            <div class="service-area-stat-label">Einsatzradius</div>
            <div class="service-area-stat-value service-area-stat-value--accent">60 km</div>
          </div>
        </div>
        <div class="service-area-cities-label">Regelm&auml;&szlig;ige Einsatzgebiete</div>
        <ul class="service-area-cities" role="list">
          <li class="service-area-cities li--primary">Rosenheim</li>
          <li class="service-area-cities li--secondary">Bad Endorf</li>
          <li class="service-area-cities li--secondary">Prien am Chiemsee</li>
          <li class="service-area-cities li--secondary">Kolbermoor</li>
          <li class="service-area-cities li--secondary">Brannenburg</li>
          <li class="service-area-cities li--more">+ weitere Orte auf Anfrage</li>
        </ul>
        <div class="service-area-cta">
          <a href="#contact" class="btn-primary">Termin anfragen <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
        </div>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Verify section renders correctly**

Run: `npx serve .` and open in browser. Confirm:
- Section appears between Testimonials and Contact
- SVG van icon displays in accent color
- Info grid shows two cards (Standort + Radius)
- City tags render with Rosenheim highlighted in accent
- CTA button links to #contact
- Hover on secondary city tags transitions border to accent

- [ ] **Step 3: Test mobile responsive**

Resize browser to ~400px width. Confirm:
- SVG icon stacks above headline text
- Info grid stacks to single column
- City tags wrap naturally
- Card padding reduces

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add standalone Einsatzgebiet section with mobile service messaging"
```

---

### Task 4: Final verification and cleanup

**Files:**
- Verify: `index.html`

- [ ] **Step 1: Full page visual check**

Run: `npx serve .` and walk through the entire page. Confirm:
- No layout breaks in any section
- Einsatzgebiet section looks correct on desktop and mobile
- Contact section no longer has the old service-area div
- Smooth scroll from CTA button to contact section works

- [ ] **Step 2: Accessibility check**

Confirm:
- Section has `aria-labelledby="service-area-title"` matching the h2
- SVG icon has `aria-hidden="true"`
- City list has `role="list"`
- All interactive elements (CTA link) are keyboard accessible

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add index.html
git commit -m "fix: Einsatzgebiet section polish and accessibility"
```