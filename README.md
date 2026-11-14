<div align="center">
  <a href="https://itsaura.ai.studio/app/">
    <img src="https://raw.githubusercontent.com/ar0x1/AURA/main/favicon.png" alt="AURA logo" width="104" />
  </a>

  <h1>A U R A</h1>
  <p><strong>AN AI COMPANION THAT DOESN'T JUST RESPOND — IT COMES ALIVE.</strong></p>
  <p><code>VOICE // MEMORY // PERSONALITY // LIVE2D</code></p>

  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=14&duration=2600&pause=850&color=9B7BFF&center=true&vCenter=true&width=680&lines=Meet+your+companion.+Give+it+a+voice.;Expressive+Live2D.+Natural+conversations.;Built+by+ar0x.+Made+to+feel+alive." alt="AURA animated tagline" />

  <br />
  <a href="https://itsaura.ai.studio/app/"><img src="https://img.shields.io/badge/LAUNCH%20AURA-8B5CF6?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Launch AURA" /></a>
  <a href="https://itsaura.ai.studio/"><img src="https://img.shields.io/badge/WEBSITE-18181B?style=for-the-badge&logo=firefoxbrowser&logoColor=white" alt="AURA website" /></a>
  <a href="https://github.com/ar0x1/AURA"><img src="https://img.shields.io/badge/SOURCE-18181B?style=for-the-badge&logo=github&logoColor=white" alt="Source code" /></a>

  <br /><br />
  <img src="https://img.shields.io/github/stars/ar0x1/AURA?style=flat-square&color=8B5CF6&label=STARS" alt="GitHub stars" />
  <img src="https://img.shields.io/github/forks/ar0x1/AURA?style=flat-square&color=8B5CF6&label=FORKS" alt="GitHub forks" />
  <img src="https://img.shields.io/github/license/ar0x1/AURA?style=flat-square&color=8B5CF6&label=LICENSE" alt="License" />
  <img src="https://img.shields.io/badge/NODE-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 20 or newer" />

  <br /><br />
  <a href="https://itsaura.ai.studio/">
    <img src="https://raw.githubusercontent.com/ar0x1/AURA/main/assets/AURA.png" alt="AURA application preview" width="760" />
  </a>

  <sub>AN ar0x PROJECT · OPEN SOURCE · MIT-0</sub>
</div>

---

## `01` — The idea

**AURA by ar0x** brings an AI companion out of the chat box and onto your screen.

Talk in real time, give your companion a distinct personality, and watch an expressive **Live2D character** react with voice, emotions, and motion. AURA combines configurable AI models, conversation context, and speech into one customizable browser experience.

> Not just another chat window. A character with a voice, expressions, and a place on your screen.

## `02` — What makes AURA different

<table>
  <tr>
    <td width="50%">
      <h3>◈ AI conversations</h3>
      Streaming chat through OpenRouter, configurable model fallbacks, custom personas, and rolling conversation summaries.
    </td>
    <td width="50%">
      <h3>◈ Live2D presence</h3>
      Animated Cubism characters, a model gallery, custom model URLs, idle motion, and emotion-linked expressions.
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>◈ Voice & lip-sync</h3>
      Fish Audio speech generation, natural sentence chunks, audio preloading, and audio-reactive mouth movement.
    </td>
    <td width="50%">
      <h3>◈ Your own space</h3>
      Custom backgrounds, adjustable panels, language options, ambient chat, message queues, and detailed debug tools.
    </td>
  </tr>
</table>

### More under the hood

- **Make it yours:** customize the companion's identity, personality, and response behavior.
- **Bring your own model:** choose from the character gallery or load a Live2D `.model3.json` URL.
- **Keep the conversation flowing:** configurable context depth and rolling summaries help preserve useful context.
- **Tune the experience:** move and resize panels, adjust opacity, change backgrounds, and personalize the interface.
- **Stay in control:** optional ambient conversation, voice controls, message queue, and categorized debug logs.

## `03` — Get started

### Requirements

- Node.js **20 or newer** and npm
- A modern browser
- Internet access for configured AI providers, voice generation, and remote model assets

### Install

```bash
git clone https://github.com/ar0x1/AURA.git
cd AURA
npm install
```

### Configure providers

Create a `.env` file in the project root. Add only the keys for the services you plan to use:

```env
# Optional server-side chat fallback
NVIDIA_API_KEY=your_nvidia_api_key
GEMINI_API_KEY=your_gemini_api_key

# Required for Fish Audio voice generation
FISH_AUDIO_API_KEY=your_fish_audio_api_key

# Optional overrides
# NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
# NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
# FISH_AUDIO_MODEL=s2.1-pro-free
# FISH_AUDIO_REFERENCE_ID=your_reference_id
```

The browser-side OpenRouter integration uses its own API-key and model settings in the app. It supports a primary model and up to two fallback models.

> **Keep your keys private.** Never commit `.env` or post API keys in issues, screenshots, or logs.

### Run AURA

```bash
# Development
npm run dev

# Or start normally
npm start
```

Open the app at **http://localhost:3000**.

| Local route | Purpose |
|---|---|
| `/` | Landing page |
| `/app/` | AURA companion |
| `/api/health` | Server health check |

## `04` — Make it yours

1. Launch AURA and open **Settings**.
2. Choose a character in **Models & Visuals → Character Gallery**.
3. Configure your AI provider, model, and companion persona.
4. Enable speech in **Voice & Audio** and adjust the volume.
5. Personalize the background and layout, then start a conversation.

For a custom Live2D character, provide a reachable `.model3.json` URL with its referenced assets available.

## `05` — How the pieces connect

| Layer | Technology | Role |
|---|---|---|
| Browser chat | OpenRouter | Configurable AI models and streaming responses |
| Server fallback | NVIDIA Nemotron · Gemini | Optional fallback response path |
| Voice | Fish Audio | Server-proxied speech generation |
| Character runtime | Live2D Cubism · PIXI.js | Character rendering, expressions, and motion |
| Server | Node.js · Express | Local app server and API routes |

The server exposes `/api/chat`, `/api/chat/stream`, `/api/tts`, `/api/tts/fish`, `/api/tts/stream`, and `/api/health`.

## `06` — Developer commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm start` | Start AURA normally |
| `npm test` | Run the test suite |
| `npm run lint` | Run the server JavaScript syntax check |

### Project layout

```text
AURA/
├── app/          # Browser app, scripts, and styles
├── assets/       # Artwork and visual assets
├── test/         # Automated tests
├── server.js     # Express server and API routes
├── index.html    # Landing page
├── package.json  # Dependencies and scripts
└── LICENSE       # MIT-0 license
```

## `07` — Contribute

Ideas, bug reports, and pull requests are welcome.

- [Report a bug or request a feature](https://github.com/ar0x1/AURA/issues)
- [Explore the source](https://github.com/ar0x1/AURA)

When reporting an issue, include reproduction steps and relevant error messages. **Remove API keys and other secrets first.**

## `08` — License

AURA is released under the **MIT No Attribution (MIT-0)** license. See [`LICENSE`](LICENSE) for the full terms.

---

<div align="center">
  <h3>GIVE YOUR SCREEN A LITTLE MORE LIFE.</h3>
  <p><strong>AURA</strong> — crafted by <a href="https://github.com/ar0x1">ar0x</a>.</p>
  <a href="https://itsaura.ai.studio/app/">LAUNCH AURA</a> &nbsp;·&nbsp;
  <a href="https://itsaura.ai.studio/">WEBSITE</a> &nbsp;·&nbsp;
  <a href="https://github.com/ar0x1/AURA">SOURCE</a>
</div>
