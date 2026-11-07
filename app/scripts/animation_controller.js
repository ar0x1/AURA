// AURA Live2D animation controller — resilient parameter updates and stable blinking.
// Keep this file as a classic browser script (not an ES module) to preserve existing globals.

const currentAnimationState = window.currentAnimationState || {
  eyeX: 0,
  eyeY: 0,
  targetEyeX: 0,
  targetEyeY: 0,
  bodyAngle: 0,
  targetBodyAngle: 0,
  headAngle: 0,
  targetHeadAngle: 0,
  blinkTimer: 0,
  idleTimer: 0,
  breathingTimer: 0,
  isHovering: false,
  hoverIntensity: 0,
  targetHoverIntensity: 0,
  lastInteractionTime: 0,
  interactionCooldown: 1000,
  currentEmotion: 'neutral',
  emotionEyeSmile: 0,
  targetEmotionEyeSmile: 0,
  emotionCheek: 0,
  targetEmotionCheek: 0,
  emotionBrowOffset: 0,
  targetEmotionBrowOffset: 0,
  emotionBrowAngle: 0,
  targetEmotionBrowAngle: 0,
  emotionEyeOpenMultiplier: 1,
  targetEmotionEyeOpenMultiplier: 1,
  emotionMouthForm: 0,
  targetEmotionMouthForm: 0,
  nextBlinkAt: 0,
  blinkStartedAt: 0,
  blinkDuration: 170
};

// If this state object existed before this script loaded, add fields introduced by this fix.
if (typeof currentAnimationState.nextBlinkAt !== 'number') currentAnimationState.nextBlinkAt = 0;
if (typeof currentAnimationState.blinkStartedAt !== 'number') currentAnimationState.blinkStartedAt = 0;
if (typeof currentAnimationState.blinkDuration !== 'number') currentAnimationState.blinkDuration = 170;

let eyeMovementFrameId = null;
let lastFrameTime = performance.now();
let expressionResetTimer = null;

function initializeMouseTracking() {
  // Gaze tracking remains disabled as requested by the app's existing behavior.
  if (typeof window.debugLog === 'function') window.debugLog('Mouse tracking disabled.', 'info');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function setCoreParameter(core, id, value) {
  if (!core || !Number.isFinite(value)) return;
  try {
    if (typeof core.setParameterValueById === 'function') {
      core.setParameterValueById(id, value);
      return;
    }
    // Cubism 2-compatible fallback for runtimes exposing setParamFloat only.
    if (typeof core.setParamFloat === 'function') {
      const legacyId = id.replace(/^Param/, 'PARAM_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
      core.setParamFloat(legacyId, value);
    }
  } catch (error) {
    // Models differ in their supported parameter IDs; an absent ID must not kill the RAF loop.
  }
}

function randomBlinkDelay() {
  return currentAnimationState.isHovering ? 2000 + Math.random() * 3000 : 3000 + Math.random() * 5000;
}

function updateBlink(now) {
  const state = currentAnimationState;
  if (!state.nextBlinkAt && !state.blinkStartedAt) {
    state.nextBlinkAt = now + randomBlinkDelay();
  }
  if (!state.blinkStartedAt && now >= state.nextBlinkAt) {
    state.blinkStartedAt = now;
    state.nextBlinkAt = 0;
  }

  if (!state.blinkStartedAt) return 1;
  const progress = clamp((now - state.blinkStartedAt) / Math.max(100, state.blinkDuration), 0, 1);
  // A full close-and-open curve rather than a one-frame blink.
  const openness = progress < 0.5 ? 1 - progress * 2 : (progress - 0.5) * 2;
  if (progress >= 1) {
    state.blinkStartedAt = 0;
    state.nextBlinkAt = now + randomBlinkDelay();
    return 1;
  }
  return clamp(openness, 0, 1);
}

function startAnimationLoop() {
  if (!eyeMovementFrameId) {
    lastFrameTime = performance.now();
    eyeMovementFrameId = requestAnimationFrame(updateEyeMovement);
  }
}

function stopAnimationLoop() {
  if (eyeMovementFrameId) cancelAnimationFrame(eyeMovementFrameId);
  eyeMovementFrameId = null;
}

function updateEyeMovement(now) {
  // Schedule the next frame before applying model parameters: a model-specific
  // runtime exception should never permanently stop breathing, gaze, or blinking.
  eyeMovementFrameId = null;
  const stage = window.app && window.app.stage;
  if (!stage) return;
  const models = stage.children.filter(child => child && child.internalModel && child.internalModel.coreModel);
  if (!models.length) return;
  eyeMovementFrameId = requestAnimationFrame(updateEyeMovement);

  const deltaTime = Math.max(0, Math.min(80, now - lastFrameTime));
  lastFrameTime = now;
  const state = currentAnimationState;

  if (typeof window.updateParticles === 'function') {
    try { window.updateParticles(); } catch (_) {}
  }

  state.hoverIntensity = lerp(state.hoverIntensity, state.targetHoverIntensity, 0.1);
  const eyeLerpSpeed = 0.08 + state.hoverIntensity * 0.04;
  state.eyeX = lerp(state.eyeX, state.targetEyeX, eyeLerpSpeed);
  state.eyeY = lerp(state.eyeY, state.targetEyeY, eyeLerpSpeed);
  const headLerpSpeed = 0.05 + state.hoverIntensity * 0.03;
  const bodyLerpSpeed = 0.03 + state.hoverIntensity * 0.02;
  state.headAngle = lerp(state.headAngle, state.targetHeadAngle, headLerpSpeed);
  state.bodyAngle = lerp(state.bodyAngle, state.targetBodyAngle, bodyLerpSpeed);

  state.breathingTimer += deltaTime;
  const breathingIntensity = 0.3 + state.hoverIntensity * 0.2;
  const breathingCycle = Math.sin(state.breathingTimer * 0.001) * breathingIntensity;
  state.blinkTimer += deltaTime;
  const eyeOpenness = updateBlink(now);

  state.idleTimer += deltaTime;
  let idleInfluence = 0;
  if (state.idleTimer > 10000 && !state.isHovering) {
    idleInfluence = Math.sin(state.idleTimer * 0.0005) * 0.5;
    if (Math.random() < 0.001) {
      state.targetHeadAngle = (Math.random() - 0.5) * 10;
      setTimeout(() => { state.targetHeadAngle = 0; }, 2000);
    }
  }

  const hoverEyeInfluence = state.hoverIntensity * 0.3;
  const finalEyeX = state.eyeX + idleInfluence * 0.3 + Math.sin(state.breathingTimer * 0.002) * hoverEyeInfluence;
  const finalEyeY = state.eyeY + breathingCycle * 0.1 + Math.cos(state.breathingTimer * 0.002) * hoverEyeInfluence;
  const headAngleMultiplier = 1 + state.hoverIntensity * 0.5;
  const bodyAngleMultiplier = 1 + state.hoverIntensity * 0.3;
  const alertnessBonus = state.hoverIntensity * 0.2;
  const browMovement = (-finalEyeY * 0.2 + breathingCycle * 0.1) * (1 + state.hoverIntensity * 0.5);

  const emotionLerpSpeed = 0.08;
  state.emotionEyeSmile = lerp(state.emotionEyeSmile, state.targetEmotionEyeSmile, emotionLerpSpeed);
  state.emotionCheek = lerp(state.emotionCheek, state.targetEmotionCheek, emotionLerpSpeed);
  state.emotionBrowOffset = lerp(state.emotionBrowOffset, state.targetEmotionBrowOffset, emotionLerpSpeed);
  state.emotionBrowAngle = lerp(state.emotionBrowAngle, state.targetEmotionBrowAngle, emotionLerpSpeed);
  state.emotionEyeOpenMultiplier = lerp(state.emotionEyeOpenMultiplier, state.targetEmotionEyeOpenMultiplier, emotionLerpSpeed);
  state.emotionMouthForm = lerp(state.emotionMouthForm, state.targetEmotionMouthForm, emotionLerpSpeed);

  const finalEyeOpen = clamp(eyeOpenness * state.emotionEyeOpenMultiplier + alertnessBonus, 0, 1);
  const speaking = Boolean(window.isCurrentlySpeaking || (window.WAIFU_TTS && window.WAIFU_TTS.speaking));

  models.forEach(model => {
    try {
      const core = model.internalModel.coreModel;
      setCoreParameter(core, 'ParamAngleX', clamp(finalEyeX * 25 * headAngleMultiplier + state.headAngle * 0.5, -30, 30));
      setCoreParameter(core, 'ParamAngleY', clamp(-finalEyeY * 25 * headAngleMultiplier + breathingCycle * 2, -30, 30));
      setCoreParameter(core, 'ParamEyeBallX', clamp(finalEyeX * 0.8, -1, 1));
      setCoreParameter(core, 'ParamEyeBallY', clamp(-finalEyeY * 0.8, -1, 1));
      setCoreParameter(core, 'ParamBodyAngleX', clamp(state.bodyAngle * 0.3 * bodyAngleMultiplier, -10, 10));
      setCoreParameter(core, 'ParamBodyAngleY', clamp((state.bodyAngle + breathingCycle) * bodyAngleMultiplier, -10, 10));
      setCoreParameter(core, 'ParamEyeLOpen', finalEyeOpen);
      setCoreParameter(core, 'ParamEyeROpen', finalEyeOpen);
      setCoreParameter(core, 'ParamEyeLSmile', clamp(state.emotionEyeSmile, 0, 1));
      setCoreParameter(core, 'ParamEyeRSmile', clamp(state.emotionEyeSmile, 0, 1));
      const browY = clamp(browMovement + state.emotionBrowOffset, -1, 1);
      setCoreParameter(core, 'ParamBrowLY', browY);
      setCoreParameter(core, 'ParamBrowRY', browY);
      setCoreParameter(core, 'ParamBrowLAngle', clamp(state.emotionBrowAngle, -1, 1));
      setCoreParameter(core, 'ParamBrowRAngle', clamp(state.emotionBrowAngle, -1, 1));
      setCoreParameter(core, 'ParamCheek', clamp(state.emotionCheek, 0, 1));
      // Mouth opening is exclusively owned by the TTS lip-sync controller while speaking.
      // Outside speech, restore the desired emotional mouth form, including neutral zero.
      if (!speaking) setCoreParameter(core, 'ParamMouthForm', clamp(state.emotionMouthForm, -1, 1));
    } catch (error) {
      if (typeof window.debugLog === 'function') window.debugLog(`Live2D parameter update skipped for one model: ${error?.message || error}`, 'warn');
    }
  });

  if (Math.abs(state.targetEyeX - state.eyeX) > 0.01 || Math.abs(state.targetEyeY - state.eyeY) > 0.01 || state.isHovering) {
    state.idleTimer = 0;
  }
}

// A safe parameter-driven fallback for emotion handling. If the project already
// provides its own applyLive2DEmotion(), that implementation remains untouched.
if (typeof window.applyLive2DEmotion !== 'function') {
  window.applyLive2DEmotion = function applyLive2DEmotion(emotion) {
    const state = currentAnimationState;
    const key = String(emotion || 'neutral').toLowerCase();
    const presets = {
      happy:       { smile: 0.58, cheek: 0.28, brow: 0.08, browAngle: 0.02, eyes: 1.0, mouth: 0.28, head: 2, body: 2 },
      playful:     { smile: 0.40, cheek: 0.16, brow: 0.12, browAngle: -0.10, eyes: 1.0, mouth: 0.18, head: 4, body: 1.5 },
      affectionate:{ smile: 0.48, cheek: 0.40, brow: 0.04, browAngle: 0.02, eyes: 0.92, mouth: 0.20, head: -2, body: 0.5 },
      curious:     { smile: 0.05, cheek: 0.02, brow: 0.20, browAngle: 0.12, eyes: 1.0, mouth: 0.08, head: 5, body: 0 },
      comforting:  { smile: 0.18, cheek: 0.10, brow: -0.08, browAngle: 0.06, eyes: 0.92, mouth: 0.10, head: -2, body: -0.5 },
      sad:         { smile: 0, cheek: 0, brow: -0.22, browAngle: 0.18, eyes: 0.78, mouth: -0.35, head: -5, body: -1.5 },
      surprised:   { smile: 0.02, cheek: 0, brow: 0.24, browAngle: 0.20, eyes: 1.0, mouth: 0.10, head: 5, body: 1 },
      excited:     { smile: 0.65, cheek: 0.32, brow: 0.16, browAngle: 0.04, eyes: 1.0, mouth: 0.30, head: 3, body: 5 },
      neutral:     { smile: 0, cheek: 0, brow: 0, browAngle: 0, eyes: 1.0, mouth: 0, head: 0, body: 0 }
    };
    const preset = presets[key] || presets.neutral;
    state.currentEmotion = key in presets ? key : 'neutral';
    state.targetEmotionEyeSmile = preset.smile;
    state.targetEmotionCheek = preset.cheek;
    state.targetEmotionBrowOffset = preset.brow;
    state.targetEmotionBrowAngle = preset.browAngle;
    state.targetEmotionEyeOpenMultiplier = preset.eyes;
    state.targetEmotionMouthForm = preset.mouth;
    state.targetHeadAngle = preset.head;
    state.targetBodyAngle = preset.body;
    if (expressionResetTimer) clearTimeout(expressionResetTimer);
    expressionResetTimer = setTimeout(() => {
      state.targetHeadAngle = 0;
      state.targetBodyAngle = 0;
      expressionResetTimer = null;
    }, key === 'surprised' ? 1200 : 1800);
  };
}

window.currentAnimationState = currentAnimationState;
window.initializeMouseTracking = initializeMouseTracking;
window.startAnimationLoop = startAnimationLoop;
window.stopAnimationLoop = stopAnimationLoop;
window.updateEyeMovement = updateEyeMovement;