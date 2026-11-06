"""Build the standalone KernelWiki project walkthrough."""
import argparse
from html import escape
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def render():
    case = json.loads((ROOT / "cases/kernel-wiki/case.json").read_text(encoding="utf-8"))
    page = (ROOT / "web/kernel-wiki.html").read_text(encoding="utf-8")
    base = f"{case['repo']}/blob/{case['commit']}/"
    for key, (path, first, last) in case["sources"].items():
        page = page.replace(f"{{{{{key}}}}}", escape(f"{base}{path}#L{first}-L{last}", quote=True))
    for key, url in case.get("external_sources", {}).items():
        page = page.replace(f"{{{{{key}}}}}", escape(url, quote=True))
    page = page.replace("{{commit}}", case["commit"])
    page = page.replace("{{short_commit}}", case["commit"][:7])
    data = json.dumps({"base": base, "query": case["query"]}, ensure_ascii=False)
    page = page.replace("{{data}}", data.replace("<", "\\u003c"))
    if re.search(r"\{\{\w+\}\}", page):
        raise ValueError("Unresolved KernelWiki source reference")
    return page


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    page = render()
    if args.check:
        if not args.output.is_file() or args.output.read_text(encoding="utf-8") != page:
            parser.exit(1, "KernelWiki lesson needs to be rebuilt.\n")
        print("KernelWiki lesson matches its source and case.")
    else:
        args.output.write_text(page, encoding="utf-8")
        print(args.output)


if __name__ == "__main__":
    main()
