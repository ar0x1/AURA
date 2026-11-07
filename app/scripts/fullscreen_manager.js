// AURA Full Screen Mode Manager
// Provides seamless fullscreen toggling with standard HTML5 Fullscreen API
// and graceful fallback for restricted/iframe environments.

(function() {
  'use strict';

  class FullscreenManager {
    constructor() {
      this.isPseudoFullscreen = false;
      this.init();
    }

    init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.bindUI());
      } else {
        this.bindUI();
      }

      this.bindFullscreenEvents();
    }

    isFullscreen() {
      const nativeFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      return nativeFullscreen || this.isPseudoFullscreen;
    }

    bindUI() {
      const quickToggle = document.getElementById('fullscreenQuickToggle');
      const checkbox = document.getElementById('fullscreenCheckbox');
      const actionBtn = document.getElementById('toggleFullscreenBtn');

      if (quickToggle) {
        quickToggle.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggle();
        });
        quickToggle.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.toggle();
          }
        });
      }

      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          const wantFullscreen = e.target.checked;
          if (wantFullscreen && !this.isFullscreen()) {
            this.enter();
          } else if (!wantFullscreen && this.isFullscreen()) {
            this.exit();
          }
        });
      }

      if (actionBtn) {
        actionBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggle();
        });
      }

      // Initial UI state sync
      this.syncUI();
    }

    bindFullscreenEvents() {
      const events = [
        'fullscreenchange',
        'webkitfullscreenchange',
        'mozfullscreenchange',
        'MSFullscreenChange'
      ];

      events.forEach((evt) => {
        document.addEventListener(evt, () => {
          if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            this.isPseudoFullscreen = false;
          }
          this.syncUI();
          this.triggerLayoutUpdate();
        });
      });

      // Escape key listener for pseudo-fullscreen fallback
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isPseudoFullscreen) {
          this.exit();
        }
      });
    }

    async enter() {
      const docEl = document.documentElement;

      try {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        } else {
          throw new Error('Native Fullscreen API not supported');
        }
        this.isPseudoFullscreen = false;
      } catch (err) {
        console.info('[Fullscreen] Native request rejected or unavailable, activating pseudo-fullscreen mode:', err?.message || err);
        this.activatePseudoFullscreen();
      }

      this.syncUI();
      this.triggerLayoutUpdate();
      if (typeof window.debugLog === 'function') {
        window.debugLog('[Fullscreen] Entered full screen mode', 'info');
      }
      if (typeof window.trackEvent === 'function') {
        window.trackEvent('fullscreen_entered');
      }
    }

    async exit() {
      try {
        if (
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        ) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            await document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            await document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            await document.msExitFullscreen();
          }
        }
      } catch (err) {
        console.warn('[Fullscreen] Error while exiting native fullscreen:', err);
      }

      this.deactivatePseudoFullscreen();
      this.syncUI();
      this.triggerLayoutUpdate();

      if (typeof window.debugLog === 'function') {
        window.debugLog('[Fullscreen] Exited full screen mode', 'info');
      }
      if (typeof window.trackEvent === 'function') {
        window.trackEvent('fullscreen_exited');
      }
    }

    toggle() {
      if (this.isFullscreen()) {
        this.exit();
      } else {
        this.enter();
      }
    }

    activatePseudoFullscreen() {
      this.isPseudoFullscreen = true;
      document.documentElement.classList.add('aura-app-fullscreen');
      document.body.classList.add('aura-app-fullscreen');
    }

    deactivatePseudoFullscreen() {
      this.isPseudoFullscreen = false;
      document.documentElement.classList.remove('aura-app-fullscreen');
      document.body.classList.remove('aura-app-fullscreen');
    }

    triggerLayoutUpdate() {
      window.dispatchEvent(new Event('resize'));
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 150);
    }

    syncUI() {
      const active = this.isFullscreen();

      // Checkbox in Preferences
      const checkbox = document.getElementById('fullscreenCheckbox');
      if (checkbox) {
        checkbox.checked = active;
      }

      // Action Button in Preferences
      const actionBtn = document.getElementById('toggleFullscreenBtn');
      const actionLabel = document.getElementById('fullscreenActionLabel');
      const actionIcon = document.getElementById('fullscreenActionIcon');
      const statusText = document.getElementById('fullscreenStatusText');

      if (actionBtn) {
        actionBtn.classList.toggle('is-active', active);
      }

      if (actionLabel) {
        actionLabel.textContent = active ? 'Exit Full Screen' : 'Enter Full Screen';
      }

      if (statusText) {
        statusText.textContent = active
          ? 'Full Screen is currently active. Press Esc or click to exit.'
          : 'Expand AURA to fill the entire screen for an immersive companion experience. Press Esc or toggle anytime to exit.';
      }

      if (actionIcon) {
        if (active) {
          // Minimize / shrink icon
          actionIcon.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>';
        } else {
          // Maximize / expand icon
          actionIcon.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
        }
      }

      // Quick toggle in main menu
      const quickBadge = document.getElementById('quickFullscreenBadge');
      if (quickBadge) {
        quickBadge.textContent = active ? 'Active' : 'Off';
        quickBadge.classList.toggle('active', active);
      }

      const quickIcon = document.getElementById('quickFullscreenIcon');
      if (quickIcon) {
        if (active) {
          quickIcon.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>';
        } else {
          quickIcon.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
        }
      }
    }
  }

  window.FullscreenManager = new FullscreenManager();
  window.toggleFullscreen = () => window.FullscreenManager.toggle();
})();
