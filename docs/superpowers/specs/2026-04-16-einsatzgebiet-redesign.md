# Einsatzgebiet Section Redesign

**Date:** 2026-04-16
**Status:** Approved
**Approach:** B – Mobil-Service Cards

## Context

The current Einsatzgebiet section is a small tag-cloud of city names embedded within the Contact section. Problems: too hidden, too little visual impact, design doesn't match the premium feel of the rest of the site, insufficient information (no radius, no mobile service message).

## Design Decisions

### Position
- **Standalone section** between Testimonials and Contact
- Gets full section spacing and visibility

### Core Message
- "Wir kommen zu Ihnen" – mobile service on request
- 60 km radius around Rosenheim

### Layout (Approach B: Mobil-Service Cards)

```
┌─────────────────────────────────────────┐
│     EINSATZGEBIET                       │  ← section-label (accent)
│  Mobiler Autoglas-Service               │  ← section-title
│  Wir kommen zu Ihnen – innerhalb von    │  ← section-sub
│  60 km um Rosenheim.                    │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   🚐  Wir kommen zu Ihnen        │  │  ← SVG Van-Icon + headline
│  │       Mobile Montage in Ihrem     │  │
│  │       60-km-Radius               │  │
│  │                                   │  │
│  │  ┌──────────┐  ┌──────────┐      │  │  ← Info grid (2 cols)
│  │  │ Standort │  │  Radius  │      │  │
│  │  │Rosenheim │  │  60 km   │      │  │
│  │  └──────────┘  └──────────┘      │  │
│  │                                   │  │
│  │  Regelmäßige Einsatzgebiete:      │  │  ← City tags
│  │  [Rosenheim] [Bad Endorf]         │  │
│  │  [Prien] [Kolbermoor]            │  │  Rosenheim = accent border
│  │  [Brannenburg]                   │  │  Rest = gray border
│  │  [+ weitere auf Anfrage]         │  │  Dashed border, gray
│  │                                   │  │
│  │       [Termin anfragen →]         │  │  ← CTA button → #contact
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Components

1. **Section Header** – Standard pattern (section-label, section-title, section-sub)
2. **SVG Van-Icon** – Custom SVG (van/delivery vehicle), 48x48, accent color. Not an emoji – professional inline SVG matching site style.
3. **Info Grid** – Two cards side-by-side:
   - Left: "Hauptstandort" → "Rosenheim"
   - Right: "Einsatzradius" → "60 km"
   - Background: `var(--black)`, border: `1px solid var(--gray-700)`, rounded corners
4. **City Tags** – Flex-wrap list:
   - Rosenheim: accent border + accent text (highlighted)
   - Bad Endorf, Prien am Chiemsee, Kolbermoor, Brannenburg: gray-700 border + gray-300 text
   - "+ weitere Orte auf Anfrage": dashed gray-600 border + gray-400 text (invites contact)
5. **CTA Button** – "Termin anfragen" with arrow icon, accent background, links to `#contact`

### Styling
- Outer card container: `background: var(--gray-950)`, `border: 1px solid var(--gray-800)`, `border-radius: 12px`, centered
- Uses existing design tokens (no new colors or fonts)
- Tag hover: border-color transitions to accent (existing pattern from current service-area-cities)

### Mobile Responsive
- Info grid: stacks to single column below ~480px
- City tags: flex-wrap handles automatically
- Card padding reduces on mobile
- SVG icon + headline: stacks vertically on mobile (icon above text)

### Removal
- Delete the current `.service-area` div and its CSS from the Contact section
- Delete associated `.service-area-cities` styles

## Out of Scope
- Google Maps embed (future enhancement)
- Interactive radius map (future enhancement)
- Schema.org changes for service area