// ui.js
'use strict';

import { KARTS } from './karts.js';
import { loadState } from './storage.js';

let currentCarouselIndex = 0;
let previewCanvas = null;
let previewCtx = null;
let previewAnimId = null;

export function initUI(onSelectKartCallback, onBackCallback) {
  previewCanvas = document.getElementById('kartPreviewCanvas');
  if (previewCanvas) {
    previewCtx = previewCanvas.getContext('2d');
  }
  
  const prevBtn = document.getElementById('prevKartBtn');
  const nextBtn = document.getElementById('nextKartBtn');
  const selectBtn = document.getElementById('selectKartBtn');
  const backBtn = document.getElementById('backToMenuBtn');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentCarouselIndex = (currentCarouselIndex - 1 + KARTS.length) % KARTS.length;
      const state = loadState();
      updateCarouselDisplay(state.unlockedKarts, state.highScore);
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentCarouselIndex = (currentCarouselIndex + 1) % KARTS.length;
      const state = loadState();
      updateCarouselDisplay(state.unlockedKarts, state.highScore);
    });
  }
  
  if (selectBtn) {
    selectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedKart = KARTS[currentCarouselIndex];
      onSelectKartCallback(selectedKart.id);
    });
  }
  
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onBackCallback();
    });
  }
}

export function resetCarouselIndex() {
  currentCarouselIndex = 0;
}

export function updateCarouselDisplay(unlockedKarts, highScore) {
  // If arguments are missing, we fetch them from storage or use global state variables
  // Passed in by game.js on load/render.
  if (!unlockedKarts) return; 
  
  const kart = KARTS[currentCarouselIndex];
  const isLocked = !unlockedKarts.includes(kart.id) && highScore < kart.unlockScore;
  
  // Update name & description text
  const nameEl = document.getElementById('kartName');
  const descEl = document.getElementById('kartDesc');
  if (nameEl) nameEl.textContent = kart.name;
  if (descEl) descEl.textContent = kart.abilityDescription;
  
  // Update glowing progress meters
  const sizeEl = document.getElementById('statSize');
  const speedEl = document.getElementById('statSpeed');
  const magnetEl = document.getElementById('statMagnet');
  
  if (sizeEl) sizeEl.style.width = `${(kart.stats.size / 5) * 100}%`;
  if (speedEl) speedEl.style.width = `${(kart.stats.speed / 5) * 100}%`;
  if (magnetEl) magnetEl.style.width = `${(kart.stats.magnet / 5) * 100}%`;
  
  // Update lock states and buttons
  const lockOverlay = document.getElementById('kartLockOverlay');
  const unlockLabel = document.getElementById('kartUnlockLabel');
  const selectBtn = document.getElementById('selectKartBtn');
  
  if (isLocked) {
    if (lockOverlay) lockOverlay.classList.remove('hidden');
    if (unlockLabel) unlockLabel.textContent = `REACH SCORE ${kart.unlockScore}+`;
    if (selectBtn) {
      selectBtn.textContent = '🔒 LOCKED';
      selectBtn.disabled = true;
      selectBtn.classList.add('disabled');
    }
  } else {
    if (lockOverlay) lockOverlay.classList.add('hidden');
    if (selectBtn) {
      selectBtn.textContent = 'ENGAGE VESSEL';
      selectBtn.disabled = false;
      selectBtn.classList.remove('disabled');
    }
  }
  
  // Start preview animation
  startPreviewAnimation(kart, isLocked);
}

function startPreviewAnimation(kart, isLocked) {
  if (previewAnimId) {
    cancelAnimationFrame(previewAnimId);
  }
  
  let angle = 0;
  
  function drawPreview(ts) {
    if (!previewCtx) return;
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Draw premium cyan tech grid grid lines
    previewCtx.strokeStyle = 'rgba(46, 182, 255, 0.04)';
    previewCtx.lineWidth = 1;
    previewCtx.beginPath();
    for (let x = 0; x < previewCanvas.width; x += 15) {
      previewCtx.moveTo(x, 0);
      previewCtx.lineTo(x, previewCanvas.height);
    }
    for (let y = 0; y < previewCanvas.height; y += 15) {
      previewCtx.moveTo(0, y);
      previewCtx.lineTo(previewCanvas.width, y);
    }
    previewCtx.stroke();
    
    // Idle float bounce
    const bounceY = Math.sin(angle) * 4;
    angle += 0.05;
    
    previewCtx.save();
    // Center kart preview
    previewCtx.translate(previewCanvas.width / 2, previewCanvas.height / 2 - 5 + bounceY);
    
    if (isLocked) {
      previewCtx.filter = 'grayscale(1) opacity(0.3)';
    }
    
    // Call karts canvas render function
    kart.draw(previewCtx, kart.width, 40);
    
    previewCtx.restore();
    
    previewAnimId = requestAnimationFrame(drawPreview);
  }
  
  drawPreview();
}

export function stopPreviewAnimation() {
  if (previewAnimId) {
    cancelAnimationFrame(previewAnimId);
    previewAnimId = null;
  }
}

export function updatePowerupsHUD(activeList) {
  const container = document.getElementById('powerupsHUD');
  if (!container) return;
  
  container.innerHTML = '';
  
  activeList.forEach(p => {
    const pct = p.timeRemaining / p.duration;
    const radius = 16;
    const circ = 2 * Math.PI * radius;
    const offset = circ * (1 - pct);
    
    const div = document.createElement('div');
    div.className = 'powerup-badge';
    div.innerHTML = `
      <svg class="ring" width="38" height="38">
        <circle class="ring-bg" cx="19" cy="19" r="${radius}"></circle>
        <circle class="ring-fill" cx="19" cy="19" r="${radius}" 
          style="stroke: ${p.color}; stroke-dasharray: ${circ}; stroke-dashoffset: ${offset};">
        </circle>
      </svg>
      <span class="icon">${p.icon}</span>
      <span class="time">${Math.ceil(p.timeRemaining)}s</span>
    `;
    container.appendChild(div);
  });
}

export function showLevelUpBanner(levelNum, levelName) {
  const banner = document.getElementById('levelUpWrap');
  const title = document.getElementById('levelUpText');
  const subtitle = document.getElementById('levelUpSub');
  
  if (!banner) return;
  
  title.textContent = `LEVEL ${levelNum} UP!`;
  subtitle.textContent = `Entering: ${levelName}`;
  
  banner.classList.remove('hidden');
  banner.classList.add('active');
  
  clearTimeout(showLevelUpBanner.timer);
  showLevelUpBanner.timer = setTimeout(() => {
    banner.classList.remove('active');
    banner.classList.add('hidden');
  }, 1800);
}
