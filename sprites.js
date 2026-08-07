/**
 * Polished map / tower / enemy rendering.
 */

import { ENEMY_BASE, TOWERS } from "./game.js";

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {{ x: number, y: number }[]} path
 */
export function drawBackground(ctx, W, H, path) {
  const g = ctx.createLinearGradient(0, 0, W * 0.2, H);
  g.addColorStop(0, "#254a32");
  g.addColorStop(0.55, "#1a3524");
  g.addColorStop(1, "#122418");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 ? "#000" : "#fff";
    ctx.beginPath();
    ctx.ellipse((i * 53 + 20) % W, (i * 89 + 40) % H, 36 + (i % 4) * 8, 18, i, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 34;
  strokePath(ctx, path);
  const pg = ctx.createLinearGradient(0, 0, W, H);
  pg.addColorStop(0, "#d2b48c");
  pg.addColorStop(1, "#b8956a");
  ctx.strokeStyle = pg;
  ctx.lineWidth = 28;
  strokePath(ctx, path);
  ctx.strokeStyle = "#9a7b52";
  ctx.lineWidth = 16;
  strokePath(ctx, path);
  ctx.save();
  ctx.setLineDash([8, 10]);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  strokePath(ctx, path);
  ctx.restore();

  const start = path[0];
  const end = path[path.length - 1];
  ctx.fillStyle = "rgba(110,231,183,0.85)";
  ctx.beginPath();
  ctx.arc(Math.max(12, Math.min(W - 12, start.x + 18)), Math.max(12, start.y), 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(248,113,113,0.9)";
  ctx.beginPath();
  ctx.arc(Math.min(W - 12, Math.max(12, end.x)), Math.min(H - 12, end.y - 10), 8, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} path
 */
function strokePath(ctx, path) {
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number | null} selectedPad
 * @param {(import('./game.js').Tower|null)[]} towers
 * @param {{ x: number, y: number }[]} pads
 */
export function drawPads(ctx, selectedPad, towers, pads) {
  for (let i = 0; i < pads.length; i++) {
    const p = pads[i];
    const occ = !!towers[i];
    const sel = selectedPad === i;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
    if (!occ) {
      ctx.fillStyle = sel ? "rgba(255,214,102,0.4)" : "rgba(255,255,255,0.12)";
      ctx.fill();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = sel ? "#ffe066" : "rgba(255,255,255,0.3)";
      ctx.lineWidth = sel ? 2 : 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", p.x, p.y + 1);
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./game.js').Tower} t
 * @param {ReturnType<import('./game.js').TowerDefGame['towerStats']>} st
 * @param {boolean} selected
 * @param {number} pulse
 */
export function drawTower(ctx, t, st, selected, pulse) {
  if (selected) {
    ctx.beginPath();
    ctx.arc(t.x, t.y, st.range, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // platform
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 2, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const def = TOWERS[t.kind];
  const body = ctx.createRadialGradient(t.x - 3, t.y - 4, 2, t.x, t.y, 11);
  body.addColorStop(0, def.color);
  body.addColorStop(1, def.color2);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 10 + t.level * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // barrel / motif
  ctx.save();
  ctx.translate(t.x, t.y);
  if (t.kind === "arrow") {
    ctx.rotate(pulse * 0.5);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(4, -1.5, 12, 3);
  } else if (t.kind === "cannon") {
    ctx.fillStyle = "#333";
    ctx.fillRect(3, -3, 11, 6);
    ctx.fillStyle = "#111";
    ctx.fillRect(12, -4, 3, 8);
  } else {
    ctx.strokeStyle = "rgba(200,240,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 6 + Math.sin(pulse * 3) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // level rings
  for (let i = 0; i < t.level; i++) {
    ctx.fillStyle = i >= 4 ? "#fbbf24" : "#e2e8f0";
    ctx.fillRect(t.x - 10 + i * 4.5, t.y + 12, 3.5, 3);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./game.js').Enemy} e
 */
export function drawEnemy(ctx, e) {
  const flash = e.hitFlash > 0;
  const base = ENEMY_BASE[e.kind];
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.slowT > 0) {
    ctx.strokeStyle = "rgba(125,211,252,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  let fill = "#f4a261";
  if (e.kind === "scout") fill = "#94d82d";
  else if (e.kind === "brute") fill = "#868e96";
  else if (e.kind === "swarm") fill = "#ff922b";
  else if (e.kind === "boss") fill = "#be4bdb";
  if (flash) fill = "#fff";

  ctx.fillStyle = fill;
  if (e.kind === "brute" || e.kind === "boss") {
    roundRect(ctx, -e.r, -e.r, e.r * 2, e.r * 2, 3);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.stroke();

  // eyes
  ctx.fillStyle = "#111";
  ctx.fillRect(-3, -2, 2, 2);
  ctx.fillRect(1, -2, 2, 2);

  ctx.restore();

  const bw = Math.max(16, e.r * 2.2);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(e.x - bw / 2, e.y - e.r - 8, bw, 3.5);
  const pct = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = pct > 0.4 ? "#69db7c" : pct > 0.2 ? "#ffd43b" : "#ff6b6b";
  ctx.fillRect(e.x - bw / 2, e.y - e.r - 8, bw * pct, 3.5);

  if (e.kind === "boss") {
    ctx.fillStyle = "#f3d9fa";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(base.name, e.x, e.y - e.r - 12);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./game.js').Shot} s
 */
export function drawShot(ctx, s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(Math.atan2(s.vy, s.vx));
  ctx.shadowColor = s.color;
  ctx.shadowBlur = 8;
  if (s.kind === "cannon") {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (s.kind === "frost") {
    ctx.fillStyle = "#a5f3fc";
    ctx.fillRect(-6, -1.5, 10, 3);
  } else {
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(-7, -1.2, 12, 2.4);
  }
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
