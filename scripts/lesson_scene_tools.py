"""Validate a self-paced scene plan and emit bounded authoring packets.

Independent implementation informed by HyperFrames frame-packets and BBuf's
understanding-to-frame coverage workflow. Provenance: docs/visual-tooling.md.
No video, audio, network or third-party runtime is required.
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path


def packets(manifest: dict, case: dict, max_bytes: int = 24576) -> list[dict]:
    claims = {item["id"]: item for item in manifest.get("claims", [])}
    if len(claims) != len(manifest.get("claims", [])):
        raise ValueError("duplicate claim id")
    sources = {item["id"]: item for item in case.get("source_map", [])}
    seen, covered, result = set(), set(), []
    for scene in manifest.get("scenes", manifest.get("reading_scenes", [])):
        sid = scene.get("id", "")
        if not sid or sid in seen:
            raise ValueError(f"missing or duplicate scene id: {sid}")
        if not all(scene.get(key) for key in ("question", "claim", "steps")):
            raise ValueError(f"{sid}: question, claim and steps are required")
        seen.add(sid)
        step_ids = [step.get("id", step.get("title")) for step in scene["steps"]]
        if not all(step_ids) or len(set(step_ids)) != len(step_ids):
            raise ValueError(f"{sid}: missing or duplicate step id")
        evidence = []
        for source_id in dict.fromkeys(scene.get("source_ids", []) + scene.get("step_sources", [])):
            if source_id not in sources:
                raise ValueError(f"{sid}: unknown source id {source_id}")
            source = dict(sources[source_id])
            anchor = case["anchor"]
            source["url"] = (f"{anchor['repo']}/blob/{anchor['commit']}/"
                             f"{source['file']}#L{source['start']}-L{source['end']}")
            evidence.append(source)
        for source in scene.get("external_sources", []):
            if not re.search(r"/blob/[0-9a-f]{40}/.+#L\d+-L\d+", source.get("url", "")):
                raise ValueError(f"{sid}: external code source must use a full SHA and line range")
            evidence.append(dict(source))
        if not evidence:
            raise ValueError(f"{sid}: no pinned evidence")
        for claim_id in scene.get("covers", []):
            if claim_id not in claims:
                raise ValueError(f"{sid}: unknown claim {claim_id}")
            covered.add(claim_id)
        packet = {"case_id": case["case_id"], "source_sha": case["anchor"]["commit"],
                  "scene": scene, "sources": evidence,
                  "claims": [claims[c] for c in scene.get("covers", [])],
                  "contract": "Reader controls steps; no duration implies hardware time. Preserve pinned evidence and mode boundaries."}
        size = len(json.dumps(packet, ensure_ascii=False).encode("utf-8"))
        if size > max_bytes:
            raise ValueError(f"{sid}: {size} bytes exceeds packet budget {max_bytes}; narrow the scene")
        result.append(packet)
    if not result:
        raise ValueError("no scenes")
    missing = sorted(set(claims) - covered)
    if missing:
        raise ValueError("uncovered claims: " + ", ".join(missing))
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, help="Optional separate plan; defaults to Case reading_scenes")
    parser.add_argument("--case", required=True, type=Path)
    parser.add_argument("--out", type=Path, help="Optional author packet directory")
    parser.add_argument("--max-bytes", type=int, default=24576)
    args = parser.parse_args()
    try:
        case = json.loads(args.case.read_text(encoding="utf-8"))
        plan = json.loads(args.manifest.read_text(encoding="utf-8")) if args.manifest else case
        output = packets(plan, case, args.max_bytes)
        if args.out:
            args.out.mkdir(parents=True, exist_ok=True)
            for index, packet in enumerate(output):
                # Numeric filenames prevent scene ids from becoming filesystem paths.
                (args.out / f"scene-{index + 1:02d}.json").write_text(
                    json.dumps(packet, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"OK: {len(output)} scenes; all declared claims covered; bounded pinned-source packets")
    except (ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"ERROR: {error}\n")


if __name__ == "__main__":
    main()
