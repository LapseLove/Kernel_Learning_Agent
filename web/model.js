/* Candidate geometry for the pinned teaching case. Hardware gates are assumed. */
'use strict';
function deriveWorkload(state) {
  const {variant, token, swa, extra, heads, phase} = state;
  if (!Number.isInteger(token) || token < 1 || !Number.isInteger(swa) || swa < 0 ||
      !Number.isInteger(extra) || extra < 0 || !Number.isInteger(heads) || heads < 1)
    throw new Error('invalid workload');
  const policy = state.case?.variants?.[variant]?.dispatch;
  if (!policy) throw new Error(`unknown variant or missing Case policy: ${variant}`);
  const keys = swa + extra, block = policy.block_keys;
  const swaBlocks = Math.ceil(swa / block), extraBlocks = Math.ceil(extra / block);
  const blocks = swaBlocks + extraBlocks;
  const rule = policy.split_policy;
  let gateTokens, splitsCandidate;
  if (rule.kind === 'token_tiers') {
    const short = keys <= policy.threshold_keys;
    gateTokens = short ? policy.max_tokens_short : policy.max_tokens_long;
    splitsCandidate = short ? rule.short_splits : rule.long_tiers.find(t => t.max_tokens === undefined || token <= t.max_tokens)?.splits;
  } else if (rule.kind === 'one_per_tile') {
    gateTokens = policy.max_tokens;
    splitsCandidate = blocks;
  } else throw new Error(`unknown split policy: ${rule.kind}`);
  if (!Number.isInteger(splitsCandidate)) throw new Error('split policy has no matching tier');
  const supported = policy.mode.split('/').includes(phase) && policy.heads.includes(heads) &&
    (state.q_dtype || 'bf16') === policy.q_dtype &&
    (state.cache_layout || 'v4-packed-584') === policy.cache_layout && token <= gateTokens;
  const blocksPerSplit = splitsCandidate ? Math.ceil(blocks / splitsCandidate) : 0;
  const activeSplitsMax = blocksPerSplit ? Math.ceil(blocks / blocksPerSplit) : 0;
  return {supported, gateTokens, block, swaBlocks, extraBlocks, blocks,
    keySlots: blocks * block, splitsCandidate, blocksPerSplit, activeSplitsMax,
    firstEmptySplit: activeSplitsMax, programsCandidate: token * splitsCandidate};
}
if (typeof module !== 'undefined') module.exports = {deriveWorkload};
