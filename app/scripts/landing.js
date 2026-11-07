// Anime Landing Page Logic (Smooth Overlay Transition & Character Selection)
(function() {
  function initLanding() {
    const landingOverlay = document.getElementById('landingOverlay');
    const enterBtn = document.getElementById('landingEnterBtn');
    const skipBtn = document.getElementById('landingSkipBtn');
    const sakuraContainer = document.getElementById('landingSakuraContainer');

    // Create subtle Sakura petals
    if (sakuraContainer) {
      const petalCount = 18;
      for (let i = 0; i < petalCount; i++) {
        const petal = document.createElement('div');
        petal.className = 'landing-sakura-petal';
        
        const size = Math.random() * 8 + 6;
        const left = Math.random() * 100;
        const duration = Math.random() * 8 + 8;
        const delay = Math.random() * 10;
        const opacity = Math.random() * 0.4 + 0.3;

        petal.style.width = `${size}px`;
        petal.style.height = `${size * 1.3}px`;
        petal.style.left = `${left}%`;
        petal.style.animationDuration = `${duration}s, ${duration * 0.6}s`;
        petal.style.animationDelay = `${delay}s, ${delay * 0.2}s`;
        petal.style.opacity = opacity;

        sakuraContainer.appendChild(petal);
      }
    }

    function hideLanding() {
      if (landingOverlay) {
        landingOverlay.classList.add('hidden');
        sessionStorage.setItem('waifuai_landing_entered', 'true');
      }
    }

    if (enterBtn) {
      enterBtn.addEventListener('click', function() {
        hideLanding();
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', function() {
        hideLanding();
      });
    }

    const MODEL_ALIASES = {
      haru: 'Elara',
      hiyori: 'Vyra',
      mao: 'Kuro',
      senko: 'Nyx'
    };

    const findModel = (queryName) => {
      if (!queryName || !window.availableModels) return null;
      const clean = queryName.trim().toLowerCase();
      const aliased = (MODEL_ALIASES[clean] || clean).toLowerCase();
      return window.availableModels.find(
        m => m.name.toLowerCase() === aliased || m.name.toLowerCase() === clean
      ) || null;
    };

    function updateLandingLockBadges() {
      document.querySelectorAll('.landing-character-card').forEach(card => {
        const charName = card.getAttribute('data-character');
        const isUnlocked = typeof window.isModelUnlockedByName === 'function' ? window.isModelUnlockedByName(charName) : (charName === 'Vyra');
        
        let lockBadge = card.querySelector('.landing-character-lock');
        if (!isUnlocked) {
          card.classList.add('locked');
          if (!lockBadge) {
            lockBadge = document.createElement('div');
            lockBadge.className = 'landing-character-lock';
            lockBadge.innerHTML = '🔒 Locked';
            card.appendChild(lockBadge);
          }
        } else {
          card.classList.remove('locked');
          if (lockBadge) lockBadge.remove();
        }
      });
    }

    updateLandingLockBadges();
    window.updateLandingLockBadges = updateLandingLockBadges;

    // Bind character roster cards
    document.querySelectorAll('.landing-character-card').forEach(card => {
      card.addEventListener('click', function() {
        const charName = this.getAttribute('data-character');
        const matched = findModel(charName);

        if (typeof window.handleModelClickToggle === 'function') {
          const res = window.handleModelClickToggle(
            charName,
            () => {
              updateLandingLockBadges();
              if (typeof renderGrid === 'function') renderGrid();
              if (typeof populateModelSelector === 'function') populateModelSelector();
              if (matched && typeof window.changeModel === 'function') {
                window.changeModel(matched.url, matched.name);
              }
              hideLanding();
            },
            () => {
              updateLandingLockBadges();
              if (typeof renderGrid === 'function') renderGrid();
              if (typeof populateModelSelector === 'function') populateModelSelector();
            }
          );

          if (res === 'locking_progress' || res === 'relocked') {
            return; // Stay on landing page, toast message displayed
          }
        }

        if (matched && typeof window.changeModel === 'function') {
          window.changeModel(matched.url, matched.name);
        }
        hideLanding();
      });
    });

    // Keep the in-app overlay hidden by default (since root /index.html is the main landing page)
    if (landingOverlay) {
      landingOverlay.classList.add('hidden');
    }

    // Expose global function to re-open landing overlay from settings if desired
    window.openLandingPage = function() {
      if (landingOverlay) {
        updateLandingLockBadges();
        landingOverlay.classList.remove('hidden');
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanding);
  } else {
    initLanding();
  }
})();
