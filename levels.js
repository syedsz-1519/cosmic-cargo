// levels.js
'use strict';

export const LEVELS = [
  {
    level: 1,
    scoreGate: 0,
    name: 'Sunrise Harbor',
    bgGradient: { start: '#ffd3b6', mid: '#ff8b94', end: '#6c5ce7' },
    speedMult: 1.0,
    spawnMult: 1.0,
    spawnInterval: 900,
    bombRatio: 0.10,
    particleColor: 'rgba(255, 255, 255, 0.4)',
    particleType: 'dust',
    activeTypes: ['WOOD_CRATE', 'GOLD_CRATE', 'BOMB']
  },
  {
    level: 2,
    scoreGate: 300,
    name: 'Daylight Docks',
    bgGradient: { start: '#a8dadc', mid: '#457b9d', end: '#1d3557' },
    speedMult: 1.15,
    spawnMult: 1.1,
    spawnInterval: 820,
    bombRatio: 0.13,
    particleColor: 'rgba(255, 255, 255, 0.55)',
    particleType: 'dust',
    activeTypes: ['WOOD_CRATE', 'GOLD_CRATE', 'BOMB', 'MAGNET']
  },
  {
    level: 3,
    scoreGate: 700,
    name: 'Golden Hour',
    bgGradient: { start: '#ffeaa7', mid: '#e17055', end: '#2d3436' },
    speedMult: 1.3,
    spawnMult: 1.2,
    spawnInterval: 750,
    bombRatio: 0.15,
    particleColor: 'rgba(255, 215, 0, 0.5)',
    particleType: 'dust',
    activeTypes: ['WOOD_CRATE', 'GOLD_CRATE', 'BOMB', 'MAGNET', 'MULTIPLIER']
  },
  {
    level: 4,
    scoreGate: 1200,
    name: 'Dusk Run',
    bgGradient: { start: '#6c5ce7', mid: '#321042', end: '#0f051d' },
    speedMult: 1.45,
    spawnMult: 1.3,
    spawnInterval: 690,
    bombRatio: 0.18,
    particleColor: 'rgba(191, 119, 255, 0.5)',
    particleType: 'dust',
    activeTypes: ['WOOD_CRATE', 'GOLD_CRATE', 'BOMB', 'MAGNET', 'MULTIPLIER', 'SLOMO']
  },
  {
    level: 5,
    scoreGate: 1800,
    name: 'Neon Night',
    bgGradient: { start: '#ff007f', mid: '#7b00ff', end: '#0d021f' },
    speedMult: 1.6,
    spawnMult: 1.4,
    spawnInterval: 640,
    bombRatio: 0.20,
    particleColor: 'rgba(0, 255, 255, 0.6)',
    particleType: 'dust',
    activeTypes: ['WOOD_CRATE', 'GOLD_CRATE', 'BOMB', 'MAGNET', 'MULTIPLIER', 'SLOMO', 'SHIELD']
  },
  {
    level: 6,
    scoreGate: 2500,
    name: 'Storm Yard',
    bgGradient: { start: '#535c68', mid: '#2c3e50', end: '#130f40' },
    speedMult: 1.75,
    spawnMult: 1.5,
    spawnInterval: 600,
    bombRatio: 0.22,
    particleColor: 'rgba(165, 200, 255, 0.4)',
    particleType: 'rain',
    activeTypes: ['WOOD_CRATE', 'GOLD_CRATE', 'BOMB', 'MAGNET', 'MULTIPLIER', 'SLOMO', 'SHIELD']
  },
  {
    level: 7,
    scoreGate: 3300,
    name: 'Deep Space Cargo',
    bgGradient: { start: '#0b0c10', mid: '#1f2833', end: '#020305' },
    speedMult: 1.9,
    spawnMult: 1.6,
    spawnInterval: 560,
    bombRatio: 0.25,
    particleColor: 'rgba(255, 255, 255, 0.85)',
    particleType: 'stars',
    activeTypes: ['WOOD_CRATE', 'GOLD_CRATE', 'BOMB', 'MAGNET', 'MULTIPLIER', 'SLOMO', 'SHIELD']
  },
  {
    level: 8,
    scoreGate: 4200,
    name: 'Volcanic Drop',
    bgGradient: { start: '#ff5e62', mid: '#ff9966', end: '#1a0000' },
    speedMult: 2.05,
    spawnMult: 1.7,
    spawnInterval: 530,
    bombRatio: 0.28,
    particleColor: 'rgba(255, 120, 50, 0.7)',
    particleType: 'embers',
    activeTypes: ['WOOD_CRATE', 'GOLD_CRATE', 'BOMB', 'MAGNET', 'MULTIPLIER', 'SLOMO', 'SHIELD']
  },
  {
    level: 9,
    scoreGate: 5200,
    name: 'Aurora Express',
    bgGradient: { start: '#00b894', mid: '#0984e3', end: '#2d3436' },
    speedMult: 2.2,
    spawnMult: 1.8,
    spawnInterval: 500,
    bombRatio: 0.30,
    particleColor: 'rgba(0, 255, 135, 0.5)',
    particleType: 'aurora',
    activeTypes: ['WOOD_CRATE', 'GOLD_CRATE', 'BOMB', 'MAGNET', 'MULTIPLIER', 'SLOMO', 'SHIELD']
  },
  {
    level: 10,
    scoreGate: 6500,
    name: 'Final Rush',
    bgGradient: { start: '#000000', mid: '#000000', end: '#000000' },
    speedMult: 2.4,
    spawnMult: 2.0,
    spawnInterval: 450,
    bombRatio: 0.33,
    particleColor: 'rgba(255, 255, 255, 0.9)',
    particleType: 'cycle',
    activeTypes: ['WOOD_CRATE', 'GOLD_CRATE', 'BOMB', 'MAGNET', 'MULTIPLIER', 'SLOMO', 'SHIELD']
  }
];

export function getLevelForScore(score) {
  let matchedLevel = LEVELS[0];
  for (const lvl of LEVELS) {
    if (score >= lvl.scoreGate) {
      matchedLevel = lvl;
    } else {
      break;
    }
  }
  return matchedLevel;
}
