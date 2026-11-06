"""Validate canonical kern lesson data and build a standalone, offline HTML."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT/'Kern_Runtime_Studio.html'


def render():
    case = json.loads((ROOT/'cases/kern-runtime/case.json').read_text(encoding='utf-8'))
    sm = json.loads((ROOT/'cases/kern-runtime/source-map.json').read_text(encoding='utf-8'))
    assert case['kind'] == 'runtime-integration'
    assert case['repository'] == sm['repository']
    assert re.fullmatch(r'[0-9a-f]{40}', case['commit']) and case['commit'] == sm['commit']
    ids = {s['id'] for s in sm['sources']}
    assert len(ids) == len(sm['sources'])
    for s in sm['sources']:
        assert s['commit'] == case['commit'] and f"/blob/{case['commit']}/" in s['url']
        assert s['url'].endswith(f"#L{s['start']}-L{s['end']}")
        assert len(s['excerpt'].split('\n')) == s['end']-s['start']+1, s['id']
        assert hashlib.sha256(s['excerpt'].encode()).hexdigest() == s['excerpt_sha256']
    for claim in case['claims']:
        assert set(claim['sources']) <= ids
    for scene in case['reading_scenes']:
        assert set(scene['data_basis']) <= ids
        for key in ('question','mental_model','visual_type','what_to_read','conclusion','interaction_or_static_reason'):
            assert scene[key], (scene['id'], key)
    for step in case['stream_steps']:
        assert set(step['sources']) <= ids
    for record in case['reported'] + case['experiments']:
        assert record['source'] in ids
    for p in case['presets']:
        assert p['q'] and all(type(q) is int and 1 <= q <= 16 for q in p['q'])
    layout = case['layout']
    assert layout['state_bytes'] == 3*10240*2+48*128*128*4
    assert layout['kv_token_bytes'] == 4*2*256*2
    assert layout['kv_block_bytes'] == layout['kernel_block_tokens'] * layout['kv_token_bytes']
    assert layout['kernel_blocks'] == -(-layout['state_bytes'] // layout['kv_block_bytes'])
    assert layout['page_tokens'] == layout['kernel_blocks'] * layout['kernel_block_tokens']
    assert layout['page_bytes'] == layout['page_tokens'] * layout['kv_token_bytes']
    assert layout['unused_gdn_capacity_bytes'] == layout['page_bytes'] - layout['state_bytes']
    page = (ROOT/'web/kern.html').read_text(encoding='utf-8')
    assert set(re.findall(r'data-source="([^"]+)"', page)) <= ids | {'all'}
    license_text = (ROOT/'cases/kern-runtime/UPSTREAM-LICENSE.txt').read_text(encoding='utf-8')
    data = json.dumps({'case':case, 'sources':sm, 'license':license_text}, ensure_ascii=False).replace('</','<\\/')
    page = page.replace('<!--KERN_DATA-->', '<script>window.__KERN__='+data+'</script>')
    for name in ('kern.css','reader.css'):
        page = page.replace(f'<link rel="stylesheet" href="{name}">', '<style>'+(ROOT/'web'/name).read_text(encoding='utf-8')+'</style>')
    for name in ('reader.js','kern.js'):
        js = (ROOT/'web'/name).read_text(encoding='utf-8')
        if name == 'kern.js':
            js = 'document.addEventListener("DOMContentLoaded",()=>{\n'+js+'\n});'
        page = page.replace(f'<script defer src="{name}"></script>', '<script>'+js+'</script>')
    assert '<!--KERN_DATA-->' not in page
    assert not re.search(r'<(?:script[^>]+src|link[^>]+href)=', page)
    return page


def main():
    p = argparse.ArgumentParser(__doc__)
    p.add_argument('--check', action='store_true')
    a = p.parse_args()
    page = render()
    if a.check:
        assert TARGET.read_text(encoding='utf-8') == page, 'Run python scripts/build_kern.py'
        print('PASS: canonical Case, source map and offline HTML are current')
    else:
        TARGET.write_text(page, encoding='utf-8', newline='\n')
        print(f'Built {TARGET} ({len(page.encode()):,} bytes)')
    print('Artifact SHA256:', hashlib.sha256(page.encode()).hexdigest())


if __name__ == '__main__':
    main()
