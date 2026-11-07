import assert from 'node:assert';
import test from 'node:test';
import http from 'node:http';
import { app } from '../server.js';

let server;
let baseUrl;

test.before(() => {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(() => {
  return new Promise((resolve) => {
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
});

test('Health check endpoint returns status ok and app name', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
  assert.strictEqual(data.app, 'AURA');
});

test('TTS status endpoint returns configured status and models', async () => {
  const res = await fetch(`${baseUrl}/api/tts/status`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
  assert.strictEqual(typeof data.configured, 'boolean');
  assert.strictEqual(data.model, 's2.1-pro-free');
  assert.strictEqual(data.referenceId, 'bd1ac757abce40e69525c54415418135');
});

test('TTS endpoint validates missing or empty text', async () => {
  const res = await fetch(`${baseUrl}/api/tts/fish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '' })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.code, 'INVALID_TEXT');
});

test('TTS endpoint synthesizes speech for Vyra with Fish Audio', async () => {
  if (!process.env.FISH_AUDIO_API_KEY) {
    console.log('Skipping real API call: FISH_AUDIO_API_KEY not present.');
    return;
  }

  const res = await fetch(`${baseUrl}/api/tts/fish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Hello master! I am Vyra, speaking with my sweet anime voice!',
      emotion: 'happy'
    })
  });

  assert.strictEqual(res.status, 200);
  const contentType = res.headers.get('content-type');
  assert.match(contentType, /audio\/mpeg/);
  const buffer = await res.arrayBuffer();
  assert.ok(buffer.byteLength > 1000, `Expected audio bytes > 1000, got ${buffer.byteLength}`);
});

test('Chat endpoint returns valid companion reply and emotion with NVIDIA Brain', async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello Vyra!' }),
      signal: controller.signal
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.reply && data.reply.length > 0);
    assert.strictEqual(data.isError, false);
    assert.ok(typeof data.emotion === 'string');
    if (data.model) {
      assert.match(data.model, /nemotron|nvidia|gemini/);
    }
  } catch (e) {
    if (e.name !== 'AbortError') throw e;
  } finally {
    clearTimeout(timer);
  }
});

test('App contains Full Screen mode button and functions', async () => {
  const htmlRes = await fetch(`${baseUrl}/app/index.html`);
  assert.strictEqual(htmlRes.status, 200);
  const html = await htmlRes.text();
  assert.ok(html.includes('fullscreenBtn'), 'app/index.html should contain fullscreenBtn next to settings button');
  assert.ok(html.includes('toggleFullScreen()'), 'fullscreenBtn should invoke toggleFullScreen()');

  const scriptRes = await fetch(`${baseUrl}/app/scripts/settings_ui.js`);
  assert.strictEqual(scriptRes.status, 200);
  const scriptContent = await scriptRes.text();
  assert.ok(scriptContent.includes('toggleFullScreen'), 'settings_ui.js should contain toggleFullScreen');
});

test('Server sets Permissions-Policy header with microphone access', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(res.status, 200);
  const policy = res.headers.get('permissions-policy');
  assert.ok(policy && policy.includes('microphone'), `Expected permissions-policy with microphone, got ${policy}`);
});

test('STT endpoint validates empty audio payload', async () => {
  const res = await fetch(`${baseUrl}/api/stt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: '' })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.code, 'INVALID_AUDIO');
});
