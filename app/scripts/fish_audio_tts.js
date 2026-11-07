// AURA Engine - Fish Audio TTS Provider (Vyra Signature Anime Voice)
// Bulletproof audio pipeline with instant unlock, sentence pipelining & Live2D mouth synchronization

(function() {
  'use strict';

  // Internal audio state
  let currentAudio = null;
  let currentAudioUrl = null;
  let lipSyncFrameId = null;
  let activeMessageId = null;
  let activeFetchController = null;
  let currentAudioFinish = null;
  let lipSyncAudioContext = null;
  const lipSyncAnalyserByAudio = new WeakMap();

  // Active sentence queue identifier (incremented to instantly invalidate previous queues)
  let activeQueueId = 0;

  // Client-side cache for synthesized sentence blobs to eliminate latency for repeats
  const clientBlobCache = new Map();
  const MAX_CLIENT_CACHE = 80;

  // Silent audio base64 data URI to unlock audio policy on user interaction
  const SILENT_WAV_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
  let unlockAudioEl = null;

  function ensureLipSyncAudioContext() {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return null;
      if (!lipSyncAudioContext) lipSyncAudioContext = new AudioContextCtor();
      if (lipSyncAudioContext.state === 'suspended') {
        lipSyncAudioContext.resume().catch(() => {});
      }
      return lipSyncAudioContext;
    } catch (_) {
      return null;
    }
  }

  function prepareAudioAnalyser(audioElement) {
    if (!audioElement) return null;
    const cached = lipSyncAnalyserByAudio.get(audioElement);
    if (cached) return cached;
    const context = ensureLipSyncAudioContext();
    if (!context || typeof context.createAnalyser !== 'function' || typeof context.createMediaElementSource !== 'function') return null;

    let source = null;
    try {
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.12;
      source = context.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(context.destination);
      const analysis = { analyser, samples: new Uint8Array(analyser.fftSize), source };
      lipSyncAnalyserByAudio.set(audioElement, analysis);
      return analysis;
    } catch (error) {
      // Do not risk silencing the HTMLAudioElement if the browser rejects Web Audio routing.
      try { if (source) source.connect(context.destination); } catch (_) {}
      return null;
    }
  }

  function unlockAudio() {
    try {
      ensureLipSyncAudioContext();
      if (!unlockAudioEl) unlockAudioEl = new Audio();
      unlockAudioEl.src = SILENT_WAV_URI;
      unlockAudioEl.play().catch(() => {});
    } catch (_) {}
  }
  window.unlockAudio = unlockAudio;

  // Default Vyra voice configuration
  const DEFAULT_REF_ID = 'bd1ac757abce40e69525c54415418135';
  const DEFAULT_MODEL = 's2.1-pro-free';

  function getStoredModel() {
    try {
      return localStorage.getItem('fish_audio_model') || DEFAULT_MODEL;
    } catch (_) {
      return DEFAULT_MODEL;
    }
  }

  function getStoredReferenceId() {
    try {
      return localStorage.getItem('fish_audio_reference_id') || DEFAULT_REF_ID;
    } catch (_) {
      return DEFAULT_REF_ID;
    }
  }

  function isEmotionSteeringEnabled() {
    return true; // Always enabled for expressive voice delivery
  }

  // Prepares text for speech synthesis while leaving the original chat message untouched
  function cleanTextForTTS(text) {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text;

    // Remove action cues enclosed in asterisks, e.g. *smirks playfully*, *tilts head*
    cleaned = cleaned.replace(/\*[^*]*\*/g, ' ');

    // Remove code blocks and inline code
    cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');
    cleaned = cleaned.replace(/`[^`]*`/g, ' ');

    // Convert markdown links [Label](url) -> Label
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove raw URLs
    cleaned = cleaned.replace(/https?:\/\/\S+/g, ' ');

    // Remove stage direction parentheticals like (laughs softly), (whispers)
    cleaned = cleaned.replace(/\((?:smiles|smiling|smirks|giggles|laughs|laughing|chuckles|sighs|blushes|winks|nods)[^)]*\)/gi, ' ');

    // Remove markdown formatting tokens
    cleaned = cleaned.replace(/[*_#~]/g, '');

    // Normalize multiple spaces and punctuation spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  // Splits long responses into natural sentence chunks for rapid pipelined playback
  function splitIntoNaturalChunks(text) {
    if (!text) return [];
    const rawParts = text.match(/[^.!?~。！？\n]+[.!?~。！？\n]*/g) || [text];
    const chunks = [];
    let current = '';

    for (const part of rawParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (!current) {
        current = trimmed;
      } else if (current.length < 28 || current.split(/\s+/).length < 4) {
        // If current chunk is very short, combine it with the next sentence for natural cadence
        current += ' ' + trimmed;
      } else {
        chunks.push(current);
        current = trimmed;
      }
    }
    if (current) chunks.push(current);
    return chunks.length > 0 ? chunks : [text];
  }

  function setMouthOpen(value) {
    // Prefer the explicit model reference set by live2d_manager.js; fall back to the
    // most recently-added stage model for older builds that have not synced the global.
    const stageModels = window.app?.stage?.children?.filter(child => child && child.internalModel) || [];
    const model = window.currentModel || stageModels[stageModels.length - 1] || null;
    if (!model) return;

    const core = model.internalModel?.coreModel;
    if (!core) return;
    const mouthValue = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    let usedCubism3 = false;
    try {
      if (typeof core.setParameterValueById === 'function') {
        const candidateIds = ['ParamMouthOpenY', 'ParamMouthOpen', 'PARAM_MOUTH_OPEN_Y'];
        if (typeof core.getParameterIndex === 'function') {
          for (const id of candidateIds) {
            let index = -1;
            try { index = core.getParameterIndex(id); } catch (_) {}
            if (typeof index === 'number' && index >= 0) {
              core.setParameterValueById(id, mouthValue);
              usedCubism3 = true;
              break;
            }
          }
        } else {
          // Most Cubism 3/4 models use ParamMouthOpenY. Try other known IDs only if
          // setting the preferred ID throws, so the common path stays lightweight.
          try {
            core.setParameterValueById('ParamMouthOpenY', mouthValue);
            usedCubism3 = true;
          } catch (_) {
            try { core.setParameterValueById('ParamMouthOpen', mouthValue); usedCubism3 = true; } catch (_) {}
          }
        }
      }
    } catch (_) {}

    // Cubism 2 fallback parameter names used by older model packs.
    if (typeof core.setParamFloat === 'function') {
      try { core.setParamFloat('PARAM_MOUTH_OPEN_Y', mouthValue); } catch (_) {}
      try { core.setParamFloat('PARAM_MOUTH_OPEN', mouthValue); } catch (_) {}
    }
  }

  // Use the actual audio waveform envelope: loud syllables open the mouth and quiet
  // gaps close it. This is audio-reactive lip sync, not phoneme/viseme alignment.
  function startLipSync(audioElement) {
    stopLipSync();
    const analysis = prepareAudioAnalyser(audioElement);
    if (lipSyncAudioContext && lipSyncAudioContext.state === 'suspended') {
      lipSyncAudioContext.resume().catch(() => {});
    }
    const fallbackStartTime = performance.now();
    let smoothedMouth = 0;

    function readAudioLevel() {
      if (!analysis?.analyser || !analysis?.samples) return null;
      if (lipSyncAudioContext && lipSyncAudioContext.state !== 'running') return null;
      try {
        analysis.analyser.getByteTimeDomainData(analysis.samples);
        let sumSquares = 0;
        for (let i = 0; i < analysis.samples.length; i++) {
          const normalized = (analysis.samples[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / analysis.samples.length);
        // Suppress background/noise floor and scale normal spoken voice into a useful range.
        return rms < 0.012 ? 0 : Math.max(0, Math.min(0.92, (rms - 0.012) * 8.5));
      } catch (_) {
        return null;
      }
    }

    function updateMouth() {
      lipSyncFrameId = null;
      if (!window.isCurrentlySpeaking || !audioElement || audioElement.paused || audioElement.ended) {
        smoothedMouth = 0;
        setMouthOpen(0);
        return;
      }

      let target = readAudioLevel();
      if (target === null) {
        // Graceful fallback only when Web Audio analysis is unavailable.
        // Lower amplitude than before so it still looks natural instead of flapping constantly.
        const elapsed = (performance.now() - fallbackStartTime) / 1000;
        const wave = Math.sin(elapsed * 13) * 0.35 + Math.sin(elapsed * 21) * 0.22 + 0.35;
        target = Math.max(0, Math.min(0.65, wave));
      }

      const smoothing = target > smoothedMouth ? 0.58 : 0.24;
      smoothedMouth += (target - smoothedMouth) * smoothing;
      setMouthOpen(smoothedMouth);
      lipSyncFrameId = requestAnimationFrame(updateMouth);
    }

    lipSyncFrameId = requestAnimationFrame(updateMouth);
  }

  function stopLipSync() {
    if (lipSyncFrameId) {
      cancelAnimationFrame(lipSyncFrameId);
      lipSyncFrameId = null;
    }
    setMouthOpen(0);
  }

  // Stops currently playing TTS audio and resets playback state.
  // notify=false is used internally when replacing a queue, not ending the chat turn.
  function stopTTS(notify = true) {
    activeQueueId++;
    if (activeFetchController) {
      try { activeFetchController.abort(); } catch (_) {}
      activeFetchController = null;
    }
    stopLipSync();

    const audioToStop = currentAudio;
    if (audioToStop) {
      try { audioToStop.pause(); audioToStop.currentTime = 0; } catch (_) {}
    }
    if (currentAudioFinish) {
      const finishCurrentAudio = currentAudioFinish;
      currentAudioFinish = null;
      try { finishCurrentAudio(); } catch (_) {}
    }
    if (audioToStop) {
      try {
        audioToStop.onplay = null;
        audioToStop.onended = null;
        audioToStop.onerror = null;
      } catch (_) {}
    }
    currentAudio = null;

    if (currentAudioUrl) {
      try { URL.revokeObjectURL(currentAudioUrl); } catch (_) {}
      currentAudioUrl = null;
    }

    window.isCurrentlySpeaking = false;
    if (activeMessageId) {
      updateMessageAudioButtonUI(activeMessageId, false);
      activeMessageId = null;
    }
    if (notify && typeof window.onAIResponseFullyFinished === 'function') {
      window.onAIResponseFullyFinished();
    }
  }

  function pauseTTS() {
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      window.isCurrentlySpeaking = false;
      stopLipSync();
      if (activeMessageId) {
        updateMessageAudioButtonUI(activeMessageId, false);
      }
    }
  }

  function resumeTTS() {
    if (currentAudio && currentAudio.paused) {
      currentAudio.play().then(() => {
        window.isCurrentlySpeaking = true;
        startLipSync(currentAudio);
        if (activeMessageId) {
          updateMessageAudioButtonUI(activeMessageId, true);
        }
      }).catch(err => {
        console.warn('TTS resume failed:', err);
      });
    }
  }

  function updateMessageAudioButtonUI(messageId, isPlaying) {
    if (!messageId) return;
    const msgEl = document.getElementById(messageId);
    if (!msgEl) return;
    const btn = msgEl.querySelector('.message-action-btn.play-msg, .message-audio-btn');
    if (btn) {
      btn.classList.toggle('playing', isPlaying);
      btn.innerHTML = isPlaying ? '⏹' : '🔊';
      btn.title = isPlaying ? 'Stop Voice' : 'Play Voice';
    }
  }

  // Fetches audio Blob for a single sentence chunk with caching
  async function fetchChunkAudio(chunkText, emotion, signal = null) {
    const clean = cleanTextForTTS(chunkText);
    if (!clean) return null;

    const cacheKey = `${getStoredModel()}_${getStoredReferenceId()}_${emotion}_${clean}`;
    if (clientBlobCache.has(cacheKey)) {
      return clientBlobCache.get(cacheKey);
    }

    try {
      const payload = {
        text: clean,
        emotion: emotion || window.currentEmotion || 'happy',
        model: getStoredModel(),
        reference_id: getStoredReferenceId(),
        enable_emotion: isEmotionSteeringEnabled(),
        format: 'mp3'
      };

      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      };
      if (signal) fetchOptions.signal = signal;
      const res = await fetch('/api/tts/fish', fetchOptions);

      if (!res.ok) {
        console.warn('[FishAudio] Chunk fetch failed with status:', res.status);
        return null;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[FishAudio] Upstream returned JSON error:', errJson);
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength < 500) {
        console.warn('[FishAudio] Received invalid or empty audio payload.');
        return null;
      }

      // Explicitly construct audio/mpeg blob
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      if (clientBlobCache.size >= MAX_CLIENT_CACHE) {
        const firstKey = clientBlobCache.keys().next().value;
        clientBlobCache.delete(firstKey);
      }
      clientBlobCache.set(cacheKey, blob);
      return blob;
    } catch (err) {
      if (err?.name !== 'AbortError') console.warn('[FishAudio] Chunk network error:', err);
      return null;
    }
  }

  // Pre-fetches audio buffer for low-latency preloading (exported for chat_controller)
  async function fetchTTSBuffer(text, emotion) {
    return fetchChunkAudio(text, emotion);
  }

  // Plays a single audio blob through speakers and drives lip sync
  function playAudioBlob(blob) {
    return new Promise((resolve) => {
      const blobUrl = URL.createObjectURL(blob);
      const audio = new Audio();
      audio.preload = 'auto';
      currentAudio = audio;
      currentAudioUrl = blobUrl;

      // Always ensure volume is audible (defaults to 1.0)
      let vol = typeof window.ttsVolume === 'number' && !isNaN(window.ttsVolume) ? window.ttsVolume : 1;
      if (vol <= 0.05) vol = 1.0;
      audio.volume = vol;

      let isResolved = false;
      const finish = () => {
        if (isResolved) return;
        isResolved = true;
        if (currentAudioFinish === finish) currentAudioFinish = null;
        if (currentAudio === audio) currentAudio = null;
        if (currentAudioUrl === blobUrl) currentAudioUrl = null;
        window.isCurrentlySpeaking = false;
        stopLipSync();
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        setTimeout(() => {
          try { URL.revokeObjectURL(blobUrl); } catch (_) {}
        }, 1000);
        resolve();
      };
      currentAudioFinish = finish;

      audio.onplay = () => {
        window.isCurrentlySpeaking = true;
        startLipSync(audio);
      };

      audio.onended = finish;

      audio.onerror = () => {
        const mediaErr = audio.error;
        if (mediaErr && mediaErr.code === 1) {
          // MEDIA_ERR_ABORTED - normal when pausing/stopping or switching sentences
          finish();
          return;
        }
        console.warn('[FishAudio] Audio playback notification:', mediaErr?.message || mediaErr?.code || 'codec error');
        finish();
      };

      audio.src = blobUrl;
      prepareAudioAnalyser(audio);
      audio.play().catch(err => {
        if (err.name === 'NotAllowedError') {
          console.warn('[FishAudio] Autoplay blocked by browser policy, unlocking on gesture.');
          unlockAudio();
        }
        finish();
      });
    });
  }

  // Incremental TTS session: completed sentences are synthesized while the LLM
  // is still generating the rest of its reply. It keeps one sentence ahead in flight.
  function createStreamingTTSSession(initialEmotion = 'happy') {
    if (window.enableVoice === false) return null;

    // Replace prior speech without falsely finalizing the current chat turn.
    stopTTS(false);
    const queueId = ++activeQueueId;
    const abortController = new AbortController();
    activeFetchController = abortController;

    const queue = [];
    let pendingText = '';
    let seenText = '';
    let currentEmotion = initialEmotion || window.currentEmotion || 'happy';
    let closed = false;
    let pumping = false;
    let notified = false;
    let sessionMessageId = null;

    function prepare(item) {
      if (!item) return Promise.resolve(null);
      if (!item.promise) {
        item.promise = fetchChunkAudio(item.text, item.emotion || currentEmotion, abortController.signal);
      }
      return item.promise;
    }

    function finishIfDrained() {
      if (notified || !closed || pumping || queue.length || queueId !== activeQueueId) return;
      notified = true;
      if (activeFetchController === abortController) activeFetchController = null;
      window.isCurrentlySpeaking = false;
      stopLipSync();
      if (sessionMessageId && activeMessageId === sessionMessageId) {
        updateMessageAudioButtonUI(sessionMessageId, false);
        activeMessageId = null;
      }
      if (typeof window.onAIResponseFullyFinished === 'function') {
        window.onAIResponseFullyFinished();
      }
    }

    async function pump() {
      if (pumping || queueId !== activeQueueId) return;
      pumping = true;
      try {
        while (queue.length && queueId === activeQueueId) {
          const item = queue[0];
          const currentPromise = prepare(item);
          // One look-ahead request gives Fish Audio time to synthesize the next sentence.
          if (queue.length > 1) prepare(queue[1]);

          const blob = await currentPromise;
          if (queueId !== activeQueueId) return;
          if (blob && blob.size > 0 && window.enableVoice !== false) {
            await playAudioBlob(blob);
          }
          if (queueId !== activeQueueId) return;
          if (queue[0] === item) queue.shift();
        }
      } catch (err) {
        if (err?.name !== 'AbortError') console.error('[FishAudio] Streaming TTS queue error:', err);
      } finally {
        pumping = false;
        if (queueId !== activeQueueId) return;
        if (queue.length) void pump();
        else finishIfDrained();
      }
    }

    function enqueueSentence(text) {
      const clean = cleanTextForTTS(text).trim();
      if (!clean || clean.length < 2 || queueId !== activeQueueId) return;
      queue.push({ text: clean, emotion: null, promise: null });
      // If current audio is playing, kick off the next request immediately.
      if (pumping && queue.length > 1) prepare(queue[1]);
      void pump();
    }

    function extractCompleteSentences() {
      const sentenceBoundary = /^([\s\S]*?[.!?~。！？\n])(?=\s|$)/;
      while (pendingText) {
        const match = pendingText.match(sentenceBoundary);
        if (!match) break;
        const sentence = match[1].trim();
        pendingText = pendingText.slice(match[1].length).trimStart();
        if (sentence) enqueueSentence(sentence);
      }
    }

    function push(cumulativeText) {
      if (closed || typeof cumulativeText !== 'string' || !cumulativeText || queueId !== activeQueueId) return;
      let delta = '';
      if (cumulativeText.startsWith(seenText)) {
        delta = cumulativeText.slice(seenText.length);
        seenText = cumulativeText;
      } else if (seenText.startsWith(cumulativeText)) {
        // Ignore a stale, shorter cumulative update.
        return;
      } else {
        // Fallback for providers that send token deltas instead of cumulative text.
        delta = cumulativeText;
        seenText += cumulativeText;
      }
      if (!delta) return;
      pendingText += delta;
      extractCompleteSentences();
    }

    function finish(finalText = '', finalEmotion = null) {
      if (closed || queueId !== activeQueueId) return;
      if (finalEmotion) currentEmotion = finalEmotion;
      // Normally finalText extends the streamed prefix; only append the missing suffix.
      if (typeof finalText === 'string' && finalText && finalText.startsWith(seenText)) {
        push(finalText);
      } else if (!seenText && typeof finalText === 'string' && finalText) {
        push(finalText);
      }
      extractCompleteSentences();
      if (pendingText.trim()) enqueueSentence(pendingText.trim());
      pendingText = '';
      closed = true;
      if (queue.length) void pump();
      else finishIfDrained();
    }

    function setMessageId(messageId) {
      sessionMessageId = messageId || null;
      if (queueId === activeQueueId && sessionMessageId) {
        activeMessageId = sessionMessageId;
        updateMessageAudioButtonUI(sessionMessageId, queue.length > 0 || window.isCurrentlySpeaking);
      }
    }

    return {
      push,
      finish,
      setEmotion: (emotion) => { if (emotion) currentEmotion = emotion; },
      setMessageId,
      cancel: (notify = true) => { if (queueId === activeQueueId) stopTTS(notify); }
    };
  }
  window.createStreamingTTSSession = createStreamingTTSSession;

  // Plays speech synthesized from Fish Audio with Vyra's voice using Sentence Pipelining
  async function playTTS(text, languageCode, messageId, startIndex = 0, preloadBuffer = null, isNew = true, emotion = 'neutral', forcePlay = false) {
    if (!forcePlay && window.enableVoice === false) {
      if (typeof window.onAIResponseFullyFinished === 'function') {
        window.onAIResponseFullyFinished();
      }
      return;
    }

    const clean = cleanTextForTTS(text);
    if (!clean || clean.length < 2) {
      if (typeof window.onAIResponseFullyFinished === 'function') {
        window.onAIResponseFullyFinished();
      }
      return;
    }

    // Stop previous speech without prematurely completing this turn.
    stopTTS(false);
    const queueId = ++activeQueueId;
    const fetchController = new AbortController();
    activeFetchController = fetchController;

    activeMessageId = messageId || null;
    if (activeMessageId) {
      updateMessageAudioButtonUI(activeMessageId, true);
    }

    const chunks = splitIntoNaturalChunks(clean);
    console.log(`[FishAudio] Pipelining ${chunks.length} sentence chunk(s):`, chunks);

    const activeEmotion = emotion || window.currentEmotion || 'happy';

    // Map to hold in-flight or completed chunk promises
    const chunkPromises = new Map();

    function getOrFetchChunk(index) {
      if (index >= chunks.length) return Promise.resolve(null);
      if (!chunkPromises.has(index)) {
        if (index === 0 && preloadBuffer instanceof Blob && preloadBuffer.size > 500) {
          chunkPromises.set(index, Promise.resolve(preloadBuffer));
        } else {
          chunkPromises.set(index, fetchChunkAudio(chunks[index], activeEmotion, fetchController.signal));
        }
      }
      return chunkPromises.get(index);
    }

    // Immediately start fetching Chunk 0 and pre-fetching Chunk 1 in parallel!
    getOrFetchChunk(0);
    if (chunks.length > 1) {
      getOrFetchChunk(1);
    }

    try {
      for (let i = 0; i < chunks.length; i++) {
        // If user stopped or new speech started, abort immediately
        if (activeQueueId !== queueId) break;

        // While chunk i is downloading or playing, ensure chunk i+1 is preloading!
        if (i + 1 < chunks.length) {
          getOrFetchChunk(i + 1);
        }

        const blob = await getOrFetchChunk(i);

        // Check again after await
        if (activeQueueId !== queueId) break;

        if (blob && blob.size > 0) {
          await playAudioBlob(blob);
        }
      }
    } catch (err) {
      console.error('[FishAudio] Sentence pipeline exception:', err);
    } finally {
      if (activeQueueId === queueId) {
        if (activeFetchController === fetchController) activeFetchController = null;
        window.isCurrentlySpeaking = false;
        stopLipSync();
        if (activeMessageId) {
          updateMessageAudioButtonUI(activeMessageId, false);
          activeMessageId = null;
        }
        if (typeof window.onAIResponseFullyFinished === 'function') {
          window.onAIResponseFullyFinished();
        }
      }
    }
  }

  // Auditions Vyra's voice with a sweet sample sentence
  async function testVyraVoice(customText) {
    unlockAudio();
    const previewText = customText || "Hi~ master!! I am Vyra, your sweet companion powered by AURA TTS and the AURA Engine! I'm so happy to chat with you!";
    const statusEl = document.getElementById('ttsPreviewStatus');
    const previewBtn = document.getElementById('previewVyraVoiceBtn');

    if (statusEl) statusEl.textContent = 'Generating AURA voice preview... ⏳';
    if (previewBtn) {
      previewBtn.disabled = true;
      previewBtn.textContent = '⏳ Synthesizing Voice...';
    }

    try {
      // Force play even if enableVoice toggle was unchecked
      await playTTS(previewText, 'en-US', null, 0, null, true, 'happy', true);
      if (statusEl) statusEl.textContent = 'Playing AURA voice preview! 🔊';
    } catch (e) {
      console.error('[FishAudio] Preview error:', e);
      if (statusEl) statusEl.textContent = 'Preview error: ' + (e?.message || 'Check connection.');
    } finally {
      if (previewBtn) {
        previewBtn.disabled = false;
        previewBtn.textContent = "🔊 Test AURA Voice";
      }
    }
  }

  // Volume change handler
  function setTTSVolume(vol) {
    const clamped = Math.max(0, Math.min(1, parseFloat(vol) || 1));
    window.ttsVolume = clamped;
    if (currentAudio) currentAudio.volume = clamped;
    try {
      localStorage.setItem('ttsVolume', clamped.toString());
    } catch (_) {}
  }

  // Unlock audio autoplay on first user gesture anywhere
  function setupGlobalAudioUnlock() {
    function onGesture() {
      unlockAudio();
      window.removeEventListener('click', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
      window.removeEventListener('touchstart', onGesture, true);
    }
    window.addEventListener('click', onGesture, true);
    window.addEventListener('keydown', onGesture, true);
    window.addEventListener('touchstart', onGesture, true);
  }

  setupGlobalAudioUnlock();

  // Export globals to integrate seamlessly into AURA
  window.playTTS = playTTS;
  window.stopTTS = stopTTS;
  window.pauseTTS = pauseTTS;
  window.resumeTTS = resumeTTS;
  window.fetchTTSBuffer = fetchTTSBuffer;
  window.cleanTextForTTS = cleanTextForTTS;
  window.testVyraVoice = testVyraVoice;
  window.setTTSVolume = setTTSVolume;

  // Global speaking flags
  window.isCurrentlySpeaking = false;
  window.enableVoice = true;

})();