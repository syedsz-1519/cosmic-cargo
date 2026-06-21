// storage.js
'use strict';

const SAVE_KEY = 'cosmicCargoSave';

const DEFAULT_STATE = {
  highScore: 0,
  unlockedKarts: ['classic', 'speedster'],
  selectedKart: 'classic',
  lastLevelReached: 1
};

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      saveState(DEFAULT_STATE);
      return { ...DEFAULT_STATE };
    }
    const parsed = JSON.parse(raw);
    // Ensure back-compatibility and merge default fields
    return { ...DEFAULT_STATE, ...parsed };
  } catch (e) {
    console.error('Failed to load game state:', e);
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

export function saveHighScore(score) {
  const state = loadState();
  if (score > state.highScore) {
    state.highScore = score;
    saveState(state);
    return true; // returns true if a new high score was set
  }
  return false;
}

export function unlockKart(kartId) {
  const state = loadState();
  if (!state.unlockedKarts.includes(kartId)) {
    state.unlockedKarts.push(kartId);
    saveState(state);
    return true;
  }
  return false;
}

export function selectKart(kartId) {
  const state = loadState();
  state.selectedKart = kartId;
  saveState(state);
}
