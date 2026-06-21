// karts.js
'use strict';

export const KARTS = [
  {
    id: 'classic',
    name: 'Classic Cargo',
    unlockScore: 0,
    width: 100,
    speedMultiplier: 1.0,
    magnetRadius: 0,
    abilityDescription: 'Standard starter transport. Well balanced.',
    stats: { size: 3, speed: 3, magnet: 0 },
    draw: (ctx, w, h) => {
      // Draw standard wireframe crate transport
      const hw = w / 2;
      
      // Outer neon glowing cage
      ctx.shadowColor = 'rgba(255, 211, 77, 0.4)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(255, 211, 77, 0.1)';
      ctx.beginPath();
      ctx.roundRect(-hw, 0, w, h - 12, [0, 0, 8, 8]);
      ctx.fill();
      ctx.stroke();

      // Inner structure lattice lines
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 211, 77, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let offset = -hw + w/4; offset < hw; offset += w/4) {
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset, h - 12);
      }
      ctx.stroke();

      // Axle bar
      ctx.strokeStyle = '#a389d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-hw + 8, h - 12);
      ctx.lineTo(hw - 8, h - 12);
      ctx.stroke();

      // Dual wheels
      ctx.fillStyle = '#1e1035';
      ctx.strokeStyle = '#2eb6ff';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(-hw + 14, h - 6, 7, 0, Math.PI * 2);
      ctx.arc(hw - 14, h - 6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner axle dots
      ctx.fillStyle = '#2eb6ff';
      ctx.beginPath();
      ctx.arc(-hw + 14, h - 6, 2, 0, Math.PI * 2);
      ctx.arc(hw - 14, h - 6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: 'speedster',
    name: 'Warp Speedster',
    unlockScore: 0,
    width: 80,
    speedMultiplier: 1.4,
    magnetRadius: 0,
    abilityDescription: 'Ultralight chassis. Extremely responsive speed.',
    stats: { size: 2, speed: 5, magnet: 0 },
    draw: (ctx, w, h) => {
      const hw = w / 2;
      
      // Sleek triangular spoiler chassis
      ctx.shadowColor = 'rgba(46, 182, 255, 0.5)';
      ctx.shadowBlur = 12;
      
      // Side wings
      ctx.fillStyle = '#1a0933';
      ctx.strokeStyle = '#2eb6ff';
      ctx.lineWidth = 2.5;
      
      ctx.beginPath();
      // Left wing
      ctx.moveTo(-hw - 8, h - 16);
      ctx.lineTo(-hw + 10, h - 28);
      ctx.lineTo(-hw + 14, h - 12);
      ctx.closePath();
      // Right wing
      ctx.moveTo(hw + 8, h - 16);
      ctx.lineTo(hw - 10, h - 28);
      ctx.lineTo(hw - 14, h - 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Main streamlined cockpit pod
      const podGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
      podGrad.addColorStop(0, '#00b4db');
      podGrad.addColorStop(1, '#0083b0');
      ctx.fillStyle = podGrad;
      
      ctx.beginPath();
      ctx.roundRect(-hw + 6, 2, w - 12, h - 14, [4, 4, 12, 12]);
      ctx.fill();
      ctx.stroke();

      // Cyber yellow headlights
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath();
      ctx.arc(-hw + 14, 6, 3, 0, Math.PI * 2);
      ctx.arc(hw - 14, 6, 3, 0, Math.PI * 2);
      ctx.fill();

      // Small high-velocity wheels
      ctx.fillStyle = '#0a0d1a';
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-hw + 12, h - 5, 5, 0, Math.PI * 2);
      ctx.arc(hw - 12, h - 5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  },
  {
    id: 'tank',
    name: 'Iron Goliath',
    unlockScore: 500,
    width: 130,
    speedMultiplier: 0.75,
    magnetRadius: 0,
    abilityDescription: 'Reinforced industrial frame. Slow but massive width.',
    stats: { size: 5, speed: 1.5, magnet: 0 },
    draw: (ctx, w, h) => {
      const hw = w / 2;
      
      ctx.shadowColor = 'rgba(255, 77, 110, 0.4)';
      ctx.shadowBlur = 10;
      
      // Heavy iron shields on side
      ctx.fillStyle = '#2c3e50';
      ctx.strokeStyle = '#ff4d6e';
      ctx.lineWidth = 3;
      
      // Base heavy plate
      ctx.beginPath();
      ctx.roundRect(-hw, 0, w, h - 16, 6);
      ctx.fill();
      ctx.stroke();

      // Industrial hazard safety lines
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Draw slanted hazard stripes
      for (let xOffset = -hw + 15; xOffset < hw; xOffset += 25) {
        ctx.moveTo(xOffset, 2);
        ctx.lineTo(xOffset - 10, h - 18);
      }
      ctx.stroke();

      // Overlay steel center cage
      ctx.fillStyle = 'rgba(26, 37, 48, 0.85)';
      ctx.strokeStyle = '#7f8c8d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-hw + 12, 6, w - 24, h - 22, 4);
      ctx.fill();
      ctx.stroke();

      // Heavy 4-wheel track system
      ctx.fillStyle = '#111';
      ctx.strokeStyle = '#ff4d6e';
      ctx.lineWidth = 3;
      // Draws large thick wheels
      ctx.beginPath();
      ctx.roundRect(-hw + 6, h - 12, 18, 11, 3);
      ctx.roundRect(hw - 24, h - 12, 18, 11, 3);
      ctx.roundRect(-hw + 32, h - 12, 14, 11, 3);
      ctx.roundRect(hw - 46, h - 12, 14, 11, 3);
      ctx.fill();
      ctx.stroke();
    }
  },
  {
    id: 'magnet',
    name: 'Electra-Pull',
    unlockScore: 1500,
    width: 95,
    speedMultiplier: 1.0,
    magnetRadius: 60,
    abilityDescription: 'Equipped with passive gravity coils. Pulls cargo automatically.',
    stats: { size: 3, speed: 3, magnet: 5 },
    draw: (ctx, w, h) => {
      const hw = w / 2;
      
      // Pulse ring visualization around kart base
      ctx.shadowColor = 'rgba(46, 255, 163, 0.4)';
      ctx.shadowBlur = 12;
      
      // Main electromagnetic core ring
      const coreGrad = ctx.createRadialGradient(0, (h-14)/2, 2, 0, (h-14)/2, hw);
      coreGrad.addColorStop(0, 'rgba(46, 255, 163, 0.25)');
      coreGrad.addColorStop(1, 'rgba(22, 10, 45, 0.8)');
      ctx.fillStyle = coreGrad;
      ctx.strokeStyle = '#2effa3';
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      ctx.roundRect(-hw, 0, w, h - 14, 12);
      ctx.fill();
      ctx.stroke();

      // Draw two large magnet emitter horn coils on the sides
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0f2c1e';
      ctx.strokeStyle = '#2effa3';
      ctx.lineWidth = 2;
      
      // Left magnetic horn
      ctx.beginPath();
      ctx.arc(-hw, (h-14)/2, 8, -Math.PI/2, Math.PI/2);
      ctx.lineTo(-hw + 8, (h-14)/2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right magnetic horn
      ctx.beginPath();
      ctx.arc(hw, (h-14)/2, 8, Math.PI/2, -Math.PI/2, true);
      ctx.lineTo(hw - 8, (h-14)/2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hover engine coils instead of wheels
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#2effa3';
      ctx.fillStyle = '#2effa3';
      ctx.beginPath();
      ctx.arc(-hw + w/4, h - 8, 4, 0, Math.PI * 2);
      ctx.arc(hw - w/4, h - 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: 'drift',
    name: 'Neon Drift-R',
    unlockScore: 4000,
    width: 100,
    speedMultiplier: 1.1,
    magnetRadius: 0,
    abilityDescription: 'Hyper-thruster trail. Earns a permanent +5% score bonus.',
    stats: { size: 3.5, speed: 3.5, magnet: 0 },
    draw: (ctx, w, h) => {
      const hw = w / 2;
      
      // Glowing thruster body
      ctx.shadowColor = 'rgba(191, 119, 255, 0.6)';
      ctx.shadowBlur = 14;
      
      // Curved futuristic aerodynamic wing scoop
      const scoopGrad = ctx.createLinearGradient(0, 0, 0, h);
      scoopGrad.addColorStop(0, '#bf77ff');
      scoopGrad.addColorStop(1, '#ff4d6e');
      ctx.fillStyle = scoopGrad;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(-hw, 0);
      ctx.quadraticCurveTo(0, 8, hw, 0);
      ctx.lineTo(hw - 10, h - 14);
      ctx.quadraticCurveTo(0, h - 4, -hw + 10, h - 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center thruster core
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#120924';
      ctx.strokeStyle = '#ff4d6e';
      ctx.beginPath();
      ctx.roundRect(-20, 4, 40, h - 22, 4);
      ctx.fill();
      ctx.stroke();

      // Thruster flame outlet at the bottom center
      ctx.fillStyle = '#ff4d6e';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff4d6e';
      ctx.beginPath();
      ctx.arc(0, h - 14, 6, 0, Math.PI * 2);
      ctx.fill();

      // Floating thruster hover pods
      ctx.shadowColor = '#bf77ff';
      ctx.fillStyle = '#bf77ff';
      ctx.beginPath();
      ctx.arc(-hw + 8, h - 8, 5, 0, Math.PI * 2);
      ctx.arc(hw - 8, h - 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
];

export function getKartById(id) {
  return KARTS.find(k => k.id === id) || KARTS[0];
}
