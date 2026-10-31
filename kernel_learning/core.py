"""Deterministic case loading, validation and dispatch simulation (not a GPU benchmark)."""
from __future__ import annotations
import json
import re
from math import ceil
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
CASE_FILE = PROJECT / 'cases' / 'dsv41-small-head-decode' / 'case.json'

def load_case(path: Path = CASE_FILE) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))

def source_url(variant: dict, stage: dict) -> str:
    s = stage['source']
    return f"{variant['repo']}/blob/{variant['commit']}/{s['file']}#L{s['start']}-L{s['end']}"

def validate(case: dict) -> list[str]:
    errors = []
    if case.get('schema_version') != 1:
        errors.append('schema_version must be 1')
    if not case.get('case_id') or not case.get('variants'):
        errors.append('case_id/variants missing')
    for vid, v in case.get('variants', {}).items():
        if not re.fullmatch(r'[0-9a-f]{40}', v.get('commit', '')):
            errors.append(f'{vid}: commit must be pinned SHA-40')
        if not v.get('repo', '').startswith('https://github.com/'):
            errors.append(f'{vid}: repo must be a GitHub URL')
        if not isinstance(v.get('dispatch'), dict):
            errors.append(f'{vid}: dispatch contract missing')
        ids = set()
        for st in v.get('stages', []):
            sid = st.get('id')
            if not sid or sid in ids:
                errors.append(f'{vid}: empty/duplicate stage ID: {sid}')
            ids.add(sid)
            s = st.get('source', {})
            if not s.get('file') or not isinstance(s.get('start'), int) or not isinstance(s.get('end'), int) or s['start'] < 1 or s['end'] < s['start']:
                errors.append(f'{vid}/{sid}: invalid source mapping')
            if st.get('visual') not in ('conceptual', 'interpreter', 'hardware-measured'):
                errors.append(f'{vid}/{sid}: unsupported evidence level')
        if v.get('reported', {}).get('status') != 'reported_not_reproduced':
            errors.append(f'{vid}: reported data must be clearly attributed')
    return errors

def workload(variant: str, tokens: int, swa: int, extra: int, heads: int,
             phase: str = 'decode', *, q_dtype: str = 'bf16',
             cache_layout: str = 'v4-packed-584') -> dict:
    """Candidate launch geometry and documented gate; hardware assumptions remain explicit."""
    if tokens < 1 or swa < 0 or extra < 0 or heads < 1:
        raise ValueError('invalid workload')
    keys = swa + extra
    if variant == 'vllm':
        block = 32
        gate = 16 if keys <= 256 else 12
        splits = 8 if keys <= 256 else 32 if tokens <= 3 else 16 if tokens <= 7 else 8
        ok = phase == 'decode' and heads in (8, 16) and q_dtype == 'bf16' and cache_layout == 'v4-packed-584' and tokens <= gate
    elif variant == 'sglang':
        block = 64
        gate = 8
        splits = ceil(swa / block) + ceil(extra / block)
        ok = phase in ('decode', 'verify', 'draft-extend-v2') and heads == 16 and q_dtype == 'bf16' and cache_layout == 'v4-packed-584' and tokens <= gate
    else:
        raise ValueError(f'unknown variant: {variant}')
    blocks = ceil(swa / block) + ceil(extra / block)
    per = ceil(blocks / splits) if splits else 0
    active = ceil(blocks / per) if per else 0
    return {'supported': ok, 'gate_tokens': gate, 'block': block,
            'swa_blocks': ceil(swa / block), 'extra_blocks': ceil(extra / block),
            'blocks': blocks, 'key_slots': blocks * block,
            'splits_candidate': splits, 'blocks_per_split': per,
            'active_splits_max': active, 'first_empty_split': active,
            'programs_candidate': tokens * splits}

def dispatch(variant: str, tokens: int, swa_keys: int, extra_keys: int, heads: int, phase: str = 'decode',
             *, q_dtype: str = 'bf16', cache_layout: str = 'v4-packed-584') -> dict:
    """Simulate *documented* specialization gates for the pinned PRs.

    This only teaches dispatch choices, not exact framework runtime behavior.
    Gate not represented here (e.g. actual device capability or different model args)
    must be validated by the framework itself.
    """
    w = workload(variant, tokens, swa_keys, extra_keys, heads, phase,
                 q_dtype=q_dtype, cache_layout=cache_layout)
    keys = swa_keys + extra_keys
    if variant == 'vllm':
        gate, ok, splits = w['gate_tokens'], w['supported'], w['splits_candidate']
        return {'selected': 'small-head SM90 Triton' if ok else 'FlashMLA fallback',
                'supported': ok, 'splits': splits if ok else None,
                'programs': tokens * splits if ok else None,
                'gate': f'{"≤256" if keys <= 256 else ">256"} keys; T≤{gate}',
                'reason': 'SM90 + heads∈{8,16} + BF16 Q + matching 584B cache + decode; other hardware gates assumed pinned'}
    if variant == 'sglang':
        ok, splits = w['supported'], w['splits_candidate']
        # In actual SGLang wrapper, split allocation uses index tensor capacities,
        # not dynamic per-token valid length. The UI inputs represent those capacities.
        return {'selected': 'swapAB tcgen05 fast path' if ok else 'existing attention backend',
                'supported': ok, 'splits': splits if ok else None,
                'programs': tokens * splits if ok else None,
                'gate': '1≤T≤8, heads=16, SM100/103, BF16 Q, 584B cache',
                'reason': 'Kernel uses ceil(SWA_capacity/64)+ceil(extra_capacity/64); device capability/layout asserted by actual caller'}
    raise ValueError(f'unknown variant: {variant}')
