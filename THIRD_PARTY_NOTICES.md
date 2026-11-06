# Third-party source excerpts

`web/pinned-sources.json` and `cases/mhc-mega/pinned-sources.json` contain short, line-numbered excerpts used to explain the pinned implementations below. These excerpts remain attributed to their upstream projects and licenses; each Case records the exact source file and line range.

| Project | Pinned revision | Upstream license |
| --- | --- | --- |
| [vLLM](https://github.com/vllm-project/vllm) | [`74c0f0e10ac647ee22cf9e2bcd0ee20e40aee343`](https://github.com/vllm-project/vllm/tree/74c0f0e10ac647ee22cf9e2bcd0ee20e40aee343) | [Apache License 2.0 at this revision](https://github.com/vllm-project/vllm/blob/74c0f0e10ac647ee22cf9e2bcd0ee20e40aee343/LICENSE) |
| [SGLang](https://github.com/sgl-project/sglang) | [`b98a4ead5bd337418e8eb5a18e9f5f5a402baac0`](https://github.com/sgl-project/sglang/tree/b98a4ead5bd337418e8eb5a18e9f5f5a402baac0) | [Apache License 2.0 at this revision](https://github.com/sgl-project/sglang/blob/b98a4ead5bd337418e8eb5a18e9f5f5a402baac0/LICENSE) |
| [DeepGEMM](https://github.com/deepseek-ai/DeepGEMM) | [`5081f8513af57e61696de4f4f04b0e707ffb503e`](https://github.com/deepseek-ai/DeepGEMM/tree/5081f8513af57e61696de4f4f04b0e707ffb503e) | [MIT License at this revision](https://github.com/deepseek-ai/DeepGEMM/blob/5081f8513af57e61696de4f4f04b0e707ffb503e/LICENSE) |

The reported performance and correctness values in `case.json` come from those projects' pull request discussions and are identified as author reports. They are not measurements by this repository.

## HTML scene workflow provenance

The kern runtime / vLLM integration lesson includes attributed excerpts from
[pegainfer-project/kern](https://github.com/pegainfer-project/kern) at commit
`83c3f62be263da5f1e482fe90872a29bc4800b77`, under its
[Apache-2.0 license](https://github.com/pegainfer-project/kern/blob/83c3f62be263da5f1e482fe90872a29bc4800b77/LICENSE).
Each excerpt preserves its upstream file, real line numbers, blob SHA and
fixed commit link in `cases/kern-runtime/source-map.json`. The lesson's
diagrams and JavaScript grouping visualization are original teaching
adaptations; upstream measured results are labeled `reported`. No compiled
GPU kernels or model weights are bundled. The separate systems language
`kern-project/kern` is linked only to disambiguate the user's original URL.

The self-paced scene workflow was informed by HeyGen HyperFrames at commit
`d0b551d0330d4d2cd932348a911b5457ed1ed3c8` (Apache-2.0, Copyright 2026 HeyGen,
Inc.) and BBuf AI-Infra-Auto-Driven-SKILLS at commit
`c592955044e896edd20890468c9bdbbe30ab0be6`. The scene reader, packet validator,
and browser QA scripts are original implementations adapted for self-paced HTML.
No upstream video runtime, BBuf code, fonts, logos, narration, or branded assets
are bundled. The inspected BBuf snapshot did not provide a root license;
its methods are attributed rather than its implementation being copied.
Pinned source links and migration decisions are recorded in
[docs/visual-tooling.md](docs/visual-tooling.md).

## DeepGEMM MIT license text

MIT License

Copyright (c) 2025 DeepSeek

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
