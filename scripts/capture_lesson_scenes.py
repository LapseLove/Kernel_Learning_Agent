"""Capture self-paced HTML states and build a browser-readable QA contact sheet.

Original implementation. Uses the existing Playwright development dependency.
The output records screenshots; a reviewer must still open and inspect them.
"""
from __future__ import annotations
import argparse
import html
import json
import hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--html", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--channel", default="msedge")
    parser.add_argument("--width", type=int, default=1440)
    parser.add_argument("--height", type=int, default=1000)
    parser.add_argument("--selectors", nargs="+", default=[".intro", "#routes", "#dispatch-map", "#fma", "#pipeline"])
    parser.add_argument("--reader", action="store_true", help="Capture each reader tab and each user-cued step")
    parser.add_argument("--plan", type=Path, help='Optional JSON states: [{"name": "...", "click": ["selector"], "selector": "..."}]')
    args = parser.parse_args()
    artifact_sha = hashlib.sha256(args.html.read_bytes()).hexdigest()
    args.out.mkdir(parents=True, exist_ok=True)
    states = json.loads(args.plan.read_text(encoding="utf-8")) if args.plan else [
        {"name": selector, "selector": selector} for selector in args.selectors]
    records, errors = [], []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel=args.channel)
        page = browser.new_page(viewport={"width": args.width, "height": args.height}, reduced_motion="reduce")
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(args.html.resolve().as_uri())
        page.wait_for_load_state("networkidle")
        if args.reader:
            states = []
            inline = page.locator("[data-figure]")
            if inline.count():
                for figure in inline.all():
                    sid = figure.get_attribute("data-figure")
                    root = f'[data-figure="{sid}"]'
                    if not figure.locator('[data-action="reset"]').count():
                        states.append({"name": f"{sid}-static", "selector": f"#{sid}", "click": []})
                        continue
                    figure.locator('[data-action="reset"]').click()
                    count = 0
                    while True:
                        states.append({"name": f"{sid}-step-{count+1}", "selector": f"#{sid}",
                                       "click": [root+' [data-action="reset"]'] + [root+' [data-action="step"]'] * count})
                        button = figure.locator('[data-action="step"]')
                        if button.is_disabled(): break
                        button.click(); count += 1
                        if count > 30: raise ValueError("Reader step limit exceeded")
            else:
                tabs = page.locator('#reader [role="tab"][data-scene]')
                for tab_index in range(tabs.count()):
                    tabs.nth(tab_index).click()
                    page.locator('#reader [data-action="reset"]').click()
                    steps = 0
                    while True:
                        states.append({"name": f"scene-{tab_index+1}-step-{steps+1}", "selector": "#reader",
                                       "click": [f'#reader [role="tab"][data-scene="{tab_index}"]', '#reader [data-action="reset"]'] + ['#reader [data-action="step"]'] * steps})
                        button = page.locator('#reader [data-action="step"]')
                        if button.is_disabled(): break
                        button.click(); steps += 1
                        if steps > 30: raise ValueError("Reader step limit exceeded")
            if not states:
                raise ValueError("No self-paced figures or reader tabs found")
        for index, state in enumerate(states):
            for selector in state.get("click", []):
                page.locator(selector).click()
            item = page.locator(state["selector"]).first
            item.evaluate("el => el.scrollIntoView({block: 'start'} )")
            # Wait for layout/paint, independent of animation durations.
            page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
            filename = f"state-{index + 1:02d}.png"
            page.screenshot(path=str(args.out / filename))
            records.append({"name": state["name"], "selector": state["selector"],
                            "screenshot": filename, "viewport": [args.width, args.height],
                            "page_overflow": page.evaluate("document.documentElement.scrollWidth > innerWidth"),
                            "review": "unreviewed"})
        browser.close()
    (args.out / "states.json").write_text(json.dumps({"artifact": args.html.name, "artifact_sha256": artifact_sha, "states": records, "page_errors": errors}, ensure_ascii=False, indent=2), encoding="utf-8")
    cards = "".join(f'<figure><figcaption>{html.escape(row["name"])} · {args.width}×{args.height} · unreviewed</figcaption><a href="{row["screenshot"]}"><img src="{row["screenshot"]}"></a></figure>' for row in records)
    (args.out / "index.html").write_text('<!doctype html><meta charset="utf-8"><title>Scene QA</title><style>body{font:16px sans-serif;background:#eee;margin:24px}figure{margin:24px 0}img{max-width:100%;border:1px solid #aaa}figcaption{margin:8px 0}</style><h1>Scene QA — inspect every image</h1><p>Capture is not a visual pass. Open each full-resolution image and record findings.</p>'+cards, encoding="utf-8")
    if errors:
        parser.exit(1, f"Page errors: {errors}\n")
    print(f"Captured {len(records)} states; inspect {args.out / 'index.html'}")


if __name__ == "__main__":
    main()
