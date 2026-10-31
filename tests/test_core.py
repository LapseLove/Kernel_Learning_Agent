import unittest
import json
from kernel_learning.core import load_case, validate, dispatch, source_url
from kernel_learning.cost_model import model

class CaseTests(unittest.TestCase):
    def test_schema(self):
        case=load_case()
        self.assertEqual(validate(case),[])
        self.assertEqual(len(case['variants']),2)
        for v in case['variants'].values():
            for stage in v['stages']:
                url=source_url(v,stage)
                self.assertIn(v['commit'],url)
                self.assertIn('#L',url)

    def test_vllm_gate_long(self):
        self.assertEqual(dispatch('vllm',1,128,512,8)['splits'],32)
        self.assertEqual(dispatch('vllm',4,128,512,8)['splits'],16)
        self.assertEqual(dispatch('vllm',8,128,512,8)['splits'],8)
        self.assertTrue(dispatch('vllm',12,128,512,8)['supported'])
        self.assertFalse(dispatch('vllm',13,128,512,8)['supported'])
        self.assertFalse(dispatch('vllm',1,128,512,8,'prefill')['supported'])

    def test_vllm_short(self):
        self.assertEqual(dispatch('vllm',16,128,0,16)['splits'],8)
        self.assertFalse(dispatch('vllm',17,128,0,16)['supported'])
        self.assertFalse(dispatch('vllm',1,128,0,32)['supported'])

    def test_guided_lesson_contract(self):
        from kernel_learning.core import PROJECT
        js=(PROJECT/'web'/'app.js').read_text(encoding='utf-8')
        html=(PROJECT/'web'/'index.html').read_text(encoding='utf-8')
        for symbol in ('memoryDiagram()', 'headBudget()', 'parallelDiagram()', 'costLedger()', 'decisionFork()', 'integrationFlow()'):
            self.assertIn(symbol,js)
        self.assertIn("view:'overview'",js)
        self.assertIn('data-view="overview" class="active"',html)
        self.assertIn('Query 和 sparse indices 是注意力 Kernel 的两路输入',js)

    def test_sglang(self):
        r=dispatch('sglang',6,128,512,16)
        self.assertTrue(r['supported'])
        self.assertEqual(r['splits'],10)
        self.assertFalse(dispatch('sglang',9,128,512,16)['supported'])
        self.assertFalse(dispatch('sglang',1,128,512,8)['supported'])
        self.assertTrue(dispatch('sglang',1,128,512,16,'verify')['supported'])
        self.assertFalse(dispatch('sglang',1,128,512,16,'prefill')['supported'])

    def test_pinned_source_excerpts(self):
        from kernel_learning.core import PROJECT
        case=load_case()
        bundle=json.loads((PROJECT/'web'/'pinned-sources.json').read_text(encoding='utf-8'))
        for vid, variant in case['variants'].items():
            pinned=bundle['variants'][vid]
            self.assertEqual(pinned['commit'],variant['commit'])
            for stage in variant['stages']:
                excerpt=pinned['stages'][stage['id']]
                for item in (excerpt,*excerpt.get('views',{}).values()):
                    loc=stage['source']
                    self.assertEqual(item['file'],loc['file'])
                    self.assertLessEqual(loc['start'],item['start'])
                    self.assertLessEqual(item['end'],loc['end'])
                    self.assertEqual(len(item['code'].splitlines()),item['end']-item['start']+1)
                    self.assertEqual(len(item['blob_sha']),40)

    def test_cost_model_h16_and_mapping(self):
        v=model('vllm',2,128,512,16)
        self.assertEqual(v['key_slots'],640)
        self.assertEqual(v['programs'],64)
        self.assertEqual(v['old_64_head_shape_proxy_flops_per_token'],83_886_080)
        self.assertEqual(v['new_tile_qk_pv_flops_per_token'],20_971_520)
        self.assertEqual(v['kv_unique_cache_bytes_per_token'],373_120)
        self.assertEqual(v['q_logical_valid_load_bytes_per_token'],524_288)
        self.assertEqual(v['scratch_allocated_bytes_per_token'],1_050_624)
        self.assertEqual(model('vllm',2,128,512,8)['new_tile_qk_pv_flops_per_token'],20_971_520)
        self.assertEqual(model('vllm',8,128,512,16)['active_programs_max'],56)
        s=model('sglang',2,128,512,16)
        self.assertEqual(s['tiles_per_token'],10)
        self.assertEqual(s['qk_plus_two_pv_tile_proxy_flops_per_token'],31_457_280)
        case=load_case()
        self.assertTrue(all('mapping' in [st['id'] for st in v['stages']]
                            for v in case['variants'].values()))

    def test_walkthrough_default_follows_one_cta(self):
        case=load_case()
        a=case['walkthrough']['default_workload']
        self.assertEqual((a['tokens'],a['heads'],a['swa_capacity'],a['extra_capacity']),
                         (4,16,128,512))
        self.assertEqual(dispatch('vllm',4,128,512,16)['splits'],16)
        # 20 blocks / 16 splits => two blocks per CTA; split 0 has work, split 10 is empty.
        blocks=(128+31)//32+(512+31)//32
        per=(blocks+16-1)//16
        self.assertEqual((blocks,per,10*per),(20,2,20))
        ids=[s['id'] for s in case['variants']['vllm']['stages']]
        self.assertLess(ids.index('config'),ids.index('split'))
        self.assertLess(ids.index('split'),ids.index('kv'))
        self.assertLess(ids.index('kv'),ids.index('qk'))
        self.assertLess(ids.index('qk'),ids.index('merge'))

if __name__=='__main__':unittest.main()
