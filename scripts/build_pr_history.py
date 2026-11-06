"""Build the local, standalone PR-history workflow lesson (standard library only)."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CASE_DIR = ROOT / 'cases' / 'model-pr-history'
TARGET = ROOT / 'Model_PR_History.html'


def render() -> str:
    case = json.loads((CASE_DIR / 'case.json').read_text(encoding='utf-8'))
    sources = json.loads((CASE_DIR / 'source-map.json').read_text(encoding='utf-8'))
    assert case['kind'] == 'knowledge-workflow'
    assert re.fullmatch(r'[a-f0-9]{40}', case['commit'])
    assert case['commit'] == sources['commit']
    ids = {s['id'] for s in sources['sources']}
    assert len(ids) == len(sources['sources'])
    for source in sources['sources']:
        assert source['commit'] == case['commit']
        assert source['end'] - source['start'] + 1 == len(source['excerpt'].split('\n'))
        assert f"/blob/{case['commit']}/" in source['url']
        assert source['url'].endswith(f"#L{source['start']}-L{source['end']}")
    for item in case['claims']:
        assert set(item['sources']) <= ids
    for scene in case['reading_scenes']:
        assert set(scene['data_basis']) <= ids
        for key in ('question', 'mental_model', 'visual_type', 'what_to_read', 'conclusion', 'interaction_or_static_reason'):
            assert scene[key]
    for step in case['maintenance_steps']:
        assert step['source'] in ids
    for sample in sources['query_samples'].values():
        for matches in sample['topics'].values():
            assert 0 < len(matches) <= 3
            assert all(m['line'] > 0 and len(m['text']) <= 220 for m in matches)
    web = ROOT / 'web'
    page = (web / 'pr-history.html').read_text(encoding='utf-8')
    data = json.dumps({'case': case, 'sources': sources}, ensure_ascii=False).replace('</', '<\\/')
    page = page.replace('<!--PR_HISTORY_DATA-->', '<script>window.__PR_HISTORY__=' + data + '</script>')
    for name in ('pr-history.css', 'reader.css'):
        page = page.replace(f'<link rel="stylesheet" href="{name}">', '<style>' + (web / name).read_text(encoding='utf-8') + '</style>')
    for name in ('reader.js', 'pr-history.js'):
        page = page.replace(f'<script defer src="{name}"></script>', '<script>' + (web / name).read_text(encoding='utf-8') + '</script>')
    # Defer inline execution until the body exists, including file:// usage.
    js = (web / 'pr-history.js').read_text(encoding='utf-8')
    page = page.replace('<script>' + js + '</script>', '<script>document.addEventListener("DOMContentLoaded",()=>{\n' + js + '\n});</script>')
    assert '<!--PR_HISTORY_DATA-->' not in page
    assert not re.search(r'<(?:link[^>]+href|script[^>]+src)=', page)
    return page


def main() -> None:
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    page = render()
    if args.check:
        assert TARGET.exists() and TARGET.read_text(encoding='utf-8') == page, 'Run python scripts/build_pr_history.py'
        print('PASS: Case/source-map references and standalone HTML are current')
    else:
        TARGET.write_text(page, encoding='utf-8')
        print(f'Built {TARGET} ({TARGET.stat().st_size:,} bytes)')
    print('Artifact SHA256:', hashlib.sha256(page.encode('utf-8')).hexdigest())


if __name__ == '__main__':
    main()
