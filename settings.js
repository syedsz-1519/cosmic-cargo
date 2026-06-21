// settings.js — Settings management, themes & difficulty presets
'use strict';

const SETTINGS_KEY = 'cosmicSettings';

const DEFAULT_SETTINGS = {
  sound: true,
  vibration: true,
  difficulty: 'medium',
  theme: 'auto'
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) { saveSettings(DEFAULT_SETTINGS); return { ...DEFAULT_SETTINGS }; }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
}

export const THEMES = [
  {
    id: 'auto', name: 'Level Theme', emoji: '🎮',
    desc: 'Background evolves with each level',
    gradient: null, particleType: null, particleColor: null,
    accent: '#ffd34d', special: null
  },
  {
    id: 'blackhole', name: 'Black Hole', emoji: '🕳️',
    desc: 'Warped spacetime singularity',
    gradient: { start: '#060010', mid: '#110020', end: '#000008' },
    particleType: 'orbit', particleColor: 'rgba(180, 100, 255, 0.65)',
    accent: '#b464ff', special: 'blackhole'
  },
  {
    id: 'sun', name: 'Solar Flare', emoji: '☀️',
    desc: 'Scorching corona radiating solar energy',
    gradient: { start: '#3a1000', mid: '#6e2500', end: '#120500' },
    particleType: 'embers', particleColor: 'rgba(255, 150, 40, 0.72)',
    accent: '#ff9a30', special: 'sun'
  },
  {
    id: 'moon', name: 'Lunar Night', emoji: '🌙',
    desc: 'Silvery moonlit craterscape in deep orbit',
    gradient: { start: '#090f18', mid: '#14213a', end: '#050b12' },
    particleType: 'moondust', particleColor: 'rgba(180, 195, 240, 0.45)',
    accent: '#bcc8f0', special: 'moon'
  },
  {
    id: 'stars', name: 'Star Cluster', emoji: '⭐',
    desc: 'Dense star-field across the cosmos',
    gradient: { start: '#030115', mid: '#08042c', end: '#010009' },
    particleType: 'stars', particleColor: 'rgba(255, 255, 210, 0.95)',
    accent: '#ffe066', special: null
  },
  {
    id: 'nebula', name: 'Nebula Storm', emoji: '🌌',
    desc: 'Colorful interstellar gas clouds',
    gradient: { start: '#150048', mid: '#2d0078', end: '#0a0022' },
    particleType: 'dust', particleColor: 'rgba(200, 120, 255, 0.60)',
    accent: '#c878ff', special: 'nebula'
  },
  {
    id: 'neon', name: 'Neon City', emoji: '🏙️',
    desc: 'Cyberpunk rain-soaked streets at night',
    gradient: { start: '#000f14', mid: '#001c28', end: '#00050f' },
    particleType: 'rain', particleColor: 'rgba(0, 240, 195, 0.45)',
    accent: '#00f0c3', special: 'neon'
  },
  {
    id: 'ocean', name: 'Ocean Abyss', emoji: '🌊',
    desc: 'Deep-sea bioluminescent trenches',
    gradient: { start: '#00102e', mid: '#002058', end: '#000b1c' },
    particleType: 'bubbles', particleColor: 'rgba(80, 200, 255, 0.55)',
    accent: '#50c8ff', special: null
  }
];

export const DIFFICULTY_PRESETS = {
  easy: {
    label: 'Easy', emoji: '🌱',
    desc: 'Slower crates, fewer bombs, 5 lives — perfect for beginners.',
    speedMult: 0.68,
    bombRatioMult: 0.55,
    spawnIntervalMult: 1.55,
    startingLives: 5
  },
  medium: {
    label: 'Medium', emoji: '⚡',
    desc: 'Balanced challenge — the standard Cosmic Cargo experience.',
    speedMult: 1.0,
    bombRatioMult: 1.0,
    spawnIntervalMult: 1.0,
    startingLives: 3
  },
  hard: {
    label: 'Hard', emoji: '💀',
    desc: 'Ultra-fast drops, dense bomb rain, only 2 lives. Legendary pilots only.',
    speedMult: 1.5,
    bombRatioMult: 1.65,
    spawnIntervalMult: 0.72,
    startingLives: 2
  }
};

export function getThemeById(id) {
  return THEMES.find(t => t.id === id) || THEMES[0];
}
