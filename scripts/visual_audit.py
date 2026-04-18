"""Comprehensive visual audit script for schwarz-autoglas.de.
Captures screenshots and extracts detailed layout/accessibility metrics."""
from playwright.sync_api import sync_playwright
import json
import os

URL = "https://www.schwarz-autoglas.de/"
BASE = "/Users/ennurkara/Projekte/schwarz-autoglas/screenshots/audit"

VIEWPORTS = [
    ("desktop", 1920, 1080),
    ("laptop", 1366, 768),
    ("tablet", 768, 1024),
    ("mobile", 375, 812),
    ("mobile-small", 320, 568),
    ("mobile-large", 414, 896),
]

AUDIT_JS = """() => {
    const results = {};

    // 1. Above-the-fold analysis
    const viewport_h = window.innerHeight;
    const h1 = document.querySelector('h1');
    const ctaButtons = document.querySelectorAll('a[href="#kontakt"], a[href*="kontakt"], .hero-cta, [class*="cta"]');
    const nav = document.querySelector('nav');

    results.aboveFold = {
        viewportHeight: viewport_h,
        h1: h1 ? {
            text: h1.textContent.trim(),
            rect: h1.getBoundingClientRect(),
            visible: h1.getBoundingClientRect().top < viewport_h,
        } : null,
        nav: nav ? {
            rect: nav.getBoundingClientRect(),
            visible: nav.getBoundingClientRect().bottom > 0,
        } : null,
        ctaCount: ctaButtons.length,
        ctas: Array.from(ctaButtons).map(el => ({
            text: el.textContent.trim().substring(0, 50),
            rect: el.getBoundingClientRect(),
            visibleInViewport: el.getBoundingClientRect().top < viewport_h && el.getBoundingClientRect().bottom > 0,
        })),
    };

    // 2. Hero section analysis
    const hero = document.querySelector('.hero, [class*="hero"], header + section, #hero');
    if (hero) {
        const heroRect = hero.getBoundingClientRect();
        results.hero = {
            fillsViewport: heroRect.height >= viewport_h * 0.8,
            height: heroRect.height,
            viewportHeight: viewport_h,
            ratio: (heroRect.height / viewport_h).toFixed(2),
        };
    }

    // 3. Font analysis
    results.fonts = Array.from(document.fonts).map(f => ({
        family: f.family,
        weight: f.weight,
        status: f.status,
    }));

    // 4. Font sizes on key elements (mobile readability)
    const textElements = document.querySelectorAll('h1, h2, h3, p, li, a, span, label');
    results.fontSizes = {};
    textElements.forEach(el => {
        const tag = el.tagName.toLowerCase();
        const size = window.getComputedStyle(el).fontSize;
        const key = `${tag}-${size}`;
        if (!results.fontSizes[key]) {
            results.fontSizes[key] = { tag, fontSize: size, count: 0 };
        }
        results.fontSizes[key].count += 1;
    });
    results.fontSizes = Object.values(results.fontSizes);

    // 5. Touch target analysis (mobile)
    const interactives = document.querySelectorAll('a, button, input, select, textarea, [role="button"]');
    results.touchTargets = Array.from(interactives).map(el => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        return {
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().substring(0, 40),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            meetsMin44: rect.width >= 44 && rect.height >= 44,
            meetsMin48: rect.width >= 48 && rect.height >= 48,
            rect: {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
            },
        };
    }).filter(t => t.width > 0 && t.height > 0);

    // 6. Small touch targets (under 44x44)
    results.smallTouchTargets = results.touchTargets.filter(t => !t.meetsMin44);

    // 7. Horizontal overflow check - check all elements
    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.right > document.documentElement.clientWidth + 1) {
            overflowing.push({
                tag: el.tagName.toLowerCase(),
                class: el.className ? (typeof el.className === 'string' ? el.className.substring(0, 60) : '') : '',
                id: el.id || '',
                overflowPx: Math.round(rect.right - document.documentElement.clientWidth),
                width: Math.round(rect.width),
                rect: { left: Math.round(rect.left), right: Math.round(rect.right) },
            });
        }
    });
    results.overflowElements = overflowing;

    // 8. Section visibility analysis
    const sections = document.querySelectorAll('section, [role="region"]');
    results.sections = Array.from(sections).map(sec => {
        const rect = sec.getBoundingClientRect();
        const heading = sec.querySelector('h1, h2, h3');
        return {
            id: sec.id || '',
            heading: heading ? heading.textContent.trim().substring(0, 60) : '',
            top: Math.round(rect.top + window.scrollY),
            height: Math.round(rect.height),
            visibleInViewport: rect.top < viewport_h && rect.bottom > 0,
        };
    });

    // 9. Image analysis
    const images = document.querySelectorAll('img');
    results.images = Array.from(images).map(img => ({
        src: (img.src || '').substring(img.src.lastIndexOf('/') + 1),
        alt: img.alt || '',
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: Math.round(img.getBoundingClientRect().width),
        displayHeight: Math.round(img.getBoundingClientRect().height),
        loaded: img.complete && img.naturalWidth > 0,
    }));

    // 10. Video analysis
    const videos = document.querySelectorAll('video');
    results.videos = Array.from(videos).map(v => ({
        poster: v.poster || '',
        autoplay: v.autoplay,
        muted: v.muted,
        playsInline: v.playsInline,
        readyState: v.readyState,
    }));

    // 11. Form analysis
    const form = document.querySelector('form');
    if (form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        results.form = {
            inputsCount: inputs.length,
            inputs: Array.from(inputs).map(inp => {
                const label = form.querySelector(`label[for="${inp.id}"]`);
                const ariaLabel = inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby');
                return {
                    type: inp.type || inp.tagName.toLowerCase(),
                    name: inp.name || '',
                    hasLabel: !!label || !!ariaLabel,
                    labelText: label ? label.textContent.trim() : (ariaLabel || ''),
                    required: inp.required || inp.getAttribute('aria-required') === 'true',
                    rect: {
                        width: Math.round(inp.getBoundingClientRect().width),
                        height: Math.round(inp.getBoundingClientRect().height),
                    },
                };
            }),
        };
    }

    // 12. Color contrast spot check (text vs background for key elements)
    results.contrastChecks = [];
    const checkSelectors = ['h1', 'h2', 'p', 'a', '.hero-label', '.hero-heading', '.accent'];
    checkSelectors.forEach(sel => {
        const els = document.querySelectorAll(sel);
        els.forEach(el => {
            const cs = window.getComputedStyle(el);
            const bg = cs.backgroundColor;
            const fg = cs.color;
            results.contrastChecks.push({
                selector: sel,
                text: el.textContent.trim().substring(0, 30),
                color: fg,
                bgColor: bg,
                fontSize: cs.fontSize,
                fontWeight: cs.fontWeight,
            });
        });
    });

    // 13. Scroll position check
    results.scrollPosition = {
        scrollY: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
    };

    return results;
}"""

def run_audit():
    all_results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch()

        for name, w, h in VIEWPORTS:
            print(f"\n=== Auditing {name} ({w}x{h}) ===")
            page = browser.new_page(viewport={"width": w, "height": h})
            page.goto(URL, wait_until="networkidle", timeout=30000)

            # Capture screenshots
            atf_path = os.path.join(BASE, f"{name}-{w}x{h}-atf.png")
            full_path = os.path.join(BASE, f"{name}-{w}x{h}-full.png")
            page.screenshot(path=atf_path, full_page=False)
            page.screenshot(path=full_path, full_page=True)

            # Run audit
            results = page.evaluate(AUDIT_JS)
            all_results[name] = results

            # Print key findings
            r = results
            print(f"  H1 visible above fold: {r['aboveFold']['h1']['visible'] if r['aboveFold']['h1'] else 'N/A'}")
            print(f"  H1 text: {r['aboveFold']['h1']['text'][:50] if r['aboveFold']['h1'] else 'N/A'}")
            print(f"  CTAs in viewport: {sum(1 for c in r['aboveFold']['ctas'] if c['visibleInViewport'])}/{len(r['aboveFold']['ctas'])}")
            print(f"  Overflow elements: {len(r['overflowElements'])}")
            if r['overflowElements']:
                for oe in r['overflowElements'][:5]:
                    print(f"    - {oe['tag']}.{oe['class'][:40]} overflow: {oe['overflowPx']}px")
            print(f"  Small touch targets (<44px): {len(r['smallTouchTargets'])}")
            for st in r['smallTouchTargets'][:10]:
                print(f"    - {st['tag']} '{st['text'][:30]}' size: {st['width']}x{st['height']}")
            print(f"  Fonts loaded: {sum(1 for f in r['fonts'] if f['status'] == 'loaded')}/{len(r['fonts'])}")
            print(f"  Images: {len(r['images'])}")
            for img in r['images']:
                print(f"    - {img['src']} alt='{img['alt'][:30]}' loaded={img['loaded']} {img['naturalWidth']}x{img['naturalHeight']} -> display {img['displayWidth']}x{img['displayHeight']}")
            if r.get('videos'):
                print(f"  Videos: {len(r['videos'])}")
                for v in r['videos']:
                    print(f"    - autoplay={v['autoplay']} muted={v['muted']} playsInline={v['playsInline']} readyState={v['readyState']}")
            if r.get('form'):
                print(f"  Form inputs: {r['form']['inputsCount']}")
                for inp in r['form']['inputs']:
                    print(f"    - {inp['type']} name={inp['name']} hasLabel={inp['hasLabel']} required={inp['required']}")

            # Section analysis
            print(f"  Sections above fold: {sum(1 for s in r['sections'] if s['visibleInViewport'])}/{len(r['sections'])}")
            for sec in r['sections']:
                print(f"    - '{sec['heading'][:40]}' top={sec['top']}px height={sec['height']}px visible={sec['visibleInViewport']}")

            page.close()

        browser.close()

    # Save full results as JSON
    results_path = os.path.join(BASE, "audit-results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    print(f"\nFull results saved to: {results_path}")

if __name__ == "__main__":
    os.makedirs(BASE, exist_ok=True)
    run_audit()