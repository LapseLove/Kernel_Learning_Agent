"""Capture the current runtime lesson in Edge or Chromium for visual review."""
from pathlib import Path
import hashlib
import json
import os

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'cases/kern-runtime/reviews/v3'


def main():
    images = OUT/'screenshots'
    images.mkdir(parents=True, exist_ok=True)
    artifact = ROOT/'Kern_Runtime_Studio.html'
    captures = []
    with sync_playwright() as playwright:
        channel = os.environ.get('KLA_BROWSER_CHANNEL', 'msedge')
        browser = playwright.chromium.launch(headless=True, **({'channel': channel} if channel else {}))
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.goto(artifact.as_uri())
        page.wait_for_selector('.program-group')

        def snap(name, selector=None):
            target = page.locator(selector) if selector else page
            target.screenshot(path=str(images/(name+'.png')))
            captures.append({'name': name, 'selector': selector, 'viewport': page.viewport_size})

        snap('desktop-start')
        # Keep the sticky header out of stitched section captures.
        page.add_style_tag(content='.site-header{position:static!important}.skip-link{display:none!important}')
        for section in ('dispatch', 'host', 'manifest'):
            snap('desktop-'+section, '#'+section)
        for section in ('why-kern', 'performance'):
            snap('desktop-'+section, '#'+section)
        page.locator('#binding summary').click()
        snap('desktop-binding', '#binding')
        page.locator('#binding summary').click()
        page.locator('#streams summary').click()
        snap('desktop-reuse', '.reuse-figure')
        page.locator('#streams summary').click()
        page.get_by_role('button', name='把 E 移到前面', exact=True).click()
        snap('desktop-reordered', '#dispatch-result')
        page.get_by_role('button', name='混合请求', exact=True).click()
        page.locator('#call-params summary').click()
        snap('desktop-parameters', '#call-params')
        page.locator('#call-params summary').click()
        page.locator('#manifest summary').first.click()
        snap('desktop-recipe-detail', '#manifest details:first-of-type')
        page.locator('#manifest summary').first.click()

        page.set_viewport_size({'width': 390, 'height': 844})
        page.evaluate('window.scrollTo(0, 0)')
        snap('mobile-start')
        for section in ('dispatch', 'host', 'manifest'):
            snap('mobile-'+section, '#'+section)
        page.get_by_role('button', name='把 E 移到前面', exact=True).click()
        snap('mobile-reordered', '#dispatch-result')
        page.locator('#custom-dispatch summary').click()
        snap('mobile-custom', '#custom-dispatch')
        page.locator('#has-prefill').uncheck()
        snap('mobile-no-prefill', '#dispatch-result')
        page.get_by_role('button', name='超过容量', exact=True).click()
        snap('mobile-over-capacity', '#dispatch-result')
        page.locator('#reset-q').click()
        page.locator('#binding summary').click()
        snap('mobile-binding', '#binding')
        page.locator('#binding summary').click()
        page.locator('#streams summary').click()
        for step in range(1, 5):
            snap('mobile-stream-'+str(step), '#stream-figure')
            if step < 4:
                page.locator('#stream-figure [data-action="step"]').click()
        page.locator('#stream-figure [data-action="reset"]').click()
        snap('mobile-reuse', '.reuse-figure')
        page.locator('[data-source="runs"]').first.click()
        snap('mobile-source', '#source-dialog')
        page.keyboard.press('Escape')

        page.locator('#layout summary').first.click()
        snap('mobile-layout', '#layout')
        page.locator('#layout summary').first.click()
        page.locator('#evidence summary').first.click()
        snap('mobile-evidence', '#evidence')
        snap('mobile-why-kern', '#why-kern')
        for index, report in enumerate(page.locator('#reported article').all(), 1):
            report.screenshot(path=str(images/(f'mobile-performance-{index}.png')))
            captures.append({'name': f'mobile-performance-{index}',
                             'selector': f'#reported article:nth-child({index})',
                             'viewport': page.viewport_size})
        browser_version = browser.version
        browser.close()

    metadata = {
        'browser': channel or 'Chromium', 'version': browser_version,
        'artifact': artifact.name, 'sha256': hashlib.sha256(artifact.read_bytes()).hexdigest(),
        'captures': captures,
    }
    (OUT/'environment.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f'Captured {len(captures)} states. Open images to review them.')


if __name__ == '__main__':
    main()
