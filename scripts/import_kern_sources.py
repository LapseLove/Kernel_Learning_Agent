"""Import reviewed, pinned upstream excerpts for the kern runtime lesson."""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHA = '83c3f62be263da5f1e482fe90872a29bc4800b77'
REPO = 'https://github.com/pegainfer-project/kern'
PY = 'crates/kern-py/python/'
RANGES = [
    ('motivation', '设计动机：按模型、负载与 GPU 交付', 'README.md', 30, 66),
    ('kernel-swap', '清单可调范围与替换设备代码示例', 'README.md', 204, 235),
    ('package', '模型包与 manifest', 'README.md', 52, 123),
    ('hosts', 'runtime、页池、验证工具与宿主', 'README.md', 124, 202),
    ('load', '自有状态与宿主状态的编译时机', 'crates/kern-runtime/src/load.rs', 249, 280),
    ('issue', '运行时执行与 CUDA Graph 分派', 'crates/kern-runtime/src/exec.rs', 298, 375),
    ('standalone', 'kern run：prefill、decode 与输出', 'crates/kern-run/src/run.rs', 345, 401),
    ('wheel', 'kern-llm 包内容与运行要求', 'crates/kern-py/README.md', 1, 23),
    ('entry', 'vLLM 插件入口', 'crates/kern-py/pyproject.toml', 1, 32),
    ('register', '注册架构', PY+'kern_vllm/__init__.py', 18, 22),
    ('contract', '插件具名契约', PY+'kern_vllm/model.py', 1, 41),
    ('layers', '宿主状态与 stub layer', PY+'kern_vllm/model.py', 77, 176),
    ('construct', '初始化与调度上界', PY+'kern_vllm/model.py', 179, 211),
    ('bind', 'eager 绑定宿主地址', PY+'kern_vllm/model.py', 235, 248),
    ('host-region', '从张量提取地址和布局', PY+'kern/host.py', 27, 38),
    ('host-graph', 'vLLM 捕获与跨队列依赖', 'docs/vllm.md', 221, 241),
    ('host-lifecycle', '延迟编译、探测缓存和重新绑定', 'docs/vllm.md', 243, 285),
    ('serve-loop', '接入 vLLM 的动机与优化闭环', 'docs/vllm.md', 3, 63),
    ('dispatch', 'forward 的实际分派', PY+'kern_vllm/model.py', 250, 282),
    ('copy', '状态页、输入与输出搬运', PY+'kern_vllm/model.py', 284, 323),
    ('head', 'head 与 logits gather', PY+'kern_vllm/model.py', 325, 350),
    ('runs', '相邻请求分组算法', PY+'kern_vllm/model.py', 353, 374),
    ('backend', '空计算 backend 的内存声明', PY+'kern_vllm/backend.py', 1, 93),
    ('events', '跨 stream 的 before / after 事件', 'crates/kern-runtime/src/host.rs', 1, 118),
    ('admit', 'HostTensor 的 dtype / shape / stride 校验', 'crates/kern-manifest/src/types.rs', 370, 449),
    ('group', '拓扑和首次绑定后的同步', PY+'kern/group.py', 1, 51),
    ('verify', 'Verifier 范围与信任边界', 'docs/manifest.md', 485, 553),
    ('layout', 'Qwen3.8 hosted transform 的布局计算', 'tools/qwen38_vllm.py', 1, 83),
    ('trace', '记录 metadata，非 GPU 时间戳', PY+'kern_vllm/trace.py', 1, 80),
    ('workload', '离线 workload 的分组与过滤', PY+'kern_vllm/workload.py', 1, 66),
    ('results', '早期 A/B 测量条件与数据（reported）', 'docs/vllm.md', 387, 416),
    ('rsi', '后续在线优化结果（reported）', 'docs/vllm-rsi-example.md', 1, 43),
    ('rsi-table', '在线优化：请求、吞吐与延迟原表', 'docs/vllm-rsi-example.md', 214, 254),
    ('ragged-results', '合组 prefill：微基准与服务对照', 'docs/vllm.md', 437, 463),
    ('limits', '适用边界与接口版本记录', 'docs/vllm.md', 78, 94),
    ('limits2', '宿主插件限制', 'docs/vllm.md', 527, 546),
    ('docs-drift', '文档中的旧式逐条 prefill 描述', 'docs/vllm.md', 355, 376),
]


def main():
    p = argparse.ArgumentParser(__doc__)
    p.add_argument('--root', type=Path, required=True)
    a = p.parse_args()
    actual = subprocess.check_output(['git', '-C', str(a.root), 'rev-parse', 'HEAD'], text=True).strip()
    if actual != SHA:
        raise SystemExit(f'Expected {SHA}; got {actual}')
    sources = []
    for ident, title, path, start, end in RANGES:
        raw = subprocess.check_output(['git', '-C', str(a.root), 'show', f'{SHA}:{path}'])
        lines = raw.decode('utf-8').splitlines()
        if not 1 <= start <= end <= len(lines):
            raise SystemExit(f'Invalid pinned range {ident}: {path}:{start}-{end} ({len(lines)} lines)')
        excerpt = '\n'.join(lines[start-1:end])
        blob = hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
        sources.append(dict(id=ident, title=title, path=path, start=start, end=end,
                            commit=SHA, blob_sha=blob, excerpt=excerpt,
                            excerpt_sha256=hashlib.sha256(excerpt.encode()).hexdigest(),
                            url=f'{REPO}/blob/{SHA}/{path}#L{start}-L{end}'))
    dest = ROOT/'cases/kern-runtime'
    dest.mkdir(parents=True, exist_ok=True)
    (dest/'source-map.json').write_text(json.dumps(dict(repository=REPO, commit=SHA, sources=sources), ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    (dest/'UPSTREAM-LICENSE.txt').write_bytes(subprocess.check_output(['git', '-C', str(a.root), 'show', f'{SHA}:LICENSE']))
    print(f'Imported {len(sources)} excerpts at {SHA}')


if __name__ == '__main__':
    main()
