import os
import unittest

from kernel_learning import mhc


class MegaMHCBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as error:
            raise unittest.SkipTest("playwright unavailable") from error
        cls.playwright = sync_playwright().start()
        channel = os.environ.get("KLA_BROWSER_CHANNEL")
        try:
            cls.browser = cls.playwright.chromium.launch(
                headless=True, **({"channel": channel} if channel else {})
            )
        except Exception:
            cls.playwright.stop()
            raise

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def test_editorial_path_modes_dispatch_and_code_mapping(self):
        page = self.browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto((mhc.PROJECT / "MHC_Learning_Studio.html").as_uri())
        page.wait_for_selector("#pipeline")
        self.assertEqual(["operator", "dispatch", "small-t"],
                         page.locator(".chapter").evaluate_all("ns=>ns.map(n=>n.id)"))
        self.assertEqual(len(mhc.load_case()["reading_scenes"]), page.locator("[data-figure]").count())
        self.assertEqual(0, page.locator(".reader-tabs, .reader-ref-title, #evolution, #predecessors").count())
        self.assertEqual(0, page.locator("#fusion [data-action], #dispatch-map [data-action]").count())
        page.locator('[data-mode="shifted"]').click()
        self.assertIn("携入旧 Pre", page.locator('#dag .figure-drawing').inner_text())
        self.assertIn("保存至下一接缝", page.locator('#dag .figure-drawing').inner_text())
        page.locator('[data-mode="normal"]').click()
        self.assertNotIn("保存至下一接缝", page.locator('#dag .figure-drawing').inner_text())
        for _ in range(3):
            page.locator('#dag [data-action="step"]').click()
        self.assertIn("#L138-L227", page.locator('#dag .step-source a', has_text="Normal Collapse").get_attribute("href"))
        page.locator('[data-mode="shifted"]').click()
        self.assertEqual(1, page.locator('#dag [data-source="norm_math"]').count())
        page.select_option("#dispatch-t", "17")
        paths = page.locator("#dispatch-result span").all_text_contents()
        self.assertIn("分离 Post", paths[0])
        self.assertIn("FMA producer", paths[1])
        page.select_option("#dispatch-t", "33")
        self.assertNotIn("FMA producer", page.locator("#dispatch-result").inner_text())
        self.assertIn("425,984 B", page.locator("#split-results").inner_text())
        page.select_option("#mega-splits", "16")
        self.assertEqual(["16", "4", "106,496 B"], page.locator("#split-results b").all_text_contents())
        self.assertIn("K0→K1→K2→K3", page.locator("#pipeline .figure-drawing").inner_text())
        self.assertIn("7,077,888", page.locator("#work svg").text_content())
        page.locator('#pipeline [data-source="load"]').click()
        self.assertTrue(page.locator("#source-dialog").is_visible())
        self.assertGreater(len(page.locator("#source-content pre").inner_text().splitlines()), 10)
        self.assertIn(mhc.load_case()["anchor"]["commit"],
                      page.locator("#source-content a").first.get_attribute("href"))
        page.keyboard.press("Escape")
        self.assertFalse(page.locator("#source-dialog").is_visible())
        page.locator("#open-map").click()
        self.assertEqual(len(mhc.load_case()["source_map"]), page.locator(".source-map-list button").count())
        page.locator('.source-map-list [data-source="post"]').click()
        self.assertIn("479", page.locator("#source-content pre").inner_text())
        self.assertEqual([], errors)
        page.close()

    def test_inline_steps_and_restored_location(self):
        page = self.browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto((mhc.PROJECT / "MHC_Learning_Studio.html").as_uri()+"#pipeline-step-3")
        page.wait_for_selector("#pipeline .step-label")
        self.assertEqual("3 / 5", page.locator("#pipeline .step-label").inner_text())
        page.locator('#pipeline [data-action="reset"]').click()
        self.assertEqual("1 / 5", page.locator("#pipeline .step-label").inner_text())
        page.locator('#pipeline [data-action="step"]').click()
        page.reload()
        self.assertEqual("2 / 5", page.locator("#pipeline .step-label").inner_text())
        self.assertEqual("1 / 3", page.locator("#sinkhorn .step-label").inner_text())
        page.close()

    def test_scope_bridge_operation_types_and_thread_mapping(self):
        page = self.browser.new_page(viewport={"width": 1440, "height": 1080})
        page.goto((mhc.PROJECT / "MHC_Learning_Studio.html").as_uri())
        page.wait_for_selector("#fma-thread")
        self.assertEqual(4, page.locator(".operation-key > div").count())
        self.assertIn("同一条链", page.locator("#dag .seam-bridge").inner_text())
        self.assertIn("Collapse(Preℓ)", page.locator(".bridge-chain").inner_text())
        self.assertIn("37", page.locator("#fma-selection").inner_text())
        self.assertIn("293", page.locator("#fma-selection").inner_text())
        page.locator('[data-fma-pick="11,7"]').click()
        page.select_option("#fma-thread", "255")
        self.assertEqual("11", page.locator("#fma-tile").input_value())
        self.assertEqual("7", page.locator("#fma-split").input_value())
        text = page.locator("#fma .figure-drawing").inner_text()
        self.assertIn("local acc[0/1]", text)
        self.assertIn("22/23", text)
        self.assertNotIn("acc[22]", text)
        self.assertIn("3839", text)
        self.assertIn("4095", text)
        page.locator('[data-fma-view="data"]').click()
        self.assertIn("不写 R′", page.locator("#fma .figure-drawing").inner_text())
        self.assertIn("不同 BF16", page.locator("#fma .figure-drawing").inner_text())
        page.select_option("#fma-tile", "0")
        self.assertIn("写 BF16 R′", page.locator("#fma .figure-drawing").inner_text())
        page.locator('#dispatch-map .framework details summary').first.click()
        self.assertIn("SM100", page.locator('#dispatch-map .framework details').first.inner_text())
        page.close()

    def test_mobile_local_diagram_scroll_and_source_dialog(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        page.goto((mhc.PROJECT / "MHC_Learning_Studio.html").as_uri())
        page.wait_for_selector("#pipeline")
        self.assertFalse(page.evaluate("document.documentElement.scrollWidth > innerWidth"))
        self.assertTrue(page.locator("#fma .figure-drawing").evaluate("n=>n.scrollWidth>n.clientWidth"))
        self.assertTrue(page.locator("#fusion .diagram-pan-hint").is_visible())
        page.locator("#open-map").click()
        page.locator('.source-map-list [data-source="mma"]').click()
        self.assertTrue(page.locator("#source-content pre").is_visible())
        self.assertLessEqual(page.locator("#source-dialog").bounding_box()["width"], 390)
        page.keyboard.press("Escape")
        page.locator('#sinkhorn [data-action="step"]').click()
        self.assertEqual("2 / 3", page.locator("#sinkhorn .step-label").inner_text())
        page.close()

    def test_mega_task_lane_mapping_and_slot_scope(self):
        page = self.browser.new_page(viewport={"width": 1440, "height": 1000})
        page.goto((mhc.PROJECT / "MHC_Learning_Studio.html").as_uri())
        page.wait_for_selector("#mega-task")
        drawing = lambda sid: page.locator(f"#{sid} .figure-drawing").inner_text()
        self.assertIn("338/339", drawing("mega-post"))
        self.assertIn("行 3（有效） / 11（填充）", drawing("mega-post"))
        page.select_option("#mega-task", "63")
        page.select_option("#mega-wg", "2")
        page.select_option("#mega-warp", "3")
        page.select_option("#mega-lane", "31")
        page.select_option("#mega-atom", "7")
        self.assertIn("4094/4095", drawing("mega-post"))
        self.assertIn("行 55（填充） / 63（填充）", drawing("mega-post"))
        page.select_option("#mega-splits", "16")
        self.assertEqual("15", page.locator("#mega-task").input_value())
        page.select_option("#mega-block", "3")
        self.assertIn("4094/4095", drawing("mega-post"))
        self.assertIn("task 15 / K3", drawing("pipeline"))
        self.assertIn("K3 的 R/x", drawing("pipeline"))
        for _ in range(3):
            page.locator('#pipeline [data-action="step"]').click()
        self.assertIn("a4 就绪", drawing("pipeline"))
        page.locator('#pipeline [data-action="step"]').click()
        self.assertIn("跳至整个 task 尾部", drawing("pipeline"))
        page.locator('#pipeline [data-action="reset"]').click()
        page.select_option("#mega-splits", "64")
        self.assertEqual("0", page.locator("#mega-block").input_value())
        self.assertIn("task 15 / K0", drawing("pipeline"))
        page.close()

    def test_mega_mode_consumers_scratch_and_pinned_source(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        page.goto((mhc.PROJECT / "MHC_Learning_Studio.html").as_uri())
        page.wait_for_selector("#mega-join")
        self.assertIn("同一消费池", page.locator("#mega-map .figure-drawing").inner_text())
        self.assertIn("同一 WG 的4个 warp", page.locator("#mega-join .figure-drawing").inner_text())
        self.assertIn("409,600 B", page.locator("#mega-scratch-ledger").inner_text())
        page.locator('#mega-join [data-mega-mode="shifted"]').click()
        self.assertEqual("true", page.locator('#mega-map [data-mega-mode="shifted"]').get_attribute("aria-pressed"))
        self.assertIn("独立 Norm barrier", page.locator("#mega-join .figure-drawing").inner_text())
        self.assertIn("不等待本次 Mix", page.locator("#mega-join .figure-drawing").inner_text())
        self.assertIn("425,984 B", page.locator("#mega-scratch-ledger").inner_text())
        self.assertFalse(page.evaluate("document.documentElement.scrollWidth > innerWidth"))
        page.locator('#mega-post .step-source [data-source="post_publish"]').click()
        self.assertIn("496", page.locator("#source-content pre").inner_text())
        self.assertIn("__float22bfloat162_rn", page.locator("#source-content pre").inner_text())
        page.keyboard.press("Escape")
        page.close()

    def test_producer_contract_t_policy_and_three_column_boundary(self):
        page = self.browser.new_page(viewport={"width": 1440, "height": 1080})
        page.goto((mhc.PROJECT / "MHC_Learning_Studio.html").as_uri())
        page.wait_for_selector("#fma-t")
        contract = page.locator(".producer-context").inner_text()
        self.assertIn("mhc_fused_tilelang", contract)
        self.assertIn("mhc_pre_big_fuse_tilelang", contract)
        self.assertIn("[24,16384]", contract)
        self.assertIn("[T, 24]", contract)
        for t, tasks, partial in ((1,96,"[8,1,24]"),(4,384,"[8,4,24]"),
                                  (7,672,"[8,7,24]"),(8,256,"[4,8,24]"),(16,512,"[4,16,24]")):
            page.select_option("#fma-t", str(t))
            self.assertIn(f"{tasks} producer CTA", page.locator("#fma-policy").inner_text())
            self.assertIn(partial, page.locator("#fma-partial-example").inner_text())
        page.select_option("#fma-t", "8")
        page.select_option("#fma-tile", "7")
        page.select_option("#fma-split", "3")
        page.select_option("#fma-thread", "255")
        text = page.locator('#fma .figure-drawing').inner_text()
        for expected in ("acc[0/1/2]", "21/22/23", "s_warp[8,4]", "3327/3583/3839/4095"):
            self.assertIn(expected, text)
        page.locator('[data-fma-view="data"]').click()
        self.assertIn("只写本 3 列投影", page.locator('#fma .figure-drawing').inner_text())
        page.select_option("#fma-t", "17")
        self.assertFalse(page.locator('[data-figure="fma"]').is_visible())
        self.assertFalse(page.locator('.fma-explorer-controls').is_visible())
        self.assertIn("离开此 FMA producer", page.locator('#fma-policy').inner_text())
        self.assertIn("[S,17,24]", page.locator('#fma-partial-example').inner_text())
        page.select_option("#fma-t", "1")
        self.assertTrue(page.locator('[data-figure="fma"]').is_visible())
        self.assertEqual("0", page.locator('#fma-token').input_value())
        page.close()


if __name__ == "__main__":
    unittest.main()
