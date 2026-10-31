"""Real browser checks of the offline Studio's main learning interactions."""
import os
import tempfile
import threading
import unittest
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

from kernel_learning.__main__ import CaseHandler, render_html
from kernel_learning.core import PROJECT, load_case

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None


@unittest.skipIf(sync_playwright is None, 'Install requirements-dev.txt for browser tests')
class BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.output_dir = tempfile.TemporaryDirectory()
        cls.standalone = Path(cls.output_dir.name) / 'studio.html'
        cls.standalone.write_text(render_html(load_case()), encoding='utf-8')
        cls.playwright = sync_playwright().start()
        channel = os.environ.get('KLA_BROWSER_CHANNEL')
        cls.browser = cls.playwright.chromium.launch(headless=True, **({'channel': channel} if channel else {}))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.output_dir.cleanup()

    def setUp(self):
        self.page = self.browser.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.goto(self.standalone.as_uri())
        self.page.locator('#view .lesson-route').wait_for()

    def tearDown(self):
        self.assertEqual(self.errors, [])
        self.page.close()

    def test_vllm_cta_inspection_and_source_pin(self):
        case = load_case()
        self.page.locator('#nav [data-view="anatomy"]').click()
        self.assertIn('20', self.page.locator('.walk-math').inner_text())
        index = next(i for i, stage in enumerate(case['variants']['vllm']['stages']) if stage['id'] == 'split')
        self.page.locator(f'[data-stage="{index}"]').click()
        self.assertIn('block 0 到 1', self.page.locator('.anatomy-selected').inner_text())
        self.page.locator('[data-inspect-split="10"]').click()
        self.assertIn('起点 10 × 2 = 20', self.page.locator('.anatomy-selected').inner_text())
        href = self.page.locator('.anatomy-figure-top a').get_attribute('href')
        self.assertIn(case['variants']['vllm']['commit'], href)
        self.assertIn('inspectSplit=10', self.page.url)
        self.page.reload()
        self.assertIn('起点 10 × 2 = 20', self.page.locator('.anatomy-selected').inner_text())
        self.page.locator('#nav [data-view="overview"]').click()
        self.page.go_back()
        self.assertIn('起点 10 × 2 = 20', self.page.locator('.anatomy-selected').inner_text())

    def test_dispatch_fallback_and_variant_switch(self):
        self.page.locator('#nav [data-view="anatomy"]').click()
        self.page.locator('#phase').select_option('prefill')
        self.assertIn('FALLBACK', self.page.locator('.dispatch').inner_text())
        self.page.locator('#variantTabs [data-variant="sglang"]').click()
        self.page.locator('#phase').select_option('verify')
        self.assertIn('FAST PATH', self.page.locator('.dispatch').inner_text())
        self.assertIn('10', self.page.locator('.walk-math').inner_text())
        self.page.locator('#heads').select_option('8')
        self.assertIn('FALLBACK', self.page.locator('.dispatch').inner_text())

    def test_served_mode_loads_case_and_model(self):
        handler = partial(CaseHandler, directory=str(PROJECT / 'web'))
        with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                self.page.goto(f'http://127.0.0.1:{server.server_port}/')
                self.page.locator('#view .lesson-route').wait_for()
                self.page.locator('#nav [data-view="anatomy"]').click()
                self.assertIn('20', self.page.locator('.walk-math').inner_text())
            finally:
                server.shutdown()
                worker.join(timeout=5)


if __name__ == '__main__':
    unittest.main()
