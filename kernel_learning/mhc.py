"""Second case: source-bound Mega mHC lesson and portable HTML export."""
from __future__ import annotations

import json
import re
import subprocess
from math import ceil
from pathlib import Path

from .core import PROJECT

CASE_FILE = PROJECT / "cases" / "mhc-mega" / "case.json"
PINNED_FILE = CASE_FILE.parent / "pinned-sources.json"

# Short, contiguous source windows for the reader. Each stays inside its stage range.
EXCERPTS = {
    "api": (223, 250), "split": (15, 23), "layout": (19, 38),
    "launch": (129, 149), "assign": (69, 75), "load": (212, 230),
    "coeff": (291, 300), "post": (479, 505), "mma": (267, 275),
    "partials": (621, 653), "mix": (63, 96), "norm": (656, 690),
    "norm_math": (302, 328), "barrier": (13, 35),
    "roles": (185, 210), "post_map": (403, 461),
    "post_publish": (496, 537), "io_store": (327, 382),
    "mma_ring": (248, 284), "normal_worker": (162, 220),
    "split_barrier": (55, 84),
}


def load_case() -> dict:
    return json.loads(CASE_FILE.read_text(encoding="utf-8"))


def geometry(tokens: int, hidden: int, sms: int, *, deterministic: bool = False,
             mode: str = "shifted") -> dict:
    """Translate the pinned API's split formula; sms is a user supplied assumption."""
    if tokens < 1 or tokens > 1 << 20 or hidden < 1 or hidden % 1024 or sms < 1:
        raise ValueError("outside the source-modelled input domain")
    if mode not in ("normal", "shifted"):
        raise ValueError("mode must be normal or shifted")
    m_blocks = ceil(tokens / 64)
    k_blocks = hidden // 64
    max_splits = min(64, max(16, sms // m_blocks))
    splits = 16 if deterministic else ceil(k_blocks / ceil(k_blocks / max_splits))
    coeff_channels = 24 if mode == "shifted" else 20
    return {
        "m_blocks": m_blocks,
        "k_blocks": k_blocks,
        "splits": splits,
        "tasks": m_blocks * splits,
        "scratch_bytes": m_blocks * splits * (64 * 24 + 2 * 64) * 4,
        "gemm_flop_proxy": 2 * tokens * 4 * hidden * 24,
        "input_unique_address_subset_bytes": (
            tokens * hidden * 2 + tokens * 4 * hidden * 2
            + 24 * 4 * hidden * 4 + tokens * coeff_channels * 4
        ),
        "logical_tma_copy_extent_bytes": (
            m_blocks * k_blocks * 65536
            + m_blocks * splits * 64 * coeff_channels * 4
        ),
    }


def validate(case: dict) -> list[str]:
    errors = []
    if case.get("schema_version") != 1 or case.get("case_id") != "mhc-mega-sm100":
        errors.append("case identity/schema mismatch")
    anchor = case.get("anchor", {})
    if anchor.get("repo") != "https://github.com/deepseek-ai/DeepGEMM":
        errors.append("unexpected source repository")
    if not re.fullmatch(r"[0-9a-f]{40}", anchor.get("commit", "")):
        errors.append("source commit must be a 40 character SHA")
    seen = set()
    for source in case.get("source_map", []):
        sid = source.get("id")
        if not sid or sid in seen:
            errors.append(f"duplicate or empty source ID: {sid}")
        seen.add(sid)
        path, start, end = source.get("file"), source.get("start"), source.get("end")
        if not isinstance(path, str) or path.startswith("/") or ".." in Path(path).parts:
            errors.append(f"unsafe source path: {sid}")
        if not isinstance(start, int) or not isinstance(end, int) or start < 1 or end < start:
            errors.append(f"invalid source range: {sid}")
        for field in ("question", "data_basis", "what_to_read", "conclusion"):
            if not source.get(field):
                errors.append(f"{sid}: missing illustration field {field}")
    if len(seen) < 10:
        errors.append("execution source map is incomplete")
    if not PINNED_FILE.exists():
        errors.append("pinned source excerpts missing")
    else:
        pinned = json.loads(PINNED_FILE.read_text(encoding="utf-8"))
        if pinned.get("commit") != anchor.get("commit"):
            errors.append("pinned excerpts use a different commit")
        for sid, snippet in pinned.get("stages", {}).items():
            source = next((s for s in case.get("source_map", []) if s.get("id") == sid), None)
            if source is None or snippet.get("file") != source.get("file") or not (
                source["start"] <= snippet.get("start", 0) <= snippet.get("end", 0) <= source["end"]
            ):
                errors.append(f"pinned excerpt outside its source map: {sid}")
            if not re.fullmatch(r"[0-9a-f]{40}", snippet.get("blob_sha", "")):
                errors.append(f"pinned excerpt missing blob SHA: {sid}")
    for group in case.get("lineage", []):
        for event in group.get("events", []):
            if not event.get("decision") or not event.get("boundary") or not event.get("sources"):
                errors.append(f"lineage event missing decision, boundary, or source: {event.get('title')}")
            for source in event.get("sources", []):
                url = source.get("url", "")
                if "/blob/main/" in url or "/tree/main/" in url:
                    errors.append(f"unversioned lineage code URL: {url}")
    graph = case.get("operator_graph", {})
    expected_nodes = {"collapse", "sublayer", "post", "projection", "activation", "sinkhorn"}
    if {node.get("id") for node in graph.get("nodes", [])} != expected_nodes:
        errors.append("operator graph is missing a required mHC stage")
    for node in graph.get("nodes", []):
        if any(not node.get(k) for k in ("reads", "computes", "writes", "dependency")):
            errors.append(f"incomplete operator DAG node: {node.get('id')}")
    edges = {(edge.get("from"), edge.get("to"), edge.get("mode"))
             for edge in graph.get("edges", [])}
    required_edges = {
        ("post", "projection", None), ("projection", "activation", None),
        ("projection", "sinkhorn", None), ("post", "collapse", None),
        ("activation", "collapse", "normal"),
        ("carried_pre", "collapse", "shifted"),
        ("collapse", "sublayer", None),
    }
    if not required_edges <= edges or ("activation", "sinkhorn", None) in edges:
        errors.append("operator DAG dependencies or mode-specific input are incorrect")
    for predecessor in case.get("predecessors", []):
        sha = predecessor.get("commit", "")
        if not re.fullmatch(r"[0-9a-f]{40}", sha):
            errors.append(f"invalid predecessor SHA: {predecessor.get('id')}")
        for key in ("url", "dispatch_url"):
            url = predecessor.get(key)
            if url and f"/blob/{sha}/" not in url:
                errors.append(f"unpinned predecessor {key}: {predecessor.get('id')}")
        if any(not predecessor.get(k) for k in ("reads", "execution", "hardware", "tradeoff")):
            errors.append(f"incomplete predecessor explanation: {predecessor.get('id')}")
    atlas = case.get("fusion_atlas", {})
    for field in ("question", "data_basis", "what_to_read", "conclusion"):
        if not atlas.get(field):
            errors.append(f"fusion atlas missing {field}")
    stages = atlas.get("stages", [])
    atlas_rows = atlas.get("rows", [])
    if len(stages) != 6 or {row.get("id") for row in atlas_rows} != {
        "sglang_pre", "vllm_fused", "sglang_fused", "mega"
    }:
        errors.append("fusion atlas stages or implementation rows incomplete")
    for row in atlas_rows:
        if sum(segment.get("span", 0) for segment in row.get("segments", [])) != len(stages):
            errors.append(f"fusion atlas coverage width mismatch: {row.get('id')}")
        if not row.get("boundaries") or not re.search(
            r"/blob/[0-9a-f]{40}/.*#L\d+-L\d+", row.get("source", "")
        ):
            errors.append(f"fusion atlas missing pinned boundary evidence: {row.get('id')}")
    lesson = case.get("teaching_v2", {})
    expected_order = ["operator", "dispatch", "small-t"]
    if lesson.get("order") != expected_order or lesson.get("diagram_type") != "conceptual":
        errors.append("guided lesson order or diagram evidence type mismatch")
    plan = case.get("lesson_plan", {})
    if plan.get("path") != expected_order or [chapter.get("id") for chapter in plan.get("chapters", [])] != expected_order:
        errors.append("active lesson must follow operator, dispatch, small-t")
    active_ids = [scene.get("id") for scene in case.get("reading_scenes", [])]
    planned_ids = [sid for chapter in plan.get("chapters", []) for sid in chapter.get("scenes", [])]
    if not active_ids or len(set(active_ids)) != len(active_ids) or planned_ids != active_ids:
        errors.append("active scenes must be unique and follow the chapter plan")
    example = lesson.get("small_t_example", {})
    try:
        t, h, hc = (example[key] for key in ("tokens", "hidden", "hc_mult"))
        tile, splits, threads = (example[key] for key in ("tile_n", "splits", "threads"))
        n_coeff = 2 * hc + hc * hc
        expected = {
            "column_tiles": ceil(n_coeff / tile),
            "producer_ctas": t * ceil(n_coeff / tile) * splits,
            "hidden_per_split": h // splits,
            "hidden_iterations_per_thread": h // splits // threads,
            "projection_flops": 2 * t * hc * h * n_coeff,
            "fn_storage_bytes": n_coeff * hc * h * 4,
            "residual_storage_bytes": t * hc * h * 2,
            "partial_storage_bytes": (splits * t * n_coeff + splits * t) * 4,
        }
        if min(t, h, hc, tile, splits, threads) < 1 or h % (splits * threads):
            raise ValueError("invalid FMA tiling")
        for key, value in expected.items():
            if example.get(key) != value:
                errors.append(f"small-T example {key} does not match its source-derived formula")
    except (KeyError, TypeError, ZeroDivisionError, ValueError) as error:
        errors.append(f"invalid small-T example: {error}")
    if lesson.get("formula_contract", {}).get("coefficient_partition") != [4, 4, 16]:
        errors.append("mHC coefficient partition must be 4+4+16")
    for profile in lesson.get("operator_profiles", []):
        if any(not profile.get(field) for field in ("name", "shape", "reason", "falsifier", "source")):
            errors.append("incomplete per-operator hypothesis")
    if len(lesson.get("operator_profiles", [])) != 4:
        errors.append("per-operator bottleneck coverage is incomplete")
    lesson3 = case.get("teaching_v3", {})
    shared = lesson3.get("shared_scenario", {})
    if any(shared.get(k) != example.get(k) for k in ("tokens", "hidden", "hc_mult")) or shared.get("mode") != "normal":
        errors.append("shared scenario diverges from the historical FMA example")
    try:
        shared_geometry = geometry(shared["tokens"], shared["hidden"], shared["num_sms_assumed"], mode=shared["mode"])
        if shared_geometry["tasks"] != 64 or shared_geometry["scratch_bytes"] != 425984:
            errors.append("shared Mega geometry does not match pinned split model")
    except (KeyError, ValueError, TypeError) as error:
        errors.append(f"invalid shared Mega scenario: {error}")
    if {edge.get("id") for edge in lesson3.get("memory_edges", [])} != {
        "fma_producer", "fma_consumer", "mega_producer", "mega_consumer"
    }:
        errors.append("shared memory/launch path is incomplete")
    lesson4 = case.get("teaching_v4", {})
    lesson6 = case.get("teaching_v6", {})
    mapping = lesson6.get("fma_mapping", {})
    expected_mapping = {"tokens": example.get("tokens"), "hidden": example.get("hidden"),
                        "column_tiles": example.get("column_tiles"), "splits": example.get("splits"),
                        "threads": example.get("threads"), "warp_size": 32, "tile_n": example.get("tile_n")}
    if any(mapping.get(key) != value for key, value in expected_mapping.items()):
        errors.append("FMA hierarchy mapping differs from the audited workload")
    if not isinstance(mapping.get("default_thread"), int) or not 0 <= mapping["default_thread"] < 256:
        errors.append("invalid selected FMA thread")
    if {row.get("code") for row in lesson6.get("operation_legend", [])} != {"EW", "REDUCE", "MM", "MOVE"}:
        errors.append("operation taxonomy is incomplete")
    ledger = lesson4.get("worked_ledger", {})
    pipeline = lesson4.get("pipeline", {})
    try:
        t, h, n = (ledger[key] for key in ("tokens", "hidden", "hc_mult"))
        columns = n * n + 2 * n
        tiles = ceil(columns / example["tile_n"])
        post_once = t * h * (n + 2 * n * n)
        mega_default = geometry(t, h, shared["num_sms_assumed"], mode=shared["mode"])
        expected_ledger = {
            "coefficient_count": columns,
            "column_tiles": tiles,
            "post_once_flops": post_once,
            "post_repeated_flops": tiles * post_once,
            "projection_flops": 2 * t * n * h * columns,
            "fma_partial_allocated_bytes": example["partial_storage_bytes"],
            "mega_default_splits": mega_default["splits"],
            "mega_default_scratch_bytes": mega_default["scratch_bytes"],
            "mega_fixed_splits": 16,
            "mega_fixed_scratch_bytes": geometry(t, h, shared["num_sms_assumed"], deterministic=True)["scratch_bytes"],
        }
        for key, expected_value in expected_ledger.items():
            if ledger.get(key) != expected_value:
                errors.append(f"worked ledger {key} does not match its source-derived formula")
        if (pipeline.get("default_k_blocks_per_split") != h // 64 // mega_default["splits"]
                or pipeline.get("fixed16_k_blocks_per_split") != h // 64 // 16
                or [pipeline.get(k) for k in ("io_stages", "fn_stages", "a_stages", "accum_stages")] != [4, 2, 4, 2]):
            errors.append("Mega pipeline stages or block count differ from the pinned source model")
        accesses = lesson4.get("access_contract", [])
        if [row.get("logical_copy_bytes", row.get("allocated_bytes")) for row in accesses] != [65536, 5120, 6656]:
            errors.append("Mega access extents or scratch allocation are inconsistent")
        if any(not row.get("scope") or not row.get("boundary") for row in accesses):
            errors.append("Mega access scope or evidence boundary missing")
        epilogue = lesson4.get("epilogue_stages", [])
        if {row.get("stage") for row in epilogue} != {
            "Mix", "Sinkhorn", "Normal Collapse/Norm", "Shifted Collapse/Norm"
        }:
            errors.append("Mega mode-specific epilogue ledger is incomplete")
        for row in epilogue:
            if any(not row.get(k) for k in ("scope", "reads", "computes", "special", "writes")) or not re.search(
                r"/blob/[0-9a-f]{40}/.*#L\d+-L\d+", row.get("source", "")
            ):
                errors.append(f"incomplete or unpinned epilogue stage: {row.get('stage')}")
            for key in ("collapse_source", "partial_source"):
                if row.get(key) and not re.search(r"/blob/[0-9a-f]{40}/.*#L\d+-L\d+", row[key]):
                    errors.append(f"unpinned {key}: {row.get('stage')}")
    except (KeyError, TypeError, ValueError, ZeroDivisionError) as error:
        errors.append(f"invalid worked ledger: {error}")
    if len(case.get("operator_implementation", [])) != 4:
        errors.append("operator implementation comparison is incomplete")
    for entry in [*case.get("operator_implementation", []), *case.get("dispatch_guide", []),
                  *case.get("dispatch_examples", [])]:
        urls = entry.get("evidence", [])
        if isinstance(urls, str):
            urls = [urls]
        if entry.get("source"):
            urls.append(entry["source"])
        if not urls or any(not re.search(r"/blob/[0-9a-f]{40}/.*#L\d+-L\d+", url) for url in urls):
            errors.append(f"unpinned implementation/dispatch evidence: {entry.get('operator', entry.get('scope', entry.get('input')))}")
    try:
        d = anchor["default_workload"]
        geometry(d["tokens"], d["hidden"], d["num_sms_assumed"],
                 deterministic=d["deterministic"], mode=d["mode"])
    except (KeyError, ValueError, TypeError) as error:
        errors.append(f"invalid default workload: {error}")
    return errors


def import_source(case: dict, repo_root: Path) -> Path:
    """Copy verified snippets from git objects at the exact Case commit."""
    root = repo_root.resolve()
    head = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
    if head != case["anchor"]["commit"]:
        raise ValueError(f"source HEAD mismatch: expected {case['anchor']['commit']}, got {head}")
    snippets = {}
    for source in case["source_map"]:
        sid = source["id"]
        if sid not in EXCERPTS:
            continue
        start, end = EXCERPTS[sid]
        if not (source["start"] <= start <= end <= source["end"]):
            raise ValueError(f"excerpt outside source stage: {sid}")
        path = source["file"]
        content = subprocess.check_output(
            ["git", "-C", str(root), "show", f"HEAD:{path}"]
        ).decode("utf-8").splitlines()
        if end > len(content):
            raise ValueError(f"source ends before excerpt: {sid}")
        blob = subprocess.check_output(
            ["git", "-C", str(root), "rev-parse", f"HEAD:{path}"], text=True
        ).strip()
        snippets[sid] = {"file": path, "start": start, "end": end,
                         "blob_sha": blob, "code": "\n".join(content[start - 1:end])}
    payload = {"schema": 1, "commit": head, "provenance": "git show at the exact Case SHA",
               "stages": snippets}
    PINNED_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return PINNED_FILE


def render_html(case: dict) -> str:
    web = PROJECT / "web"
    html = (web / "mhc.html").read_text(encoding="utf-8")
    css = (web / "mhc.css").read_text(encoding="utf-8")
    js = (web / "mhc.js").read_text(encoding="utf-8")
    payload = json.dumps(case, ensure_ascii=False).replace("</", "<\\/")
    pinned = json.loads(PINNED_FILE.read_text(encoding="utf-8")) if PINNED_FILE.exists() else {}
    pinned_payload = json.dumps(pinned, ensure_ascii=False).replace("</", "<\\/")
    html = html.replace('<link rel="stylesheet" href="/mhc.css">', f"<style>{css}</style>")
    html = html.replace('<link rel="stylesheet" href="/reader.css">',
                        '<style>' + (web / 'reader.css').read_text(encoding='utf-8') + '</style>')
    for asset in ('reader.js', 'mhc-mega-scenes.js', 'mhc-scenes.js'):
        html = html.replace(f'<script defer src="/{asset}"></script>',
                            '<script>' + (web / asset).read_text(encoding='utf-8') + '</script>')
    html = html.replace('<script defer src="/mhc.js"></script>',
                        f"<script>window.__MHC_CASE__={payload};window.__MHC_PINNED__={pinned_payload};</script><script>{js}</script>")
    html = html.replace('href="/index.html"', 'href="Kernel_Learning_Studio.html"')
    return html


def build(case: dict, check: bool = False) -> Path:
    target = PROJECT / "MHC_Learning_Studio.html"
    html = render_html(case)
    if check:
        if not target.exists() or target.read_text(encoding="utf-8") != html:
            raise ValueError("Mega mHC HTML is missing or stale; run python -m kernel_learning build-mhc")
    else:
        target.write_text(html, encoding="utf-8")
    return target
