"""Python stdlib CLI: validate, serve, build, export, import, dispatch, cost."""
import argparse
import json
import subprocess
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from .core import PROJECT, CASE_FILE, dispatch, load_case, validate
from .cost_model import model

class CaseHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Do not expose repository files other than the explicit static web/ files.
        from urllib.parse import unquote, urlsplit
        p = unquote(urlsplit(path).path)
        if p == '/case.json':
            return str(CASE_FILE)
        return super().translate_path(path)

def do_import(case, vid, repo_root: Path, allow_mismatch: bool):
    v = case['variants'][vid]
    if not repo_root.is_dir():
        raise ValueError(f'not a directory: {repo_root}')
    p = subprocess.run(['git', '-C', str(repo_root), 'rev-parse', 'HEAD'],
                       capture_output=True, text=True, check=True)
    actual = p.stdout.strip()
    expected = v['commit']
    if actual != expected and not allow_mismatch:
        raise ValueError(f'{vid} HEAD mismatch. Expected {expected}, got {actual}. Checkout the pinned SHA or use --allow-mismatch for exploratory viewing.')
    result = {'actual_commit': actual, 'expected_commit': expected, 'matched': actual == expected,
              'repo': vid, 'stages': {}}
    for stage in v['stages']:
        loc = stage['source']
        target = (repo_root / loc['file']).resolve()
        if not target.is_relative_to(repo_root.resolve()):
            raise ValueError('unsafe source file path')
        if not target.is_file():
            raise FileNotFoundError(target)
        lines = target.read_text(encoding='utf-8').splitlines()
        if len(lines) < loc['end']:
            raise ValueError(f"{loc['file']} too short for pinned mapping ({len(lines)} < {loc['end']})")
        result['stages'][stage['id']] = dict(file=loc['file'],start=loc['start'],
            end=loc['end'], code='\n'.join(f'{i+1:>4}  {lines[i]}' for i in range(loc['start']-1,loc['end'])))
    dest=PROJECT/'web'/'local-sources.json'
    current = {}
    if dest.exists():
        current=json.loads(dest.read_text(encoding='utf-8'))
    current[vid]=result
    dest.write_text(json.dumps(current,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Imported {len(result["stages"])} mapped stages into {dest}; SHA matched: {result["matched"]}')

def render_html(case, include_local_sources: bool = False) -> str:
    # Make a portable standalone HTML for local Obsidian vault previews.
    web=PROJECT/'web'
    page=(web/'index.html').read_text(encoding='utf-8')
    css=(web/'style.css').read_text(encoding='utf-8')
    anatomy_js=(web/'anatomy.js').read_text(encoding='utf-8')
    js=(web/'app.js').read_text(encoding='utf-8')
    local={}
    pinned=json.loads((web/'pinned-sources.json').read_text(encoding='utf-8'))
    localfile=web/'local-sources.json'
    if include_local_sources and localfile.exists():
        local=json.loads(localfile.read_text(encoding='utf-8'))
    def safe_json(x):
        return json.dumps(x,ensure_ascii=False).replace('</','<\\/')
    page=page.replace('<link rel="stylesheet" href="/style.css">','<style>'+css+'</style>')
    page=page.replace('<script defer src="/model.js"></script>', '<script>'+ (web/'model.js').read_text(encoding='utf-8') +'</script>')
    page=page.replace('<script defer src="/anatomy.js"></script>',
        '<script>window.__KLA_CASE__='+safe_json(case)+';window.__KLA_LOCAL__='+safe_json(local)+
        ';window.__KLA_PINNED__='+safe_json(pinned)+'</script>\n<script>'+anatomy_js+'</script>')
    page=page.replace('<script defer src="/app.js"></script>','<script>'+js+'</script>')
    return page

def export_html(case, target: Path, include_local_sources: bool = False):
    page=render_html(case, include_local_sources)
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(page,encoding='utf-8')
    print(f'Portable HTML: {target} ({target.stat().st_size:,} bytes)')

def build(case, check: bool = False):
    page=render_html(case)
    targets=(PROJECT/'Kernel_Learning_Studio.html', PROJECT/'web'/'studio-standalone.html')
    if check:
        stale=[str(p) for p in targets if not p.exists() or p.read_text(encoding='utf-8')!=page]
        if stale:
            raise SystemExit('Generated HTML is missing or stale: '+', '.join(stale)+'; run python -m kernel_learning build')
        print('OK: both standalone HTML files match source and exclude local sources')
    else:
        for target in targets:
            target.write_text(page,encoding='utf-8')
            print(f'Built {target}')

def main():
    parser=argparse.ArgumentParser(description='Kernel Learning Harness · evidence-first case explorer')
    sub=parser.add_subparsers(dest='command',required=True)
    sub.add_parser('validate')
    sv=sub.add_parser('serve');sv.add_argument('--port',type=int,default=8765)
    ex=sub.add_parser('export-html');ex.add_argument('--output',type=Path,default=PROJECT/'Kernel_Learning_Studio.html')
    ex.add_argument('--include-local-sources',action='store_true',help='Explicitly embed imported local source excerpts; review before sharing')
    build_parser=sub.add_parser('build',help='Regenerate both local standalone HTML entry points')
    build_parser.add_argument('--check',action='store_true')
    imp=sub.add_parser('import-source');imp.add_argument('--repo',choices=('vllm','sglang'),required=True)
    imp.add_argument('--root',required=True,type=Path);imp.add_argument('--allow-mismatch',action='store_true')
    d=sub.add_parser('dispatch');d.add_argument('--repo',choices=('vllm','sglang'),default='vllm');d.add_argument('--tokens',type=int,default=1)
    d.add_argument('--swa',type=int,default=128);d.add_argument('--extra',type=int,default=512)
    d.add_argument('--heads',type=int,default=8);d.add_argument('--phase',default='decode')
    c=sub.add_parser('cost',help='source-derived FLOP/byte shape ledger; not measured traffic')
    c.add_argument('--repo',choices=('vllm','sglang'),default='vllm')
    c.add_argument('--tokens',type=int,default=2);c.add_argument('--swa',type=int,default=128)
    c.add_argument('--extra',type=int,default=512);c.add_argument('--heads',type=int,default=16)
    args=parser.parse_args();case=load_case()
    if args.command=='validate':
        problems=validate(case)
        if problems:
            print('\n'.join(problems));raise SystemExit(1)
        print('OK: 2 variants, %s stages, each with pinned source locations.'%sum(len(v['stages']) for v in case['variants'].values()))
    elif args.command=='serve':
        # Handler directory explicitly constrained to web/; /case.json is special-cased.
        factory=partial(CaseHandler,directory=str(PROJECT/'web'))
        with ThreadingHTTPServer(('127.0.0.1',args.port),factory) as srv:
            print(f'Kernel Learning Studio: http://127.0.0.1:{args.port}')
            try: srv.serve_forever()
            except KeyboardInterrupt: pass
    elif args.command=='export-html':
        export_html(case,args.output,args.include_local_sources)
    elif args.command=='build':
        build(case,args.check)
    elif args.command=='import-source':
        do_import(case,args.repo,args.root, args.allow_mismatch)
    elif args.command=='dispatch':
        print(json.dumps(dispatch(args.repo,args.tokens,args.swa,args.extra,args.heads,args.phase),ensure_ascii=False,indent=2))
    elif args.command=='cost':
        print(json.dumps(model(args.repo,args.tokens,args.swa,args.extra,args.heads),ensure_ascii=False,indent=2))

if __name__=='__main__':main()
