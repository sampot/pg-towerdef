import { TowerAudio } from "./audio.js";
import {
  H,
  PADS,
  PATH,
  TOWERS,
  TowerDefGame,
  W,
} from "./game.js";

const audio = new TowerAudio();
const game = new TowerDefGame();

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("game"));
const ctx = canvas.getContext("2d");
const goldEl = document.getElementById("gold");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const btnStart = document.getElementById("btn-start");
const btnWave = document.getElementById("btn-wave");
const btnUpgrade = document.getElementById("btn-upgrade");
const btnSell = document.getElementById("btn-sell");
const btnMute = document.getElementById("btn-mute");
const pickBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (
  document.querySelectorAll(".tower-btn")
);

canvas.width = W;
canvas.height = H;

let lastTs = 0;
/** @type {{ x: number, y: number, t: number, color: string }[]} */
let particles = [];

/**
 * @param {string} msg
 * @param {string} [tone]
 */
function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function syncHud() {
  goldEl.textContent = String(game.gold);
  livesEl.textContent = String(game.lives);
  waveEl.textContent = `${game.wave}/${game.maxWaves}`;
  scoreEl.textContent = String(game.score);
  btnStart.textContent = game.status === "ready" ? "開局" : "重開";
  const canWave =
    game.status === "playing" && game.waveClear && game.wave < game.maxWaves;
  btnWave.disabled = !canWave;
  const sel = game.selectedPad != null ? game.towers[game.selectedPad] : null;
  btnUpgrade.disabled = !sel || sel.level >= 3 || game.status !== "playing";
  btnSell.disabled = !sel || game.status !== "playing";
  if (sel) {
    const cost = Math.round(TOWERS[sel.kind].cost * (0.7 + sel.level * 0.5));
    btnUpgrade.textContent = sel.level >= 3 ? "滿級" : `升級 ${cost}g`;
  } else {
    btnUpgrade.textContent = "升級";
  }
  for (const b of pickBtns) {
    b.classList.toggle("is-active", b.dataset.kind === game.selectedKind);
  }
}

/**
 * @param {string[]} events
 */
function handleEvents(events) {
  for (const e of events) {
    if (e === "arrow") audio.arrow();
    else if (e === "cannon") audio.cannon();
    else if (e === "frost") audio.frost();
    else if (e === "hit") audio.hit();
    else if (e === "kill") audio.kill();
    else if (e === "leak") {
      audio.leak();
      setStatus(`敵人溜過！生命 ${game.lives}`, "warn");
    } else if (e === "waveClear") {
      audio.wave();
      setStatus(game.message, "ok");
    } else if (e === "win") {
      audio.win();
      setStatus(game.message, "ok");
    } else if (e === "lose") {
      audio.lose();
      setStatus(game.message, "bad");
    }
  }
}

function drawMap() {
  // grass
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#2f5c3a");
  g.addColorStop(1, "#1e3f28");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // soft patches
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse((i * 47) % W, (i * 73) % H, 40, 24, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // path
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#c4a574";
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();
  ctx.strokeStyle = "#a88855";
  ctx.lineWidth = 18;
  ctx.stroke();

  // pads
  for (let i = 0; i < PADS.length; i++) {
    const p = PADS[i];
    const occupied = !!game.towers[i];
    const sel = game.selectedPad === i;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = occupied
      ? "rgba(0,0,0,0.2)"
      : sel
        ? "rgba(255,220,100,0.35)"
        : "rgba(255,255,255,0.14)";
    ctx.fill();
    ctx.strokeStyle = sel ? "#ffe066" : "rgba(255,255,255,0.25)";
    ctx.lineWidth = sel ? 2.5 : 1;
    ctx.stroke();
  }
}

/**
 * @param {import('./game.js').Tower} t
 */
function drawTower(t) {
  const def = TOWERS[t.kind];
  const st = game.towerStats(t);
  if (game.selectedPad === t.pad) {
    ctx.beginPath();
    ctx.arc(t.x, t.y, st.range, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.stroke();
  }

  // base
  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.stroke();

  // kind glyph
  ctx.fillStyle = "#fff";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const glyph = t.kind === "arrow" ? "弓" : t.kind === "cannon" ? "炮" : "冰";
  ctx.fillText(glyph, t.x, t.y);

  // level pips
  for (let i = 0; i < t.level; i++) {
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(t.x - 8 + i * 6, t.y + 11, 4, 3);
  }
}

/**
 * @param {import('./game.js').Enemy} e
 */
function drawEnemy(e) {
  const r = 9 + (e.maxHp > 100 ? 4 : 0);
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.fillStyle = e.slowT > 0 ? "#8ecae6" : e.tint;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.stroke();

  // hp bar
  const bw = 18;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(e.x - bw / 2, e.y - r - 7, bw, 3);
  ctx.fillStyle = "#6dffb0";
  ctx.fillRect(e.x - bw / 2, e.y - r - 7, bw * (e.hp / e.maxHp), 3);
}

function drawShots() {
  for (const s of game.shots) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.splash > 0 ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawParticles(dt) {
  for (const p of particles) {
    p.t -= dt;
    ctx.globalAlpha = Math.max(0, p.t * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  particles = particles.filter((p) => p.t > 0);
}

/**
 * @param {PointerEvent} ev
 */
function canvasPos(ev) {
  const rect = canvas.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * W;
  const y = ((ev.clientY - rect.top) / rect.height) * H;
  return { x, y };
}

canvas.addEventListener("pointerdown", async (ev) => {
  await audio.unlock();
  if (game.status !== "playing") return;
  const { x, y } = canvasPos(ev);
  let best = -1;
  let bestD = 28;
  for (let i = 0; i < PADS.length; i++) {
    const d = Math.hypot(PADS[i].x - x, PADS[i].y - y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best < 0) {
    game.selectedPad = null;
    syncHud();
    return;
  }
  if (game.towers[best]) {
    game.selectedPad = best;
    audio.click();
    syncHud();
    return;
  }
  const res = game.tryBuild(best);
  if (res.ok) {
    audio.place();
    setStatus(`建造 ${TOWERS[game.selectedKind].name}`, "ok");
  } else if (res.reason === "gold") {
    audio.click();
    setStatus("金幣不足", "warn");
  }
  syncHud();
});

for (const b of pickBtns) {
  b.addEventListener("click", async () => {
    await audio.unlock();
    audio.click();
    game.selectedKind = /** @type {import('./game.js').TowerKind} */ (b.dataset.kind || "arrow");
    syncHud();
  });
}

btnStart.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  game.start();
  particles = [];
  setStatus(game.message);
  syncHud();
});

btnWave.addEventListener("click", async () => {
  await audio.unlock();
  if (game.startWave()) {
    audio.wave();
    setStatus(game.message);
  }
  syncHud();
});

btnUpgrade.addEventListener("click", async () => {
  await audio.unlock();
  const r = game.tryUpgrade();
  if (r.ok) {
    audio.upgrade();
    setStatus("防禦塔升級！", "ok");
  } else if (r.reason === "gold") setStatus("金幣不足", "warn");
  syncHud();
});

btnSell.addEventListener("click", async () => {
  await audio.unlock();
  const r = game.trySell();
  if (r.ok) {
    audio.sell();
    setStatus(`賣掉，退回 ${r.refund} 金幣`, "warn");
  }
  syncHud();
});

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  const on = !(btnMute.getAttribute("aria-pressed") === "true");
  btnMute.setAttribute("aria-pressed", on ? "true" : "false");
  btnMute.textContent = on ? "音效開" : "音效關";
  audio.setEnabled(on);
});

/**
 * @param {number} ts
 */
function frame(ts) {
  const dt = Math.min(0.05, (ts - (lastTs || ts)) / 1000);
  lastTs = ts;

  const { events } = game.update(dt);
  for (const e of events) {
    if (e === "kill" || e === "hit") {
      // spark near first enemy approx — skip if none
    }
  }
  handleEvents(events);

  // particles on kills
  if (events.includes("kill")) {
    for (const en of game.enemies) {
      /* already removed */
    }
  }

  drawMap();
  for (const t of game.towers) if (t) drawTower(t);
  for (const e of game.enemies) drawEnemy(e);
  drawShots();
  drawParticles(dt);

  // ghost range when picking empty pad with selected kind
  if (game.status === "playing" && game.selectedPad != null && !game.towers[game.selectedPad]) {
    const p = PADS[game.selectedPad];
    const r = TOWERS[game.selectedKind].range;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.stroke();
  }

  syncHud();
  requestAnimationFrame(frame);
}

syncHud();
setStatus(game.message);
requestAnimationFrame(frame);
