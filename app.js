import { TowerAudio } from "./audio.js";
import {
  H,
  PADS,
  TOWERS,
  TowerDefGame,
  W,
  loadBest,
  saveBest,
} from "./game.js";
import {
  drawBackground,
  drawEnemy,
  drawPads,
  drawShot,
  drawTower,
} from "./sprites.js";

const audio = new TowerAudio();
const game = new TowerDefGame();

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("game"));
const ctx = canvas.getContext("2d");
const fx = document.getElementById("fx");
const goldEl = document.getElementById("gold");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const comboEl = document.getElementById("combo");
const statusEl = document.getElementById("status");
const inspectEl = document.getElementById("inspect");
const btnStart = document.getElementById("btn-start");
const btnWave = document.getElementById("btn-wave");
const btnSpeed = document.getElementById("btn-speed");
const btnMute = document.getElementById("btn-mute");
const btnUpgrade = document.getElementById("btn-upgrade");
const btnSell = document.getElementById("btn-sell");
const btnTarget = document.getElementById("btn-target");
const btnAuto = document.getElementById("btn-auto");
const sellPanel = document.getElementById("sell-panel");
const sellYes = document.getElementById("sell-yes");
const sellNo = document.getElementById("sell-no");
const pickBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (
  document.querySelectorAll(".tower-btn")
);
const modeBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (
  document.querySelectorAll("[data-mode]")
);
const diffBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (
  document.querySelectorAll("[data-diff]")
);

canvas.width = W;
canvas.height = H;

/** @type {'campaign'|'endless'} */
let mode = "campaign";
/** @type {import('./game.js').Diff} */
let diff = "normal";
let best = loadBest();
let lastTs = 0;
let pulse = 0;
let shake = 0;
let autoWaveTimer = 0;
/** @type {{ x: number, y: number, vx: number, vy: number, life: number, color: string, size: number }[]} */
let particles = [];

const TARGET_LABEL = { first: "最前", strong: "最肉", close: "最近" };

/**
 * @param {string} msg
 * @param {string} [tone]
 */
function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

/**
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} color
 */
function spawnFloat(text, x, y, color) {
  const el = document.createElement("div");
  el.className = "float";
  el.textContent = text;
  el.style.left = `${(x / W) * 100}%`;
  el.style.top = `${(y / H) * 100}%`;
  el.style.color = color;
  fx.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

/**
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {number} n
 */
function burst(x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 120;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.3,
      color,
      size: 1.5 + Math.random() * 2.5,
    });
  }
}

function syncChips() {
  for (const b of modeBtns) b.classList.toggle("is-active", b.dataset.mode === mode);
  for (const b of diffBtns) b.classList.toggle("is-active", b.dataset.diff === diff);
  for (const b of pickBtns) {
    b.classList.toggle("is-active", b.dataset.kind === game.selectedKind);
  }
}

function syncHud() {
  goldEl.textContent = String(game.gold);
  livesEl.textContent = String(game.lives);
  waveEl.textContent =
    game.mode === "campaign" ? `${game.wave}/${game.maxWaves}` : String(game.wave);
  scoreEl.textContent = String(game.score);
  bestEl.textContent = String(Math.max(best, game.score));
  comboEl.textContent = String(game.combo);
  btnStart.textContent = game.status === "ready" ? "開局" : "重開";
  btnSpeed.textContent = `×${game.speed}`;
  btnTarget.textContent = `優先：${TARGET_LABEL[game.targetMode]}`;
  btnAuto.setAttribute("aria-pressed", game.autoWave ? "true" : "false");
  btnAuto.textContent = game.autoWave ? "自動波開" : "自動波";

  const canWave =
    game.status === "playing" &&
    game.waveClear &&
    (game.mode === "endless" || game.wave < game.maxWaves);
  btnWave.disabled = !canWave;

  const sel = game.selectedPad != null ? game.towers[game.selectedPad] : null;
  btnUpgrade.disabled = !sel || sel.level >= 5 || game.status !== "playing";
  btnSell.disabled = !sel || game.status !== "playing";
  if (sel) {
    const cost = game.upgradeCost(sel);
    btnUpgrade.textContent = sel.level >= 5 ? "滿級" : `升級 ${cost}g`;
    const st = game.towerStats(sel);
    inspectEl.hidden = false;
    inspectEl.textContent = `${TOWERS[sel.kind].name} Lv${sel.level} · 傷害 ${Math.round(st.dmg)} · 射程 ${Math.round(st.range)} · 擊殺 ${sel.kills} · 賣掉退 ${game.sellValue(sel)}g`;
  } else {
    inspectEl.hidden = true;
    btnUpgrade.textContent = "升級";
  }
  syncChips();
}

/**
 * @param {string[]} events
 * @param {{ x: number, y: number, text: string, color: string }[]} floats
 */
function handleEvents(events, floats) {
  for (const f of floats) spawnFloat(f.text, f.x, f.y, f.color);
  for (const e of events) {
    if (e === "arrow") audio.arrow();
    else if (e === "cannon") audio.cannon();
    else if (e === "frost") audio.frost();
    else if (e === "hit") audio.hit();
    else if (e === "boom") {
      audio.boom();
      shake = Math.max(shake, 5);
    } else if (e === "kill") {
      audio.kill();
      shake = Math.max(shake, 3);
    } else if (e === "leak") {
      audio.leak();
      shake = Math.max(shake, 6);
      setStatus(`敵人突入！生命 ${game.lives}`, "warn");
    } else if (e === "waveClear") {
      audio.wave();
      setStatus(game.message, "ok");
    } else if (e === "autoWave") {
      autoWaveTimer = 0.85;
    } else if (e === "win") {
      audio.win();
      saveBest(game.score);
      best = loadBest();
      setStatus(game.message, "ok");
    } else if (e === "lose") {
      audio.lose();
      saveBest(game.score);
      best = loadBest();
      setStatus(game.message, "bad");
    }
  }
  // particles for kills via floats with +g
  for (const f of floats) {
    if (f.text.startsWith("+")) burst(f.x, f.y, "#fbbf24", 8);
    if (f.text.startsWith("-") && !f.text.includes("♥")) burst(f.x, f.y, f.color, 5);
  }
}

function canvasPos(ev) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / rect.width) * W,
    y: ((ev.clientY - rect.top) / rect.height) * H,
  };
}

canvas.addEventListener("pointerdown", async (ev) => {
  await audio.unlock();
  if (game.status !== "playing") return;
  const { x, y } = canvasPos(ev);
  let bestPad = -1;
  let bestD = 26;
  for (let i = 0; i < PADS.length; i++) {
    const d = Math.hypot(PADS[i].x - x, PADS[i].y - y);
    if (d < bestD) {
      bestD = d;
      bestPad = i;
    }
  }
  if (bestPad < 0) {
    game.selectedPad = null;
    syncHud();
    return;
  }
  if (game.towers[bestPad]) {
    game.selectedPad = bestPad;
    audio.click();
    syncHud();
    return;
  }
  const res = game.tryBuild(bestPad);
  if (res.ok) {
    audio.place();
    burst(PADS[bestPad].x, PADS[bestPad].y, TOWERS[game.selectedKind].color, 12);
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
for (const b of modeBtns) {
  b.addEventListener("click", async () => {
    await audio.unlock();
    audio.click();
    mode = /** @type {'campaign'|'endless'} */ (b.dataset.mode || "campaign");
    syncChips();
  });
}
for (const b of diffBtns) {
  b.addEventListener("click", async () => {
    await audio.unlock();
    audio.click();
    diff = /** @type {import('./game.js').Diff} */ (b.dataset.diff || "normal");
    syncChips();
  });
}

btnStart.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  sellPanel.hidden = true;
  game.start(diff, mode);
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

btnSpeed.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  game.speed = game.speed >= 3 ? 1 : game.speed + 1;
  syncHud();
});

btnTarget.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  const order = /** @type {const} */ (["first", "strong", "close"]);
  const i = order.indexOf(game.targetMode);
  game.targetMode = order[(i + 1) % order.length];
  syncHud();
});

btnAuto.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  game.autoWave = !game.autoWave;
  syncHud();
});

btnUpgrade.addEventListener("click", async () => {
  await audio.unlock();
  const r = game.tryUpgrade();
  if (r.ok) {
    audio.upgrade();
    const t = game.towers[game.selectedPad];
    if (t) burst(t.x, t.y, TOWERS[t.kind].color, 14);
    setStatus("防禦塔升級！", "ok");
  } else if (r.reason === "gold") setStatus("金幣不足", "warn");
  syncHud();
});

btnSell.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  if (game.selectedPad == null || !game.towers[game.selectedPad]) return;
  sellPanel.hidden = false;
});

sellYes.addEventListener("click", async () => {
  await audio.unlock();
  const r = game.trySell();
  sellPanel.hidden = true;
  if (r.ok) {
    audio.sell();
    setStatus(`已賣掉，退回 ${r.refund} 金幣`, "warn");
  }
  syncHud();
});

sellNo.addEventListener("click", () => {
  sellPanel.hidden = true;
});

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  const on = !(btnMute.getAttribute("aria-pressed") === "true");
  btnMute.setAttribute("aria-pressed", on ? "true" : "false");
  btnMute.textContent = on ? "音效" : "靜音";
  audio.setEnabled(on);
});

/**
 * @param {number} ts
 */
function frame(ts) {
  const dt = Math.min(0.05, (ts - (lastTs || ts)) / 1000);
  lastTs = ts;
  pulse += dt;

  if (autoWaveTimer > 0) {
    autoWaveTimer -= dt;
    if (autoWaveTimer <= 0 && game.autoWave && game.waveClear && game.status === "playing") {
      if (game.startWave()) {
        audio.wave();
        setStatus(game.message);
      }
    }
  }

  const { events, floats } = game.update(dt);
  handleEvents(events, floats);

  // credit kills to selected nearby tower approx
  if (events.includes("kill")) {
    for (const t of game.towers) {
      if (t) t.kills += 0; // kept for inspect; increment below
    }
  }
  for (const f of floats) {
    if (f.text.startsWith("+") && f.text.endsWith("g")) {
      let nearest = null;
      let nd = 999;
      for (const t of game.towers) {
        if (!t) continue;
        const d = Math.hypot(t.x - f.x, t.y - f.y);
        if (d < nd && d < 120) {
          nd = d;
          nearest = t;
        }
      }
      if (nearest) nearest.kills += 1;
    }
  }

  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 180 * dt;
    p.life -= dt;
  }
  particles = particles.filter((p) => p.life > 0);
  shake = Math.max(0, shake - dt * 25);

  ctx.save();
  if (shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }
  drawBackground(ctx, W, H);
  drawPads(ctx, game.selectedPad, game.towers);
  for (const t of game.towers) {
    if (t) drawTower(ctx, t, game.towerStats(t), game.selectedPad === t.pad, pulse);
  }
  for (const e of game.enemies) drawEnemy(ctx, e);
  for (const s of game.shots) drawShot(ctx, s);
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  syncHud();
  requestAnimationFrame(frame);
}

bestEl.textContent = String(best);
syncHud();
setStatus(game.message);
requestAnimationFrame(frame);
