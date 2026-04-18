from playwright.sync_api import sync_playwright
import os

URL = "https://www.schwarz-autoglas.de/"
BASE = "/Users/ennurkara/Projekte/schwarz-autoglas/screenshots/audit"

VIEWPORTS = [
    # (name, width, height, full_page)
    ("desktop-1920x1080", 1920, 1080, False),
    ("desktop-1920x1080-full", 1920, 1080, True),
    ("laptop-1366x768", 1366, 768, False),
    ("laptop-1366x768-full", 1366, 768, True),
    ("tablet-768x1024", 768, 1024, False),
    ("tablet-768x1024-full", 768, 1024, True),
    ("mobile-375x812", 375, 812, False),
    ("mobile-375x812-full", 375, 812, True),
    ("mobile-320x568", 320, 568, False),
    ("mobile-414x896", 414, 896, False),
]

def capture_all():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, w, h, full in VIEWPORTS:
            page = browser.new_page(viewport={"width": w, "height": h})
            page.goto(URL, wait_until="networkidle", timeout=30000)
            out = os.path.join(BASE, f"{name}.png")
            page.screenshot(path=out, full_page=full)

            # Also capture CLS / layout shift info
            cls_score = page.evaluate("""() => {
                try {
                    const entries = performance.getEntriesByType('layout-shift');
                    let cls = 0;
                    for (const e of entries) {
                        if (!e.hadRecentInput) cls += e.value;
                    }
                    return cls;
                } catch { return -1; }
            }""")

            # Check for horizontal overflow
            overflow = page.evaluate("""() => {
                const body = document.body;
                const html = document.documentElement;
                const bodyScrollW = body.scrollWidth;
                const bodyClientW = body.clientWidth;
                const htmlScrollW = html.scrollWidth;
                const htmlClientW = html.clientWidth;
                return {
                    bodyOverflow: bodyScrollW - bodyClientW,
                    htmlOverflow: htmlScrollW - htmlClientW,
                    bodyScrollW: bodyScrollW,
                    bodyClientW: bodyClientW,
                };
            }""")

            # Get font loading status
            fonts = page.evaluate("""() => {
                return document.fonts.ready.then(() => {
                    return Array.from(document.fonts).map(f => ({
                        family: f.family,
                        weight: f.weight,
                        status: f.status
                    }));
                });
            }""")

            loaded_count = sum(1 for f in fonts if f["status"] == "loaded")
            total_count = len(fonts)

            print(f"Saved: {name} ({w}x{h}) | CLS: {cls_score:.4f} | Overflow: {overflow} | Fonts: {loaded_count}/{total_count} loaded")
            page.close()
        browser.close()

if __name__ == "__main__":
    os.makedirs(BASE, exist_ok=True)
    capture_all()
    print("All audit screenshots captured.")