// tutorial.js - Help & Tutorial steps renderer
(function () {
  const bodyEl = document.getElementById("settingsTutorialContent");
  
  const defaultSteps = [
    {
      title: "👋 Welcome to AURA",
      body: "AURA pairs an interactive Live2D anime companion 🎭 with intelligent conversational chat 💬. You can move 🖱️ and zoom 🔍 your character, and chat seamlessly in real time."
    },
    {
      title: "💬 Conversational Chat & Memory",
      body: "Type your message ⌨️ and press Enter ↩️. AURA replies with streaming text, emotional expressions, and natural gestures 🎭. Your chat history is saved locally in your browser 💾."
    },
    {
      title: "🎭 Live2D Characters & Gallery",
      body: "Browse and choose your favorite companion in Settings → Live2D Characters (Character Gallery) 🧩. Drag the character with your mouse or finger 🖱️ to reposition, scroll or pinch 🔍 to zoom, or tap 'Reset Character Position & Scale' to re-center."
    },
    {
      title: "✨ Emotion & Action Directions",
      body: "AURA cleanly separates dialogue from action descriptions ✨. Emotion tags and stage directions (like *smiles*, (laughs softly), or [speaking slowly]) trigger matching Live2D facial expressions and motions while keeping text responses clean."
    },
    {
      title: "🌐 Multilingual Support",
      body: "Chat with AURA in English, Japanese, Spanish, Hindi, or 50+ other languages 🌎. The AI understands and replies naturally in your spoken language with matching character emotions."
    },
    {
      title: "⚙️ Preferences",
      body: "In Settings → Preferences ⚙️, you can enable 'Load multiple models at once' if you want to display multiple anime companions together."
    }
  ];

  window.TUTORIAL_STEPS = defaultSteps;

  async function render() {
    if (!bodyEl) return;
    const langCode = window.currentInterfaceLanguage || "en-US";
    let displaySteps = defaultSteps;
    if (langCode !== "en-US" && typeof translateTutorialSteps === 'function') {
      displaySteps = await translateTutorialSteps(defaultSteps, langCode);
    }
    const stepsHtml = displaySteps
      .map((step) => `<div class="tutorial-step-card"><h4>${step.title}</h4><p>${step.body.replace(/\n/g, "<br>")}</p></div>`)
      .join("");
    bodyEl.innerHTML = stepsHtml;
    window.lastTutorialLang = langCode;
  }

  window.renderTutorial = async function () {
    try {
      await render();
    } catch (error) {
      console.error("Failed to render tutorial", error);
      if (bodyEl) {
        bodyEl.innerHTML = defaultSteps.map((step) => `<div class="tutorial-step-card"><h4>${step.title}</h4><p>${step.body.replace(/\n/g, "<br>")}</p></div>`).join("");
      }
    }
  };

  window.rerenderTutorial = window.renderTutorial;
})();
