from playwright.sync_api import sync_playwright


def capture(url, output_path, viewport_width=1920, viewport_height=1080, full_page=False):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": viewport_width, "height": viewport_height})
        page.goto(url, wait_until="networkidle", timeout=30000)
        page.screenshot(path=output_path, full_page=full_page)
        browser.close()
    print(f"Saved: {output_path} ({viewport_width}x{viewport_height})")


if __name__ == "__main__":
    URL = "https://www.schwarz-autoglas.de/"
    BASE = "/Users/ennurkara/Projekte/schwarz-autoglas/screenshots"

    # Desktop full page
    capture(URL, f"{BASE}/desktop-fullpage.png", 1440, 900, full_page=True)

    # Desktop above-the-fold
    capture(URL, f"{BASE}/desktop-above-fold.png", 1440, 900, full_page=False)

    # Mobile above-the-fold
    capture(URL, f"{BASE}/mobile-above-fold.png", 375, 812, full_page=False)

    print("All screenshots captured.")