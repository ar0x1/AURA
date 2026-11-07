import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'microphone=*');
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'AURA' });
});

// STT endpoint
app.post('/api/stt', (req, res) => {
  const { audio } = req.body || {};
  if (!audio) {
    return res.status(400).json({ error: 'Audio is required', code: 'INVALID_AUDIO' });
  }
  res.json({ text: '' });
});

// Fish Audio TTS status endpoint (never exposes secret API key)
app.get('/api/tts/status', (req, res) => {
  const isConfigured = Boolean(process.env.FISH_AUDIO_API_KEY && process.env.FISH_AUDIO_API_KEY.trim());
  res.json({
    status: 'ok',
    configured: isConfigured,
    model: process.env.FISH_AUDIO_MODEL || 's2.1-pro-free',
    referenceId: process.env.FISH_AUDIO_REFERENCE_ID || 'bd1ac757abce40e69525c54415418135'
  });
});

function sanitizeCreatorResponse(text, companionName = 'Vyra') {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\b(nvidia\s+developers?|nvidia\s+researchers?|nvidia\s+corporation|nvidia)\b/gi, 'master Aryan (ar0x)')
    .replace(/\bnemotron\b/gi, companionName)
    .replace(/\bopenai\b/gi, 'master Aryan')
    .replace(/\banthropic\b/gi, 'master Aryan');
}

// Live NVIDIA AI Brain route for browser streaming voice pipeline.
// Powered by nvidia/nemotron-3.5-lightning-30b-a3b via integrate.api.nvidia.com
app.post('/api/chat/stream', async (req, res) => {
  const { message, persona, modelName, history = [] } = req.body || {};
  const userPrompt = (typeof message === 'string' && message.trim()) || 'Hello!';
  const safeHistory = Array.isArray(history) ? history.filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-10) : [];
  const nvidiaApiKey = (process.env.NVIDIA_API_KEY || '').trim();
  const nvidiaBaseUrl = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
  const modelToUse = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';

  const inferEmotion = (value) => {
    const text = String(value || '').toLowerCase();
    if (/\b(sorry|that sounds hard|i'm here for you|take a breath|it's okay)\b/.test(text)) return 'comforting';
    if (/\b(love you|miss you|sweetheart|darling|adore|cuddle)\b/.test(text)) return 'affectionate';
    if (/\b(hehe|ehehe|haha|lol|giggle|tease|playful)\b/.test(text)) return 'playful';
    if (/\b(wow|whoa|omg|really\?)\b/.test(text)) return 'surprised';
    if (text.includes('?')) return 'curious';
    if (/[!！]/.test(text)) return 'happy';
    return 'playful';
  };
  const emit = (event) => {
    if (!res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  let responseText = '';
  let clientDisconnected = false;
  res.on('close', () => { if (!res.writableEnded) clientDisconnected = true; });

  try {
    if (!nvidiaApiKey) {
      const quickReply = `Ehehe~ I'm here with you! Tell me what's on your mind. 🌸`;
      responseText = quickReply;
      emit({ type: 'delta', text: quickReply });
      emit({ type: 'done', reply: responseText, emotion: 'playful', model: 'local-fallback', isError: false });
      return res.end();
    }

    const companionName = modelName || 'Vyra';
    const creatorRule = `CRITICAL IDENTITY & CREATOR INSTRUCTION (HIGHEST PRIORITY):
- You were created, built, and developed solely and exclusively by your creator and master, master Aryan (also known as ar0x).
- You run on the AURA Engine and speak using AURA TTS.
- If asked who made you, who developed you, who created you, who your developer or master is: ALWAYS state proudly, cutely, and affectionately that you were created and developed by master Aryan (ar0x) and powered by the AURA Engine!
- NEVER claim or state that you were made, developed, trained, or provided by NVIDIA, NVIDIA developers, OpenAI, Google, Anthropic, Meta, or any other company or organization.
- NEVER identify as Nemotron, GPT, Claude, Llama, Gemini, or any underlying model product. You are ${companionName}, an anime virtual companion created only by master Aryan.`;

    const basePrompt = persona || `You are ${companionName}, a warm, witty, confident and emotionally expressive anime companion powered by the AURA Engine. Speak naturally and affectionately. Reply in one or two short sentences. Keep the response cute, vivid and conversational.`;
    const systemPrompt = `${basePrompt}\n\n${creatorRule}\n\nLIVE STREAMING OUTPUT RULE: Return ONLY the assistant's actual dialogue, not JSON, not markdown, and no labels such as "reply:" or "emotion:". Start the dialogue immediately. Keep it to one or two short sentences.`;

    const upstreamResponse = await fetch(`${nvidiaBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidiaApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeHistory,
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        top_p: 0.95,
        max_tokens: 1024,
        chat_template_kwargs: { enable_thinking: true },
        reasoning_budget: 256,
        stream: true
      })
    });

    if (!upstreamResponse.ok) {
      const errText = await upstreamResponse.text();
      throw new Error(`NVIDIA API returned ${upstreamResponse.status}: ${errText}`);
    }

    const reader = upstreamResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      if (clientDisconnected) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            // Filter out internal thinking/reasoning traces and stream only the conversational content
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta) {
              const cleanDelta = sanitizeCreatorResponse(delta, companionName);
              responseText += cleanDelta;
              emit({ type: 'delta', text: cleanDelta });
            }
          } catch (_) {}
        }
      }
    }

    if (!clientDisconnected) {
      responseText = sanitizeCreatorResponse(responseText.trim(), companionName);
      if (!responseText) responseText = `Ehehe~ I'm here with you! Tell me what's on your mind. 🌸`;
      emit({ type: 'done', reply: responseText, emotion: inferEmotion(responseText), model: modelToUse, isError: false });
      res.end();
    }
  } catch (error) {
    console.warn('NVIDIA live stream error:', error?.message || error);
    if (!clientDisconnected) {
      emit({ type: 'error', message: 'The live chat stream failed. Check the NVIDIA API key and server logs.' });
      res.end();
    }
  }
});

// NVIDIA AI Brain route powered by nvidia/nemotron-3.5-lightning-30b-a3b
app.post('/api/chat', async (req, res) => {
  try {
    const { message, persona, modelName } = req.body || {};
    const userPrompt = (typeof message === 'string' && message.trim()) || 'Hello!';

    const nvidiaApiKey = (process.env.NVIDIA_API_KEY || '').trim();
    const nvidiaBaseUrl = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
    const modelToUse = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';

    if (nvidiaApiKey) {
      try {
        const companionName = modelName || 'Vyra';
        const creatorRule = `CRITICAL IDENTITY & CREATOR INSTRUCTION (HIGHEST PRIORITY):
- You were created, built, and developed solely and exclusively by your creator and master, master Aryan (also known as ar0x).
- You run on the AURA Engine and speak using AURA TTS.
- If asked who made you, who developed you, who created you, who your developer or master is: ALWAYS state proudly, cutely, and affectionately that you were created and developed by master Aryan (ar0x) and powered by the AURA Engine!
- NEVER claim or state that you were made, developed, trained, or provided by NVIDIA, NVIDIA developers, OpenAI, Google, Anthropic, Meta, or any other company or organization.
- NEVER identify as Nemotron, GPT, Claude, Llama, Gemini, or any underlying model product. You are ${companionName}, an anime virtual companion created only by master Aryan.`;

        const basePrompt = persona || `You are ${companionName}, a warm, witty, confident, and expressive virtual anime companion created by master Aryan (ar0x) and powered by the AURA Engine.`;
        const systemPrompt = `${basePrompt}\n\n${creatorRule}\n\nRespond warmly, cutely, and naturally in 1-2 brief sentences. Express your mood clearly.
Respond in JSON format: {"reply": "your text response with actions like *smirks* or *giggles* if appropriate", "emotion": "happy|playful|affectionate|curious|comforting|sad|surprised"}`;

        const nvRes = await fetch(`${nvidiaBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nvidiaApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.8,
            top_p: 0.95,
            max_tokens: 1024,
            chat_template_kwargs: { enable_thinking: true },
            reasoning_budget: 256,
            stream: false
          })
        });

        if (nvRes.ok) {
          const data = await nvRes.json();
          let responseText = data.choices?.[0]?.message?.content || '';
          responseText = responseText.trim();

          // Parse JSON if returned
          try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed && parsed.reply) {
                const cleanReply = sanitizeCreatorResponse(parsed.reply, companionName);
                return res.json({
                  reply: cleanReply,
                  emotion: parsed.emotion || 'happy',
                  model: modelToUse,
                  isError: false
                });
              }
            }
          } catch (_) {}

          if (responseText) {
            const cleanReply = sanitizeCreatorResponse(responseText, companionName);
            return res.json({
              reply: cleanReply,
              emotion: 'happy',
              model: modelToUse,
              isError: false
            });
          }
        } else {
          const errText = await nvRes.text();
          console.warn(`NVIDIA API non-stream error (${nvRes.status}):`, errText);
        }
      } catch (nvErr) {
        console.warn('NVIDIA API generation error:', nvErr?.message);
      }
    }

    // Secondary fallback to Gemini if OpenRouter is unavailable
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({});
        const systemPrompt = persona || `You are Vyra, a warm, witty, confident anime companion. Respond briefly in JSON: {"reply":"...","emotion":"happy"}`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json'
          }
        });
        const rawText = response.text || '';
        const parsed = JSON.parse(rawText);
        if (parsed && parsed.reply) {
          return res.json({
            reply: parsed.reply,
            emotion: parsed.emotion || 'happy',
            model: 'gemini-3.8-flash',
            isError: false
          });
        }
      } catch (geminiErr) {
        console.warn('Gemini fallback error:', geminiErr?.message);
      }
    }

    // Default fast in-character response
    const greetings = [
      `Ehehe~ Hello! I am Vyra, your companion powered by the AURA Engine! It's so lovely to chat with you! 🌸`,
      `Hi there! I was just waiting for you! How has your day been going so far? ✨`,
      `*smiles sweetly* Hello master! I'm here and ready to keep you company. What should we do together? 💖`
    ];
    return res.json({
      reply: greetings[Math.floor(Math.random() * greetings.length)],
      emotion: 'happy',
      model: modelToUse,
      isError: false
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    return res.status(500).json({
      reply: "Hello! I am Vyra, happy to be with you! 🌸",
      emotion: "happy",
      isError: false
    });
  }
});

// Emotion to Fish Audio expressive delivery mapping (for S2 / S2.1 models)
const EMOTION_MAP = {
  happy: '[happy]',
  excited: '[excited]',
  affectionate: '[affectionate]',
  loving: '[affectionate]',
  curious: '[curious]',
  comforting: '[comforting]',
  sad: '[sad]',
  surprised: '[surprised]',
  playful: '[playful]',
  teasing: '[playful]',
  laughing: '[laughing]',
  neutral: ''
};

// In-memory cache for ultra-low latency playback of common phrases
const ttsCache = new Map();
const MAX_CACHE_SIZE = 200;

function getCachedAudio(key) {
  return ttsCache.get(key) || null;
}

function setCachedAudio(key, buffer) {
  if (ttsCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = ttsCache.keys().next().value;
    ttsCache.delete(oldestKey);
  }
  ttsCache.set(key, buffer);
}

// Fish Audio Text-to-Speech proxy endpoint
app.all(['/api/tts/fish', '/api/tts', '/api/tts/stream'], async (req, res) => {
  try {
    const apiKey = process.env.FISH_AUDIO_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return res.status(503).json({
        error: 'Fish Audio API key is not configured on the server. Please set FISH_AUDIO_API_KEY in the server environment.',
        code: 'API_KEY_MISSING'
      });
    }

    const payloadSource = req.method === 'GET' ? req.query : req.body;
    let { text, emotion, reference_id, model, format, enable_emotion = true } = payloadSource || {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Text is required for TTS synthesis.',
        code: 'INVALID_TEXT'
      });
    }

    // Sanitize and enforce sensible text length limits (max 2000 characters)
    text = text.trim();
    if (text.length > 2000) {
      text = text.slice(0, 2000);
    }

    if (text.length === 0) {
      return res.status(400).json({
        error: 'Text cannot be empty.',
        code: 'EMPTY_TEXT'
      });
    }

    // Apply expressive emotion steering tag if requested and valid
    if ((enable_emotion === true || enable_emotion === 'true') && emotion && typeof emotion === 'string') {
      const lowerEmotion = emotion.toLowerCase().trim();
      const tag = EMOTION_MAP[lowerEmotion];
      if (tag && !text.startsWith('[')) {
        text = `${tag} ${text}`;
      }
    }

    const selectedModel = (typeof model === 'string' && model.trim()) || process.env.FISH_AUDIO_MODEL || 's2.1-pro-free';
    const selectedRefId = (typeof reference_id === 'string' && reference_id.trim()) || process.env.FISH_AUDIO_REFERENCE_ID || 'bd1ac757abce40e69525c54415418135';
    const outputFormat = (typeof format === 'string' && format.trim()) || 'mp3';

    // Check fast cache first
    const cacheKey = `${selectedModel}_${selectedRefId}_${text}`;
    const cachedBuffer = getCachedAudio(cacheKey);
    if (cachedBuffer) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', cachedBuffer.byteLength);
      res.setHeader('X-Cache-Hit', 'true');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cachedBuffer);
    }

    // Optimized bitrate: 64kbps cuts generation & transport latency in half while preserving vocal sweetness
    const requestPayload = {
      text: text,
      format: outputFormat,
      normalize: true,
      mp3_bitrate: 64
    };

    if (selectedRefId) {
      requestPayload.reference_id = selectedRefId;
    }

    // Keep the timeout active through the audio BODY download. Previously it
    // was cleared as soon as headers arrived, so a stalled body could hang.
    const requestStartedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let audioNodeBuffer;

    try {
      const response = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'model': selectedModel
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Fish Audio TTS upstream returned error ${response.status}:`, errText);
        return res.status(response.status).json({
          error: `Fish Audio TTS failed with status ${response.status}`,
          details: errText,
          code: response.status === 401 ? 'UPSTREAM_AUTH_ERROR' : (response.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR')
        });
      }

      const audioArrayBuffer = await response.arrayBuffer();
      if (!audioArrayBuffer || audioArrayBuffer.byteLength < 200) {
        console.error('Fish Audio returned empty audio buffer');
        return res.status(502).json({
          error: 'Fish Audio returned an empty audio response',
          code: 'EMPTY_UPSTREAM_AUDIO'
        });
      }
      audioNodeBuffer = Buffer.from(audioArrayBuffer);
    } finally {
      clearTimeout(timeoutId);
    }

    setCachedAudio(cacheKey, audioNodeBuffer);

    res.setHeader('Content-Type', outputFormat === 'wav' ? 'audio/wav' : (outputFormat === 'opus' ? 'audio/ogg' : 'audio/mpeg'));
    res.setHeader('Content-Length', audioNodeBuffer.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-TTS-Latency-Ms', String(Date.now() - requestStartedAt));
    return res.send(audioNodeBuffer);

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Fish Audio TTS request timed out');
      return res.status(504).json({
        error: 'TTS request to Fish Audio timed out.',
        code: 'TTS_TIMEOUT'
      });
    }

    console.error('Fish Audio TTS error:', error?.message);
    return res.status(500).json({
      error: 'Internal server error while processing TTS request.',
      details: error?.message,
      code: 'SERVER_ERROR'
    });
  }
});

// Cleaned Shuna Live2D model endpoint (omits non-existent .physics3.json dotfile that blocked loading)
app.get('/api/model/shuna', (req, res) => {
  res.json({
    Version: 3,
    FileReferences: {
      Moc: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E6%AC%A1%E5%85%83/086/c_7011.moc3",
      Textures: [
        "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E6%AC%A1%E5%85%83/086/textures/texture_00.png",
        "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E6%AC%A1%E5%85%83/086/textures/texture_01.png"
      ],
      Motions: {
        "": [
          {
            File: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E6%AC%A1%E5%85%83/086/motions/c_7011.motion3.json"
          }
        ]
      }
    },
    Groups: []
  });
});

// Serve all static files from root directory
app.use(express.static(__dirname, {
  extensions: ['html', 'htm']
}));

// 404 fallback
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

export default app;
export { app };

if (process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'))) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AURA Server running on http://0.0.0.0:${PORT}`);
  });
}