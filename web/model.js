/* Candidate geometry for the pinned teaching case. Hardware gates are assumed. */
'use strict';
function deriveWorkload(state) {
  const {variant, token, swa, extra, heads, phase} = state;
  if (!Number.isInteger(token) || token < 1 || !Number.isInteger(swa) || swa < 0 ||
      !Number.isInteger(extra) || extra < 0 || !Number.isInteger(heads) || heads < 1)
    throw new Error('invalid workload');
  if (!['vllm', 'sglang'].includes(variant)) throw new Error(`unknown variant: ${variant}`);
  const vl = variant === 'vllm', keys = swa + extra, block = vl ? 32 : 64;
  const swaBlocks = Math.ceil(swa / block), extraBlocks = Math.ceil(extra / block);
  const blocks = swaBlocks + extraBlocks;
  const gateTokens = vl ? (keys <= 256 ? 16 : 12) : 8;
  const splitsCandidate = vl ? (keys <= 256 ? 8 : token <= 3 ? 32 : token <= 7 ? 16 : 8) : blocks;
  const supported = vl ? phase === 'decode' && [8, 16].includes(heads) && token <= gateTokens
    : ['decode', 'verify', 'draft-extend-v2'].includes(phase) && heads === 16 && token <= gateTokens;
  const blocksPerSplit = splitsCandidate ? Math.ceil(blocks / splitsCandidate) : 0;
  const activeSplitsMax = blocksPerSplit ? Math.ceil(blocks / blocksPerSplit) : 0;
  return {supported, gateTokens, block, swaBlocks, extraBlocks, blocks,
    keySlots: blocks * block, splitsCandidate, blocksPerSplit, activeSplitsMax,
    firstEmptySplit: activeSplitsMax, programsCandidate: token * splitsCandidate};
}
if (typeof module !== 'undefined') module.exports = {deriveWorkload};
