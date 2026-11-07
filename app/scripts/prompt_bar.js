// PromptBar Controller with Ultracode Spark Particles
// Seamlessly connects the input bar, Enter key sending, particle canvas, and conversation history

(function() {
  'use strict';

  const ARROW_UP = [12, 4.5, 18.5, 11, 14.25, 11, 14.25, 19.5, 9.75, 19.5, 9.75, 11, 5.5, 11];
  const SQUARE = [12, 6, 18, 6, 18, 12, 18, 18, 6, 18, 6, 12, 6, 6];

  const mix = (a, b, t) => a + (b - a) * t;
  const pathAt = (a, b, t) => {
    let d = '';
    for (let i = 0; i < a.length; i += 2) {
      d += `${i ? 'L' : 'M'}${mix(a[i], b[i], t).toFixed(2)} ${mix(a[i + 1], b[i + 1], t).toFixed(2)}`;
    }
    return `${d}Z`;
  };

  class PromptBarComponent {
    constructor() {
      this.state = {
        draft: '',
        busy: false,
        historyVisible: true
      };

      this.typing = { energy: 0.6, strokes: 0 };
      this.sparkBoost = 1.2;
      this.tVal = 0;
      this.tTarget = 0;
      this.animatingT = false;

      this.init();
    }

    init() {
      this.cacheDomRefs();
      this.setupCanvasSparks();
      this.bindEvents();
      this.updateSendButton();
    }

    cacheDomRefs() {
      this.input = document.getElementById('messageInput');
      this.sendBtn = document.getElementById('sendMessageBtn');
      this.voiceBtn = document.getElementById('voiceInputBtn');
      this.historyToggle = document.getElementById('promptHistoryToggle');
      this.historyChevron = document.getElementById('promptHistoryChevron');
      this.historyBox = document.getElementById('promptBarHistory');
      this.sidebarToggle = document.getElementById('chatSidebarToggle');
      this.canvas = document.getElementById('promptSparksCanvas');
      this.field = document.getElementById('promptBarField');

      // Update global refs
      window.messageInput = this.input;
      window.sendMessageBtn = this.sendBtn;
      window.voiceInputBtn = this.voiceBtn;
      window.chatHistory = document.getElementById('chatHistory');
      window.typingIndicator = document.getElementById('typingIndicator');
      if (window.DomRefs) {
        window.DomRefs.messageInput = this.input;
        window.DomRefs.chatHistory = window.chatHistory;
        window.DomRefs.typingIndicator = window.typingIndicator;
      }
    }

    bindEvents() {
      if (!this.input || !this.sendBtn) return;

      // History visibility toggle
      if (this.historyToggle && this.historyBox) {
        this.historyToggle.addEventListener('click', () => {
          this.state.historyVisible = !this.state.historyVisible;
          this.historyBox.classList.toggle('hidden', !this.state.historyVisible);
          if (this.historyChevron) {
            this.historyChevron.textContent = this.state.historyVisible ? '▼' : '▲';
          }
        });
      }

      // Sidebar toggle
      if (this.sidebarToggle) {
        this.sidebarToggle.addEventListener('click', () => {
          const sidebar = document.getElementById('chatSidebar');
          if (sidebar) sidebar.classList.toggle('visible');
        });
      }

      // Full chatbox container & field click-to-focus delegation
      const forwardFocusToInput = (e) => {
        // If clicking on or inside the send or voice mic button, let those buttons handle it
        if (this.sendBtn && (this.sendBtn === e.target || this.sendBtn.contains(e.target))) {
          return;
        }
        if (this.voiceBtn && (this.voiceBtn === e.target || this.voiceBtn.contains(e.target))) {
          return;
        }
        if (this.input) {
          this.input.focus();
          // If clicked outside the textarea itself (edges, padding, empty space), place caret at the end
          if (e.target !== this.input) {
            const len = this.input.value.length;
            try {
              this.input.setSelectionRange(len, len);
            } catch (err) {}
          }
        }
      };

      if (this.field) {
        this.field.addEventListener('click', forwardFocusToInput);
        this.field.addEventListener('pointerdown', (e) => {
          if (this.sendBtn && (this.sendBtn === e.target || this.sendBtn.contains(e.target))) return;
          if (this.voiceBtn && (this.voiceBtn === e.target || this.voiceBtn.contains(e.target))) return;
          if (this.input && document.activeElement !== this.input) {
            this.input.focus();
          }
        });
      }

      const promptBarRoot = document.getElementById('promptBarRoot');
      if (promptBarRoot && promptBarRoot !== this.field) {
        promptBarRoot.addEventListener('click', forwardFocusToInput);
        promptBarRoot.addEventListener('pointerdown', (e) => {
          if (this.sendBtn && (this.sendBtn === e.target || this.sendBtn.contains(e.target))) return;
          if (this.voiceBtn && (this.voiceBtn === e.target || this.voiceBtn.contains(e.target))) return;
          if (this.input && document.activeElement !== this.input) {
            this.input.focus();
          }
        });
      }

      // Input changes & typing spark boost
      this.input.addEventListener('input', () => {
        this.state.draft = this.input.value;
        this.typing.energy = Math.min(2.5, this.typing.energy + 0.4);
        this.typing.strokes = Math.min(6, this.typing.strokes + 1);
        this.adjustInputHeight(this.input);
        this.updateSendButton();
      });

      // Keydown handler (Enter to send, Shift+Enter for multiline)
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          if (this.canSend()) {
            this.triggerSend();
          }
        }
      });

      // Send / Stop button handler
      this.sendBtn.addEventListener('click', () => {
        if (this.state.busy || window.isProcessing) {
          if (typeof window.stopTTS === 'function') window.stopTTS();
          if (window.abortController) window.abortController.abort();
          this.setBusy(false);
        } else if (this.canSend()) {
          this.triggerSend();
        }
      });
    }

    canSend() {
      const val = this.input ? this.input.value.trim() : '';
      return val.length > 0;
    }

    triggerSend() {
      if (window.STTManager && typeof window.STTManager.stop === 'function' && window.STTManager.isListening) {
        window.STTManager.stop();
      }
      if (typeof window.unlockAudio === 'function') {
        window.unlockAudio();
      }
      if (typeof window.sendMessage === 'function') {
        window.sendMessage();
      }
      setTimeout(() => {
        this.adjustInputHeight(this.input);
        this.updateSendButton();
      }, 50);
    }

    adjustInputHeight(el) {
      if (!el) return;
      el.style.height = 'auto';
      const max = 110;
      el.style.height = `${Math.min(el.scrollHeight, max)}px`;
      el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
    }

    updateSendButton() {
      if (!this.sendBtn) return;
      const busy = !!(this.state.busy || window.isProcessing);
      const armed = busy || this.canSend();
      this.sendBtn.disabled = !armed;
      this.sendBtn.toggleAttribute('data-armed', armed);
    }

    setBusy(isBusy) {
      this.state.busy = isBusy;
      this.tTarget = isBusy ? 1 : 0;
      this.animateMorph();
      this.updateSendButton();
    }

    animateMorph() {
      if (this.animatingT) return;
      this.animatingT = true;

      const pathEl = document.getElementById('promptGlyphPath');
      const start = performance.now();
      const initial = this.tVal;
      const target = this.tTarget;
      const duration = 220;

      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        this.tVal = initial + (target - initial) * ease;

        if (pathEl) {
          pathEl.setAttribute('d', pathAt(ARROW_UP, SQUARE, this.tVal));
        }

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          this.tVal = target;
          this.animatingT = false;
        }
      };

      requestAnimationFrame(tick);
    }

    setupCanvasSparks() {
      const canvas = document.getElementById('promptSparksCanvas');
      const field = document.getElementById('promptBarField');
      if (!canvas || !field) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let width = 0;
      let height = 0;
      let dpr = 1;

      const resize = () => {
        const rect = field.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(1, Math.floor(rect.width));
        height = Math.max(1, Math.floor(rect.height));
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      resize();
      window.addEventListener('resize', resize, { passive: true });

      const COUNT = 28;
      const sparks = [];

      for (let i = 0; i < COUNT; i++) {
        sparks.push({
          x: Math.random() * (width || 300),
          y: Math.random() * (height || 50),
          vx: (Math.random() - 0.5) * 0.45,
          vy: -Math.random() * 0.55 - 0.15,
          size: Math.random() * 1.8 + 0.6,
          life: Math.random(),
          maxLife: Math.random() * 0.7 + 0.3,
          hue: 250 + Math.random() * 50
        });
      }

      let lastTime = performance.now();

      const animate = (now) => {
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        this.typing.energy = Math.max(0.4, this.typing.energy - dt * 0.35);

        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < sparks.length; i++) {
          const s = sparks[i];
          s.life += dt * (0.35 + this.typing.energy * 0.45);

          if (s.life >= s.maxLife) {
            s.life = 0;
            s.x = Math.random() * width;
            s.y = height + 4;
            s.vx = (Math.random() - 0.5) * (0.4 + this.typing.energy * 0.4);
            s.vy = -Math.random() * (0.6 + this.typing.energy * 0.8) - 0.2;
            s.maxLife = Math.random() * 0.6 + 0.3;
          }

          s.x += s.vx * (1 + this.typing.energy * 0.5);
          s.y += s.vy * (1 + this.typing.energy * 0.5);

          const progress = s.life / s.maxLife;
          const alpha = Math.sin(progress * Math.PI) * (0.45 + this.typing.energy * 0.35);

          ctx.fillStyle = `hsla(${s.hue}, 85%, 75%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * (0.8 + this.typing.energy * 0.3), 0, Math.PI * 2);
          ctx.fill();
        }

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }
  }

  function initPromptBar() {
    window.PromptBarInstance = new PromptBarComponent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPromptBar);
  } else {
    initPromptBar();
  }
})();