// Live2D Character Gallery Controller
// Full-featured, responsive, anime-styled model gallery with search, tags, and quick preview

(function() {
  'use strict';

  const UNLOCK_CODE = "1!2@3#4$5%6^7&8*9(0)";

  function isRestrictedUnlocked() {
    try {
      return localStorage.getItem('aura_restricted_unlocked') === 'true';
    } catch (_) {
      return false;
    }
  }

  function setRestrictedUnlocked() {
    try {
      localStorage.setItem('aura_restricted_unlocked', 'true');
    } catch (_) {}
  }

  let currentFilter = 'anime';
  let pendingModelOnUnlock = null;

  const getFranchiseTag = (model) => {
    const url = model.url || '';
    const name = model.name || '';
    const unlocked = isRestrictedUnlocked();

    if (name === 'Nyx' || name === 'Kuro' || name === 'Elara') {
      const isCharUnlocked = typeof window.isModelUnlockedByName === 'function' ? window.isModelUnlockedByName(name) : false;
      return { tag: 'Live models', class: 'tag-anime', category: 'anime', locked: !isCharUnlocked };
    }

    if (name === 'Gothic Mommyyyy' || name === 'Mommyyy' || name === 'Mommyy' || name === 'Mommy' || url.includes('bulaimodun_2') || url.includes('hemin_3') || url.includes('nengdai_2') || url.includes('lisailiu_3')) {
      return { tag: '🤤 🍽️', class: 'tag-mommys', category: 'mommys', locked: !unlocked };
    }
    if (url.includes('Azue%20Lane') || url.includes('Azue Lane') || name === 'Nozaria' || name === 'Lunavelle' || name === 'Virelya' || name === 'Fuku' || name === 'Yomii' || name === 'Rinn' || name === 'Fuku sama' || name === 'Fuku xhy' || url.includes('l2d00203') || url.includes('c_8018') || url.includes('c_9004') || url.includes('c_6001') || url.includes('c_8015') || url.includes('c_9999')) {
      return { tag: 'Azur Lane', class: 'tag-azur', category: 'azur', locked: !unlocked };
    }
    return { tag: 'Live models', class: 'tag-anime', category: 'anime', locked: false };
  };

  function updateTabBadges() {
    const unlocked = isRestrictedUnlocked();
    const azurLock = document.getElementById('azurTabLock');
    const mommysLock = document.getElementById('mommysTabLock');
    if (azurLock) azurLock.style.display = unlocked ? 'none' : 'inline';
    if (mommysLock) mommysLock.style.display = unlocked ? 'none' : 'inline';
  }

  function getFilteredModels() {
    const list = (window.availableModels || []).filter(m => m.image && String(m.image).trim()).slice();
    return list.filter(m => {
      const meta = getFranchiseTag(m);
      return meta.category === currentFilter;
    });
  }

  function renderGrid() {
    updateTabBadges();
    const grid = document.getElementById('modelGalleryGrid');
    if (!grid) return;

    const filtered = getFilteredModels();
    const currentUrl = (typeof AppStorage !== 'undefined' ? AppStorage.getString('selectedModelUrl', '') : localStorage.getItem('selectedModelUrl')) || window.currentModelUrl || '';
    const isCurrentCategoryLocked = (currentFilter === 'azur' || currentFilter === 'mommys') && !isRestrictedUnlocked();

    let noticeHtml = '';
    if (isCurrentCategoryLocked) {
      const categoryName = currentFilter === 'azur' ? 'Azur Lane' : 'Mommy';
      noticeHtml = `
        <div class="model-gallery-locked-notice">
          <span class="notice-icon">🔒</span>
          <span><strong>${categoryName} Section Locked:</strong> You can view all character previews, but selecting a character requires entering the access code.</span>
        </div>
      `;
    }

    if (filtered.length === 0) {
      grid.innerHTML = noticeHtml + `
        <div class="model-gallery-empty">
          <div class="empty-icon">🌸</div>
          <h3>No characters found</h3>
          <p>Try selecting a different tab</p>
        </div>
      `;
      return;
    }

    const html = filtered.map(m => {
      const img = m.image || 'assets/hiyori.png';
      const name = m.name || 'Live2D Character';
      const meta = getFranchiseTag(m);
      const isActive = (currentUrl && m.url === currentUrl) || (!currentUrl && name === 'Vyra');

      return `
        <div class="model-card ${isActive ? 'active' : ''} ${meta.locked ? 'locked' : ''}" data-url="${m.url}" data-name="${name}" data-category="${meta.category}" data-locked="${meta.locked ? 'true' : 'false'}">
          <div class="model-card-thumb-wrapper">
            <img class="model-thumb" src="${img}" alt="${name}" loading="lazy" onerror="this.src='assets/hiyori.png'">
            ${meta.locked ? '<div class="model-card-locked-badge">🔒 Passcode</div>' : (isActive ? '<div class="model-card-active-badge">✓ Active</div>' : '')}
          </div>
          <div class="model-card-info">
            <div class="model-name">${name}</div>
            <span class="model-tag ${meta.class}">${meta.tag} ${meta.locked ? '🔒' : ''}</span>
          </div>
        </div>
      `;
    }).join('');

    grid.innerHTML = noticeHtml + `<div class="model-gallery-cards-wrapper">${html}</div>`;

    // Attach click listeners for character selection or passcode unlock prompt
    grid.querySelectorAll('.model-card').forEach(card => {
      card.addEventListener('click', async () => {
        const url = card.dataset.url;
        const name = card.dataset.name;
        const isLocked = card.dataset.locked === 'true';

        if (isLocked) {
          if (name === 'Nyx' || name === 'Kuro' || name === 'Elara') {
            if (typeof window.registerModelClickToUnlock === 'function') {
              window.registerModelClickToUnlock(name, (alreadyUnlocked) => {
                renderGrid();
                if (typeof updateLandingLockBadges === 'function') updateLandingLockBadges();
                if (typeof populateModelSelector === 'function') populateModelSelector();
              });
            }
            return;
          }

          if (typeof playSound === 'function') {
            try { playSound('ui', 'C3', '8n'); } catch (_) {}
          }
          openPasscodeModal({ url, name });
          return;
        }

        // Visual selection indicator
        grid.querySelectorAll('.model-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        try {
          if (typeof playSound === 'function') {
            try { playSound('ui', 'E5', '16n'); } catch (_) {}
          }

          if (typeof loadModel === 'function') {
            await loadModel(url);
          }

          try {
            if (typeof AppStorage !== 'undefined') {
              AppStorage.setString('selectedModelUrl', url);
            } else {
              localStorage.setItem('selectedModelUrl', url);
            }
          } catch(e) {
            console.warn('Persist selectedModelUrl failed:', e);
          }

          if (typeof populateModelSelector === 'function') {
            populateModelSelector();
          }

          showGalleryToast(`Switched to ${name}! ✨`);
        } catch (e) {
          console.error('Model gallery load failed', e);
          showGalleryToast(`Could not load ${name} (${e.message})`);
        } finally {
          setTimeout(() => {
            closeModelGallery();
          }, 350);
        }
      });
    });
  }

  function showGalleryToast(message) {
    let toast = document.getElementById('galleryToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'galleryToast';
      toast.className = 'gallery-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 2400);
  }

  function openPasscodeModal(pendingModel) {
    pendingModelOnUnlock = pendingModel || null;
    const modal = document.getElementById('passcodeUnlockModal');
    const input = document.getElementById('passcodeCodeInput');
    const errorMsg = document.getElementById('passcodeErrorMsg');

    if (!modal) return;
    if (input) {
      input.value = '';
      input.type = 'password';
    }
    if (errorMsg) errorMsg.textContent = '';

    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      input?.focus();
    }, 120);
  }

  function closePasscodeModal() {
    const modal = document.getElementById('passcodeUnlockModal');
    if (!modal) return;
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    pendingModelOnUnlock = null;
  }

  function handlePasscodeSubmit() {
    const input = document.getElementById('passcodeCodeInput');
    const errorMsg = document.getElementById('passcodeErrorMsg');
    const modalCard = document.querySelector('.passcode-modal');
    const code = (input?.value || '').trim();

    if (code === UNLOCK_CODE) {
      setRestrictedUnlocked();
      closePasscodeModal();
      updateTabBadges();
      renderGrid();

      if (pendingModelOnUnlock && pendingModelOnUnlock.url) {
        const target = pendingModelOnUnlock;
        pendingModelOnUnlock = null;

        if (typeof loadModel === 'function') {
          loadModel(target.url).then(() => {
            try {
              if (typeof AppStorage !== 'undefined') {
                AppStorage.setString('selectedModelUrl', target.url);
              } else {
                localStorage.setItem('selectedModelUrl', target.url);
              }
            } catch (_) {}

            if (typeof populateModelSelector === 'function') {
              populateModelSelector();
            }

            showGalleryToast(`Unlocked & switched to ${target.name}! ✨`);
            setTimeout(() => {
              closeModelGallery();
            }, 350);
          }).catch(e => {
            showGalleryToast(`Unlocked! Could not load ${target.name} (${e.message})`);
          });
        }
      } else {
        showGalleryToast('🔓 Azur Lane & Mommy sections unlocked! 🎉');
      }
    } else {
      if (errorMsg) errorMsg.textContent = '❌ Incorrect access code. Please try again.';
      if (modalCard) {
        modalCard.classList.remove('shake');
        void modalCard.offsetWidth;
        modalCard.classList.add('shake');
      }
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  }

  function openModelGallery() {
    const overlay = document.getElementById('modelGalleryOverlay');
    if (!overlay) return;

    renderGrid();
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeModelGallery() {
    const overlay = document.getElementById('modelGalleryOverlay');
    if (!overlay) return;
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function initGalleryEvents() {
    updateTabBadges();

    // Close button
    document.getElementById('modelGalleryCloseBtn')?.addEventListener('click', closeModelGallery);

    // Overlay background click
    document.getElementById('modelGalleryOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'modelGalleryOverlay') {
        closeModelGallery();
      }
    });

    // Passcode modal cancel button & backdrop
    document.getElementById('passcodeCancelBtn')?.addEventListener('click', closePasscodeModal);
    document.getElementById('passcodeUnlockModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'passcodeUnlockModal') {
        closePasscodeModal();
      }
    });

    // Passcode form submit
    document.getElementById('passcodeUnlockForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handlePasscodeSubmit();
    });

    // Toggle password visibility
    document.getElementById('passcodeToggleVisBtn')?.addEventListener('click', () => {
      const input = document.getElementById('passcodeCodeInput');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const passcodeModal = document.getElementById('passcodeUnlockModal');
        if (passcodeModal?.classList.contains('visible')) {
          closePasscodeModal();
          return;
        }
        const overlay = document.getElementById('modelGalleryOverlay');
        if (overlay?.classList.contains('visible')) {
          closeModelGallery();
        }
      }
    });

    // Open gallery triggers
    document.getElementById('openModelGalleryBtn')?.addEventListener('click', openModelGallery);

    // Category tabs - Allow viewing sections freely without triggering passcode popup on tab click
    document.querySelectorAll('.gallery-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const filter = tab.dataset.filter || 'anime';
        document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = filter;
        renderGrid();
      });
    });
  }

  // Initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGalleryEvents);
  } else {
    initGalleryEvents();
  }

  window.isRestrictedUnlocked = isRestrictedUnlocked;
  window.openPasscodeModal = openPasscodeModal;
  window.openModelGallery = openModelGallery;
  window.closeModelGallery = closeModelGallery;
})();
