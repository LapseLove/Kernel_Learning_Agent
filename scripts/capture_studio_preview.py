"""Capture the current offline Studio for the repository README."""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


PROJECT = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=PROJECT / 'Kernel_Learning_Studio.html')
    parser.add_argument('--output', type=Path, default=PROJECT / 'dist/studio-overview.png')
    parser.add_argument('--scroll', type=int, default=500, help='Vertical offset that brings the first diagram into view')
    args = parser.parse_args()
    if not args.input.is_file():
        parser.error(f'{args.input} is missing; run python -m kernel_learning build')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    channel = os.environ.get('KLA_BROWSER_CHANNEL')
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, **({'channel': channel} if channel else {}))
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
            page.goto(args.input.resolve().as_uri())
            page.locator('#view .lesson-route').wait_for()
            page.evaluate('(offset) => window.scrollTo(0, offset)', args.scroll)
            page.screenshot(path=str(args.output), full_page=False)
        finally:
            browser.close()
    print(args.output)


if __name__ == '__main__':
    main()
