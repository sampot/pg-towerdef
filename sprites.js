/**
 * Arena / tower / enemy rendering — military silhouettes, not cartoon blobs.
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {{ x: number, y: number }[]} path
 */
export function drawBackground(ctx, W, H, path) {
  const g = ctx.createLinearGradient(0, 0, W * 0.2, H);
  g.addColorStop(0, "#1f3a2a");
  g.addColorStop(0.55, "#15281e");
  g.addColorStop(1, "#0c1611");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 ? "#000" : "#fff";
    ctx.beginPath();
    ctx.ellipse((i * 53 + 20) % W, (i * 89 + 40) % H, 36 + (i % 4) * 8, 18, i, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 34;
  strokePath(ctx, path);
  const pg = ctx.createLinearGradient(0, 0, W, H);
  pg.addColorStop(0, "#a89070");
  pg.addColorStop(1, "#7a6548");
  ctx.strokeStyle = pg;
  ctx.lineWidth = 26;
  strokePath(ctx, path);
  ctx.strokeStyle = "#5c4a34";
  ctx.lineWidth = 14;
  strokePath(ctx, path);
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1.5;
  strokePath(ctx, path);
  ctx.restore();

  const start = path[0];
  const end = path[path.length - 1];
  // gate markers — banners, not candy dots
  drawBanner(ctx, Math.max(16, Math.min(W - 16, start.x + 16)), Math.max(18, start.y), "#166534", true);
  drawBanner(ctx, Math.min(W - 16, Math.max(16, end.x)), Math.min(H - 16, end.y - 8), "#9f1239", false);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {boolean} entry
 */
function drawBanner(ctx, x, y, color, entry) {
  ctx.fillStyle = "#1c1917";
  ctx.fillRect(x - 1, y - 10, 2, 16);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x + 10, y - 6);
  ctx.lineTo(x, y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "bold 7px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(entry ? "IN" : "OUT", x, y + 12);
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
    if (occ) continue;
    // stone foundation ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = sel ? "rgba(180,160,100,0.28)" : "rgba(40,45,40,0.55)";
    ctx.fill();
    ctx.strokeStyle = sel ? "#c4a574" : "rgba(120,130,120,0.45)";
    ctx.lineWidth = sel ? 2 : 1.2;
    ctx.stroke();
    // crosshair build cue
    ctx.strokeStyle = sel ? "rgba(255,220,140,0.7)" : "rgba(180,190,180,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - 5, p.y);
    ctx.lineTo(p.x + 5, p.y);
    ctx.moveTo(p.x, p.y - 5);
    ctx.lineTo(p.x, p.y + 5);
    ctx.stroke();
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
    ctx.fillStyle = "rgba(180,200,220,0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(200,220,240,0.25)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const scale = 1 + (t.level - 1) * 0.06;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 8, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (t.kind === "arrow") drawArrowTower(ctx, pulse);
  else if (t.kind === "cannon") drawCannonTower(ctx);
  else drawFrostTower(ctx, pulse);
  ctx.restore();

  for (let i = 0; i < t.level; i++) {
    const gx = t.x - 9 + i * 4.5;
    ctx.fillStyle = i >= 4 ? "#d4a017" : "#8a9aa8";
    ctx.beginPath();
    ctx.arc(gx, t.y + 14, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} pulse */
function drawArrowTower(ctx, pulse) {
  const stone = ctx.createLinearGradient(-10, -4, 10, 12);
  stone.addColorStop(0, "#6b7280");
  stone.addColorStop(0.45, "#4b5563");
  stone.addColorStop(1, "#374151");
  ctx.fillStyle = stone;
  roundRect(ctx, -9, -2, 18, 12, 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-9, 3);
  ctx.lineTo(9, 3);
  ctx.moveTo(0, -2);
  ctx.lineTo(0, 10);
  ctx.stroke();

  const wood = ctx.createLinearGradient(-7, -14, 7, -2);
  wood.addColorStop(0, "#a16207");
  wood.addColorStop(1, "#713f12");
  ctx.fillStyle = wood;
  roundRect(ctx, -7, -14, 14, 12, 1.5);
  ctx.fill();

  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(-9, -13);
  ctx.lineTo(0, -20);
  ctx.lineTo(9, -13);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-1.2, -11, 2.4, 6);

  ctx.save();
  ctx.rotate(Math.sin(pulse * 1.2) * 0.15);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(2, -3, 11, 2.2);
  ctx.fillStyle = "#94a3b8";
  ctx.beginPath();
  ctx.moveTo(13, -4.5);
  ctx.lineTo(17, -1.9);
  ctx.lineTo(13, 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx */
function drawCannonTower(ctx) {
  const iron = ctx.createLinearGradient(-11, 0, 11, 12);
  iron.addColorStop(0, "#57534e");
  iron.addColorStop(0.5, "#292524");
  iron.addColorStop(1, "#1c1917");
  ctx.fillStyle = iron;
  roundRect(ctx, -11, 0, 22, 10, 2);
  ctx.fill();
  ctx.fillStyle = "#a8a29e";
  for (const rx of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.arc(rx, 4, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const ring = ctx.createRadialGradient(-2, -6, 1, 0, -4, 9);
  ring.addColorStop(0, "#78716c");
  ring.addColorStop(1, "#292524");
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(0, -4, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(214,211,209,0.35)";
  ctx.stroke();
  ctx.fillStyle = "#1c1917";
  roundRect(ctx, 4, -7, 14, 5.5, 1);
  ctx.fill();
  ctx.fillStyle = "#0c0a09";
  ctx.fillRect(16, -8, 4, 7.5);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(5, -6.2, 12, 1.4);
}

/** @param {CanvasRenderingContext2D} ctx @param {number} pulse */
function drawFrostTower(ctx, pulse) {
  const ped = ctx.createLinearGradient(-8, 2, 8, 12);
  ped.addColorStop(0, "#334155");
  ped.addColorStop(1, "#0f172a");
  ctx.fillStyle = ped;
  roundRect(ctx, -8, 2, 16, 8, 2);
  ctx.fill();
  const shimmer = 0.5 + Math.sin(pulse * 2.5) * 0.15;
  const cry = ctx.createLinearGradient(0, -18, 0, 4);
  cry.addColorStop(0, `rgba(186,230,253,${0.95 * shimmer})`);
  cry.addColorStop(0.45, "#38bdf8");
  cry.addColorStop(1, "#0e7490");
  ctx.fillStyle = cry;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(7, -2);
  ctx.lineTo(3, 4);
  ctx.lineTo(-3, 4);
  ctx.lineTo(-7, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(224,242,254,0.55)";
  ctx.stroke();
  ctx.fillStyle = "rgba(125,211,252,0.7)";
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(-11, -10);
  ctx.lineTo(-5, -6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -4);
  ctx.lineTo(11, -11);
  ctx.lineTo(5, -6);
  ctx.closePath();
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./game.js').Enemy} e
 */
export function drawEnemy(ctx, e) {
  const flash = e.hitFlash > 0;
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.slowT > 0) {
    ctx.strokeStyle = "rgba(125,211,252,0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (flash) ctx.globalAlpha = 0.85;
  if (flash) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (e.kind === "scout") drawScout(ctx, e.r);
  else if (e.kind === "grunt") drawGrunt(ctx, e.r);
  else if (e.kind === "brute") drawBrute(ctx, e.r);
  else if (e.kind === "swarm") drawSwarm(ctx, e.r);
  else drawBoss(ctx, e.r);

  ctx.restore();

  const bw = Math.max(18, e.r * 2.4);
  const by = e.y - e.r - 9;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, e.x - bw / 2, by, bw, 3.5, 1);
  ctx.fill();
  const pct = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = pct > 0.45 ? "#4ade80" : pct > 0.2 ? "#fbbf24" : "#f87171";
  roundRect(ctx, e.x - bw / 2, by, bw * pct, 3.5, 1);
  ctx.fill();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} r */
function drawScout(ctx, r) {
  const body = ctx.createLinearGradient(-r, -r, r, r);
  body.addColorStop(0, "#3f6212");
  body.addColorStop(1, "#1a2e05");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 1, r * 0.7, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#14532d";
  ctx.beginPath();
  ctx.arc(0, -r * 0.55, r * 0.45, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = "#a3a3a3";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(r * 0.2, -r * 0.2);
  ctx.lineTo(r * 1.35, -r * 0.9);
  ctx.stroke();
  ctx.fillStyle = "#d4d4d4";
  ctx.beginPath();
  ctx.moveTo(r * 1.2, -r * 1.05);
  ctx.lineTo(r * 1.55, -r * 0.85);
  ctx.lineTo(r * 1.15, -r * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#86efac";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.25, -r * 0.45);
  ctx.lineTo(r * 0.25, -r * 0.45);
  ctx.stroke();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} r */
function drawGrunt(ctx, r) {
  const armor = ctx.createLinearGradient(-r, -r, r, r);
  armor.addColorStop(0, "#78716c");
  armor.addColorStop(0.5, "#57534e");
  armor.addColorStop(1, "#292524");
  ctx.fillStyle = armor;
  roundRect(ctx, -r * 0.85, -r * 0.9, r * 1.7, r * 1.8, 2);
  ctx.fill();
  ctx.fillStyle = "#44403c";
  ctx.beginPath();
  ctx.ellipse(-r * 0.85, -r * 0.35, r * 0.35, r * 0.28, -0.3, 0, Math.PI * 2);
  ctx.ellipse(r * 0.85, -r * 0.35, r * 0.35, r * 0.28, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1917";
  ctx.beginPath();
  ctx.moveTo(-r * 1.15, -r * 0.5);
  ctx.lineTo(-r * 1.45, 0);
  ctx.lineTo(-r * 1.15, r * 0.7);
  ctx.lineTo(-r * 0.7, r * 0.5);
  ctx.lineTo(-r * 0.7, -r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#a8a29e";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "#7f1d1d";
  ctx.fillRect(-1.2, -r * 1.15, 2.4, r * 0.4);
  ctx.fillStyle = "#0c0a09";
  ctx.fillRect(-r * 0.35, -r * 0.55, r * 0.7, r * 0.28);
  ctx.fillStyle = "rgba(248,113,113,0.55)";
  ctx.fillRect(-r * 0.3, -r * 0.48, r * 0.6, 1.5);
}

/** @param {CanvasRenderingContext2D} ctx @param {number} r */
function drawBrute(ctx, r) {
  const hull = ctx.createLinearGradient(-r, -r, r, r);
  hull.addColorStop(0, "#64748b");
  hull.addColorStop(0.4, "#475569");
  hull.addColorStop(1, "#1e293b");
  ctx.fillStyle = hull;
  roundRect(ctx, -r, -r * 0.85, r * 2, r * 1.9, 3);
  ctx.fill();
  ctx.strokeStyle = "rgba(15,23,42,0.55)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-r * 0.7, -r * 0.5, r * 1.4, r * 0.55);
  ctx.strokeRect(-r * 0.7, r * 0.15, r * 1.4, r * 0.55);
  ctx.fillStyle = "#334155";
  roundRect(ctx, -r * 1.25, -r * 0.2, r * 0.4, r * 1.1, 2);
  roundRect(ctx, r * 0.85, -r * 0.2, r * 0.4, r * 1.1, 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  roundRect(ctx, -r * 0.45, -r * 1.15, r * 0.9, r * 0.45, 1.5);
  ctx.fill();
  ctx.fillStyle = "#f87171";
  ctx.fillRect(-r * 0.3, -r * 0.95, r * 0.6, 2);
  ctx.fillStyle = "#94a3b8";
  for (const [bx, by] of [
    [-r * 0.55, -r * 0.25],
    [r * 0.55, -r * 0.25],
    [-r * 0.55, r * 0.4],
    [r * 0.55, r * 0.4],
  ]) {
    ctx.beginPath();
    ctx.arc(bx, by, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} r */
function drawSwarm(ctx, r) {
  const shell = ctx.createLinearGradient(-r, -r, r, r);
  shell.addColorStop(0, "#9a3412");
  shell.addColorStop(1, "#431407");
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.1);
  ctx.lineTo(r * 0.95, -r * 0.2);
  ctx.lineTo(r * 0.55, r * 0.9);
  ctx.lineTo(-r * 0.55, r * 0.9);
  ctx.lineTo(-r * 0.95, -r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.stroke();
  ctx.strokeStyle = "#fdba74";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.7);
  ctx.lineTo(-r * 0.7, -r * 1.2);
  ctx.moveTo(r * 0.35, -r * 0.7);
  ctx.lineTo(r * 0.7, -r * 1.2);
  ctx.stroke();
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.35, 1.2, 0, Math.PI * 2);
  ctx.arc(r * 0.25, -r * 0.35, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} r */
function drawBoss(ctx, r) {
  const cape = ctx.createLinearGradient(0, -r, 0, r);
  cape.addColorStop(0, "#312e81");
  cape.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = cape;
  ctx.beginPath();
  ctx.moveTo(-r * 1.1, -r * 0.3);
  ctx.lineTo(-r * 1.4, r * 1.1);
  ctx.lineTo(r * 1.4, r * 1.1);
  ctx.lineTo(r * 1.1, -r * 0.3);
  ctx.closePath();
  ctx.fill();
  const plate = ctx.createLinearGradient(-r, -r, r, r);
  plate.addColorStop(0, "#6b7280");
  plate.addColorStop(0.5, "#374151");
  plate.addColorStop(1, "#111827");
  ctx.fillStyle = plate;
  roundRect(ctx, -r * 0.95, -r * 0.7, r * 1.9, r * 1.6, 3);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  roundRect(ctx, -r * 0.55, -r * 1.25, r * 1.1, r * 0.7, 2);
  ctx.fill();
  ctx.fillStyle = "#a78bfa";
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 1.1);
  ctx.lineTo(-r * 1.05, -r * 1.55);
  ctx.lineTo(-r * 0.35, -r * 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.55, -r * 1.1);
  ctx.lineTo(r * 1.05, -r * 1.55);
  ctx.lineTo(r * 0.35, -r * 1.2);
  ctx.closePath();
  ctx.fill();
  const visor = ctx.createLinearGradient(-r * 0.4, 0, r * 0.4, 0);
  visor.addColorStop(0, "#e11d48");
  visor.addColorStop(0.5, "#fb7185");
  visor.addColorStop(1, "#e11d48");
  ctx.fillStyle = visor;
  ctx.fillRect(-r * 0.4, -r * 0.95, r * 0.8, 3);
  ctx.strokeStyle = "#c4b5fd";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.25);
  ctx.lineTo(r * 0.35, r * 0.15);
  ctx.lineTo(0, r * 0.45);
  ctx.lineTo(-r * 0.35, r * 0.15);
  ctx.closePath();
  ctx.stroke();
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
  ctx.shadowBlur = 5;
  if (s.kind === "cannon") {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
    g.addColorStop(0, "#ffedd5");
    g.addColorStop(0.5, s.color);
    g.addColorStop(1, "#7c2d12");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (s.kind === "frost") {
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -2.5);
    ctx.lineTo(-4, 2.5);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(-8, -1, 14, 2);
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.moveTo(6, -2.5);
    ctx.lineTo(11, 0);
    ctx.lineTo(6, 2.5);
    ctx.closePath();
    ctx.fill();
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
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
