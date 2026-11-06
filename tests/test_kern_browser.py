"""Behavioral review of the pinned runtime/host lesson (no GPU required)."""
from __future__ import annotations

import ast
import itertools
import json
import os
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]


class QueryVector(list):
    def __getitem__(self, key):
        out = super().__getitem__(key)
        return QueryVector(out) if isinstance(key, slice) else out

    def sum(self):
        return sum(self)


class KernBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from playwright.sync_api import sync_playwright
        cls.p = sync_playwright().start()
        channel = os.environ.get('KLA_BROWSER_CHANNEL')
        cls.browser = cls.p.chromium.launch(headless=True, **({'channel':channel} if channel else {}))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.p.stop()

    def test_pinned_grouping_and_reader_boundaries(self):
        page = self.browser.new_page(viewport={'width':1440,'height':1000})
        self.addCleanup(page.close)
        errors, network = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: network.append(r.url) if r.url.startswith(('http:','https:')) else None)
        page.goto((ROOT/'Kern_Runtime_Studio.html').as_uri())
        page.wait_for_selector('.program-group')
        sm = json.loads((ROOT/'cases/kern-runtime/source-map.json').read_text(encoding='utf-8'))
        code = next(s['excerpt'] for s in sm['sources'] if s['id']=='runs')
        tree = ast.parse(code)
        fn = next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='runs')
        ns = {'np':SimpleNamespace(ndarray=QueryVector)}
        exec(compile(ast.Module(body=[fn],type_ignores=[]),'<pinned model.runs>','exec'),ns)
        samples = [list(q) for n in range(1,7) for q in itertools.product(range(1,5),repeat=n)]
        expected = [ns['runs'](QueryVector(q),4,2,16) for q in samples]
        actual = page.evaluate('(qs)=>qs.map(q=>KernLesson.groupRuns(q,4,2,16))',samples)
        self.assertEqual(expected, [[tuple(span) for span in row] for row in actual])
        self.assertEqual(5460,len(samples))
        self.assertEqual(['decode_batch','prefill','decode_batch'],page.locator('.program-group h3').all_text_contents())
        page.locator('#call-params summary').click()
        self.assertIn('cu_seqlens_q=[0, 4, 7]', page.locator('#dispatch-result').inner_text())
        page.get_by_role('button', name='把 E 移到前面', exact=True).click()
        self.assertEqual(['A','B','E'],page.locator('.program-group').first.locator('.request strong').all_text_contents())
        self.assertEqual(['C','D'],page.locator('.program-group').nth(1).locator('.request strong').all_text_contents())
        page.locator('#custom-dispatch summary').click()
        page.get_by_role('button', name='三个多 token 请求', exact=True).click()
        self.assertEqual(2,page.locator('.program-group').count())
        page.get_by_role('button', name='六个单 token 请求', exact=True).click()
        self.assertEqual(2,page.locator('.program-group').count())
        page.locator('#has-prefill').uncheck()
        self.assertEqual(2,page.locator('.program-group').count())
        page.get_by_role('button', name='混合请求', exact=True).click()
        self.assertIn('缺少 prefill',page.locator('#dispatch-result').inner_text())
        page.locator('#reset-q').click()
        page.get_by_role('button', name='超过容量', exact=True).click()
        self.assertIn('超过练习容量',page.locator('#dispatch-result').inner_text())
        page.locator('#query-lengths').fill('0,-1,foo')
        page.locator('#apply-q').click()
        self.assertIn('正整数',page.locator('#dispatch-result').inner_text())
        page.locator('#reset-q').click()
        page.locator('#streams summary').click()
        for i in range(1,4):
            page.locator('#stream-figure [data-action="step"]').click()
            self.assertIn(f'{i+1} / 4',page.locator('.step-label').inner_text())
        self.assertTrue(page.locator('#stream-figure [data-action="step"]').is_disabled())
        page.reload()
        self.assertIn('4 / 4',page.locator('.step-label').inner_text())
        self.assertTrue(page.locator('.step-label').is_visible())
        page.locator('#stream-figure [data-action="reset"]').click()
        self.assertIn('1 / 4',page.locator('.step-label').inner_text())
        page.locator('[data-source="runs"]').first.click()
        self.assertTrue(page.locator('#source-dialog').is_visible())
        self.assertIn('def runs(',page.locator('#source-content pre').inner_text())
        self.assertIn(sm['commit'],page.locator('.source-entry>a').get_attribute('href'))
        page.keyboard.press('Escape')
        for size in ({'width':1440,'height':1000},{'width':390,'height':844}):
            page.set_viewport_size(size)
            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),size['width'])
        self.assertEqual([],errors)
        self.assertEqual([],network)


if __name__ == '__main__':
    unittest.main()
