/**
 * Model Priority Configuration
 * Primary AI Brain: nvidia/nemotron-3.5-lightning:free
 */
const MODEL_PRIORITY = [
  'nvidia/nemotron-3.5-lightning:free', // #1 Primary — NVIDIA Nemotron 3.5 Lightning AI Brain
  'nex-agi/nex-n2.5-pro:free',          // #2 Fallback 1
  'google/gemma-4-26b-a4b-it:free'      // #3 Fallback 2
];

const STALE_OPENROUTER_DEFAULTS = [
  'openrouter/free',
  'qwen/qwen3.6-plus-preview:free',
  'stepfun/step-3.5-flash:free',
  'nvidia/nemotron-3-super-120b-a12b:free'
];

window.MODEL_PRIORITY = MODEL_PRIORITY;
window.STALE_OPENROUTER_DEFAULTS = STALE_OPENROUTER_DEFAULTS;
