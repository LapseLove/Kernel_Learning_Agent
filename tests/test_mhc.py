import json
from copy import deepcopy
import unittest

from kernel_learning import mhc


class MegaMHCCaseTests(unittest.TestCase):
    def test_case_contract_and_portable_build(self):
        case = mhc.load_case()
        self.assertEqual([], mhc.validate(case))
        html = mhc.render_html(case)
        self.assertIn("window.__MHC_CASE__=", html)
        self.assertIn(case["anchor"]["commit"], html)
        self.assertNotIn('href="/mhc.css"', html)
        self.assertNotIn('src="/mhc.js"', html)
        self.assertIn('href="Kernel_Learning_Studio.html"', html)
        pinned = json.loads(mhc.PINNED_FILE.read_text(encoding="utf-8"))
        self.assertEqual(case["anchor"]["commit"], pinned["commit"])
        self.assertIn("blob_sha", pinned["stages"]["post"])
        self.assertIn("window.__MHC_PINNED__=", html)

    def test_split_geometry_and_deterministic_boundary(self):
        one = mhc.geometry(64, 4096, 132)
        self.assertEqual((1, 64, 64, 64),
                         (one["m_blocks"], one["k_blocks"], one["splits"], one["tasks"]))
        self.assertEqual(425984, one["scratch_bytes"])
        self.assertEqual(4200448, one["input_unique_address_subset_bytes"])
        self.assertEqual(4587520, one["logical_tma_copy_extent_bytes"])
        two = mhc.geometry(65, 7168, 132)
        self.assertEqual((2, 112, 56, 112),
                         (two["m_blocks"], two["k_blocks"], two["splits"], two["tasks"]))
        fixed = mhc.geometry(65, 7168, 132, deterministic=True)
        self.assertEqual(16, fixed["splits"])
        self.assertGreater(two["scratch_bytes"], fixed["scratch_bytes"])

    def test_api_domain(self):
        for args in ((0, 4096, 132), (64, 5000, 132), (64, 4096, 0)):
            with self.subTest(args=args), self.assertRaises(ValueError):
                mhc.geometry(*args)

    def test_mega_effective_work_tile_work_and_partial_capacity(self):
        lesson = mhc.load_case()["mega_walkthrough"]
        t, h, n = lesson["tokens"], lesson["hidden"], lesson["routes"]
        rows = lesson["tile_m"]
        costs = {entry["name"]: entry for entry in lesson["costs"]}
        self.assertEqual(t*h*(n+2*n*n), costs["Post/Comb"]["effective"])
        self.assertEqual(rows*h*(n+2*n*n), costs["Post/Comb"]["tile"])
        self.assertEqual(2*t*n*h*lesson["outputs"], costs["系数投影"]["effective"])
        self.assertEqual(2*rows*n*h*lesson["outputs"], costs["系数投影"]["tile"])
        self.assertGreater(costs["Post/Comb"]["tile"], mhc.load_case()["teaching_v4"]["worked_ledger"]["post_repeated_flops"])
        for deterministic in (False, True):
            config = mhc.geometry(t, h, lesson["sms_assumed"], deterministic=deterministic, mode="normal")
            # Normal reserves X1-square storage but only writes GEMM + HC squares.
            normal_partial_writes = config["tasks"] * rows * (lesson["outputs"] + 1) * 4
            self.assertEqual(config["tasks"]*rows*4, config["scratch_bytes"] - normal_partial_writes)

    def test_primer_and_history_contract(self):
        case = mhc.load_case()
        self.assertEqual(
            {"collapse", "sublayer", "post", "projection", "activation", "sinkhorn"},
            {node["id"] for node in case["operator_graph"]["nodes"]},
        )
        self.assertEqual(["sglang_pre", "vllm_fused", "sglang_fused"],
                         [item["id"] for item in case["predecessors"]])
        self.assertEqual(4, len(case["operator_implementation"]))
        atlas = case["fusion_atlas"]
        self.assertEqual(6, len(atlas["stages"]))
        self.assertEqual(["sglang_pre", "vllm_fused", "sglang_fused", "mega"],
                         [row["id"] for row in atlas["rows"]])
        self.assertTrue(all(sum(seg["span"] for seg in row["segments"]) == 6
                            for row in atlas["rows"]))
        self.assertGreaterEqual(len(case["dispatch_examples"]), 5)
        self.assertEqual([], mhc.validate(case))

    def test_residual_hand_example_matches_formula(self):
        old = (1.0, 2.0)
        post = (0.5, 0.25)
        comb = ((0.75, 0.25), (0.25, 0.75))
        result = [post[j] * 3 + sum(comb[i][j] * old[i] for i in range(2))
                  for j in range(2)]
        self.assertEqual([2.75, 2.5], result)
        self.assertIn("[2.75,2.5]", mhc.load_case()["operator_graph"]["numerical_example"])

    def test_dag_and_small_t_arithmetic_are_checked(self):
        case = mhc.load_case()
        example = case["teaching_v2"]["small_t_example"]
        shared = case["teaching_v3"]["shared_scenario"]
        mega = mhc.geometry(shared["tokens"], shared["hidden"], shared["num_sms_assumed"], mode=shared["mode"])
        self.assertEqual((64, 425984), (mega["tasks"], mega["scratch_bytes"]))
        self.assertEqual((12, 384, 3200),
                         (example["column_tiles"], example["producer_ctas"],
                          example["partial_storage_bytes"]))
        changed = deepcopy(case)
        changed["operator_graph"]["edges"].append(
            {"from": "activation", "to": "sinkhorn", "value": "false dependency"}
        )
        self.assertIn("operator DAG dependencies or mode-specific input are incorrect",
                      mhc.validate(changed))
        changed = deepcopy(case)
        changed["teaching_v2"]["small_t_example"]["producer_ctas"] = 12
        self.assertIn("small-T example producer_ctas does not match its source-derived formula",
                      mhc.validate(changed))
        ledger = case["teaching_v4"]["worked_ledger"]
        self.assertEqual(7_077_888, ledger["post_repeated_flops"])
        self.assertEqual(106_496, ledger["mega_fixed_scratch_bytes"])
        epilogue = {row["stage"]: row for row in case["teaching_v4"]["epilogue_stages"]}
        self.assertIn("32 lanes", epilogue["Sinkhorn"]["special"])
        self.assertIn("Shifted writes new Pre[4] global", epilogue["Mix"]["writes"])
        changed = deepcopy(case)
        changed["teaching_v4"]["worked_ledger"]["post_repeated_flops"] = 589_824
        self.assertIn("worked ledger post_repeated_flops does not match its source-derived formula",
                      mhc.validate(changed))
        changed = deepcopy(case)
        changed["lesson_plan"]["chapters"].reverse()
        self.assertIn("active lesson must follow operator, dispatch, small-t", mhc.validate(changed))


if __name__ == "__main__":
    unittest.main()
