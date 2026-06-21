// game.js
'use strict';

import { loadState, saveState, saveHighScore, selectKart, unlockKart } from './storage.js';
import { LEVELS, getLevelForScore } from './levels.js';
import { KARTS, getKartById } from './karts.js';
import { initUI, updateCarouselDisplay, resetCarouselIndex, stopPreviewAnimation, updatePowerupsHUD, showLevelUpBanner } from './ui.js';
import { loadSettings, saveSettings, getThemeById, THEMES, DIFFICULTY_PRESETS } from './settings.js';

(() => {
  /* ===================== SETUP & DOM ===================== */
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud');
  const scoreValEl = document.getElementById('scoreVal');
  const timerBar = document.getElementById('timerBar');
  const comboText = document.getElementById('comboText');

  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const finalScoreEl = document.getElementById('finalScore');
  const bestScoreValEl = document.getElementById('bestScoreVal');
  const newBestTag = document.getElementById('newBestTag');

  // Modular DOM references
  const levelNameEl = document.getElementById('levelName');
  const targetLabelEl = document.getElementById('targetLabel');
  const targetBarEl = document.getElementById('targetBar');
  const heartsContainer = document.getElementById('heartsContainer');
  const startHighScoreEl = document.getElementById('startHighScore');
  
  // Custom overlays
  const howToPlayModal = document.getElementById('howToPlayModal');
  const pauseScreen = document.getElementById('pauseScreen');
  const kartSelectScreen = document.getElementById('kartSelectScreen');

  // Stats overlays in Game Over
  const goLevelVal = document.getElementById('goLevelVal');
  const goKartVal = document.getElementById('goKartVal');

  // Button inputs
  const playBtn = document.getElementById('playBtn');
  const howToPlayBtn = document.getElementById('howToPlayBtn');
  const closeHowToBtn = document.getElementById('closeHowToBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const muteBtn = document.getElementById('muteBtn');
  
  // Pause buttons
  const resumeBtn = document.getElementById('resumeBtn');
  const restartBtn = document.getElementById('restartBtn');
  const exitBtn = document.getElementById('exitBtn');

  // Game over buttons
  const replayBtn = document.getElementById('replayBtn');
  const changeKartBtn = document.getElementById('changeKartBtn');
  const exitToMenuBtn = document.getElementById('exitToMenuBtn');

  // Settings panel refs
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsBackdrop = document.getElementById('settingsBackdrop');
  const settingsOpenBtn = document.getElementById('settingsOpenBtn');
  const settingsGameBtn = document.getElementById('settingsGameBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');

  // Game configuration
  const CART_Y_OFFSET = 75; // height of cart from bottom
  const CART_HEIGHT = 40;

  // Crate definitions: weight dictates probability of spawning
  const OBJECT_TYPES = {
    WOOD_CRATE: { weight: 55, color: '#b58a63', border: '#785333', glow: 'rgba(181, 138, 99, 0.3)', radius: 24, score: 10, isCrate: true },
    GOLD_CRATE: { weight: 8,  color: '#ffd34d', border: '#b38600', glow: 'rgba(255, 211, 77, 0.5)', radius: 24, score: 50, isCrate: true },
    BOMB:       { weight: 20, color: '#2c3e50', border: '#ff4d6e', glow: 'rgba(255, 77, 110, 0.6)', radius: 24, isBomb: true },
    MAGNET:     { weight: 6,  color: '#2eb6ff', border: '#007ab3', glow: 'rgba(46, 182, 255, 0.5)', radius: 25, power: 'magnet' },
    SLOMO:      { weight: 5,  color: '#bf77ff', border: '#7a33b3', glow: 'rgba(191, 119, 255, 0.5)', radius: 25, power: 'slomo' },
    MULTIPLIER: { weight: 4,  color: '#ffb834', border: '#b36b00', glow: 'rgba(255, 184, 52, 0.5)', radius: 25, power: 'multiplier' },
    SHIELD:     { weight: 4,  color: '#2effa3', border: '#00b366', glow: 'rgba(46, 255, 163, 0.5)', radius: 25, power: 'shield' }
  };

  /* ===================== AUDIO ENGINE (WEB AUDIO API) ===================== */
  let audioCtx = null;
  let isMuted = false;
  let appSettings = loadSettings();
  isMuted = !appSettings.sound; // sync mute state from persisted settings
  let wasPlayingBeforeSettings = false;
  // Theme special-effect timers
  let bhAngle = 0;
  let sunTime = 0;
  let nebulaTime = 0;

  function ensureAudio() {
    if (isMuted) return;
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function vibrate(pattern) {
    if (!appSettings.vibration) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function playCoinSound(baseFreq, scaleMultiplier = 1) {
    if (!audioCtx || isMuted) return;
    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(baseFreq * scaleMultiplier, now);
    osc1.frequency.setValueAtTime(baseFreq * 1.5 * scaleMultiplier, now + 0.08);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2.0 * scaleMultiplier, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  function playExplosionSound() {
    if (!audioCtx || isMuted) return;
    const duration = 0.45;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + duration);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    noise.connect(filter).connect(gain).connect(audioCtx.destination);
    noise.start();
    noise.stop(audioCtx.currentTime + duration);

    const subOsc = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(120, audioCtx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.3);
    
    subGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    
    subOsc.connect(subGain).connect(audioCtx.destination);
    subOsc.start();
    subOsc.stop(audioCtx.currentTime + 0.3);
  }

  function playPowerUpSound() {
    if (!audioCtx || isMuted) return;
    const now = audioCtx.currentTime;
    const notes = [293.66, 369.99, 440.00, 587.33, 739.99]; // D Major scale
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      
      gain.gain.setValueAtTime(0.08, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.2);
      
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.2);
    });
  }

  function playGameOverSound() {
    if (!audioCtx || isMuted) return;
    const now = audioCtx.currentTime;
    const notes = [220.00, 261.63, 311.13, 440.00]; // A dim chord
    notes.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq / 2, now + 0.6);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  /* ===================== GAME STATE ===================== */
  let gameState = loadState();
  
  let state = 'menu'; // menu | kartSelect | countdown | playing | paused | gameover
  let score = 0;
  let lives = 3;
  
  let currentLevel = LEVELS[0];
  let currentBgColors = { start: [0,0,0], mid: [0,0,0], end: [0,0,0] };
  let levelColorTimer = 0; // used for cycling gradients in level 10
  
  let objects = [];
  let particles = [];
  let bgParticles = [];
  
  let spawnTimer = 0;
  let spawnInterval = 900;
  let elapsed = 0;
  let lastTime = 0;
  
  let combo = 0;
  let comboStreak = 0; // track streak milestones (5, 10, 20)
  
  let shake = 0;
  
  let countdownVal = 3;
  let countdownTimer = 0;
  
  let cartX = 0;
  let targetCartX = 0;

  // Powerup timers in milliseconds
  const powerupTimers = {
    magnet: 0,
    slomo: 0,
    multiplier: 0,
    shield: false
  };

  /* ===================== INITIALIZATION ===================== */
  function resizeCanvas() {
    const w = Math.min(window.innerWidth, 500);
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    if (state === 'menu' || state === 'kartSelect') {
      cartX = w / 2;
      targetCartX = w / 2;
    }
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Create background space dust particles
  function initBackground() {
    bgParticles = [];
    for (let i = 0; i < 45; i++) {
      bgParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 1 + Math.random() * 2,
        speed: 0.3 + Math.random() * 0.8,
        opacity: 0.2 + Math.random() * 0.5,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        twinkleDir: Math.random() > 0.5 ? 1 : -1
      });
    }
  }
  initBackground();

  // Load High Score on Load
  startHighScoreEl.textContent = gameState.highScore;

  // Initial colors
  function setBgColors(grad) {
    const hexToRgb = (hex) => {
      const bigint = parseInt(hex.slice(1), 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };
    currentBgColors.start = hexToRgb(grad.start);
    currentBgColors.mid = hexToRgb(grad.mid);
    currentBgColors.end = hexToRgb(grad.end);
  }
  setBgColors(LEVELS[0].bgGradient);

  /* ===================== DYNAMIC OBJECT & PARTICLE BUILDERS ===================== */
  function pickRandomType() {
    const activeTypes = currentLevel.activeTypes;
    const diffPreset = DIFFICULTY_PRESETS[appSettings.difficulty] || DIFFICULTY_PRESETS.medium;
    
    // Sum weights of active level types only
    let activeWeight = 0;
    activeTypes.forEach(key => {
      if (OBJECT_TYPES[key]) {
        // Adjust bomb ratio based on level + difficulty
        if (key === 'BOMB') {
          activeWeight += (currentLevel.bombRatio * diffPreset.bombRatioMult * 100);
        } else {
          activeWeight += OBJECT_TYPES[key].weight;
        }
      }
    });

    let r = Math.random() * activeWeight;
    for (const key of activeTypes) {
      if (OBJECT_TYPES[key]) {
        const weight = (key === 'BOMB') ? (currentLevel.bombRatio * diffPreset.bombRatioMult * 100) : OBJECT_TYPES[key].weight;
        r -= weight;
        if (r <= 0) return key;
      }
    }
    return 'WOOD_CRATE';
  }

  function spawnObject() {
    const typeKey = pickRandomType();
    const def = OBJECT_TYPES[typeKey];
    const r = def.radius;
    const x = r + Math.random() * (canvas.width - r * 2);
    
    // Speed maps to elapsed time, levels factor, and slow-mo powerups
    const diffPreset = DIFFICULTY_PRESETS[appSettings.difficulty] || DIFFICULTY_PRESETS.medium;
    let baseSpeed = 2.2 + Math.random() * 1.2 + (elapsed / 45) * 1.5;
    baseSpeed *= currentLevel.speedMult * diffPreset.speedMult;

    objects.push({
      typeKey,
      def,
      x,
      y: -r - 15,
      r,
      speed: baseSpeed,
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.04 + Math.random() * 0.04
    });
  }

  function spawnBurstParticles(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        size: 3 + Math.random() * 4.5,
        color,
        isText: false
      });
    }
  }

  function spawnFloatText(x, y, text, color) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -1.8,
      life: 1.0,
      decay: 0.018,
      size: 20,
      color,
      text,
      isText: true
    });
  }

  /* ===================== INPUT HANDLERS ===================== */
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    let cx, cy;
    if (e.touches && e.touches.length) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    return {
      x: (cx - rect.left) * (canvas.width / rect.width),
      y: (cy - rect.top) * (canvas.height / rect.height)
    };
  }

  function handleAction(px, py) {
    if (state !== 'playing') return;
    ensureAudio();
    
    // Fetch selected kart details
    const kart = getKartById(gameState.selectedKart);
    
    // Snappier pointer speed response for Speedster
    const trackingSpeed = (kart.id === 'speedster') ? 0.28 : 0.16;
    targetCartX = px;
    cartX += (targetCartX - cartX) * trackingSpeed * kart.speedMultiplier;

    let hit = false;
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      const dx = px - o.x;
      const dy = py - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Tap margin
      if (dist <= o.r + 25) {
        hit = true;
        collectObject(o, i, true);
        break;
      }
    }

    if (!hit) {
      particles.push({
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        life: 0.4,
        decay: 0.08,
        size: 5,
        color: 'rgba(255, 255, 255, 0.4)',
        isText: false
      });
    }
  }

  function updateCartPosition(px) {
    if (state === 'playing') {
      const kart = getKartById(gameState.selectedKart);
      const limit = kart.width / 2;
      targetCartX = Math.max(limit, Math.min(canvas.width - limit, px));
    }
  }

  // Pointer Listeners
  canvas.addEventListener('mousedown', e => {
    const p = getCanvasCoords(e);
    handleAction(p.x, p.y);
  });
  canvas.addEventListener('mousemove', e => {
    const p = getCanvasCoords(e);
    updateCartPosition(p.x);
  });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const p = getCanvasCoords(e);
    handleAction(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const p = getCanvasCoords(e);
    updateCartPosition(p.x);
  }, { passive: false });

  // Escape key for Pause
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (state === 'playing') {
        togglePause(true);
      } else if (state === 'paused') {
        togglePause(false);
      }
    }
  });

  /* ===================== COLLECT / SMASH RESOLUTION ===================== */
  function collectObject(o, index, isDirectTap = false) {
    objects.splice(index, 1);
    ensureAudio();

    const kart = getKartById(gameState.selectedKart);

    if (o.def.isBomb) {
      // Shield deflector logic
      if (powerupTimers.shield) {
        powerupTimers.shield = false;
        shake = 8;
        playCoinSound(900);
        spawnBurstParticles(o.x, o.y, '#2effa3', 18);
        spawnFloatText(o.x, o.y, 'DEFLECTED!', '#2effa3');
      } else {
        // Bomb hit penalties
        lives--;
        combo = 0;
        shake = 18;
        playExplosionSound();
        vibrate([35, 12, 35]);
        spawnBurstParticles(o.x, o.y, o.def.border, 24);
        spawnFloatText(o.x, o.y, '-1 LIFE', o.def.border);
        updateLivesHUD();
        
        if (lives <= 0) {
          lives = 0;
          endPlaySession();
          return;
        }
      }
    } else if (o.def.power) {
      // Power-up activation
      playPowerUpSound();
      vibrate([15, 5, 15]);
      shake = 8;
      spawnBurstParticles(o.x, o.y, o.def.color, 18);
      
      if (o.def.power === 'magnet') {
        powerupTimers.magnet = 5000; // 5 seconds magnet
        spawnFloatText(o.x, o.y, 'MAGNET SHIELD!', o.def.color);
      } else if (o.def.power === 'slomo') {
        powerupTimers.slomo = 4000; // 4 seconds slow-mo
        spawnFloatText(o.x, o.y, 'SLOW-MO WARP!', o.def.color);
      } else if (o.def.power === 'multiplier') {
        powerupTimers.multiplier = 6000; // 6 seconds 2x coin multiplier
        spawnFloatText(o.x, o.y, '2X MULTIPLIER!', o.def.color);
      } else if (o.def.power === 'shield') {
        powerupTimers.shield = true;
        spawnFloatText(o.x, o.y, 'DEFLECTOR ACTIVE!', o.def.color);
      }
    } else {
      // Coin/Crate Collection
      combo++;
      
      // Streak calculations: 1.0x -> 1.2x (at 5) -> 1.5x (at 10) -> 2.0x (at 20)
      let comboMultiplier = 1.0;
      if (combo >= 20) {
        comboMultiplier = 2.0;
        if (combo === 20) triggerComboMilestone(20);
      } else if (combo >= 10) {
        comboMultiplier = 1.5;
        if (combo === 10) triggerComboMilestone(10);
      } else if (combo >= 5) {
        comboMultiplier = 1.2;
        if (combo === 5) triggerComboMilestone(5);
      }

      // Check selected kart ability multiplier (Neon Drift has +5% permanent score mult)
      const driftMult = (kart.id === 'drift') ? 1.05 : 1.0;

      // Active score multiplier powerup
      const activeMult = (powerupTimers.multiplier > 0) ? 2 : 1;

      const finalVal = Math.round(o.def.score * comboMultiplier * activeMult * driftMult);
      score += finalVal;
      
      shake = Math.min(shake + 1.5, 6);
      vibrate(8);
      spawnBurstParticles(o.x, o.y, o.def.color, 12);
      spawnFloatText(o.x, o.y, `+${finalVal}`, o.def.color);
      
      if (combo >= 2) {
        showComboIndicator(comboMultiplier);
        playCoinSound(650, 1 + Math.min(combo * 0.03, 0.6));
      } else {
        playCoinSound(780);
      }
    }

    updateScoreUI();
    checkLevelUp();
    updateLevelHUD();
  }

  function triggerComboMilestone(milestone) {
    shake = 10;
    playCoinSound(880, 1.4);
    
    // Milestones arpeggio chord
    const now = audioCtx.currentTime;
    if (audioCtx && !isMuted) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.50, now); // C6
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 0.25);
    }
    
    comboText.textContent = `MILESTONE STREAK x${milestone}!`;
    comboText.classList.add('active');
    setTimeout(() => {
      comboText.classList.remove('active');
    }, 800);
  }

  function showComboIndicator(mult) {
    const comboEl = document.getElementById('comboText');
    if (!comboEl) return;
    comboEl.textContent = `COMBO STREAK x${mult}!`;
    comboEl.classList.add('active');
    clearTimeout(showComboIndicator.timer);
    showComboIndicator.timer = setTimeout(() => {
      comboEl.classList.remove('active');
    }, 600);
  }

  function updateScoreUI() {
    scoreValEl.textContent = score;
    
    // Dynamic Combo Bar hud progress calculation
    const comboBar = document.getElementById('hudComboBar');
    const comboTextEl = document.getElementById('hudComboText');
    if (comboBar && comboTextEl) {
      let pct = 0;
      let label = '1.0x';
      if (combo < 5) {
        pct = (combo / 5) * 100;
        label = '1.0x';
      } else if (combo < 10) {
        pct = ((combo - 5) / 5) * 100;
        label = '1.2x';
      } else if (combo < 20) {
        pct = ((combo - 10) / 10) * 100;
        label = '1.5x';
      } else {
        pct = 100;
        label = '2.0x';
      }
      comboBar.style.width = `${pct}%`;
      comboTextEl.textContent = label;
    }
  }

  function updateLivesHUD() {
    const maxLives = (DIFFICULTY_PRESETS[appSettings.difficulty] || DIFFICULTY_PRESETS.medium).startingLives;
    heartsContainer.textContent = '❤️'.repeat(lives) + '🖤'.repeat(Math.max(0, maxLives - lives));
  }

  /* ===================== LEVEL SYSTEM OPERATIONS ===================== */
  function updateLevelHUD() {
    levelNameEl.textContent = `Lvl ${currentLevel.level}: ${currentLevel.name}`;
    
    // LEVELS is 0-indexed, level numbers start at 1. Max level is LEVELS.length (10).
    if (currentLevel.level >= LEVELS.length) {
      targetLabelEl.textContent = 'Goal: Survive!';
      targetBarEl.style.width = '100%';
    } else {
      // currentLevel.level is 1-based, so index into LEVELS at [currentLevel.level] gives the NEXT level
      const nextLevelConfig = LEVELS[currentLevel.level];
      if (!nextLevelConfig) {
        targetLabelEl.textContent = 'Goal: Survive!';
        targetBarEl.style.width = '100%';
        return;
      }
      const prevTarget = currentLevel.scoreGate;
      const nextTarget = nextLevelConfig.scoreGate;
      const levelScore = score - prevTarget;
      const levelTotal = nextTarget - prevTarget;
      
      targetLabelEl.textContent = `Goal: ${nextTarget}`;
      const pct = Math.max(0, Math.min(100, (levelScore / levelTotal) * 100));
      targetBarEl.style.width = `${pct}%`;
    }
  }

  function checkLevelUp() {
    const nextLvl = getLevelForScore(score);
    if (nextLvl.level > currentLevel.level) {
      currentLevel = nextLvl;
      
      // Trigger level-up banner slide-in
      showLevelUpBanner(currentLevel.level, currentLevel.name);
      
      // Visual flare
      playPowerUpSound();
      shake = 16;
      spawnLevelUpParticles();
      
      // Dynamic level check unlocks!
      checkKartUnlockCriteria();
    }
  }

  function checkKartUnlockCriteria() {
    // We check high score unlock gates on kart selections or gameplay over, but doing it in real-time is great
    let unlockedAny = false;
    KARTS.forEach(k => {
      if (score >= k.unlockScore) {
        const added = unlockKart(k.id);
        if (added) unlockedAny = true;
      }
    });
    if (unlockedAny) {
      gameState = loadState(); // reload state
    }
  }

  function spawnLevelUpParticles() {
    const colors = ['#ffd34d', '#2effa3', '#bf77ff', '#2eb6ff', '#ff4d6e'];
    for (let f = 0; f < 3; f++) {
      const rx = canvas.width * 0.2 + Math.random() * canvas.width * 0.6;
      const ry = canvas.height * 0.3 + Math.random() * canvas.height * 0.4;
      const col = colors[f % colors.length];
      spawnBurstParticles(rx, ry, col, 24);
    }
  }

  /* ===================== GAME FLOW STATES ===================== */
  function openKartSelect() {
    state = 'kartSelect';
    startScreen.classList.add('hidden');
    kartSelectScreen.classList.remove('hidden');
    
    // Update high scores on Select
    gameState = loadState();
    resetCarouselIndex();
    updateCarouselDisplay(gameState.unlockedKarts, gameState.highScore);
  }

  function selectAndStartGame(kartId) {
    selectKart(kartId);
    gameState = loadState(); // reload selection
    
    kartSelectScreen.classList.add('hidden');
    stopPreviewAnimation();
    
    startNewGame();
  }

  function startNewGame() {
    ensureAudio();
    score = 0;
    const diffPreset = DIFFICULTY_PRESETS[appSettings.difficulty] || DIFFICULTY_PRESETS.medium;
    lives = diffPreset.startingLives;
    currentLevel = LEVELS[0];
    
    // Reset background color values
    setBgColors(LEVELS[0].bgGradient);

    objects = [];
    particles = [];
    combo = 0;
    elapsed = 0;

    // Reset cart positioning to center of canvas
    cartX = canvas.width / 2;
    targetCartX = canvas.width / 2;
    
    // Reset active powerup timers
    powerupTimers.magnet = 0;
    powerupTimers.slomo = 0;
    powerupTimers.multiplier = 0;
    powerupTimers.shield = false;

    spawnInterval = currentLevel.spawnInterval;
    
    updateScoreUI();
    updateLevelHUD();
    updateLivesHUD();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    state = 'countdown';
    countdownVal = 3;
    countdownTimer = 0;
  }

  function endPlaySession() {
    state = 'gameover';
    hud.classList.add('hidden');
    playGameOverSound();

    // Check unlocks & persist score
    const newBest = saveHighScore(score);
    checkKartUnlockCriteria(); // unlocks based on high score
    
    gameState = loadState(); // refresh state

    finalScoreEl.textContent = score;
    bestScoreValEl.textContent = gameState.highScore;
    
    if (newBest) {
      newBestTag.classList.remove('hidden');
    } else {
      newBestTag.classList.add('hidden');
    }
    
    // Set game stats details
    goLevelVal.textContent = `Level ${currentLevel.level} (${currentLevel.name})`;
    const usedKart = getKartById(gameState.selectedKart);
    goKartVal.textContent = usedKart.name;

    gameOverScreen.classList.remove('hidden');
  }

  function togglePause(paused) {
    if (paused) {
      state = 'paused';
      pauseScreen.classList.remove('hidden');
    } else {
      state = 'playing';
      pauseScreen.classList.add('hidden');
    }
  }

  /* ===================== CONTROL ACTIONS & BUTTON LISTENERS ===================== */
  playBtn.addEventListener('click', () => {
    openKartSelect();
  });

  howToPlayBtn.addEventListener('click', () => {
    howToPlayModal.classList.remove('hidden');
  });

  closeHowToBtn.addEventListener('click', () => {
    howToPlayModal.classList.add('hidden');
  });

  pauseBtn.addEventListener('click', () => {
    togglePause(true);
  });

  function updateMuteButtonUI() {
    const muteIcon = muteBtn.querySelector('.material-symbols-outlined');
    if (muteIcon) {
      muteIcon.textContent = isMuted ? 'volume_off' : 'volume_up';
    } else {
      muteBtn.textContent = isMuted ? '🔇' : '🔊';
    }
  }

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isMuted = !isMuted;
    appSettings.sound = !isMuted;
    saveSettings(appSettings);
    updateMuteButtonUI();
    if (!isMuted) ensureAudio();
  });
  // Sync muteBtn icon on load
  updateMuteButtonUI();

  /* ── Settings Panel Logic ─────────────────────────────────── */
  function openSettingsPanel() {
    settingsPanel.classList.add('open');
    settingsBackdrop.classList.add('visible');
    if (state === 'playing') {
      wasPlayingBeforeSettings = true;
      togglePause(true);
    }
    syncSettingsUI();
  }

  function closeSettingsPanel() {
    settingsPanel.classList.remove('open');
    settingsBackdrop.classList.remove('visible');
    if (wasPlayingBeforeSettings && state === 'paused') {
      togglePause(false);
      wasPlayingBeforeSettings = false;
    }
  }

  function syncSettingsUI() {
    const soundToggleEl = document.getElementById('soundToggle');
    const vibToggleEl = document.getElementById('vibrationToggle');
    if (soundToggleEl) soundToggleEl.checked = appSettings.sound;
    if (vibToggleEl) vibToggleEl.checked = appSettings.vibration;
    document.querySelectorAll('.diff-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.diff === appSettings.difficulty);
    });
    const preset = DIFFICULTY_PRESETS[appSettings.difficulty];
    const diffDescEl = document.getElementById('diffDesc');
    if (diffDescEl && preset) diffDescEl.textContent = preset.desc;
    buildThemeGrid();
    const gs = loadState();
    const hiEl = document.getElementById('settingsHighScore');
    if (hiEl) hiEl.textContent = gs.highScore.toLocaleString();
    startHighScoreEl.textContent = gs.highScore;
  }

  function buildThemeGrid() {
    const grid = document.getElementById('themeGrid');
    if (!grid) return;
    grid.innerHTML = '';
    THEMES.forEach(theme => {
      const card = document.createElement('div');
      card.className = 'theme-card' + (appSettings.theme === theme.id ? ' active' : '');
      const previewStyle = theme.gradient
        ? `background: linear-gradient(135deg, ${theme.gradient.start}, ${theme.gradient.mid})`
        : 'background: linear-gradient(135deg, #0b0c10, #1f2833)';
      card.innerHTML = `
        <div class="theme-preview" style="${previewStyle}"></div>
        <span class="theme-emoji">${theme.emoji}</span>
        <span class="theme-name">${theme.name}</span>
        <span class="theme-desc">${theme.desc}</span>
      `;
      card.addEventListener('click', () => {
        appSettings.theme = theme.id;
        saveSettings(appSettings);
        buildThemeGrid();
      });
      grid.appendChild(card);
    });
  }

  if (settingsOpenBtn) settingsOpenBtn.addEventListener('click', (e) => { e.stopPropagation(); openSettingsPanel(); });
  if (settingsGameBtn) settingsGameBtn.addEventListener('click', (e) => { e.stopPropagation(); openSettingsPanel(); });
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsPanel);
  if (settingsBackdrop) settingsBackdrop.addEventListener('click', closeSettingsPanel);

  document.getElementById('soundToggle')?.addEventListener('change', (e) => {
    appSettings.sound = e.target.checked;
    isMuted = !appSettings.sound;
    updateMuteButtonUI();
    saveSettings(appSettings);
  });

  document.getElementById('vibrationToggle')?.addEventListener('change', (e) => {
    appSettings.vibration = e.target.checked;
    saveSettings(appSettings);
  });

  document.querySelectorAll('.diff-tab').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      appSettings.difficulty = btn.dataset.diff;
      saveSettings(appSettings);
      document.querySelectorAll('.diff-tab').forEach(b => b.classList.toggle('active', b.dataset.diff === appSettings.difficulty));
      const preset = DIFFICULTY_PRESETS[appSettings.difficulty];
      const diffDescEl = document.getElementById('diffDesc');
      if (diffDescEl && preset) diffDescEl.textContent = preset.desc;
    });
  });

  document.getElementById('resetScoreBtn')?.addEventListener('click', () => {
    const gs = loadState();
    saveState({ ...gs, highScore: 0 });
    startHighScoreEl.textContent = '0';
    bestScoreValEl.textContent = '0';
    const hiEl = document.getElementById('settingsHighScore');
    if (hiEl) hiEl.textContent = '0';
  });

  // Auto-pause when tab becomes hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') togglePause(true);
  });

  // Pause menu actions
  resumeBtn.addEventListener('click', () => {
    togglePause(false);
  });

  restartBtn.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    startNewGame();
  });

  exitBtn.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    hud.classList.add('hidden');
    startScreen.classList.remove('hidden');
    state = 'menu';
    startHighScoreEl.textContent = gameState.highScore;
  });

  // Game over menu actions
  replayBtn.addEventListener('click', () => {
    startNewGame();
  });

  changeKartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    openKartSelect();
  });

  exitToMenuBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    state = 'menu';
    startHighScoreEl.textContent = gameState.highScore;
  });

  // Register selection callbacks in UI module
  initUI(
    (kartId) => selectAndStartGame(kartId), // selection callback
    () => { // back callback
      kartSelectScreen.classList.add('hidden');
      stopPreviewAnimation();
      startScreen.classList.remove('hidden');
      state = 'menu';
    }
  );

  /* ===================== PHYSICS & UPDATES ===================== */
  function lerp(start, end, amt) {
    return start.map((s, i) => s + (end[i] - s) * amt);
  }

  function updatePhysics(dt) {
    if (state === 'paused') return;

    // Background scrolling based on level
    const activeThemeForParticles = getThemeById(appSettings.theme);
    const effectivePType = activeThemeForParticles.particleType || currentLevel.particleType;

    bgParticles.forEach(p => {
      let scrollMult = 1.0 + (currentLevel.level * 0.15);
      if (powerupTimers.slomo > 0) scrollMult *= 0.5;

      if (effectivePType === 'rain') {
        p.y += p.speed * scrollMult * 2.8;
      } else if (effectivePType === 'embers') {
        p.y -= p.speed * scrollMult * 0.7;
        p.x += Math.sin(p.y / 20) * 0.4;
      } else if (effectivePType === 'stars' || effectivePType === 'moondust') {
        p.opacity += p.twinkleSpeed * p.twinkleDir;
        if (p.opacity >= 0.92 || p.opacity <= 0.10) p.twinkleDir *= -1;
        p.y += p.speed * scrollMult * (effectivePType === 'moondust' ? 0.14 : 0.20);
      } else if (effectivePType === 'bubbles') {
        p.y -= p.speed * scrollMult * 0.72;
        p.x += Math.sin(p.y / 30) * 0.45;
        p.opacity = 0.22 + Math.abs(Math.sin(Date.now() * 0.0014 + p.x * 0.05)) * 0.28;
      } else if (effectivePType === 'orbit') {
        if (!p.orbitR) {
          p.orbitR = 38 + Math.random() * Math.min(canvas.width, canvas.height) * 0.42;
          p.orbitAngle = Math.random() * Math.PI * 2;
          p.orbitDir = Math.random() < 0.5 ? 1 : -1;
          p.orbitSpd = 0.0035 + Math.random() * 0.0075;
        }
        p.orbitAngle += p.orbitSpd * p.orbitDir * scrollMult;
        p.x = canvas.width / 2 + Math.cos(p.orbitAngle) * p.orbitR;
        p.y = canvas.height / 2 + Math.sin(p.orbitAngle) * p.orbitR * 0.30;
        p.opacity = 0.12 + (1 - p.orbitR / (Math.min(canvas.width, canvas.height) * 0.45)) * 0.55;
      } else {
        p.y += p.speed * scrollMult;
      }

      if (effectivePType === 'bubbles') {
        if (p.y < -10) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
      } else if (effectivePType !== 'orbit') {
        if (p.y > canvas.height) { p.y = -5; p.x = Math.random() * canvas.width; }
        else if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
      }
    });

    if (state === 'countdown') {
      countdownTimer += dt;
      if (countdownTimer >= 750) {
        countdownTimer = 0;
        countdownVal--;
        if (countdownVal > 0) {
          playCoinSound(400, 1.2);
        } else {
          playCoinSound(600, 2.0);
          state = 'playing';
        }
      }
      return;
    }

    if (state !== 'playing') return;

    elapsed += dt / 1000;

    // Decrement powerups
    if (powerupTimers.magnet > 0) powerupTimers.magnet = Math.max(0, powerupTimers.magnet - dt);
    if (powerupTimers.slomo > 0) powerupTimers.slomo = Math.max(0, powerupTimers.slomo - dt);
    if (powerupTimers.multiplier > 0) powerupTimers.multiplier = Math.max(0, powerupTimers.multiplier - dt);

    // Call UI power-up ring updates
    const activeHUDList = [];
    if (powerupTimers.magnet > 0) {
      activeHUDList.push({ type: 'magnet', timeRemaining: powerupTimers.magnet / 1000, duration: 5.0, icon: '🧲', color: '#2eb6ff' });
    }
    if (powerupTimers.slomo > 0) {
      activeHUDList.push({ type: 'slomo', timeRemaining: powerupTimers.slomo / 1000, duration: 4.0, icon: '⏳', color: '#bf77ff' });
    }
    if (powerupTimers.multiplier > 0) {
      activeHUDList.push({ type: 'multiplier', timeRemaining: powerupTimers.multiplier / 1000, duration: 6.0, icon: '✨', color: '#ffd34d' });
    }
    if (powerupTimers.shield) {
      activeHUDList.push({ type: 'shield', timeRemaining: 1.0, duration: 1.0, icon: '🛡️', color: '#2effa3' });
    }
    updatePowerupsHUD(activeHUDList);

    // Dynamic background color interpolation
    const hexToRgbLocal = (hex) => {
      if (!hex || hex[0] !== '#') return [0, 0, 0];
      const bigint = parseInt(hex.slice(1), 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };
    const activeBgTheme = getThemeById(appSettings.theme);

    if (activeBgTheme.gradient) {
      // Theme overrides level background colors — smooth lerp to theme
      currentBgColors.start = lerp(currentBgColors.start, hexToRgbLocal(activeBgTheme.gradient.start), 0.055);
      currentBgColors.mid   = lerp(currentBgColors.mid,   hexToRgbLocal(activeBgTheme.gradient.mid),   0.055);
      currentBgColors.end   = lerp(currentBgColors.end,   hexToRgbLocal(activeBgTheme.gradient.end),   0.055);
    } else {
      // Level-specific bg colors (original logic)
      let targetGrad = currentLevel.bgGradient;

      if (currentLevel.level === 10) {
        levelColorTimer += dt * 0.0006;
        const hue1 = Math.round(levelColorTimer * 50) % 360;
        const hue2 = (hue1 + 120) % 360;
        targetGrad = { start: `hsl(${hue1}, 55%, 25%)`, mid: `hsl(${hue2}, 45%, 15%)`, end: '#020105' };

        const hslToRgb = (h, s, l) => {
          s /= 100; l /= 100;
          const k = n => (n + h / 30) % 12;
          const a = s * Math.min(l, 1 - l);
          const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
          return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
        };
        currentBgColors.start = lerp(currentBgColors.start, hslToRgb(hue1, 55, 25), 0.04);
        currentBgColors.mid   = lerp(currentBgColors.mid,   hslToRgb(hue2, 45, 15), 0.04);
        currentBgColors.end   = lerp(currentBgColors.end,   [10, 5, 20], 0.04);
      } else {
        currentBgColors.start = lerp(currentBgColors.start, hexToRgbLocal(targetGrad.start), 0.06);
        currentBgColors.mid   = lerp(currentBgColors.mid,   hexToRgbLocal(targetGrad.mid),   0.06);
        currentBgColors.end   = lerp(currentBgColors.end,   hexToRgbLocal(targetGrad.end),   0.06);
      }
    }

    // Spawn timing curves (difficulty-adjusted)
    const diffPresetSpawn = DIFFICULTY_PRESETS[appSettings.difficulty] || DIFFICULTY_PRESETS.medium;
    const baseSpawnInterval = currentLevel.spawnInterval * diffPresetSpawn.spawnIntervalMult;
    spawnInterval = Math.max(200, (baseSpawnInterval / currentLevel.spawnMult) - elapsed * 5);
    
    // Slow-mo decreases spawn rate comfort
    if (powerupTimers.slomo > 0) {
      spawnInterval *= 1.8;
    }

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnObject();
      
      // Level specific extra spawns
      if (Math.random() < 0.2 + (currentLevel.level * 0.06)) {
        spawnObject();
      }
    }

    // Autoplay helper for developer testing and agent walkthroughs
    if (window.autoplayActive) {
      const nonBombs = objects.filter(o => !o.def.isBomb && o.y > 0);
      if (nonBombs.length > 0) {
        const lowest = nonBombs.reduce((lowest, o) => o.y > lowest.y ? o : lowest, nonBombs[0]);
        targetCartX = lowest.x;
      }
    }

    // Selected kart movement configuration
    const selectedKart = getKartById(gameState.selectedKart);
    const trackingSpeed = (selectedKart.id === 'speedster') ? 0.28 : 0.16;
    cartX += (targetCartX - cartX) * trackingSpeed * selectedKart.speedMultiplier;

    // Neon Drift trailing particles ability
    if (selectedKart.id === 'drift' && Math.random() < 0.45) {
      particles.push({
        x: cartX + (Math.random() - 0.5) * selectedKart.width * 0.7,
        y: canvas.height - CART_Y_OFFSET + 24,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1 + Math.random() * 2,
        life: 0.8,
        decay: 0.03 + Math.random() * 0.02,
        size: 2.5 + Math.random() * 3.5,
        color: 'rgba(191, 119, 255, 0.75)',
        isText: false
      });
    }

    // Update cargo crates physics
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      o.angle += o.rotationSpeed;
      o.wobble += o.wobbleSpeed;

      // Slow-mo powerup speed damping
      let currentFallSpeed = o.speed;
      if (powerupTimers.slomo > 0) {
        currentFallSpeed *= 0.5;
      }

      // Magnet properties (active shield powerup OR passive Magnet Kart skill)
      const hasMagnetSkill = (selectedKart.id === 'magnet');
      const pullRadius = hasMagnetSkill ? 150 : 0;
      const isMagnetActive = (powerupTimers.magnet > 0);
      
      if ((isMagnetActive || hasMagnetSkill) && !o.def.isBomb) {
        const dx = cartX - o.x;
        const dy = (canvas.height - CART_Y_OFFSET) - o.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Magnet pulls if active globally OR within pull range for Magnet Kart
        if (isMagnetActive || dist <= pullRadius) {
          const force = isMagnetActive ? 0.09 : 0.05;
          o.x += dx * force;
          o.y += dy * force;
        } else {
          o.x += Math.sin(o.wobble) * 0.5;
          o.y += currentFallSpeed;
        }
      } else {
        o.x += Math.sin(o.wobble) * 0.5;
        o.y += currentFallSpeed;
      }

      // Basket collision gates
      const cartTop = canvas.height - CART_Y_OFFSET;
      const cartBottom = cartTop + CART_HEIGHT;
      const cartLeft = cartX - selectedKart.width / 2;
      const cartRight = cartX + selectedKart.width / 2;

      const collidesWithCart = (
        o.y + o.r >= cartTop &&
        o.y - o.r <= cartBottom &&
        o.x + o.r >= cartLeft &&
        o.x - o.r <= cartRight
      );

      if (collidesWithCart) {
        collectObject(o, i, false);
        continue;
      }

      // Out of bounds detection
      if (o.y - o.r > canvas.height) {
        // Missed standard cargo crates breaks combo streak
        if (o.def.isCrate) {
          combo = 0;
          updateScoreUI();
        }
        objects.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      
      if (!p.isText) {
        p.vy += 0.07;
      }
      
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Screen Shake decay
    if (shake > 0.05) {
      shake *= 0.88;
    } else {
      shake = 0;
    }
  }

  /* ===================== THEME SPECIAL EFFECTS ===================== */
  function drawBlackHoleEffect() {
    bhAngle += 0.007;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const maxR = Math.min(canvas.width, canvas.height) * 0.40;
    for (let r = maxR; r > 16; r -= 7) {
      const t = 1 - r / maxR;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.65, r * 0.42, bhAngle, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${270 + t * 70}, 80%, 62%, ${t * 0.13})`;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    const ehG = ctx.createRadialGradient(cx, cy, 0, cx, cy, 52);
    ehG.addColorStop(0, 'rgba(0,0,0,1)');
    ehG.addColorStop(0.78, 'rgba(0,0,0,0.92)');
    ehG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ehG;
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSunEffect() {
    sunTime += 0.012;
    const cx = canvas.width / 2, cy = -canvas.height * 0.08;
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + sunTime * 0.12;
      const len = canvas.height * 0.65 + Math.sin(sunTime * 2.2 + i * 0.73) * 70;
      const alpha = 0.032 + Math.abs(Math.sin(sunTime * 1.5 + i)) * 0.018;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      ctx.strokeStyle = `rgba(255,190,50,${alpha})`;
      ctx.lineWidth = 22 + Math.sin(sunTime + i) * 8;
      ctx.stroke();
    }
    const sunG = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.height * 0.22);
    sunG.addColorStop(0, 'rgba(255,240,100,0.22)');
    sunG.addColorStop(0.5, 'rgba(255,140,30,0.08)');
    sunG.addColorStop(1, 'rgba(255,50,0,0)');
    ctx.fillStyle = sunG;
    ctx.beginPath();
    ctx.arc(cx, cy, canvas.height * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMoonEffect() {
    const mlG = ctx.createRadialGradient(canvas.width * 0.88, -20, 0, canvas.width * 0.88, -20, canvas.height * 0.55);
    mlG.addColorStop(0, 'rgba(180,200,255,0.08)');
    mlG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mlG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const craters = [{rx:0.14,ry:0.11,r:26},{rx:0.80,ry:0.19,r:20},{rx:0.46,ry:0.07,r:34},{rx:0.30,ry:0.28,r:14},{rx:0.65,ry:0.14,r:22},{rx:0.90,ry:0.36,r:12}];
    craters.forEach(c => {
      const cx = c.rx * canvas.width, cy = c.ry * canvas.height;
      ctx.beginPath(); ctx.arc(cx, cy, c.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(130,150,200,0.16)'; ctx.lineWidth = 2; ctx.stroke();
      const cg = ctx.createRadialGradient(cx - c.r * 0.2, cy - c.r * 0.2, 0, cx, cy, c.r);
      cg.addColorStop(0, 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, c.r * 0.8, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawNebulaEffect() {
    nebulaTime += 0.0025;
    const clouds = [{rx:0.18,ry:0.22,r:130,hue:280,a:0.055},{rx:0.78,ry:0.14,r:95,hue:200,a:0.045},{rx:0.5,ry:0.42,r:160,hue:320,a:0.04},{rx:0.84,ry:0.58,r:85,hue:240,a:0.055},{rx:0.08,ry:0.50,r:100,hue:300,a:0.035}];
    clouds.forEach((c, i) => {
      const cx = c.rx * canvas.width + Math.sin(nebulaTime + i) * 18;
      const cy = c.ry * canvas.height + Math.cos(nebulaTime * 0.72 + i) * 12;
      const pulse = c.a + Math.sin(nebulaTime * 1.4 + i * 1.3) * 0.016;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, c.r);
      grad.addColorStop(0, `hsla(${c.hue},80%,65%,${pulse * 2.2})`);
      grad.addColorStop(1, `hsla(${c.hue},70%,40%,0)`);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, c.r, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawNeonCityEffect() {
    const floor = canvas.height * 0.93;
    const bldgs = [{x:0.00,w:0.055,h:0.12},{x:0.05,w:0.04,h:0.20},{x:0.08,w:0.065,h:0.15},{x:0.14,w:0.045,h:0.27},{x:0.18,w:0.04,h:0.17},{x:0.21,w:0.075,h:0.22},{x:0.28,w:0.04,h:0.14},{x:0.31,w:0.055,h:0.30},{x:0.36,w:0.048,h:0.18},{x:0.40,w:0.068,h:0.14},{x:0.46,w:0.038,h:0.25},{x:0.49,w:0.055,h:0.36},{x:0.54,w:0.045,h:0.20},{x:0.58,w:0.075,h:0.16},{x:0.65,w:0.038,h:0.28},{x:0.68,w:0.058,h:0.20},{x:0.73,w:0.045,h:0.14},{x:0.77,w:0.065,h:0.23},{x:0.83,w:0.045,h:0.17},{x:0.87,w:0.075,h:0.11},{x:0.94,w:0.06,h:0.19}];
    ctx.fillStyle = 'rgba(0,4,10,0.82)';
    bldgs.forEach(b => ctx.fillRect(b.x * canvas.width, floor - b.h * canvas.height, b.w * canvas.width, b.h * canvas.height));
    bldgs.forEach((b, i) => {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(0,240,195,0.25)' : 'rgba(180,80,255,0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x * canvas.width + 0.5, floor - b.h * canvas.height + 0.5, b.w * canvas.width - 1, b.h * canvas.height - 1);
    });
    const nG = ctx.createLinearGradient(0, floor - 2, 0, floor - 28);
    nG.addColorStop(0, 'rgba(0,240,195,0.18)'); nG.addColorStop(1, 'rgba(0,240,195,0)');
    ctx.fillStyle = nG; ctx.fillRect(0, floor - 28, canvas.width, 28);
  }

  /* ===================== CANVAS DRAWING ENGINE ===================== */
  function drawBackground() {
    const activeDTheme = getThemeById(appSettings.theme);
    const effectivePType  = activeDTheme.particleType  || currentLevel.particleType;
    const effectivePColor = activeDTheme.particleColor || currentLevel.particleColor;

    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const cStart = `rgb(${Math.round(currentBgColors.start[0])}, ${Math.round(currentBgColors.start[1])}, ${Math.round(currentBgColors.start[2])})`;
    const cMid   = `rgb(${Math.round(currentBgColors.mid[0])},   ${Math.round(currentBgColors.mid[1])},   ${Math.round(currentBgColors.mid[2])})`;
    const cEnd   = `rgb(${Math.round(currentBgColors.end[0])},   ${Math.round(currentBgColors.end[1])},   ${Math.round(currentBgColors.end[2])})`;
    g.addColorStop(0, cStart); g.addColorStop(0.5, cMid); g.addColorStop(1, cEnd);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Theme-specific special effects (drawn behind particles)
    if      (activeDTheme.special === 'blackhole') drawBlackHoleEffect();
    else if (activeDTheme.special === 'sun')       drawSunEffect();
    else if (activeDTheme.special === 'moon')      drawMoonEffect();
    else if (activeDTheme.special === 'nebula')    drawNebulaEffect();
    else if (activeDTheme.special === 'neon')      drawNeonCityEffect();

    // Particle system (theme or level-specific type)
    bgParticles.forEach(p => {
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      if (effectivePType === 'rain') {
        ctx.strokeStyle = effectivePColor;
        ctx.lineWidth = 1;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 1, p.y + 12);
        ctx.stroke();
      } else if (effectivePType === 'bubbles') {
        ctx.strokeStyle = effectivePColor;
        ctx.lineWidth = 1.2;
        ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = p.opacity * 0.35;
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.38, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = effectivePColor;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1.0;

    // Bottom zone gradient overlay
    const grad = ctx.createLinearGradient(0, canvas.height - 130, 0, canvas.height);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.025)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, canvas.height - 130, canvas.width, 130);
  }

  // Draw procedural cargo blocks matching specifications
  function drawCrate(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.angle);

    ctx.shadowColor = o.def.glow;
    ctx.shadowBlur = (powerupTimers.slomo > 0) ? 22 : 14;

    const size = o.r * 2.0;
    const hs = size / 2;

    if (o.typeKey === 'BOMB') {
      // Hazard styling for core core bombs
      ctx.fillStyle = '#1e252b';
      ctx.strokeStyle = '#ff4d6e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-hs, -hs, size, size, 5);
      ctx.fill();
      ctx.stroke();

      // Hazard caution diagonal stripes
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-hs + 4, -hs + 12);
      ctx.lineTo(-hs + 12, -hs + 4);
      ctx.moveTo(-hs + 4, hs - 4);
      ctx.lineTo(hs - 4, -hs + 4);
      ctx.moveTo(hs - 12, hs - 4);
      ctx.lineTo(hs - 4, hs - 12);
      ctx.stroke();

      // Pulsing warning energy core center
      const corePulse = 4 + Math.sin(Date.now() * 0.01) * 2;
      ctx.shadowColor = '#ff4d6e';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff4d6e';
      ctx.beginPath();
      ctx.arc(0, 0, corePulse, 0, Math.PI * 2);
      ctx.fill();

    } else if (o.typeKey === 'GOLD_CRATE') {
      // Premium metal plates
      const goldGrad = ctx.createLinearGradient(-hs, -hs, hs, hs);
      goldGrad.addColorStop(0, '#ffe066');
      goldGrad.addColorStop(0.5, '#f5b041');
      goldGrad.addColorStop(1, '#9c6c00');
      
      ctx.fillStyle = goldGrad;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-hs, -hs, size, size, 6);
      ctx.fill();
      ctx.stroke();

      // Inner details
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#b38600';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(-hs + 5, -hs + 5, size - 10, size - 10);
      ctx.moveTo(-hs + 5, -hs + 5);
      ctx.lineTo(hs - 5, hs - 5);
      ctx.stroke();

    } else if (o.typeKey === 'WOOD_CRATE') {
      // Wood cargo panels
      ctx.fillStyle = '#875a36';
      ctx.strokeStyle = '#5c3a21';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-hs, -hs, size, size, 4);
      ctx.fill();
      ctx.stroke();

      // Wood grains plank lines
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#a06d42';
      ctx.beginPath();
      ctx.roundRect(-hs + 3, -hs + 3, size - 6, size - 6, 2);
      ctx.fill();

      ctx.strokeStyle = '#5c3a21';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // X bracing
      ctx.moveTo(-hs + 3, -hs + 3);
      ctx.lineTo(hs - 3, hs - 3);
      ctx.moveTo(hs - 3, -hs + 3);
      ctx.lineTo(-hs + 3, hs - 3);
      ctx.stroke();

    } else {
      // Powerup vector cores
      ctx.fillStyle = '#0e051c';
      ctx.strokeStyle = o.def.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-hs, -hs, size, size, 12);
      ctx.fill();
      ctx.stroke();

      // Core interior energy drawing
      ctx.shadowBlur = 10;
      ctx.shadowColor = o.def.color;
      ctx.fillStyle = o.def.color;
      
      if (o.def.power === 'magnet') {
        // Draw blue magnet shape
        ctx.strokeStyle = '#2eb6ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 7, Math.PI, 0);
        ctx.stroke();
      } else if (o.def.power === 'slomo') {
        // Hourglass shape
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(6, -8);
        ctx.lineTo(-6, 8);
        ctx.lineTo(6, 8);
        ctx.closePath();
        ctx.fill();
      } else if (o.def.power === 'multiplier') {
        // Glowing cross stars/X
        ctx.font = '900 16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('2X', 0, 0);
      } else if (o.def.power === 'shield') {
        // Cyan Hexagon core
        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
          const sa = (s * Math.PI) / 3;
          const sx = Math.cos(sa) * 8;
          const sy = Math.sin(sa) * 8;
          if (s === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      
      if (p.isText) {
        ctx.font = '900 20px Outfit, sans-serif';
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });
    ctx.globalAlpha = 1.0;
  }

  function drawCountdownOverlay() {
    drawBackground();
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (countdownVal > 0) {
      ctx.font = '900 100px Outfit, sans-serif';
      ctx.fillStyle = '#ffd34d';
      ctx.shadowColor = 'rgba(255, 211, 77, 0.5)';
      ctx.shadowBlur = 32;
      ctx.fillText(countdownVal, 0, 0);
    } else {
      ctx.font = '900 75px Outfit, sans-serif';
      ctx.fillStyle = '#2effa3';
      ctx.shadowColor = 'rgba(46, 255, 163, 0.6)';
      ctx.shadowBlur = 32;
      ctx.fillText('LAUNCH!', 0, 0);
    }
    ctx.restore();
  }

  function drawFrame() {
    ctx.save();
    
    // Process Screen shaking offsets
    if (shake > 0.5) {
      const dx = (Math.random() - 0.5) * shake;
      const dy = (Math.random() - 0.5) * shake;
      ctx.translate(dx, dy);
    }

    if (state === 'countdown') {
      drawCountdownOverlay();
      ctx.restore();
      return;
    }

    // Default play background
    drawBackground();

    // Render gameplay elements
    objects.forEach(drawCrate);
    drawParticles();
    
    if (state === 'playing' || state === 'paused') {
      const selectedKart = getKartById(gameState.selectedKart);
      
      // Draw translated active player vehicle
      ctx.save();
      ctx.translate(cartX, canvas.height - CART_Y_OFFSET);
      
      // Draw custom vector kart graphics
      selectedKart.draw(ctx, selectedKart.width, CART_HEIGHT);
      
      ctx.restore();
    }

    ctx.restore();
  }

  /* ===================== GAME MAIN LOOP ===================== */
  function mainLoop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min(ts - lastTime, 50); // safety cap
    lastTime = ts;

    updatePhysics(dt);
    drawFrame();

    requestAnimationFrame(mainLoop);
  }

  requestAnimationFrame(mainLoop);

})();
