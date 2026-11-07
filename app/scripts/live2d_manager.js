// Load Live2D model
async function loadModel(modelUrl) {
  debugLog(`Loading Live2D model from: ${modelUrl}`, 'info');
  try {
    // Cancel previous animation loop if running
    if (!window.allowMultipleModels && window.stopAnimationLoop) {
      window.stopAnimationLoop();
    }

    // Remove and destroy the previous model if it exists
    if (!window.allowMultipleModels && currentModel) {
      app.stage.removeChild(currentModel);
      currentModel.destroy({ children: true, texture: true, baseTexture: true });
      currentModel = null;
      window.currentModel = null;
      currentModelName = "";
      debugLog('Previous model removed and destroyed.', 'info');
    }

    let loadUrl = modelUrl;
    if (modelUrl && modelUrl.includes('086/c_7011.model3.json')) {
      loadUrl = '/api/model/shuna';
      debugLog('Redirecting Shuna model to clean /api/model/shuna endpoint', 'info');
    }

    const model = await PIXI.live2d.Live2DModel.from(loadUrl);
    debugLog('New model loaded successfully', 'info');

    currentModel = model;
    // TTS and animation code consume the explicit window reference. Keep it synced even if
    // the project declares `currentModel` as a top-level `let` (not a window property).
    window.currentModel = model;
    // Find the model configuration to get the name
    const modelConfig = availableModels.find(m => m.url === modelUrl || m.url === loadUrl);
    if (modelConfig) {
        currentModelName = modelConfig.name;
        debugLog(`Current model name set to: ${currentModelName}`, 'info');
        if (typeof AppState !== 'undefined' && modelConfig.persona) {
            AppState.corePersonaPrompt = modelConfig.persona;
        }
    } else {
        currentModelName = "Character";
        debugLog(`Could not find model name for URL: ${modelUrl}, using fallback "Character"`, 'warn');
    }

    if (typeof trackEvent === 'function') {
        trackEvent('model_changed', { model_name: currentModelName });
    }

    model.__modelUrl = modelUrl;

    // Model Setup
    const isFbm = typeof isFBMModel === 'function' && isFBMModel(modelUrl);
    window.currentModelUrl = modelUrl;

    if (isFbm) {
      // Full screen locked mode for FBMs - perfectly fitted without cutting off heads
      const baseScale = Math.min(window.innerWidth / 1600, window.innerHeight / 1600);
      model.scale.set(baseScale * 1.15);
      model.position.set(window.innerWidth / 2, window.innerHeight / 2);
      model.anchor.set(0.5, 0.5);
      model.interactive = false;
      model.buttonMode = false;
      debugLog('FBM model loaded in locked full-screen mode', 'info');
    } else {
      model.scale.set(0.4);
      model.position.set(window.innerWidth / 2, window.innerHeight / 2);
      model.anchor.set(0.5, 0.25);

      model.interactive = true;
      model.buttonMode = true;

      // Restore saved position if available
      try {
        const saved = (typeof loadModelSavedPosition==='function') ? loadModelSavedPosition(modelUrl) : null;
        if (saved && typeof saved.x==='number' && typeof saved.y==='number') {
          model.position.set(saved.x, saved.y);
          debugLog(`Restored model position to (${saved.x.toFixed(0)}, ${saved.y.toFixed(0)})`, 'info');
        }
      } catch(e){ debugError('Failed to restore model position', e, { url: modelUrl }); }

      // Restore saved zoom if available
      try {
        const savedScale = (typeof loadModelSavedZoom==='function') ? loadModelSavedZoom(modelUrl) : null;
        if (savedScale && typeof savedScale === 'number') {
          model.scale.set(savedScale);
          debugLog(`Restored model zoom to scale ${savedScale.toFixed(2)}`, 'info');
        }
      } catch(e){ debugError('Failed to restore model zoom', e, { url: modelUrl }); }
    }

    app.stage.addChild(model);

    // Create particle system
    if (window.createParticleSystem) {
      window.createParticleSystem();
    }

    // Setup all interactions using extracted handlers
    if (window.setupModelInteractions) {
      window.setupModelInteractions(model);
    }
    if (window.setupDragging) {
      window.setupDragging(model);
    }
    if (window.setupZooming) {
      window.setupZooming(model);
    }

    // start animation loop if not already running
    if (window.startAnimationLoop) {
      window.startAnimationLoop();
      window.__animLoopStarted = true;
    }

    if (window.setupWindowResize) {
      window.setupWindowResize();
    }

  } catch (err) {
    debugError('Failed to load model', err, { url: modelUrl });
    currentModelName = "";
    if (!currentModel || currentModel.destroyed) window.currentModel = null;
    throw err;
  }
}

// Remove all Live2D models from the stage
function clearAllModels() {
  try {
    const models = app.stage.children.filter(c => c && c.__modelUrl);
    models.forEach(m => { app.stage.removeChild(m); try { m.destroy({ children:true, texture:true, baseTexture:true }); } catch(e) { debugLog(`Model destroy warning for ${m.__modelUrl}: ${e.message}`, 'warn', true); } });
    if (typeof destroyParticleSystem === 'function') destroyParticleSystem();
    if (typeof stopAnimationLoop === 'function') stopAnimationLoop();
    window.__animLoopStarted = false;
    currentModel = null; window.currentModel = null; currentModelName = ""; currentModelUrl = null;
    debugLog(`Cleared ${models.length} model(s) from stage.`, 'info');
  } catch (e) {
    debugError('clearAllModels failed', e);
  }
}
window.clearAllModels = clearAllModels;

window.changeModel = async function(modelUrl, modelName) {
  if (!modelUrl && !modelName) return;
  const MODEL_ALIASES = { haru: 'Elara', hiyori: 'Vyra', mao: 'Kuro', senko: 'Nyx' };
  let matched = null;
  if (modelUrl) {
    matched = (window.availableModels || []).find(m => m.url === modelUrl);
  }
  if (!matched && modelName) {
    const clean = modelName.trim().toLowerCase();
    const aliased = (MODEL_ALIASES[clean] || clean).toLowerCase();
    matched = (window.availableModels || []).find(
      m => m.name.toLowerCase() === aliased || m.name.toLowerCase() === clean
    );
  }

  const targetUrl = matched ? matched.url : modelUrl;
  const targetName = matched ? matched.name : (modelName || 'Companion');

  if (targetUrl) {
    try {
      if (typeof AppStorage !== 'undefined') {
        AppStorage.setString('selectedModelUrl', targetUrl);
      } else {
        localStorage.setItem('selectedModelUrl', targetUrl);
      }
    } catch (_) {}
    window.currentModelName = targetName;
    if (matched && matched.persona) {
      if (typeof AppState !== 'undefined') AppState.corePersonaPrompt = matched.persona;
      window.corePersonaPrompt = matched.persona;
    }
    if (typeof loadModel === 'function') {
      await loadModel(targetUrl);
    }
  }
};