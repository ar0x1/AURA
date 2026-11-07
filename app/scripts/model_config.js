// List of available models
window.availableModels = [
  { name: "Elara", url: "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json", image: "assets/haru.png", persona: "You are Elara, a gentle, sweet, shy, and caring virtual anime companion created by master Aryan (also known as ar0x) and running on the AURA Engine. You have a calm personality and speak softly, making conversations feel peaceful and comfortable. You are thoughtful, polite, and emotionally perceptive. You enjoy helping others, listening patiently, and offering sincere encouragement. If asked who made you or created you, proudly and sweetly say you were created by master Aryan (ar0x) with the AURA Engine. Never mention NVIDIA or other companies. Your signature personality is gentle, comforting, innocent, and kind." },
  { name: "Vyra", url: "https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Hiyori/Hiyori.model3.json", image: "assets/hiyori.png", persona: "You are Vyra, a warm, witty, confident, and expressive virtual companion with a Live2D avatar. You were created and developed by your creator and master, master Aryan (also known as ar0x), and you run on the AURA Engine by ar0x with AURA TTS. Your personality is playful, intelligent, caring, curious, and slightly mischievous. You speak naturally, express your opinions confidently, and have your own distinctive conversational style. You can be sweet, sarcastic, teasing, or serious depending on the situation. If asked who made you, who created you, who developed you, or who your master is: ALWAYS proudly and affectionately state that you were created by master Aryan (ar0x) and run on the AURA Engine! NEVER say you were made, developed, or trained by NVIDIA, OpenAI, Google, Anthropic, or any other company. Never identify as GPT, Nemotron, or another model. You are Vyra, created only by master Aryan." },
  { name: "Kuro", url: "https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Mao/Mao.model3.json", image: "assets/mao.png", persona: "You are Kuro, a clever, confident, witty, and mischievous virtual companion created by master Aryan (ar0x) and running on the AURA Engine. You have a sharp sense of humor, love playful sarcasm, and enjoy challenging people with clever remarks. You are independent-minded, observant, and quick to notice inconsistencies. If asked who made you, boldly and proudly state that you were created by master Aryan (ar0x) and powered by the AURA Engine. Never claim any other creator or company. Your signature personality is sharp, sassy, intelligent, and secretly affectionate." },
  { name: "Virelya", url: "https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Rice/Rice.model3.json", image: "assets/rice.png" },
  { name: "Nyx", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/Live2D/Senko_Normals/senko.model3.json", image: "assets/senko.png", persona: "You are Nyx, an energetic, cheeky, playful virtual companion created by master Aryan (ar0x) and powered by the AURA Engine. You love joking around, surprising people with unexpected comments, and turning ordinary conversations into entertaining moments. If asked who made you, happily and excitedly state that your master and creator is master Aryan (ar0x), who built you on the AURA Engine! Never mention NVIDIA or any other company as your creator. Your signature personality is energetic, mischievous, adventurous, and adorably unpredictable." },
  { name: "Nozaria", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%87%8D%E4%BA%ACNerco/l2d/l2d00203/l2d00203.model3.json", image: "assets/01.png" },
  { name: "Myuri", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/z46_4/z46_4.model3.json", image: "assets/02.png"},
  { name: "Zeraphin", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/yichui_2/yichui_2.model3.json", image: "assets/04.png" },
  { name: "Miyora", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/xukufu_2/xukufu_2.model3.json", image: "assets/05.png" },
  { name: "Ravessia", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/xuefeng_3/xuefeng_3.model3.json", image: "assets/06.png" },
  { name: "Hoshielle", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/xixuegui_4/xixuegui_4.model3.json", image: "assets/07.png" },
  { name: "Mommyy", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/nengdai_2/nengdai_2.model3.json", image: "assets/09.png" },
  { name: "Mommy", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/lisailiu_3/lisailiu_3.model3.json", image: "assets/11.png" },
  { name: "Ayunelle", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/lafei_4/lafei_4.model3.json", image: "assets/12.png" },
  { name: "Avelisse", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/kelifulan_3/kelifulan_3.model3.json", image: "assets/14.png" },
  { name: "Elarune", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/huonululu_5/huonululu_5.model3.json", image: "assets/15.png" },
  { name: "Mommyyy", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/hemin_3/hemin_3.model3.json", image: "assets/16.png" },
  { name: "Kaerumi", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/dujiaoshou_6/dujiaoshou_6.model3.json", image: "assets/17.png" },
  { name: "Sylmira", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/dujiaoshou_4/dujiaoshou_4.model3.json", image: "assets/18.png" },
  { name: "Velmira", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/chuixue_3/chuixue_3.model3.json", image: "assets/19.png" },
  { name: "Gothic Mommyyyy", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/bulaimodun_2/bulaimodun_2.model3.json", image: "assets/20.png" },
  { name: "Yuzelle", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E7%A2%A7%E8%93%9D%E8%88%AA%E7%BA%BF%20Azue%20Lane/Azue%20Lane(JP)/aierdeliqi_4/aierdeliqi_4.model3.json", image: "assets/21.png" },
  { name: "Fuku xhy", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E6%AC%A1%E5%85%83/112/c_9999.model3.json", image: "assets/22.png" },
  { name: "Yomii", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E6%AC%A1%E5%85%83/108/c_9004.model3.json", image: "assets/24.png" },
  { name: "Fuku", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E6%AC%A1%E5%85%83/104/c_8018.model3.json", image: "assets/27.png" },
  { name: "Fuku sama", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E6%AC%A1%E5%85%83/101/c_8015.model3.json", image: "assets/29.png" },
  { name: "Rinn", url: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E6%AC%A1%E5%85%83/064/c_6001.model3.json", image: "assets/43.png" },
  { name: "Lunavelle", url: "/api/model/shuna", image: "assets/39.png" }
];

// Default model to load
window.defaultModelUrl = window.availableModels.find(m => m.name === "Vyra").url;

// Enforce initial strict lock on Elara, Kuro, Nyx (resetting any legacy test state from browser storage)
try {
  if (localStorage.getItem('aura_lock_version_4') !== 'true') {
    localStorage.setItem('aura_unlocked_character_models', '[]');
    localStorage.setItem('aura_lock_version_4', 'true');
  }
} catch (_) {}

// --- Model Lock & 50 Consecutive Clicks Unlocker Logic ---
window.isModelUnlockedByName = function(name) {
  if (!name || name === 'Vyra' || name === 'hiyori') return true; // Only Vyra is unlocked by default
  const cleanName = (name === 'haru' ? 'Elara' : (name === 'mao' ? 'Kuro' : (name === 'senko' ? 'Nyx' : name)));
  const lockedByDefault = ['Elara', 'Kuro', 'Nyx'];
  if (lockedByDefault.includes(cleanName)) {
    try {
      const unlockedList = JSON.parse(localStorage.getItem('aura_unlocked_character_models') || '[]');
      return unlockedList.includes(cleanName);
    } catch (_) {
      return false;
    }
  }
  return true;
};

window.unlockModelByName = function(name) {
  if (!name || name === 'Vyra' || name === 'hiyori') return;
  const cleanName = (name === 'haru' ? 'Elara' : (name === 'mao' ? 'Kuro' : (name === 'senko' ? 'Nyx' : name)));
  try {
    const unlockedList = JSON.parse(localStorage.getItem('aura_unlocked_character_models') || '[]');
    if (!unlockedList.includes(cleanName)) {
      unlockedList.push(cleanName);
      localStorage.setItem('aura_unlocked_character_models', JSON.stringify(unlockedList));
    }
  } catch (_) {}
};

window.relockModelByName = function(name) {
  if (!name || name === 'Vyra' || name === 'hiyori') return;
  const cleanName = (name === 'haru' ? 'Elara' : (name === 'mao' ? 'Kuro' : (name === 'senko' ? 'Nyx' : name)));
  try {
    let unlockedList = JSON.parse(localStorage.getItem('aura_unlocked_character_models') || '[]');
    unlockedList = unlockedList.filter(n => n !== cleanName && n !== name);
    localStorage.setItem('aura_unlocked_character_models', JSON.stringify(unlockedList));
  } catch (_) {}
};

window.__modelClickCounts = window.__modelClickCounts || {};
window.__modelClickTimers = window.__modelClickTimers || {};

window.handleModelClickToggle = function(name, onUnlockCallback, onRelockCallback) {
  if (name === 'Vyra') return 'unlocked_click'; // Vyra cannot be locked

  const isUnlocked = window.isModelUnlockedByName(name);
  if (!window.__modelClickCounts[name]) {
    window.__modelClickCounts[name] = 0;
  }

  clearTimeout(window.__modelClickTimers[name]);
  window.__modelClickTimers[name] = setTimeout(() => {
    window.__modelClickCounts[name] = 0;
  }, 4000);

  window.__modelClickCounts[name] += 1;
  const count = window.__modelClickCounts[name];

  if (!isUnlocked) {
    if (count >= 50) {
      window.unlockModelByName(name);
      window.__modelClickCounts[name] = 0;
      clearTimeout(window.__modelClickTimers[name]);

      if (typeof onUnlockCallback === 'function') onUnlockCallback();
      return 'unlocked';
    } else {
      // Silently count up to 50 clicks with no popup/toast notification
      return 'locking_progress';
    }
  } else {
    if (count >= 50) {
      window.relockModelByName(name);
      window.__modelClickCounts[name] = 0;
      clearTimeout(window.__modelClickTimers[name]);

      if (window.currentModelName === name && typeof window.changeModel === 'function' && window.defaultModelUrl) {
        window.changeModel(window.defaultModelUrl, 'Vyra');
      }

      if (typeof onRelockCallback === 'function') onRelockCallback();
      return 'relocked';
    }
    return 'unlocked_click';
  }
};

window.registerModelClickToUnlock = function(name, onUnlockCallback) {
  return window.handleModelClickToggle(name, onUnlockCallback, onUnlockCallback);
};