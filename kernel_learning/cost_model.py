"""Source-derived shape/byte ledger. None of these numbers are measured traffic."""
from __future__ import annotations

from .core import workload


def model(variant: str, tokens: int, swa: int, extra: int, heads: int) -> dict:
    if tokens < 1 or swa < 0 or extra < 0 or heads < 1:
        raise ValueError('invalid workload')
    if variant == 'vllm':
        if heads not in (8, 16):
            raise ValueError('vLLM small-head path requires 8 or 16 heads')
        w = workload(variant, tokens, swa, extra, heads)
        block, slots, splits, active = w['block'], w['key_slots'], w['splits_candidate'], w['active_splits_max']
        return {
            'variant': variant, 'tokens': tokens, 'heads_real': heads,
            'key_capacity': swa + extra, 'key_slots': slots, 'block_or_tile': block,
            'programs': tokens * splits, 'active_programs_max': tokens * active,
            'empty_programs_min': tokens * (splits - active), 'splits_per_token': splits,
            'useful_qk_pv_flops_per_token': 4 * heads * 512 * (swa + extra),
            'new_tile_qk_pv_flops_per_token': 4 * 16 * 512 * slots,
            'old_64_head_shape_proxy_flops_per_token': 4 * 64 * 512 * slots,
            'kv_storage_bytes_per_token': (swa + extra) * 584,
            'kv_unique_cache_bytes_per_token': (swa + extra) * 583,
            'scale_source_load_positions_per_key': 7,
            'index_unique_bytes_per_token': (swa + extra) * 4,
            'q_logical_valid_load_bytes_per_token': splits * heads * 512 * 2,
            'scratch_allocated_bytes_per_token': splits * 16 * (512 * 4 + 4),
            'scratch_merge_read_bytes_per_token': splits * heads * (512 * 4 + 4),
            'basis': 'all capacity IDs valid, no duplicate IDs; Q loads counted per CTA, cache reuse unknown; FLOPs are matrix shape proxies, not instruction counts',
        }
    if variant == 'sglang':
        if heads != 16:
            raise ValueError('SGLang fast path requires 16 heads')
        w = workload(variant, tokens, swa, extra, heads)
        block, tiles, slots = w['block'], w['splits_candidate'], w['key_slots']
        return {
            'variant': variant, 'tokens': tokens, 'heads_real': heads,
            'key_capacity': swa + extra, 'key_slots': slots, 'block_or_tile': block,
            'programs': tokens * tiles, 'tiles_per_token': tiles,
            'useful_single_pv_flops_per_token': 4 * heads * 512 * (swa + extra),
            'qk_plus_two_pv_tile_proxy_flops_per_token': 6 * heads * 512 * slots,
            'kv_storage_bytes_per_token': (swa + extra) * 584,
            'kv_unique_cache_bytes_per_token': (swa + extra) * 583,
            'scale_source_load_positions_per_key': 448,
            'index_unique_bytes_per_token': (swa + extra) * 4,
            'q_logical_load_bytes_per_token': tiles * heads * 512 * 2,
            'scratch_allocated_bytes_per_token': tiles * heads * (512 * 4 + 4 + 4),
            'basis': 'capacity equals effective length, all IDs valid; 583B is a unique-address illustration, not logical or physical transactions; FLOPs are matrix shape proxies',
        }
    raise ValueError(f'unknown variant: {variant}')
