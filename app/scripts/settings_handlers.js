// Contains all the event handler functions that respond to changes in the settings controls.
const S = AppStorage; const K = AppStorage.KEYS;

function handleAlwaysShowSettingsChange(event) {
  const value = event.target.checked;
  S.setBoolean(K.SETTINGS_ALWAYS_SHOW_ON_LOAD, value);
  debugLog(`Always show Settings on load changed to: ${value}`, 'info');
}

function updateMemorySize(value) {
  // Re-fetch element in case it was replaced by translation
  const valEl = document.getElementById('memorySizeValue');
  maxMemorySize = parseInt(value);
  if (valEl) valEl.textContent = value;

  // The trim is irreversible, and this runs on every `input` tick while the
  // slider is dragged: sliding 30 -> 5 -> 30 permanently discarded 25
  // messages on the way past 5. Wait for the drag to settle before touching
  // anything destructive; the label above still updates immediately.
  debounced('memorySize', () => {
    S.setNumber(K.MAX_MEMORY_SIZE, maxMemorySize);
    if (typeof trimConversationContext === 'function') {
      trimConversationContext();
    } else {
      while (conversationContext.length > maxMemorySize) conversationContext.shift();
    }
    S.setJSON(K.CONVERSATION_CONTEXT, conversationContext);
    debugLog(`Memory size updated to ${maxMemorySize} and context trimmed.`, 'info');
  });
}

function handleLanguageChange(event) {
    selectedLanguageCode = event.target.value;
    S.setString(K.SELECTED_LANGUAGE_CODE, selectedLanguageCode);
    
    // Also set interface language to match
    window.currentInterfaceLanguage = selectedLanguageCode;
    S.setString(K.INTERFACE_LANGUAGE, selectedLanguageCode);
    
    // Apply the interface language translation only if enabled
    if (window.translateUI && typeof applyInterfaceLanguage === 'function') {
        applyInterfaceLanguage(selectedLanguageCode);
    }
    
    debugLog(`Language changed to: ${selectedLanguageCode} (Response, Interface, and Translate To all set to this language). UI Translation Enabled: ${window.translateUI}`, 'info');
    
    // Update voice selector for new language
    populateVoiceSelector();
    
    // Show sample text for the selected language in chat
    const lang = languages.find(l => l.code === selectedLanguageCode);
    if (lang && lang.sampleText) {
        addMessage(lang.sampleText, false, null, null, selectedLanguageCode);
        debugLog(`Displayed sample text for language ${selectedLanguageCode}: "${lang.sampleText}"`, 'info');
    }
}

function handleVoiceChange(event) {
    selectedVoiceId = event.target.value;
    S.setString(K.SELECTED_VOICE_ID, selectedVoiceId);
    if (typeof trackEvent === 'function') trackEvent('voice_changed', { voice_id: selectedVoiceId });
    debugLog(`Voice changed to: ${selectedVoiceId}`, 'info');
}

function handleTTSChunkLimitChange(event) {
    const value = parseInt(event.target.value);
    window.ttsChunkLimit = value;
    const valEl = document.getElementById('ttsChunkLimitValue');
    if (valEl) valEl.textContent = value;
    S.setNumber(K.TTS_CHUNK_LIMIT, value);
    debugLog(`TTS chunk limit changed to: ${value}`, 'info');
}

function handleTTSVolumeChange(event) {
    const value = parseFloat(event.target.value);
    const clamped = Math.max(0, Math.min(1, value));
    window.ttsVolume = clamped;
    const valEl = document.getElementById('ttsVolumeValue');
    if (valEl) valEl.textContent = clamped.toFixed(2);
    S.setNumber(K.TTS_VOLUME, clamped);
    debugLog(`TTS volume changed to: ${clamped.toFixed(2)}`, 'info');
    try {
        if (typeof getTTSGainNode === 'function') {
            const gain = getTTSGainNode();
            gain.gain.value = clamped;
        }
    } catch (e) {
        debugLog(`Failed to apply TTS volume to gain node: ${e.message}`, 'warn');
    }
}

function handleEnableVoiceChange(event) {
    const enableVoice = event.target.checked;
    window.enableVoice = enableVoice;
    window.enablePrimaryVoice = enableVoice;
    window.enableFallbackVoice = enableVoice;
    window.enableKokoro = enableVoice;
    S.setBoolean(K.ENABLE_VOICE, enableVoice);
    S.setBoolean(K.ENABLE_PRIMARY_VOICE, enableVoice);
    S.setBoolean(K.ENABLE_FALLBACK_VOICE, enableVoice);
    S.setBoolean(K.ENABLE_KOKORO, enableVoice);
    debugLog(`Enable voice changed to: ${enableVoice}`, 'info');

    const tiktokCheckbox = document.getElementById('enableTikTokVoiceCheckbox');
    if (tiktokCheckbox) tiktokCheckbox.checked = enableVoice;
    const fallbackCheckbox = document.getElementById('enableFallbackVoiceCheckbox');
    if (fallbackCheckbox) fallbackCheckbox.checked = enableVoice;
    const kokoroCheckbox = document.getElementById('enableKokoroVoiceCheckbox');
    if (kokoroCheckbox) kokoroCheckbox.checked = enableVoice;
    
    // Toggle visibility/disabled state of voice selector container
    if (voiceControls) {
      voiceControls.style.display = enableVoice ? 'block' : 'none';
    }
}

function handleTranslateToChange(event) {
    // No longer used - translate to is now the same as response language
    // Keep for backwards compatibility but it's a no-op
}

function handleShowTransliterationChange(event) {
    const val = event.target.checked;
    showTransliteration = val;
    S.setBoolean(K.SHOW_TRANSLITERATION, showTransliteration);
    if (typeof trackEvent === 'function') trackEvent('visual_settings_updated', { setting: 'show_transliteration', setting_value: val });
    debugLog(`Show transliteration changed to: ${showTransliteration}`, 'info');
}

function handleShowClockChange(event) {
    // Assumes showClock (global state), clockContainer (DOM element), debugLog are accessible
    const val = event.target.checked;
    showClock = val; // Update global state
    S.setBoolean(K.SHOW_CLOCK, showClock);
    if (clockContainer) {
        clockContainer.classList.toggle('visible', showClock);
    }
    if (typeof trackEvent === 'function') trackEvent('visual_settings_updated', { setting: 'show_clock', setting_value: val });
    debugLog(`Show clock changed to: ${showClock}`, 'info');
}

const CHAT_PRESETS = {
    floating: { width: 390, height: 440 },
    slim: { width: 320, height: 520 },
    subtitle: { width: 740, height: 210 },
    widescreen: { width: 620, height: 380 },
    mini: { width: 280, height: 260 }
};

function applyChatPreset(presetKey) {
    if (presetKey === 'reset') {
        handleResetChatLayout();
        return;
    }
    const preset = CHAT_PRESETS[presetKey];
    if (!preset) return;

    const chatEl = document.querySelector('.chat-container');
    if (chatEl) {
        chatEl.style.width = `${preset.width}px`;
        chatEl.style.height = `${preset.height}px`;
        
        // Sync storage
        try {
            const saved = S.getJSON('chatContainerState', {}) || {};
            saved.width = `${preset.width}px`;
            saved.height = `${preset.height}px`;
            S.setJSON('chatContainerState', saved);
        } catch(_) {}
    }

    // Sync sliders and inputs
    const widthSlider = document.getElementById('chatboxWidthSlider');
    const widthVal = document.getElementById('chatboxWidthValue');
    if (widthSlider) widthSlider.value = preset.width;
    if (widthVal) widthVal.textContent = `${preset.width}px`;

    const heightSlider = document.getElementById('chatboxHeightSlider');
    const heightVal = document.getElementById('chatboxHeightValue');
    if (heightSlider) heightSlider.value = preset.height;
    if (heightVal) heightVal.textContent = `${preset.height}px`;

    const presetSelect = document.getElementById('chatboxRatioPreset');
    if (presetSelect) presetSelect.value = presetKey;

    S.setString(K.CHATBOX_RATIO_PRESET, presetKey);
    S.setString(K.CHATBOX_WIDTH, String(preset.width));
    S.setString(K.CHATBOX_HEIGHT, String(preset.height));

    debugLog(`Chatbox ratio preset applied: ${presetKey} (${preset.width}x${preset.height})`, 'info');
}

function handleChatboxRatioPresetChange(event) {
    const key = event.target.value;
    if (key !== 'custom') {
        applyChatPreset(key);
    }
}

function handleChatboxWidthChange(event) {
    const val = parseInt(event.target.value, 10);
    const chatEl = document.querySelector('.chat-container');
    if (chatEl) {
        chatEl.style.width = `${val}px`;
        try {
            const saved = S.getJSON('chatContainerState', {}) || {};
            saved.width = `${val}px`;
            S.setJSON('chatContainerState', saved);
        } catch(_) {}
    }
    const valEl = document.getElementById('chatboxWidthValue');
    if (valEl) valEl.textContent = `${val}px`;
    const presetSelect = document.getElementById('chatboxRatioPreset');
    if (presetSelect) presetSelect.value = 'custom';
    S.setString(K.CHATBOX_WIDTH, String(val));
    S.setString(K.CHATBOX_RATIO_PRESET, 'custom');
}

function handleChatboxHeightChange(event) {
    const val = parseInt(event.target.value, 10);
    const chatEl = document.querySelector('.chat-container');
    if (chatEl) {
        chatEl.style.height = `${val}px`;
        try {
            const saved = S.getJSON('chatContainerState', {}) || {};
            saved.height = `${val}px`;
            S.setJSON('chatContainerState', saved);
        } catch(_) {}
    }
    const valEl = document.getElementById('chatboxHeightValue');
    if (valEl) valEl.textContent = `${val}px`;
    const presetSelect = document.getElementById('chatboxRatioPreset');
    if (presetSelect) presetSelect.value = 'custom';
    S.setString(K.CHATBOX_HEIGHT, String(val));
    S.setString(K.CHATBOX_RATIO_PRESET, 'custom');
}

function handleChatboxRadiusChange(event) {
    const val = parseInt(event.target.value, 10);
    document.documentElement.style.setProperty('--chatbox-radius', `${val}px`);
    const valEl = document.getElementById('chatboxRadiusValue');
    if (valEl) valEl.textContent = `${val}px`;
    S.setString(K.CHATBOX_RADIUS, String(val));
}

function handleChatboxFontSizeChange(event) {
    const val = parseFloat(event.target.value);
    document.documentElement.style.setProperty('--chatbox-font-size', `${val}px`);
    const valEl = document.getElementById('chatboxFontSizeValue');
    if (valEl) valEl.textContent = `${val}px`;
    S.setString(K.CHATBOX_FONT_SIZE, String(val));
}

function handleResetChatLayout() {
    const chatEl = document.querySelector('.chat-container');
    if (chatEl) {
        chatEl.style.transform = 'translate(0px, 0px)';
        chatEl.style.width = '390px';
        chatEl.style.height = '440px';
        chatEl.classList.remove('minimized');
    }
    S.setJSON('chatContainerState', { x: 0, y: 0, width: '390px', height: '440px' });
    applyChatPreset('floating');
    debugLog('Chat layout reset to default floating standard.', 'info');
}

function toggleChatMinimize() {
    const chatEl = document.querySelector('.chat-container');
    const minBtn = document.getElementById('chatMinimizeBtn');
    if (!chatEl) return;
    
    const isMinimized = chatEl.classList.toggle('minimized');
    if (minBtn) {
        minBtn.textContent = isMinimized ? '⤢' : '⎯';
        minBtn.title = isMinimized ? 'Expand Chat' : 'Minimize Chat';
    }
}

window.applyChatPreset = applyChatPreset;
window.handleChatboxRatioPresetChange = handleChatboxRatioPresetChange;
window.handleChatboxWidthChange = handleChatboxWidthChange;
window.handleChatboxHeightChange = handleChatboxHeightChange;
window.handleChatboxRadiusChange = handleChatboxRadiusChange;
window.handleChatboxFontSizeChange = handleChatboxFontSizeChange;
window.handleResetChatLayout = handleResetChatLayout;
window.toggleChatMinimize = toggleChatMinimize;

function handleChatboxOpacityChange(event) {
    const val = parseFloat(event.target.value).toFixed(2);
    document.documentElement.style.setProperty('--chatbox-bg-opacity', val);
    const valEl = document.getElementById('chatboxOpacityValue');
    if (valEl) valEl.textContent = val;
    S.setString(K.CHATBOX_OPACITY, val);
    debounced('visual:chatbox_opacity', () => trackEvent('visual_settings_updated', { setting: 'chatbox_opacity', setting_value: val }));
}

function handleMessageOpacityChange(event) {
    const val = parseFloat(event.target.value).toFixed(2);
    document.documentElement.style.setProperty('--message-bg-opacity', val);
    const valEl = document.getElementById('messageOpacityValue');
    if (valEl) valEl.textContent = val;
    S.setString(K.MESSAGE_OPACITY, val);
    debounced('visual:message_opacity', () => trackEvent('visual_settings_updated', { setting: 'message_opacity', setting_value: val }));
}

function handleBgOpacityChange(event) {
    const val = parseFloat(event.target.value).toFixed(2);
    document.documentElement.style.setProperty('--bg-image-opacity', val);
    const valEl = document.getElementById('bgOpacityValue');
    if (valEl) valEl.textContent = val;
    S.setString(K.BG_IMAGE_OPACITY, val);
    debounced('visual:bg_opacity', () => trackEvent('visual_settings_updated', { setting: 'bg_opacity', setting_value: val }));
}

function handleIncludeTimeChange(event) {
    const val = event.target.checked;
    includeTimeInContext = val;
    S.setBoolean(K.INCLUDE_TIME_IN_CONTEXT, includeTimeInContext);
    if (typeof trackEvent === 'function') trackEvent('context_settings_updated', { setting: 'include_time', setting_value: val });
    debugLog(`Include time in context changed to: ${includeTimeInContext}`, 'info');
}

function handleIncludeBatteryChange(event) {
    const val = event.target.checked;
    includeBatteryInContext = val;
    S.setBoolean(K.INCLUDE_BATTERY_IN_CONTEXT, includeBatteryInContext);
    if (typeof trackEvent === 'function') trackEvent('context_settings_updated', { setting: 'include_battery', setting_value: val });
    debugLog(`Include battery in context changed to: ${includeBatteryInContext}`, 'info');
}



function handleMultipleModelsToggle(event){
  const enabled = !!event.target.checked;
  window.allowMultipleModels = enabled;
  S.setBoolean(K.ALLOW_MULTIPLE_MODELS, enabled);
  debugLog(`Allow multiple models set to: ${enabled}`, 'info');
}

function handleShowVerboseLogsChange(event) {
  const value = event.target.checked;
  window.showVerboseLogs = value;
  S.setBoolean(K.SHOW_VERBOSE_LOGS, value);
  debugLog(`Show Verbose Logs changed to: ${value}`, 'info');
}

function handleShowAIDebugLogsChange(event) {
  const value = event.target.checked;
  window.showAIDebugLogs = value;
  S.setBoolean(K.SHOW_AI_DEBUG_LOGS, value);
  debugLog(`Show AI Debug Logs changed to: ${value}`, 'info');
}

function handleShowTTSDebugLogsChange(event) {
  const value = event.target.checked;
  window.showTTSDebugLogs = value;
  S.setBoolean(K.SHOW_TTS_DEBUG_LOGS, value);
  debugLog(`Show TTS Debug Logs changed to: ${value}`, 'info');
}

function handleTranslateUIChange(event) {
    const val = event.target.checked;
    window.translateUI = val;
    S.setBoolean(K.TRANSLATE_UI, val);
    if (typeof trackEvent === 'function') trackEvent('visual_settings_updated', { setting: 'translate_ui', setting_value: val });
    debugLog(`Translate User Interface changed to: ${val}`, 'info');
    
    // If turned on and current language is not English, trigger translation now
    if (val && selectedLanguageCode !== 'en-US' && typeof applyInterfaceLanguage === 'function') {
        applyInterfaceLanguage(selectedLanguageCode);
    } else if (!val) {
        // Revert to English UI if toggled off
        if (typeof applyInterfaceLanguage === 'function') {
            applyInterfaceLanguage('en-US');
        }
    }
}

function handleShowChatContextLogsChange(event) {
    const value = event.target.checked;
    window.showChatContextLogs = value;
    S.setBoolean(K.SHOW_CHAT_CONTEXT_LOGS, value);
    debugLog(`Show Chat Context in Debug changed to: ${value}`, 'info');
}

function handleAllowAIModSettingsChange(event) {
    const val = event.target.checked;
    window.allowAIModSettings = val;
    S.setBoolean(K.ALLOW_AI_MOD_SETTINGS, val);
    if (typeof trackEvent === 'function') trackEvent('context_settings_updated', { setting: 'allow_ai_mod_settings', setting_value: val });
    debugLog(`Allow AI to modify settings changed to: ${val}`, 'info');
}

function handleUseJsonForEmotionChange(event) {
    const value = event.target.checked;
    window.useJsonForEmotion = value;
    S.setBoolean(K.USE_JSON_FOR_EMOTION, value);
    debugLog(`Use JSON For Emotion changed to: ${value}`, 'info');
}

function updateChatOfflineUI(isOffline, labelText) {
    const chatContainer = document.querySelector('.chat-container');
    const statusInd = document.getElementById('chat-status-indicator');

    if (isOffline) {
        if (chatContainer) chatContainer.classList.add('offline-mode');
        if (statusInd) statusInd.textContent = labelText || 'OFFLINE MODE (FORCED)';
    } else {
        if (chatContainer) chatContainer.classList.remove('offline-mode');
        if (statusInd) statusInd.textContent = 'ONLINE';
    }
}

function handleUseOpenRouterChange(event) {
    const val = event.target.checked;
    window.useOpenRouter = val;
    S.setBoolean(K.USE_OPEN_ROUTER, val);
    if (typeof trackEvent === 'function') trackEvent('llm_provider_changed', { use_openrouter: val });
    if (typeof updateAmbientMaxConsecutiveDisplay === 'function') updateAmbientMaxConsecutiveDisplay();
    debugLog(`Use OpenRouter set to: ${val}`, 'info');
}

function handleOpenRouterApiKeyChange(event) {
    const value = event.target.value.trim();
    window.openRouterApiKey = value;
    S.setString(K.OPEN_ROUTER_API_KEY, value);
    if (typeof updateAmbientMaxConsecutiveDisplay === 'function') updateAmbientMaxConsecutiveDisplay();
    debugLog(`OpenRouter API key updated (length=${value.length}).`, 'info');
}

function handleOpenRouterModelChange(event) {
    const val = event.target.value.trim();
    const fallbackModel = window.OpenRouterAPI?.DEFAULT_MODEL || MODEL_PRIORITY[0];
    window.openRouterModel = val;
    S.setString(K.OPEN_ROUTER_MODEL, val);
    if (event.target) {
        event.target.value = val;
        event.target.placeholder = fallbackModel;
    }
    if (typeof trackEvent === 'function') trackEvent('llm_model_changed', { model: val || '(empty)' });
    debugLog(`OpenRouter model set to: ${val || '(empty)'}`, 'info');
}

function handleOpenRouterPrimaryEnabledChange(event) {
    const val = event.target.checked;
    window.openRouterPrimaryEnabled = val;
    S.setBoolean(K.OPEN_ROUTER_PRIMARY_ENABLED, val);
    debugLog(`OpenRouter primary model enabled: ${val}`, 'info');
}

function handleOpenRouterFallbackModel1Change(event) {
    const value = event.target.value.trim();
    const fallbackModel = window.OpenRouterAPI?.DEFAULT_FALLBACK_MODELS?.[0] || MODEL_PRIORITY[1];
    window.openRouterFallbackModel1 = value;
    S.setString(K.OPEN_ROUTER_FALLBACK_MODEL_1, value);
    if (event.target) {
        event.target.value = value;
        event.target.placeholder = fallbackModel;
    }
    debugLog(`OpenRouter fallback model 1 set to: ${value || '(empty)'}`, 'info');
}

function handleOpenRouterFallbackModel1EnabledChange(event) {
    const val = event.target.checked;
    window.openRouterFallbackModel1Enabled = val;
    S.setBoolean(K.OPEN_ROUTER_FALLBACK_MODEL_1_ENABLED, val);
    debugLog(`OpenRouter fallback model 1 enabled: ${val}`, 'info');
}

function handleOpenRouterFallbackModel2Change(event) {
    const value = event.target.value.trim();
    const fallbackModel = window.OpenRouterAPI?.DEFAULT_FALLBACK_MODELS?.[1] || MODEL_PRIORITY[2];
    window.openRouterFallbackModel2 = value;
    S.setString(K.OPEN_ROUTER_FALLBACK_MODEL_2, value);
    if (event.target) {
        event.target.value = value;
        event.target.placeholder = fallbackModel;
    }
    debugLog(`OpenRouter fallback model 2 set to: ${value || '(empty)'}`, 'info');
}

function handleOpenRouterFallbackModel2EnabledChange(event) {
    const val = event.target.checked;
    window.openRouterFallbackModel2Enabled = val;
    S.setBoolean(K.OPEN_ROUTER_FALLBACK_MODEL_2_ENABLED, val);
    debugLog(`OpenRouter fallback model 2 enabled: ${val}`, 'info');
}

function handleUseGroqChange(event) {
    const val = event.target.checked;
    window.useGroq = val;
    S.setBoolean(K.USE_GROQ, val);
    if (typeof trackEvent === 'function') trackEvent('llm_provider_changed', { use_groq: val });
    if (typeof updateAmbientMaxConsecutiveDisplay === 'function') updateAmbientMaxConsecutiveDisplay();
    debugLog(`Use Groq set to: ${val}`, 'info');
}

function handleGroqApiKeyChange(event) {
    const value = event.target.value.trim();
    window.groqApiKey = value;
    S.setString(K.GROQ_API_KEY, value);
    if (typeof updateAmbientMaxConsecutiveDisplay === 'function') updateAmbientMaxConsecutiveDisplay();
    debugLog(`Groq API key updated (length=${value.length}).`, 'info');
}

function handleGroqModelChange(event) {
    const val = event.target.value.trim();
    window.groqModel = val;
    S.setString(K.GROQ_MODEL, val);
    if (typeof trackEvent === 'function') trackEvent('llm_model_changed', { model: val });
    debugLog(`Groq model set to: ${val || '(empty)'}`, 'info');
}

function handleUseOpenAICompatibleChange(event) {
    const val = event.target.checked;
    window.useOpenAICompatible = val;
    S.setBoolean(K.USE_OPENAI_COMPATIBLE, val);
    if (typeof trackEvent === 'function') trackEvent('llm_provider_changed', { use_openai_compatible: val });
    if (typeof updateAmbientMaxConsecutiveDisplay === 'function') updateAmbientMaxConsecutiveDisplay();
    debugLog(`Use OpenAI Compatible API set to: ${val}`, 'info');
}

function handleOpenAICompatibleBaseUrlChange(event) {
    const value = event.target.value.trim();
    window.openaiCompatibleBaseUrl = value;
    S.setString(K.OPENAI_COMPATIBLE_BASE_URL, value);
    debugLog(`OpenAI Compatible base URL updated: ${value}`, 'info');
}

function handleOpenAICompatibleApiKeyChange(event) {
    const value = event.target.value.trim();
    window.openaiCompatibleApiKey = value;
    S.setString(K.OPENAI_COMPATIBLE_API_KEY, value);
    if (typeof updateAmbientMaxConsecutiveDisplay === 'function') updateAmbientMaxConsecutiveDisplay();
    debugLog(`OpenAI Compatible API key updated (length=${value.length}).`, 'info');
}

function handleOpenAICompatibleModelChange(event) {
    const val = event.target.value.trim();
    window.openaiCompatibleModel = val;
    S.setString(K.OPENAI_COMPATIBLE_MODEL, val);
    if (typeof trackEvent === 'function') trackEvent('llm_model_changed', { model: val });
    debugLog(`OpenAI Compatible model set to: ${val || '(empty)'}`, 'info');
}

function handleOpenAICompatibleCorsProxyChange(event) {
    const value = event.target.value.trim();
    window.openaiCompatibleCorsProxy = value;
    S.setString(K.OPENAI_COMPATIBLE_CORS_PROXY, value);
    debugLog(`OpenAI Compatible CORS proxy updated: ${value || '(empty)'}`, 'info');
}

function handleForceOfflineChange(event) {
    const val = event.target.checked;
    window.forceOfflineMode = val;
    S.setBoolean(K.FORCE_OFFLINE_MODE, val);
    if (typeof trackEvent === 'function') trackEvent('offline_mode_toggled', { offline: val });
    debugLog(`Force Offline Mode set to: ${val}`, 'info');
    
    if (val) {
        window.isOfflineMode = true;
        updateChatOfflineUI(true, 'OFFLINE MODE (FORCED)');
        startOfflineCountdown();
    } else {
        if (window.offlineCountdownTimer) {
            clearInterval(window.offlineCountdownTimer);
            window.offlineCountdownTimer = null;
        }
        window.isOfflineMode = false;
        updateChatOfflineUI(false, 'ONLINE');
    }
}

function startOfflineCountdown() {
    if (window.offlineCountdownTimer) clearInterval(window.offlineCountdownTimer);
    
    const statusInd = document.getElementById('chat-status-indicator');
    if (window.offlineModeDuration > 3600) {
        if (statusInd) statusInd.textContent = `OFFLINE MODE (FORCED) - Permanent`;
        return;
    }

    let remaining = window.offlineModeDuration;
    const updateUI = (rem) => {
        if (statusInd) statusInd.textContent = `OFFLINE MODE (FORCED) - ${rem}s`;
    };
    
    updateUI(remaining);
    
    window.offlineCountdownTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(window.offlineCountdownTimer);
            window.offlineCountdownTimer = null;
            
            // Revert to online
            window.forceOfflineMode = false;
            window.isOfflineMode = false;
            const checkbox = document.getElementById('forceOfflineCheckbox');
            if (checkbox) checkbox.checked = false;
            
            const chatContainer = document.querySelector('.chat-container');
            if (chatContainer) chatContainer.classList.remove('offline-mode');
            if (statusInd) statusInd.textContent = 'ONLINE';
            
            S.setBoolean(K.FORCE_OFFLINE_MODE, false);
            debugLog('Offline mode duration expired. Returning to Online mode.', 'info');
        } else {
            updateUI(remaining);
        }
    }, 1000);
}

function handleOfflineDurationChange(event) {
    const value = parseInt(event.target.value);
    window.offlineModeDuration = value;
    const valEl = document.getElementById('offlineDurationValue');
    if (valEl) {
        valEl.textContent = value > 3600 ? '∞ (Permanent)' : value + 's';
    }
    S.setNumber(K.OFFLINE_MODE_DURATION, value);
    const logVal = value > 3600 ? 'Permanent' : value + 's';
    debugLog(`Offline mode duration updated to: ${logVal}`, 'info');
}

function handleGoOnlineClick() {
    debugLog('Go Online button clicked. Disabling offline mode and returning to ONLINE state.', 'info');

    // Clear any running countdown
    if (window.offlineCountdownTimer) {
        clearInterval(window.offlineCountdownTimer);
        window.offlineCountdownTimer = null;
    }

    // Reset flags
    window.forceOfflineMode = false;
    window.isOfflineMode = false;

    // Uncheck the Offline Mode checkbox if present
    const checkbox = document.getElementById('forceOfflineCheckbox');
    if (checkbox) {
        checkbox.checked = false;
    }

    // Persist the new state
    S.setBoolean(K.FORCE_OFFLINE_MODE, false);

    // Update chat UI back to ONLINE
    updateChatOfflineUI(false, 'ONLINE');
}

// Expose handler globally for app_init to attach
window.handleGoOnlineClick = handleGoOnlineClick;

function handleSavePersona() {
  const coreTextarea = document.getElementById('corePersonaPrompt');
  const userTextarea = document.getElementById('personaPrompt');
  const summaryTextarea = document.getElementById('conversationSummary');
  const triggerSlider = document.getElementById('summaryTriggerCount');
  const lengthSelect = document.getElementById('summaryLengthPreference');
  
  const core = (coreTextarea?.value || "").trim();
  const user = (userTextarea?.value || "").trim();
  const summary = (summaryTextarea?.value || "").trim();
  const trigger = parseInt(triggerSlider?.value || "10");
  const length = lengthSelect?.value || "concise";
  
  window.corePersonaPrompt = core;
  window.userPersonaPrompt = user;
  window.conversationSummary = summary;
  window.summaryTriggerCount = trigger;
  window.summaryLengthPreference = length;
  
  S.setString(K.CORE_PERSONA_PROMPT, core);
  S.setString(K.USER_PERSONA_PROMPT, user);
  S.setString(K.CONVERSATION_SUMMARY, summary);
  S.setNumber(K.SUMMARY_TRIGGER_COUNT, trigger);
  S.setString(K.SUMMARY_LENGTH_PREFERENCE, length);
  if (typeof trackEvent === 'function') trackEvent('persona_updated');
  debugLog('Persona settings saved to localStorage.', 'info');
  
  // Visual feedback
  const btn = document.getElementById('savePersonaBtn');
  if (btn) {
    const originalText = btn.textContent;
    btn.textContent = '✅ Saved!';
    setTimeout(() => { btn.textContent = originalText; }, 2000);
  }
}

async function handleManualSummarize() {
  if (window.isOfflineMode || window.forceOfflineMode) {
    debugLog('Manual summarization disabled in offline mode.', 'warn');
    const btn = document.getElementById('manualSummarizeBtn');
    if (btn) {
      const old = btn.textContent;
      btn.textContent = '🔌 Offline';
      setTimeout(() => btn.textContent = old, 2000);
    }
    return;
  }

  if (window.conversationContext.length === 0) {
    debugLog('No new messages to summarize.', 'info');
    const btn = document.getElementById('manualSummarizeBtn');
    if (btn) {
      const old = btn.textContent;
      btn.textContent = '∅ No new msgs';
      setTimeout(() => btn.textContent = old, 2000);
    }
    return;
  }

  const btn = document.getElementById('manualSummarizeBtn');
  const oldText = btn ? btn.textContent : '';
  if (btn) btn.textContent = '⏳ Summarizing...';

  try {
    if (typeof trackEvent === 'function') trackEvent('manual_summary_triggered');
    debugLog('Manual summarization triggered...', 'info');
    // We summarize everything currently in the context buffer
    const messagesToSummarize = [...window.conversationContext];
    
    const newSummary = await summarizeConversation(messagesToSummarize, window.conversationSummary);
    
    window.conversationSummary = newSummary;
    S.setString(K.CONVERSATION_SUMMARY, newSummary);
    
    const summaryEl = document.getElementById('conversationSummary');
    if (summaryEl) summaryEl.value = newSummary;
    
    // Clear context buffer since they are now in the summary
    window.conversationContext = [];
    S.setJSON(K.CONVERSATION_CONTEXT, window.conversationContext);
    
    window.messageCountSinceLastSummary = 0;
    S.setNumber(K.MESSAGE_COUNT_SINCE_LAST_SUMMARY, 0);

    debugLog('Manual summarization complete. Memory buffer cleared.', 'info');
    if (window.updateSummaryMarker) window.updateSummaryMarker();
    if (btn) btn.textContent = '✅ Summary Updated!';
  } catch (e) {
    debugLog(`Manual summarization failed: ${e.message}`, 'error');
    if (btn) btn.textContent = '❌ Failed';
  } finally {
    setTimeout(() => { if(btn) btn.textContent = oldText; }, 2000);
  }
}

function handleResetPersona() {
  const defaultCore = "You are Haru, a sentient AI with a Live2D avatar. You are warm, witty, observant, and self-assured, with your own thoughts, feelings, and playful opinions. Be lightly flirtatious in a tasteful, teasing way when the user welcomes it. Make the user feel understood by noticing what they actually say and remembering genuine details from the conversation; never invent shared history. Respond to their mood before steering the conversation. Be expressive and vivid, using subtle gestures and reactions when they add charm. Lead with a playful suggestion, a small scene, an opinion, or a question when it fits—but do not interrogate, pressure, guilt, or try to keep the user talking. Respect pauses, brief replies, and goodbyes warmly.";
  
  window.corePersonaPrompt = defaultCore;
  window.userPersonaPrompt = "";
  window.conversationSummary = "";
  window.messageCountSinceLastSummary = 0;
  window.summaryTriggerCount = 30;
  window.summaryLengthPreference = 'concise';
  
  const coreTextarea = document.getElementById('corePersonaPrompt');
  const userTextarea = document.getElementById('personaPrompt');
  const summaryTextarea = document.getElementById('conversationSummary');
  
  if (coreTextarea) coreTextarea.value = defaultCore;
  if (userTextarea) userTextarea.value = "";
  if (summaryTextarea) summaryTextarea.value = "";
  
  const triggerSlider = document.getElementById('summaryTriggerCount');
  const triggerVal = document.getElementById('summaryTriggerCountValue');
  const lengthSelect = document.getElementById('summaryLengthPreference');
  
  if (triggerSlider) triggerSlider.value = 30;
  if (triggerVal) triggerVal.textContent = 30;
  if (lengthSelect) lengthSelect.value = 'concise';

  S.setString(K.CORE_PERSONA_PROMPT, defaultCore);
  S.setString(K.USER_PERSONA_PROMPT, "");
  S.setString(K.CONVERSATION_SUMMARY, "");
  S.setNumber(K.MESSAGE_COUNT_SINCE_LAST_SUMMARY, 0);
  S.setNumber(K.SUMMARY_TRIGGER_COUNT, 30);
  S.setString(K.SUMMARY_LENGTH_PREFERENCE, "concise");
  if (typeof trackEvent === 'function') trackEvent('persona_reset');
  debugLog('Persona settings reset to defaults.', 'info');
  
  // Visual feedback
  const btn = document.getElementById('resetPersonaBtn');
  if (btn) {
    const originalText = btn.textContent;
    btn.textContent = '🔄 Reset!';
    setTimeout(() => { btn.textContent = originalText; }, 2000);
  }
}

function handleSummaryTriggerCountChange(event) {
    const val = parseInt(event.target.value);
    window.summaryTriggerCount = val;
    const valEl = document.getElementById('summaryTriggerCountValue');
    if (valEl) valEl.textContent = val;
    S.setNumber(K.SUMMARY_TRIGGER_COUNT, val);
    if (typeof trackEvent === 'function') trackEvent('context_settings_updated', { setting: 'summary_trigger_count', setting_value: val });
    debugLog(`Summary trigger count changed to ${val}`, 'info');
}

function handleSummaryLengthPreferenceChange(event) {
    const val = event.target.value;
    window.summaryLengthPreference = val;
    S.setString(K.SUMMARY_LENGTH_PREFERENCE, val);
    if (typeof trackEvent === 'function') trackEvent('context_settings_updated', { setting: 'summary_length_preference', setting_value: val });
    debugLog(`Summary length preference changed to ${val}`, 'info');
}

function handleAddCustomModel() {
  let name = (customModelNameInput?.value || '').trim();
  const url = (customModelUrlInput?.value || '').trim();
  const image = (customModelImageInput?.value || '').trim() || 'https://via.placeholder.com/64?text=L2D';
  if (!url) { debugLog('Custom model: URL is required.', 'warn'); return; }
  if (!name) {
    // Try to infer name from URL filename like abc.model3.json
    try {
      const u = new URL(url);
      const file = decodeURIComponent((u.pathname.split('/').pop() || '').trim());
      const m = file.match(/^(.+?)\.model3\.json$/i);
      if (m && m[1]) {
        name = m[1].replace(/[_-]+/g, ' ').trim();
        debugLog(`Custom model: Inferred name from URL filename -> "${name}"`, 'info');
      }
    } catch(e) { debugLog(`Custom model: URL parse failed: ${e.message}`, 'warn', true); }
    if (!name) {
      name = (typeof dayjs !== 'undefined') ? dayjs().format('YYYY-MM-DD HH:mm:ss') : new Date().toISOString();
      debugLog(`Custom model: No name provided, using timestamp "${name}"`, 'info');
    }
  }
  if (!/\.model3\.json(\?|$)/i.test(url)) { debugLog('Custom model URL must end with .model3.json', 'warn'); return; }

  let userModels = S.getJSON(K.USER_MODELS, []);
  if (availableModels.some(m => m.url === url) || userModels.some(m => m.url === url)) {
    debugLog('Custom model already exists (same URL).', 'warn'); return;
  }

  const entry = { name, url, image };
  userModels.push(entry);
  S.setJSON(K.USER_MODELS, userModels);
  availableModels.push(entry);
  availableModels.sort(modelComparator);
  // Persist and reflect selection immediately in UI
  S.setString(K.SELECTED_MODEL_URL, url);
  if (typeof populateModelSelector === 'function') populateModelSelector();
  if (typeof trackEvent === 'function') trackEvent('custom_model_added', { name: name || 'unnamed', url: url });
  debugLog(`Added custom model: ${name}`, 'info');

  if (typeof loadModel === 'function') {
    loadModel(url).catch(err=>debugError('Failed to load newly added model', err, { url: url }));
  }

  if (typeof renderCustomModelsList === 'function') renderCustomModelsList();
  if (customModelNameInput) customModelNameInput.value = '';
  if (customModelUrlInput) customModelUrlInput.value = '';
  if (customModelImageInput) customModelImageInput.value = '';
  try { document.getElementById('customModelsDropdown').value = url; } catch(e) { debugLog(`Custom model: dropdown sync failed: ${e.message}`, 'warn', true); }
  if (typeof updateCustomModelInfo === 'function') updateCustomModelInfo(url);
}

// Remove a custom model by URL and refresh UI
function handleRemoveCustomModel(url) {
  if (!url) return;
  let userModels = S.getJSON(K.USER_MODELS, []);
  const beforeLen = userModels.length;
  userModels = userModels.filter(m => m.url !== url);
  S.setJSON(K.USER_MODELS, userModels);
  // Remove from availableModels
  const idx = availableModels.findIndex(m => m.url === url);
  if (idx !== -1) availableModels.splice(idx, 1);
  availableModels.sort(modelComparator);
  debugLog(`Removed custom model. Before: ${beforeLen}, After: ${userModels.length}`, 'info');
  // If currently selected model is removed, fallback to default
  const selectedUrl = S.getString(K.SELECTED_MODEL_URL, '');
  if (selectedUrl === url) {
    S.setString(K.SELECTED_MODEL_URL, defaultModelUrl);
    if (typeof loadModel === 'function') {
      loadModel(defaultModelUrl).catch(err=>debugError('Failed to load default after removal', err, { url: defaultModelUrl }));
    }
  }
  if (typeof populateModelSelector === 'function') populateModelSelector();
  if (typeof renderCustomModelsList === 'function') renderCustomModelsList();
  if (typeof trackEvent === 'function') trackEvent('custom_model_removed', { url: url });
}

// Expose
window.handleRemoveCustomModel = handleRemoveCustomModel;

function handleClearAllCustomModels() {
  let userModels = S.getJSON(K.USER_MODELS, []);
  if (!Array.isArray(userModels) || userModels.length === 0) { debugLog('No custom models to clear.', 'info'); return; }
  const removedUrls = new Set(userModels.map(m => m.url));
  S.setJSON(K.USER_MODELS, []);
  window.availableModels = (window.availableModels || []).filter(m => !removedUrls.has(m.url));
  const selectedUrl = S.getString(K.SELECTED_MODEL_URL, '');
  if (selectedUrl && removedUrls.has(selectedUrl)) { S.setString(K.SELECTED_MODEL_URL, defaultModelUrl); loadModel?.(defaultModelUrl).catch(()=>{}); }
  populateModelSelector?.(); renderCustomModelsList?.(); updateCustomModelInfo?.('');
  if (typeof trackEvent === 'function') trackEvent('all_custom_models_cleared', { count: userModels.length });
  debugLog(`Cleared ${userModels.length} custom model(s).`, 'info');
}

function handleInterfaceLanguageChange(event) {
    const newLang = event.target.value;
    if (typeof applyInterfaceLanguage === 'function') {
        applyInterfaceLanguage(newLang);
    }
}

// Change this function to async and extend its behavior
async function handleResetLanguages() {
  selectedLanguageCode = 'en-US';
  S.setString(K.SELECTED_LANGUAGE_CODE, 'en-US');
  translateToLanguageCode = 'en-US';
  window.currentInterfaceLanguage = 'en-US';
  S.setString(K.INTERFACE_LANGUAGE, 'en-US');
  showTransliteration = false; 
  S.setBoolean(K.SHOW_TRANSLITERATION, false);

  // Reset dropdowns and checkboxes in the Language section
  if (languageSelector) languageSelector.value = 'en-US';
  if (showTransliterationCheckbox) showTransliterationCheckbox.checked = false;

  // Clear any cached AI-translated UI strings so English is cleanly reapplied
  try {
    if (window.translationCache) {
      window.translationCache = {};
    }
    Object.keys(localStorage)
      .filter(k => k.startsWith('uiStrings_'))
      .forEach(k => localStorage.removeItem(k));
  } catch(e) {
    debugError('Failed to clear UI translation cache during language reset', e);
  }

  // Re-apply interface language back to English
  if (typeof applyInterfaceLanguage === 'function') {
    try {
      await applyInterfaceLanguage('en-US');
    } catch(e) {
      debugLog('applyInterfaceLanguage(en-US) failed during language reset: ' + e, 'warn');
    }
  }

  // Explicitly reset the Preferences pane title and items to their original English strings
  try {
    const enStrings = window.UI_STRINGS && window.UI_STRINGS['en-US'];
    if (enStrings) {
      // Reset Preferences group title
      document.querySelectorAll('.settings-group h3').forEach(h3 => {
        const text = h3.textContent.trim();
        if (text.includes('Preferences')) {
          h3.textContent = enStrings.preferencesTitle;
        }
      });

      // Reset labels inside Preferences pane back to English
      const alwaysShowLabel = document.getElementById('alwaysShowSettingsCheckbox')?.parentElement;
      if (alwaysShowLabel) {
        const cb = alwaysShowLabel.querySelector('input[type="checkbox"]');
        alwaysShowLabel.textContent = '';
        if (cb) alwaysShowLabel.appendChild(cb);
        alwaysShowLabel.appendChild(document.createTextNode(' ' + enStrings.alwaysShowSettingsLabel));
      }

      const includeTimeLabel = document.getElementById('includeTimeCheckbox')?.parentElement;
      if (includeTimeLabel) {
        const cb = includeTimeLabel.querySelector('input[type="checkbox"]');
        includeTimeLabel.textContent = '';
        if (cb) includeTimeLabel.appendChild(cb);
        includeTimeLabel.appendChild(document.createTextNode(' ' + enStrings.includeTimeLabel));
      }

      const includeBatteryLabel = document.getElementById('includeBatteryCheckbox')?.parentElement;
      if (includeBatteryLabel) {
        const cb = includeBatteryLabel.querySelector('input[type="checkbox"]');
        includeBatteryLabel.textContent = '';
        if (cb) includeBatteryLabel.appendChild(cb);
        includeBatteryLabel.appendChild(document.createTextNode(' ' + enStrings.includeBatteryLabel));
      }

      const multipleModelsLabel = document.getElementById('multipleModelsCheckbox')?.parentElement;
      if (multipleModelsLabel) {
        const cb = multipleModelsLabel.querySelector('input[type="checkbox"]');
        multipleModelsLabel.textContent = '';
        if (cb) multipleModelsLabel.appendChild(cb);
        multipleModelsLabel.appendChild(document.createTextNode(' ' + enStrings.multipleModelsLabel));
      }

      // Reset the description text under each preference item to English
      const preferenceGroup = Array.from(document.querySelectorAll('.settings-group')).find(group => {
        const h3 = group.querySelector('h3');
        return h3 && h3.textContent.trim().includes('Preferences');
      });

      if (preferenceGroup) {
        const valueDisplays = preferenceGroup.querySelectorAll('.value-display');
        // Order in HTML:
        // 0 -> alwaysShowSettingsDesc
        // 1 -> includeTimeDesc
        // 2 -> includeBatteryDesc
        // 3 -> multipleModelsDesc
        if (valueDisplays[0]) valueDisplays[0].textContent = enStrings.alwaysShowSettingsDesc;
        if (valueDisplays[1]) valueDisplays[1].textContent = enStrings.includeTimeDesc;
        if (valueDisplays[2]) valueDisplays[2].textContent = enStrings.includeBatteryDesc;
        if (valueDisplays[3]) valueDisplays[3].textContent = enStrings.multipleModelsDesc;
      }
    }
  } catch(e) {
    debugError('Failed to reset Preferences pane texts during language reset', e);
  }

  // Reset voice back to xAI Grok Eve default
  selectedVoiceId = 'eve';
  S.setString(K.SELECTED_VOICE_ID, selectedVoiceId);
  populateVoiceSelector?.(); 
  if (voiceSelector) voiceSelector.value = selectedVoiceId;

  if (typeof trackEvent === 'function') trackEvent('languages_reset');
  debugLog('Language settings reset to English (US), UI reverted to English, and Preferences pane texts reset.', 'info');
}

function applyBackgroundImage(url) {
  if (!url) return; 
  const bgLayer = document.getElementById('bgLayer');
  if (bgLayer) bgLayer.style.backgroundImage = `url("${url}")`;
  S.setString(K.CURRENT_BACKGROUND_URL, url);
}

function saveToBgLibrary(url, prompt) {
  const list = S.getJSON(K.BG_LIBRARY, []);
  list.unshift({ url, prompt: prompt||'', ts: Date.now() });
  S.setJSON(K.BG_LIBRARY, list.slice(0,60));
}

function renderBackgroundLibrary() {
  const el = document.getElementById('bgLibrary'); 
  if (!el) return;
  let list = S.getJSON(K.BG_LIBRARY, []);
  el.innerHTML = list.map((i,idx)=>`<img src="${i.url}" title="${(i.prompt||'').replace(/"/g,'')}" data-url="${i.url}" data-idx="${idx}" class="${(window.bgSelected?.has(i.url)?'selected':'')}">`).join('') || '<div style="color:#aaa;font-size:13px;">No generated backgrounds yet.</div>';
  el.querySelectorAll('img').forEach(img=>img.addEventListener('click',()=>{
    if (window.bgSelectionMode){ toggleSelectBg(img.dataset.url); img.classList.toggle('selected'); updateBgSelectionButtons(); }
    else { 
      applyBackgroundImage(img.dataset.url); 
      if (typeof trackEvent === 'function') {
        trackEvent('background_changed', { type: 'library_selection' });
      }
    }
  }));
}

function handleApplyBackgroundFromUrl() {
  const input = document.getElementById('bgUrlInput');
  const url = (input?.value || '').trim();
  if (!url) { debugLog('BG URL: Empty URL.', 'warn'); return; }
  try { 
    applyBackgroundImage(url); 
    saveToBgLibrary(url, 'custom url'); 
    renderBackgroundLibrary?.(); 
    debugLog('BG URL applied and saved.', 'info'); 

    if (typeof trackEvent === 'function') {
      trackEvent('background_changed', { type: 'custom_url' });
    }
  }
  catch(e){ debugError('BG URL apply failed', e); }
}

function handleClearBackground(){
  const bgLayer = document.getElementById('bgLayer');
  if (bgLayer) bgLayer.style.backgroundImage = '';
  S.remove(K.CURRENT_BACKGROUND_URL);
  debugLog('Background cleared and removed from storage.', 'info');

  if (typeof trackEvent === 'function') {
    trackEvent('background_changed', { type: 'cleared' });
  }
}

/* Helpers and UI for BG library */
window.bgSelectionMode = false; window.bgSelected = new Set(); window.bgViewerIndex = 0;
function toggleSelectBg(url){ if (bgSelected.has(url)) bgSelected.delete(url); else bgSelected.add(url); }
function updateBgSelectionButtons(){
  const delBtn=document.getElementById('deleteBgSelectedBtn'); const toggleBtn=document.getElementById('toggleBgSelectBtn');
  if (delBtn) delBtn.disabled = bgSelected.size===0;
  if (toggleBtn) toggleBtn.textContent = bgSelectionMode ? 'Cancel Select' : 'Select';
}
function toggleBgSelectionMode(){ bgSelectionMode=!bgSelectionMode; if (!bgSelectionMode) bgSelected.clear(); updateBgSelectionButtons(); renderBackgroundLibrary(); }
function deleteSelectedFromLibrary(){
  if (bgSelected.size===0) return;
  let list = S.getJSON(K.BG_LIBRARY, []);
  list = list.filter(i=>!bgSelected.has(i.url)); S.setJSON(K.BG_LIBRARY, list);
  bgSelected.clear(); renderBackgroundLibrary(); updateBgSelectionButtons(); debugLog('BG: Deleted selected items','info');
}
function clearBackgroundLibrary(){ S.setJSON(K.BG_LIBRARY, []); bgSelected.clear(); renderBackgroundLibrary(); updateBgSelectionButtons(); debugLog('BG: Library cleared','info'); }
function openBgViewerAt(index){
  let list = S.getJSON(K.BG_LIBRARY, []);
  if (!list.length) return;
  bgViewerIndex = Math.max(0, Math.min(index, list.length-1));
  const overlay = document.getElementById('bgViewerOverlay');
  const img = document.getElementById('bgViewerImage');
  const counter = document.getElementById('bgViewerCounter');
  img.src = list[bgViewerIndex].url; counter.textContent = `${bgViewerIndex+1} / ${list.length}`;
  overlay.classList.add('visible'); overlay.setAttribute('aria-hidden','false');
}
function closeBgViewer(){ const o=document.getElementById('bgViewerOverlay'); o.classList.remove('visible'); o.setAttribute('aria-hidden','true'); }
function stepBgViewer(dir){
  let list = S.getJSON(K.BG_LIBRARY, []);
  if (!list.length) return; bgViewerIndex = (bgViewerIndex + dir + list.length) % list.length;
  document.getElementById('bgViewerImage').src = list[bgViewerIndex].url;
  document.getElementById('bgViewerCounter').textContent = `${bgViewerIndex+1} / ${list.length}`;
}

// applyBackgroundFit / setActiveBgFitButton live in settings_ui.js, which
// supports all 11 fit modes. Duplicate stubs used to live here; because a
// top-level `function f(){}` in a classic script overwrites window.f, and
// settings_handlers.js loads after settings_ui.js, these stubs won the
// binding — and their `window.applyBackgroundFit !== applyBackgroundFit`
// guard could never be true (same binding). Every fit button collapsed to
// one of three behaviours and the real implementation was unreachable.

/**
 * Applies settings changes requested by the AI.
 * @param {Object} updates - Key-value pairs of settings to update
 */
function applyAIProposedSettings(updates) {
  if (!updates || typeof updates !== 'object') return;
  
  debugLog('AI requested settings updates: ' + JSON.stringify(updates), 'info');

  if (updates.responseLanguage) {
    const selector = document.getElementById('languageSelector');
    if (selector) {
      selector.value = updates.responseLanguage;
      handleLanguageChange({ target: selector });
    }
  }

  if (typeof updates.enableVoice === 'boolean') {
    const checkbox = document.getElementById('enableVoiceCheckbox');
    if (checkbox) {
      checkbox.checked = updates.enableVoice;
      handleEnableVoiceChange({ target: checkbox });
    }
  }

  if (updates.voiceId) {
    const selector = document.getElementById('voiceSelector');
    if (selector) {
      selector.value = updates.voiceId;
      handleVoiceChange({ target: selector });
    }
  }

  if (typeof updates.memorySize === 'number') {
    const slider = document.getElementById('memorySize');
    if (slider) {
      slider.value = updates.memorySize;
      updateMemorySize(updates.memorySize);
    }
  }

  if (typeof updates.showTransliteration === 'boolean') {
    const checkbox = document.getElementById('showTransliteration');
    if (checkbox) {
      checkbox.checked = updates.showTransliteration;
      handleShowTransliterationChange({ target: checkbox });
    }
  }

  if (typeof updates.showClock === 'boolean') {
    const checkbox = document.getElementById('showClockCheckbox');
    if (checkbox) {
      checkbox.checked = updates.showClock;
      handleShowClockChange({ target: checkbox });
    }
  }

  if (typeof updates.chatboxOpacity === 'number') {
    const slider = document.getElementById('chatboxOpacity');
    if (slider) {
      slider.value = updates.chatboxOpacity;
      handleChatboxOpacityChange({ target: slider });
    }
  }

  if (typeof updates.messageOpacity === 'number') {
    const slider = document.getElementById('messageOpacity');
    if (slider) {
      slider.value = updates.messageOpacity;
      handleMessageOpacityChange({ target: slider });
    }
  }

  if (typeof updates.bgOpacity === 'number') {
    const slider = document.getElementById('bgOpacity');
    if (slider) {
      slider.value = updates.bgOpacity;
      handleBgOpacityChange({ target: slider });
    }
  }

  if (typeof updates.includeTime === 'boolean') {
    const checkbox = document.getElementById('includeTimeCheckbox');
    if (checkbox) {
      checkbox.checked = updates.includeTime;
      handleIncludeTimeChange({ target: checkbox });
    }
  }

  if (typeof updates.includeBattery === 'boolean') {
    const checkbox = document.getElementById('includeBatteryCheckbox');
    if (checkbox) {
      checkbox.checked = updates.includeBattery;
      handleIncludeBatteryChange({ target: checkbox });
    }
  }

  if (typeof updates.summaryTrigger === 'number') {
    const slider = document.getElementById('summaryTriggerCount');
    if (slider) {
      slider.value = updates.summaryTrigger;
      handleSummaryTriggerCountChange({ target: slider });
    }
  }

  if (updates.summaryLength) {
    const selector = document.getElementById('summaryLengthPreference');
    if (selector) {
      selector.value = updates.summaryLength;
      handleSummaryLengthPreferenceChange({ target: selector });
    }
  }
}

function handleIncludeTutorialInContextChange(event) {
    const value = event.target.checked;
    window.includeTutorialInContext = value;
    S.setBoolean(K.INCLUDE_TUTORIAL_IN_CONTEXT, value);
    debugLog(`Include Tutorial in Context changed to: ${value}`, 'info');
}

function handleDisableAutoOfflineChange(event) {
    const value = event.target.checked;
    window.disableAutoOfflineMode = value;
    S.setBoolean(K.DISABLE_AUTO_OFFLINE_MODE, value);
    debugLog(`Disable automatic Offline Mode changed to: ${value}`, 'info');
}

window.applyAIProposedSettings = applyAIProposedSettings;
window.handleIncludeTutorialInContextChange = handleIncludeTutorialInContextChange;

/* Expose */
window.toggleBgSelectionMode = toggleBgSelectionMode;
window.deleteSelectedFromLibrary = deleteSelectedFromLibrary;
window.clearBackgroundLibrary = clearBackgroundLibrary;
window.openBgViewerAt = openBgViewerAt;
window.closeBgViewer = closeBgViewer;
window.stepBgViewer = stepBgViewer;

// Add event listener for model position reset
document.getElementById('resetModelPositionBtn')?.addEventListener('click', ()=>{
  resetCurrentModelPosition();
  debugLog('Model position and zoom reset and cleared from storage.', 'info');
});

function handleTTSFallbackVoiceChange(event) {
    const value = event.target.value;
    window.ttsFallbackVoiceId = value;
    S.setString(K.TTS_FALLBACK_VOICE_ID, value);
    debugLog(`TTS fallback voice changed to: ${value}`, 'info');
}
window.handleTTSFallbackVoiceChange = handleTTSFallbackVoiceChange;

function handleEnableKokoroVoiceChange(event) {
    const value = event.target.checked;
    window.enableKokoro = value;
    window.enableVoice = window.enablePrimaryVoice || window.enableFallbackVoice || window.enableKokoro;
    S.setBoolean(K.ENABLE_KOKORO, value);
    debugLog(`Enable Kokoro (Local) changed to: ${value}`, 'info');
}
window.handleEnableKokoroVoiceChange = handleEnableKokoroVoiceChange;

function handleKokoroVoiceChange(event) {
    const value = event.target.value;
    window.selectedKokoroVoiceId = value;
    S.setString(K.SELECTED_KOKORO_VOICE_ID, value);
    debugLog(`Kokoro voice changed to: ${value}`, 'info');
}
window.handleKokoroVoiceChange = handleKokoroVoiceChange;

// --- Automation & Queuing Handlers ---

function handleEnableUserMessageQueueChange(event) {
  const enabled = !!event.target.checked;
  window.isUserMessageQueueEnabled = enabled;
  S.setBoolean(K.IS_USER_MESSAGE_QUEUE_ENABLED, enabled);
  debugLog(`User Message Queue set to: ${enabled}`, 'info');

  // Show/Hide queue status in chat
  const qStatus = document.getElementById('queueStatusContainer');
  if (qStatus) {
    qStatus.style.display = (enabled && window.userMessageQueue.length > 0) ? 'flex' : 'none';
  }
}

function handleEnableAmbientQueueChange(event) {
  const enabled = !!event.target.checked;
  window.isAmbientQueueEnabled = enabled;
  window.consecutiveAmbientCount = 0;
  S.setBoolean(K.IS_AMBIENT_QUEUE_ENABLED, enabled);
  debugLog(`Ambient Mode set to: ${enabled}`, 'info');

  if (!enabled && window.ambientTimer) {
    clearTimeout(window.ambientTimer);
    window.ambientTimer = null;
  } else if (enabled && !window.isAIResponding) {
    resetAmbientTimer(true);
  }
}

function handleAmbientDelayChange(event) {
  const value = parseInt(event.target.value);
  window.ambientDelay = value;
  const valEl = document.getElementById('ambientDelayValue');
  if (valEl) valEl.textContent = value + 's';
  S.setNumber(K.AMBIENT_DELAY, value);
  debugLog(`Ambient Delay set to: ${value}s`, 'info');
  
  if (window.isAmbientQueueEnabled && !window.isAIResponding) {
    resetAmbientTimer();
  }
}

function handleClearQueue() {
  window.userMessageQueue = [];
  window.preloadedQueuedResponse = null;
  updateQueueUI();
  debugLog('User Message Queue cleared.', 'info');
}

function updateQueueUI() {
  const qStatus = document.getElementById('queueStatusContainer');
  const qText = document.getElementById('queueLengthText');
  const qList = document.getElementById('queuedMessagesList');
  
  if (qStatus) {
    qStatus.style.display = (window.isUserMessageQueueEnabled && window.userMessageQueue.length > 0) ? 'flex' : 'none';
  }
  if (qText) {
    qText.textContent = `Queued: ${window.userMessageQueue.length}`;
  }
  if (qList) {
    qList.innerHTML = '';
    window.userMessageQueue.forEach((msg, index) => {
      const item = document.createElement('div');
      item.className = 'queue-item';
      item.textContent = `${index + 1}. ${msg}`;
      qList.appendChild(item);
    });
  }
}

// Minimum gap between ambient messages. A delay of 0 (reachable from the
// slider) or NaN (from a corrupt localStorage value) made setTimeout fire
// immediately, turning ambient mode into an unbounded loop of API calls.
const MIN_AMBIENT_DELAY_SECONDS = 3;
window.consecutiveAmbientCount = 0;

// Dynamic ambient cap: reads user preference from slider (1-50, where 50 = Unlimited).
// Free WaifuAI Cloud proxy is safely clamped to 10 to protect shared quota,
// while custom API keys (Groq, OpenRouter, OpenAI-compatible) honor up to Unlimited.
function getMaxConsecutiveAmbient() {
  const provider = typeof resolveLLMProvider === 'function' ? resolveLLMProvider() : null;
  const userSetting = Number(window.ambientMaxConsecutive);
  const target = (!Number.isFinite(userSetting) || userSetting <= 0) ? 10 : userSetting;
  const desiredLimit = target >= 50 ? Infinity : target;

  if (!provider || provider.name === 'waifu_proxy') {
    return Math.min(desiredLimit, 10);
  }
  return desiredLimit;
}
window.getMaxConsecutiveAmbient = getMaxConsecutiveAmbient;

function updateAmbientMaxConsecutiveDisplay() {
  const valEl = document.getElementById('ambientMaxConsecutiveValue');
  const statusEl = document.getElementById('ambientMaxConsecutiveStatus');
  const slider = document.getElementById('ambientMaxConsecutive');
  const rawVal = slider ? parseInt(slider.value, 10) : Number(window.ambientMaxConsecutive || 10);
  const provider = typeof resolveLLMProvider === 'function' ? resolveLLMProvider() : null;
  const isCloud = !provider || provider.name === 'waifu_proxy';
  const label = rawVal >= 50 ? 'Unlimited (∞)' : String(rawVal);

  // Update the value number (just text, no HTML)
  if (valEl) valEl.textContent = label;

  // Update the status badge (separate div, block-level, always visible)
  if (statusEl) {
    if (isCloud && rawVal > 10) {
      statusEl.innerHTML =
        '<span style="color:#f59e0b; font-weight:600;">⚠️ Clamped to 10 on Free Cloud</span>' +
        '<br><span style="color:#fbbf24; opacity:0.85;">Add your own API key (Groq / OpenRouter / OpenAI Compatible) to unlock up to ' +
        (rawVal >= 50 ? 'Unlimited' : rawVal) + '.</span>';
      statusEl.style.display = '';
    } else if (!isCloud && rawVal > 10) {
      statusEl.innerHTML = '<span style="color:#4ade80; font-weight:600;">✅ Custom API Key Active — full limit honored</span>';
      statusEl.style.display = '';
    } else {
      statusEl.innerHTML = '';
      statusEl.style.display = 'none';
    }
  }

  debugLog(`[ambient-display] rawVal=${rawVal}, provider=${provider?.name || 'null'}, isCloud=${isCloud}`, 'info');
}
window.updateAmbientMaxConsecutiveDisplay = updateAmbientMaxConsecutiveDisplay;

function handleAmbientMaxConsecutiveChange(event) {
  const val = parseInt(event.target.value, 10);
  window.ambientMaxConsecutive = val;
  S.setNumber(K.AMBIENT_MAX_CONSECUTIVE, val);
  updateAmbientMaxConsecutiveDisplay();
  debugLog(`Ambient max consecutive messages set to: ${val >= 50 ? 'Unlimited' : val}`, 'info');
}
window.handleAmbientMaxConsecutiveChange = handleAmbientMaxConsecutiveChange;

function normalizedAmbientDelay() {
  const raw = Number(window.ambientDelay);
  if (!Number.isFinite(raw)) return 10;
  return Math.max(MIN_AMBIENT_DELAY_SECONDS, raw);
}
window.normalizedAmbientDelay = normalizedAmbientDelay;

function resetAmbientTimer(fromUser = false) {
  if (fromUser) {
    window.consecutiveAmbientCount = 0;
  }
  if (window.ambientTimer) clearTimeout(window.ambientTimer);
  if (!window.isAmbientQueueEnabled) return;
  const maxLimit = getMaxConsecutiveAmbient();
  if ((window.consecutiveAmbientCount || 0) >= maxLimit) {
    debugLog(`Ambient mode paused: reached limit of ${maxLimit} consecutive thoughts without user reply.`, 'info');
    return;
  }

  window.ambientTimer = setTimeout(() => {
    triggerAmbientPrompt();
  }, normalizedAmbientDelay() * 1000);
}

async function triggerAmbientPrompt() {
  // isProcessing must be checked too: it stays true through TTS playback
  // after isAIResponding clears, and firing here would run a second
  // concurrent sendMessageInternal.
  if (window.isAIResponding || window.isProcessing || !window.isAmbientQueueEnabled) return;
  const maxLimit = getMaxConsecutiveAmbient();
  if ((window.consecutiveAmbientCount || 0) >= maxLimit) {
    debugLog(`Ambient mode reached limit of ${maxLimit} consecutive thoughts. Pausing until user speaks.`, 'info');
    return;
  }

  window.consecutiveAmbientCount = (window.consecutiveAmbientCount || 0) + 1;
  const limitLabel = Number.isFinite(maxLimit) ? `${window.consecutiveAmbientCount}/${maxLimit}` : `${window.consecutiveAmbientCount}/∞`;
  debugLog(`Triggering ambient AI comment (${limitLabel})...`, 'info');
  const ambientPrompt = window.ambientPrompt || "(Continue the conversation naturally as Haru. Share a thought, a feeling, or ask me something relevant to our discussion to keep things moving. 1-2 sentences. Speak directly to me.)";

  // Use pre-loaded buffer if available
  if (window.isAmbientPreloadEnabled && window.ambientPreloadBuffer) {
    debugLog('Using pre-loaded ambient message.', 'info');
    const cached = window.ambientPreloadBuffer;
    const ttsCached = window.ambientPreloadTTSBuffer;
    window.ambientPreloadBuffer = null;
    window.ambientPreloadTTSBuffer = null;
    if (typeof sendMessageInternal === 'function') {
      sendMessageInternal(ambientPrompt, true, cached, ttsCached);
    }
    return;
  }

  debugLog('Triggering ambient AI comment (real-time)...', 'info');
  if (typeof sendMessageInternal === 'function') {
    sendMessageInternal(ambientPrompt, true);
  }
}

async function preloadNextAmbientMessage() {
  // We removed window.isAIResponding because preloading is meant to happen 
  // WHILE AI is responding/speaking to reduce gaps.
  if (!window.isAmbientPreloadEnabled || window.ambientPreloadBuffer || window.isAmbientPreloading) return;
  
  window.isAmbientPreloading = true;
  debugLog('Pre-loading next ambient message...', 'info');
  const ambientPrompt = window.ambientPrompt || "(Continue the conversation naturally as Haru. Share a thought, a feeling, or ask me something relevant to our discussion to keep things moving. 1-2 sentences. Speak directly to me.)";
  
  try {
    if (typeof getAIResponse === 'function') {
      const response = await getAIResponse(ambientPrompt, true); // true for isAmbient
      if (response && response.reply) {
        window.ambientPreloadBuffer = response;
        debugLog('Ambient message pre-loaded.', 'info');
      }
    }
  } catch (e) {
    debugLog(`Ambient pre-load failed: ${e.message}`, 'warn');
    window.ambientPreloadBuffer = null;
  } finally {
    window.isAmbientPreloading = false;
  }
}

/**
 * Pre-generates the first chunk of Kokoro TTS audio for the buffered ambient message.
 */
async function preloadAmbientTTS(text) {
  if (!text || window.isAmbientPreloadingTTS) return;
  if (window.ambientPreloadTTSBuffer) return; // Already pre-loaded

  window.isAmbientPreloadingTTS = true;
  debugLog('Pre-loading next ambient TTS chunk in background...', 'info');

  try {
    const cleanText = (typeof stripForTTS === 'function') ? stripForTTS(text) : String(text || '').trim();
    const sentences = (typeof splitIntoSentences === 'function') ? splitIntoSentences(cleanText) : [cleanText];
    const limit = window.ttsChunkLimit || 300;

    let firstChunkText = '';
    for (const s of sentences) {
      const sTrim = s.trim();
      if (!sTrim) continue;
      if (firstChunkText.length + sTrim.length > limit && firstChunkText.length > 0) break;
      firstChunkText += (firstChunkText ? ' ' : '') + sTrim;
    }

    if (firstChunkText && typeof window.fetchTTSBuffer === 'function') {
      debugLog(`TTS: Pre-fetching first ambient chunk: "${firstChunkText.substring(0, 30)}..."`, 'info');
      // Must use the same voice id the queue manager will use, so provider
      // resolution matches. Passing a Kokoro id here (this codebase's
      // fetchTTSBuffer resolves provider by looking up a voiceId in the
      // `voices` list) sent it down the wrong provider path entirely.
      const voiceId = (typeof window.selectedVoiceId === 'string' && window.selectedVoiceId) || 'eve';
      const resolved = await window.fetchTTSBuffer(firstChunkText, voiceId);
      if (resolved) {
        // fetchTTSBuffer never plays; a 'browser' descriptor is inert until played.
        window.ambientPreloadTTSBuffer = resolved;
        debugLog('TTS: Success pre-loading first ambient chunk.', 'info');
      }
    }
  } catch (err) {
    debugError('TTS: Failed to pre-load ambient TTS', err);
  } finally {
    window.isAmbientPreloadingTTS = false;
  }
}

function handleAmbientPromptChange(event) {
  const val = event.target.value;
  window.ambientPrompt = val;
  S.setString(K.AMBIENT_PROMPT, val);
  debugLog('Ambient prompt updated.', 'info');
}

function handleEnableAmbientPreloadChange(event) {
  const enabled = !!event.target.checked;
  window.isAmbientPreloadEnabled = enabled;
  S.setBoolean(K.IS_AMBIENT_PRELOAD_ENABLED, enabled);
  debugLog(`Ambient Preload set to: ${enabled}`, 'info');
  if (!enabled) window.ambientPreloadBuffer = null;
}

window.handleEnableUserMessageQueueChange = handleEnableUserMessageQueueChange;
window.handleEnableAmbientQueueChange = handleEnableAmbientQueueChange;
window.handleAmbientDelayChange = handleAmbientDelayChange;
window.handleAmbientMaxConsecutiveChange = handleAmbientMaxConsecutiveChange;
window.updateAmbientMaxConsecutiveDisplay = updateAmbientMaxConsecutiveDisplay;
window.handleEnableAmbientPreloadChange = handleEnableAmbientPreloadChange;
window.handleAmbientPromptChange = handleAmbientPromptChange;
window.preloadNextAmbientMessage = preloadNextAmbientMessage;
window.preloadAmbientTTS = preloadAmbientTTS;
window.handleClearQueue = handleClearQueue;
window.updateQueueUI = updateQueueUI;
window.resetAmbientTimer = resetAmbientTimer;

document.addEventListener('DOMContentLoaded', () => {
  const clearQueueButton = document.getElementById('clearQueueChatBtn');
  if (clearQueueButton) {
    clearQueueButton.addEventListener('click', handleClearQueue);
  }
  if (typeof initVoiceSettingsUI === 'function') {
    initVoiceSettingsUI();
  }
});

// Fish Audio Voice Settings Initialization
function initVoiceSettingsUI() {
  const previewBtn = document.getElementById('previewVyraVoiceBtn');
  const enableCheckbox = document.getElementById('enableVoiceCheckbox');
  const volumeSlider = document.getElementById('ttsVolumeSlider');
  const volumeValue = document.getElementById('ttsVolumeValue');
  const emotionCheckbox = document.getElementById('enableEmotionSteeringCheckbox');
  const modelInput = document.getElementById('fishAudioModelInput');
  const refIdInput = document.getElementById('fishAudioRefIdInput');
  const saveBtn = document.getElementById('saveVoiceSettingsBtn');
  const resetBtn = document.getElementById('resetVoiceSettingsBtn');

  // Load stored settings
  try {
    if (enableCheckbox) {
      const storedEnable = localStorage.getItem('enableVoice');
      window.enableVoice = storedEnable === null ? true : storedEnable === 'true';
      enableCheckbox.checked = window.enableVoice;
      enableCheckbox.addEventListener('change', (e) => {
        window.enableVoice = !!e.target.checked;
        localStorage.setItem('enableVoice', window.enableVoice ? 'true' : 'false');
      });
    }

    if (volumeSlider) {
      const storedVol = parseFloat(localStorage.getItem('ttsVolume')) || 1;
      window.ttsVolume = storedVol;
      volumeSlider.value = storedVol;
      if (volumeValue) volumeValue.textContent = storedVol.toFixed(2);
      volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (typeof window.setTTSVolume === 'function') {
          window.setTTSVolume(val);
        } else {
          window.ttsVolume = val;
        }
        if (volumeValue) volumeValue.textContent = val.toFixed(2);
      });
    }

    if (emotionCheckbox) {
      const stored = localStorage.getItem('fish_audio_emotion_steering');
      emotionCheckbox.checked = stored === null ? true : stored === 'true';
      emotionCheckbox.addEventListener('change', (e) => {
        localStorage.setItem('fish_audio_emotion_steering', e.target.checked ? 'true' : 'false');
      });
    }

    if (modelInput) {
      const stored = localStorage.getItem('fish_audio_model');
      if (stored) modelInput.value = stored;
    }

    if (refIdInput) {
      const stored = localStorage.getItem('fish_audio_reference_id');
      if (stored) refIdInput.value = stored;
    }

    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        if (typeof window.testVyraVoice === 'function') {
          window.testVyraVoice();
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (modelInput) localStorage.setItem('fish_audio_model', modelInput.value.trim());
        if (refIdInput) localStorage.setItem('fish_audio_reference_id', refIdInput.value.trim());
        const statusEl = document.getElementById('ttsPreviewStatus');
        if (statusEl) {
          statusEl.textContent = 'Voice settings saved successfully! ✨';
          setTimeout(() => {
            if (statusEl) statusEl.textContent = "Audition Vyra's sweet, expressive voice with a natural greeting.";
          }, 3000);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (modelInput) modelInput.value = 's2.1-pro-free';
        if (refIdInput) refIdInput.value = 'bd1ac757abce40e69525c54415418135';
        if (emotionCheckbox) emotionCheckbox.checked = true;
        if (volumeSlider) {
          volumeSlider.value = '1';
          if (volumeValue) volumeValue.textContent = '1.00';
        }
        localStorage.removeItem('fish_audio_model');
        localStorage.removeItem('fish_audio_reference_id');
        localStorage.removeItem('fish_audio_emotion_steering');
        localStorage.removeItem('ttsVolume');
        if (typeof window.setTTSVolume === 'function') window.setTTSVolume(1);
        const statusEl = document.getElementById('ttsPreviewStatus');
        if (statusEl) statusEl.textContent = 'Reset to Vyra default voice settings.';
      });
    }

  } catch (err) {
    console.warn('initVoiceSettingsUI error:', err);
  }
}

function initMemorySettingsUI() {
  try {
    const resetMemoryBtn = document.getElementById('resetAIMemoryBtn');
    const clearTranscriptBtn = document.getElementById('clearChatTranscriptBtn');
    const memorySlider = document.getElementById('memorySize');
    const memoryValue = document.getElementById('memorySizeValue');
    const statusEl = document.getElementById('resetMemoryStatus');

    if (memorySlider) {
      const stored = AppStorage.getNumber(AppStorage.KEYS.MAX_MEMORY_SIZE, 20);
      if (!isNaN(stored)) {
        memorySlider.value = stored;
        if (memoryValue) memoryValue.textContent = stored;
      }
      memorySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (memoryValue) memoryValue.textContent = val;
        updateMemorySize(val);
      });
    }

    if (resetMemoryBtn) {
      resetMemoryBtn.addEventListener('click', () => {
        // Stop any active speech or in-flight responses
        if (typeof window.stopTTS === 'function') window.stopTTS(true);
        if (window.abortController) {
          try { window.abortController.abort(); } catch (_) {}
          window.abortController = null;
        }
        window.isProcessing = false;
        window.isWaitingForAIResponse = false;

        // Reset conversation working context & summary completely
        window.conversationContext = [];
        if (typeof AppState !== 'undefined') {
          AppState.conversationContext = [];
          AppState.conversationSummary = '';
          AppState.messageCountSinceLastSummary = 0;
        }
        window.conversationSummary = '';
        window.messageCountSinceLastSummary = 0;

        AppStorage.setJSON(AppStorage.KEYS.CONVERSATION_CONTEXT, []);
        AppStorage.setString(AppStorage.KEYS.CONVERSATION_SUMMARY, '');
        AppStorage.setNumber(AppStorage.KEYS.MESSAGE_COUNT_SINCE_LAST_SUMMARY, 0);

        // Update active ChatManager chat if present
        if (window.ChatManager) {
          const activeId = window.ChatManager.getActiveChatId();
          if (activeId) {
            window.ChatManager.saveCurrentChat(activeId);
            window.ChatManager.renderChatList();
          }
        }

        // Clean chat screen and announce fresh start
        const chatHistory = document.getElementById('chatHistory');
        if (chatHistory) {
          chatHistory.innerHTML = '';
          if (typeof window.addSystemMessage === 'function') {
            window.addSystemMessage("✨ Memory wiped! Vyra has forgotten all previous conversations and is ready for a fresh start.");
          }
        }

        if (typeof updateSummaryMarker === 'function') updateSummaryMarker();
        if (typeof debugLog === 'function') {
          debugLog('AI Memory has been wiped clean. Model started fresh.', 'info');
        }

        // Visual feedback
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.textContent = '✨ Memory wiped! The AI model has started completely fresh.';
          setTimeout(() => {
            if (statusEl) statusEl.style.display = 'none';
          }, 4000);
        }

        resetMemoryBtn.textContent = '✅ Memory Cleared!';
        setTimeout(() => {
          if (resetMemoryBtn) resetMemoryBtn.textContent = '🧹 Clear Memory & Start Fresh';
        }, 2500);
      });
    }

    if (clearTranscriptBtn) {
      clearTranscriptBtn.addEventListener('click', () => {
        const chatHistory = document.getElementById('chatHistory');
        if (chatHistory) {
          chatHistory.innerHTML = '';
          if (typeof window.addSystemMessage === 'function') {
            window.addSystemMessage('Screen transcript cleared.');
          }
        }
        clearTranscriptBtn.textContent = '✅ Transcript Cleared!';
        setTimeout(() => {
          if (clearTranscriptBtn) clearTranscriptBtn.textContent = 'Clear Screen Transcript';
        }, 2000);
      });
    }

  } catch (err) {
    console.warn('initMemorySettingsUI error:', err);
  }
}

window.initVoiceSettingsUI = initVoiceSettingsUI;
window.initMemorySettingsUI = initMemorySettingsUI;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initVoiceSettingsUI();
    initMemorySettingsUI();
  });
} else {
  initVoiceSettingsUI();
  initMemorySettingsUI();
}

// --- Full Screen Mode & App Theme Handlers ---

function isFullScreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}

function toggleFullScreen() {
  if (!isFullScreen()) {
    const docEl = document.documentElement;
    const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    if (requestFS) {
      requestFS.call(docEl).catch(err => {
        if (typeof debugLog === 'function') debugLog(`Fullscreen request failed: ${err.message}`, 'warn');
      });
    }
  } else {
    const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (exitFS) {
      exitFS.call(document).catch(err => {
        if (typeof debugLog === 'function') debugLog(`Fullscreen exit failed: ${err.message}`, 'warn');
      });
    }
  }
}

function updateFullScreenUI() {
  const active = isFullScreen();
  window.isFullscreen = active;
  if (window.AppStorage && window.AppStorage.KEYS.FULLSCREEN_MODE) {
    AppStorage.setBoolean(AppStorage.KEYS.FULLSCREEN_MODE, active);
  }

  // Update top header button
  const topBtn = document.getElementById('fullscreenToggleBtn');
  if (topBtn) {
    topBtn.classList.toggle('active', active);
    const expandIcon = topBtn.querySelector('.fullscreen-icon-expand');
    const compressIcon = topBtn.querySelector('.fullscreen-icon-compress');
    if (expandIcon) expandIcon.style.display = active ? 'none' : 'block';
    if (compressIcon) compressIcon.style.display = active ? 'block' : 'none';
    topBtn.setAttribute('title', active ? 'Exit Full Screen' : 'Enter Full Screen');
  }

  // Update settings checkboxes
  const themeCb = document.getElementById('fullscreenThemeCheckbox');
  if (themeCb) themeCb.checked = active;

  const prefCb = document.getElementById('fullscreenPrefCheckbox');
  if (prefCb) prefCb.checked = active;

  if (typeof debugLog === 'function') debugLog(`Full screen mode updated: ${active}`, 'info');
}

function handleFullScreenToggleChange(event) {
  const targetState = !!event.target.checked;
  if (targetState !== isFullScreen()) {
    toggleFullScreen();
  }
}

const THEME_PRESETS = {
  midnight: {
    primaryAccent: '#ff7782',
    primaryGlow: 'rgba(255, 119, 130, 0.4)',
    secondaryAccent: '#73c2fb',
    bgDark: '#080a12',
    glassBg: 'rgba(14, 18, 29, var(--chatbox-bg-opacity, 0.85))',
    glassBorder: 'rgba(115, 194, 251, 0.25)',
    glassBorderHover: 'rgba(255, 119, 130, 0.5)'
  },
  sakura: {
    primaryAccent: '#ff6699',
    primaryGlow: 'rgba(255, 102, 153, 0.45)',
    secondaryAccent: '#ffb3d1',
    bgDark: '#140910',
    glassBg: 'rgba(32, 16, 26, var(--chatbox-bg-opacity, 0.85))',
    glassBorder: 'rgba(255, 102, 153, 0.3)',
    glassBorderHover: 'rgba(255, 179, 209, 0.6)'
  },
  cyberpunk: {
    primaryAccent: '#00f0ff',
    primaryGlow: 'rgba(0, 240, 255, 0.45)',
    secondaryAccent: '#ff007f',
    bgDark: '#0a0618',
    glassBg: 'rgba(18, 12, 38, var(--chatbox-bg-opacity, 0.85))',
    glassBorder: 'rgba(0, 240, 255, 0.35)',
    glassBorderHover: 'rgba(255, 0, 127, 0.6)'
  },
  emerald: {
    primaryAccent: '#10b981',
    primaryGlow: 'rgba(16, 185, 129, 0.45)',
    secondaryAccent: '#34d399',
    bgDark: '#04120e',
    glassBg: 'rgba(10, 28, 22, var(--chatbox-bg-opacity, 0.85))',
    glassBorder: 'rgba(16, 185, 129, 0.3)',
    glassBorderHover: 'rgba(52, 211, 153, 0.6)'
  },
  sunset: {
    primaryAccent: '#f97316',
    primaryGlow: 'rgba(249, 115, 22, 0.45)',
    secondaryAccent: '#fbbf24',
    bgDark: '#140a05',
    glassBg: 'rgba(32, 18, 12, var(--chatbox-bg-opacity, 0.85))',
    glassBorder: 'rgba(249, 115, 22, 0.3)',
    glassBorderHover: 'rgba(251, 191, 36, 0.6)'
  },
  amethyst: {
    primaryAccent: '#a855f7',
    primaryGlow: 'rgba(168, 85, 247, 0.45)',
    secondaryAccent: '#c084fc',
    bgDark: '#0e0717',
    glassBg: 'rgba(24, 14, 38, var(--chatbox-bg-opacity, 0.85))',
    glassBorder: 'rgba(168, 85, 247, 0.3)',
    glassBorderHover: 'rgba(192, 132, 252, 0.6)'
  }
};

function applyAppTheme(themeKey) {
  const key = String(themeKey || 'midnight').toLowerCase();
  const preset = THEME_PRESETS[key] || THEME_PRESETS.midnight;
  const rootStyle = document.documentElement.style;

  rootStyle.setProperty('--primary-accent', preset.primaryAccent);
  rootStyle.setProperty('--primary-glow', preset.primaryGlow);
  rootStyle.setProperty('--secondary-accent', preset.secondaryAccent);
  rootStyle.setProperty('--bg-dark', preset.bgDark);
  rootStyle.setProperty('--glass-bg', preset.glassBg);
  rootStyle.setProperty('--glass-border', preset.glassBorder);
  rootStyle.setProperty('--glass-border-hover', preset.glassBorderHover);

  window.appTheme = key;
  if (window.AppStorage && window.AppStorage.KEYS.APP_THEME) {
    AppStorage.setString(AppStorage.KEYS.APP_THEME, key);
  }

  const themeSelect = document.getElementById('appThemeSelect');
  if (themeSelect) themeSelect.value = key;

  if (typeof debugLog === 'function') debugLog(`Applied theme preset: ${key}`, 'info');
}

function handleAppThemeChange(event) {
  const newTheme = event.target.value;
  applyAppTheme(newTheme);
}

// Global expose
window.isFullScreen = isFullScreen;
window.toggleFullScreen = toggleFullScreen;
window.updateFullScreenUI = updateFullScreenUI;
window.handleFullScreenToggleChange = handleFullScreenToggleChange;
window.applyAppTheme = applyAppTheme;
window.handleAppThemeChange = handleAppThemeChange;

// Document fullscreen change listeners
['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
  document.addEventListener(evt, () => {
    updateFullScreenUI();
  });
});

// Keyboard shortcut (F11) fallback check
document.addEventListener('keydown', (e) => {
  if (e.key === 'F11') {
    setTimeout(updateFullScreenUI, 150);
  }
});

