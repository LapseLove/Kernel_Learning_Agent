"""Reusable Case contract plus focused scenarios for the current Case."""
import copy
import json
import shutil
import subprocess
import unittest

from kernel_learning.__main__ import render_html
from kernel_learning.core import PROJECT, load_case, validate, workload


class ContractTests(unittest.TestCase):
    def test_json_schema_and_semantic_rules(self):
        import jsonschema
        case = load_case()
        schema = json.loads((PROJECT / 'cases' / 'schema.json').read_text(encoding='utf-8'))
        jsonschema.validate(case, schema)
        self.assertEqual(validate(case), [])
        for change in ('schema_version', 'commit', 'source'):
            broken = copy.deepcopy(case)
            if change == 'schema_version':
                broken['schema_version'] = 2
            elif change == 'commit':
                broken['variants']['vllm']['commit'] = 'x' * 40
            else:
                broken['variants']['vllm']['stages'][0]['source']['end'] = 0
            self.assertTrue(validate(broken), change)

    def test_python_browser_geometry_parity(self):
        node = shutil.which('node')
        if not node:
            self.skipTest('Node is required for browser model parity')
        scenarios = [
            ('vllm', 1, 128, 512, 8, 'decode'),
            ('vllm', 4, 128, 512, 16, 'decode'),
            ('vllm', 8, 128, 512, 16, 'decode'),
            ('vllm', 12, 128, 512, 16, 'decode'),
            ('vllm', 13, 128, 512, 16, 'decode'),
            ('vllm', 16, 128, 0, 16, 'decode'),
            ('vllm', 1, 32, 64, 32, 'prefill'),
            ('sglang', 1, 32, 0, 16, 'decode'),
            ('sglang', 8, 128, 512, 16, 'verify'),
            ('sglang', 9, 128, 512, 16, 'decode'),
            ('sglang', 1, 128, 512, 8, 'decode'),
        ]
        inputs = [dict(variant=v, token=t, swa=s, extra=e, heads=h, phase=p)
                  for v, t, s, e, h, p in scenarios]
        script = "const {deriveWorkload}=require('./web/model.js');let x='';process.stdin.on('data',c=>x+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(x).map(deriveWorkload))));"
        result = subprocess.run([node, '-e', script], input=json.dumps(inputs), text=True,
                                cwd=PROJECT, capture_output=True, check=True)
        browser = json.loads(result.stdout)
        keys = {'supported': 'supported', 'gateTokens': 'gate_tokens', 'block': 'block',
                'swaBlocks': 'swa_blocks', 'extraBlocks': 'extra_blocks', 'blocks': 'blocks',
                'keySlots': 'key_slots', 'splitsCandidate': 'splits_candidate',
                'blocksPerSplit': 'blocks_per_split', 'activeSplitsMax': 'active_splits_max',
                'firstEmptySplit': 'first_empty_split', 'programsCandidate': 'programs_candidate'}
        for x, got in zip(inputs, browser):
            expected = workload(x['variant'], x['token'], x['swa'], x['extra'], x['heads'], x['phase'])
            for js, py in keys.items():
                self.assertEqual(got[js], expected[py], (x, js))

    def test_standalone_export_excludes_local_sources_by_default(self):
        marker = 'LOCAL_PRIVATE_SOURCE_MARKER'
        localfile = PROJECT / 'web' / 'local-sources.json'
        original = localfile.read_bytes() if localfile.exists() else None
        try:
            localfile.write_text(json.dumps({'vllm': {'code': marker}}), encoding='utf-8')
            self.assertNotIn(marker, render_html(load_case()))
            self.assertIn(marker, render_html(load_case(), include_local_sources=True))
        finally:
            if original is None:
                localfile.unlink(missing_ok=True)
            else:
                localfile.write_bytes(original)


if __name__ == '__main__':
    unittest.main()
