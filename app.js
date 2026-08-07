import { TowerAudio } from "./audio.js";
import { TOWERS, TowerDefGame, W, H } from "./game.js";
import { MAPS } from "./maps.js";
import {
  ACHIEVEMENTS,
  loadMeta,
  saveMeta,
  starKey,
  unlockAch,
} from "./meta.js";
import {
  drawBackground,
  drawEnemy,
  drawPads,
  drawShot,
  drawTower,
} from "./sprites.js";

const audio = new TowerAudio();
const game = new TowerDefGame();
let meta = loadMeta();

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
const mapStarsEl = document.getElementById("map-stars");
const mapRow = document.getElementById("map-row");
const achToast = document.getElementById("ach-toast");
const achPanel = document.getElementById("ach-panel");
const achList = document.getElementById("ach-list");
const pauseOverlay = document.getElementById("pause-overlay");
const tutorial = document.getElementById("tutorial");
const tutText = document.getElementById("tut-text");
const btnStart = document.getElementById("btn-start");
const btnWave = document.getElementById("btn-wave");
const btnPause = document.getElementById("btn-pause");
const btnSpeed = document.getElementById("btn-speed");
const btnMute = document.getElementById("btn-mute");
const btnUpgrade = document.getElementById("btn-upgrade");
const btnSell = document.getElementById("btn-sell");
const btnTarget = document.getElementById("btn-target");
const btnAuto = document.getElementById("btn-auto");
const btnAch = document.getElementById("btn-ach");
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
let mapId = meta.unlocked.includes("serpentine") ? "serpentine" : MAPS[0].id;
let lastTs = 0;
let pulse = 0;
let shake = 0;
let autoWaveTimer = 0;
let tutStep = 0;
/** @type {{ x: number, y: number, vx: number, vy: number, life: number, color: string, size: number }[]} */
let particles = [];

const TARGET_LABEL = { first: "最前", strong: "最肉", close: "最近" };
const TUTORIAL = [
  "歡迎！先點下方「箭塔／炮塔／冰塔」選一種。",
  "再點地圖上的「＋」空地建造防禦塔。",
  "準備好後按「下一波」放出敵人；可升級或賣掉塔。",
  "通關會依剩餘生命給星，並解鎖下一張地圖。加油！",
];

function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

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

/**
 * @param {string} title
 */
function toastAch(title) {
  achToast.hidden = false;
  achToast.textContent = `成就解鎖：${title}`;
  clearTimeout(toastAch._t);
  toastAch._t = setTimeout(() => {
    achToast.hidden = true;
  }, 2600);
}
toastAch._t = 0;

/**
 * @param {string[]} ids
 */
function grantAchs(ids) {
  for (const id of ids) {
    if (unlockAch(meta, id)) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        toastAch(def.title);
        audio.wave();
      }
    }
  }
  saveMeta(meta);
}

function renderMapChips() {
  mapRow.innerHTML = "";
  for (const m of MAPS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.map = m.id;
    const locked = !meta.unlocked.includes(m.id);
    btn.disabled = locked;
    const sk = starKey(m.id, diff);
    const stars = meta.stars[sk] || 0;
    btn.textContent = locked
      ? `🔒 ${m.name}`
      : `${m.name}${stars ? ` ${"★".repeat(stars)}` : ""}`;
    if (m.id === mapId) btn.classList.add("is-active");
    btn.title = m.blurb;
    btn.addEventListener("click", async () => {
      if (locked) return;
      await audio.unlock();
      audio.click();
      mapId = m.id;
      renderMapChips();
      syncMapStars();
    });
    mapRow.appendChild(btn);
  }
}

function syncMapStars() {
  const map = MAPS.find((m) => m.id === mapId) || MAPS[0];
  const parts = /** @type {import('./game.js').Diff[]} */ (["easy", "normal", "hard"]).map((d) => {
    const s = meta.stars[starKey(map.id, d)] || 0;
    const label = d === "easy" ? "簡" : d === "hard" ? "難" : "普";
    return `${label}${"★".repeat(s)}${"☆".repeat(Math.max(0, 3 - s))}`;
  });
  mapStarsEl.textContent = `${map.name}：${parts.join(" · ")}`;
}

function syncChips() {
  for (const b of modeBtns) b.classList.toggle("is-active", b.dataset.mode === mode);
  for (const b of diffBtns) b.classList.toggle("is-active", b.dataset.diff === diff);
  for (const b of pickBtns) {
    b.classList.toggle("is-active", b.dataset.kind === game.selectedKind);
  }
  renderMapChips();
  syncMapStars();
}

function syncHud() {
  goldEl.textContent = String(game.gold);
  livesEl.textContent = String(game.lives);
  waveEl.textContent =
    game.mode === "campaign" ? `${game.wave}/${game.maxWaves}` : String(game.wave);
  scoreEl.textContent = String(game.score);
  bestEl.textContent = String(Math.max(meta.best, game.score));
  comboEl.textContent = String(game.combo);
  btnStart.textContent = game.status === "ready" ? "開局" : "重開";
  btnSpeed.textContent = `×${game.speed}`;
  btnTarget.textContent = `優先：${TARGET_LABEL[game.targetMode]}`;
  btnAuto.setAttribute("aria-pressed", game.autoWave ? "true" : "false");
  btnAuto.textContent = game.autoWave ? "自動波開" : "自動波";
  btnPause.disabled = game.status !== "playing";
  btnPause.textContent = game.paused ? "繼續" : "暫停";
  pauseOverlay.hidden = !(game.status === "playing" && game.paused);

  const canWave =
    game.status === "playing" &&
    !game.paused &&
    game.waveClear &&
    (game.mode === "endless" || game.wave < game.maxWaves);
  btnWave.disabled = !canWave;

  const sel = game.selectedPad != null ? game.towers[game.selectedPad] : null;
  btnUpgrade.disabled = !sel || sel.level >= 5 || game.status !== "playing" || game.paused;
  btnSell.disabled = !sel || game.status !== "playing" || game.paused;
  if (sel) {
    const cost = game.upgradeCost(sel);
    btnUpgrade.textContent = sel.level >= 5 ? "滿級" : `升級 ${cost}g`;
    const st = game.towerStats(sel);
    inspectEl.hidden = false;
    inspectEl.textContent = `${TOWERS[sel.kind].name} Lv${sel.level} · 傷害 ${Math.round(st.dmg)} · 射程 ${Math.round(st.range)} · 擊殺 ${sel.kills} · 賣 ${game.sellValue(sel)}g`;
  } else {
    inspectEl.hidden = true;
    btnUpgrade.textContent = "升級";
  }
  syncChips();
}

function applyProgressOnEnd() {
  meta.best = Math.max(meta.best, game.score);
  meta.totalKills += game.enemiesKilled;
  const unlocked = [];

  if (game.status === "won" && game.mode === "campaign") {
    const key = starKey(game.mapId, game.diff);
    meta.stars[key] = Math.max(meta.stars[key] || 0, game.stars);
    const idx = MAPS.findIndex((m) => m.id === game.mapId);
    if (idx >= 0 && idx < MAPS.length - 1) {
      const next = MAPS[idx + 1].id;
      if (!meta.unlocked.includes(next)) {
        meta.unlocked.push(next);
        setStatus(`解鎖地圖：${MAPS[idx + 1].name}`, "ok");
      }
    }
    unlocked.push("first_win");
    if (game.stars >= 3) unlocked.push("three_star");
    if (game.diff === "hard") unlocked.push("hard_clear");
    const cleared = MAPS.every((m) =>
      /** @type {import('./game.js').Diff[]} */ (["easy", "normal", "hard"]).some(
        (d) => (meta.stars[starKey(m.id, d)] || 0) >= 1,
      ),
    );
    if (cleared) unlocked.push("all_maps");
  }
  if (game.mode === "endless" && game.wave >= 10) unlocked.push("endless_10");
  if (game.bestCombo >= 20) unlocked.push("combo_20");
  if (game.maxTowerLevel >= 5) unlocked.push("tower_max");
  if (meta.totalKills >= 100) unlocked.push("kill_100");

  saveMeta(meta);
  grantAchs(unlocked);
  renderMapChips();
  syncMapStars();
}

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
      if (game.mode === "endless" && game.wave >= 10) {
        grantAchs(["endless_10"]);
      }
    } else if (e === "autoWave") autoWaveTimer = 0.85;
    else if (e === "win" || e === "lose") {
      if (e === "win") audio.win();
      else audio.lose();
      applyProgressOnEnd();
      setStatus(game.message, e === "win" ? "ok" : "bad");
    }
  }
  for (const f of floats) {
    if (f.text.startsWith("+")) burst(f.x, f.y, "#fbbf24", 8);
    if (f.text.startsWith("-") && !f.text.includes("♥")) burst(f.x, f.y, f.color, 5);
  }
  if (game.bestCombo >= 20) grantAchs(["combo_20"]);
  if (game.maxTowerLevel >= 5) grantAchs(["tower_max"]);
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
  if (game.status !== "playing" || game.paused) return;
  const { x, y } = canvasPos(ev);
  let bestPad = -1;
  let bestD = 26;
  for (let i = 0; i < game.pads.length; i++) {
    const d = Math.hypot(game.pads[i].x - x, game.pads[i].y - y);
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
    burst(game.pads[bestPad].x, game.pads[bestPad].y, TOWERS[game.selectedKind].color, 12);
    setStatus(`建造 ${TOWERS[game.selectedKind].name}`, "ok");
    if (tutStep === 1) advanceTutorial();
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
    if (tutStep === 0) advanceTutorial();
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
  if (!meta.unlocked.includes(mapId)) mapId = meta.unlocked[0] || MAPS[0].id;
  game.start(diff, mode, mapId);
  particles = [];
  setStatus(game.message);
  syncHud();
});

btnWave.addEventListener("click", async () => {
  await audio.unlock();
  if (game.startWave()) {
    audio.wave();
    setStatus(game.message);
    if (tutStep === 2) advanceTutorial();
  }
  syncHud();
});

btnPause.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  if (game.status !== "playing") return;
  game.paused = !game.paused;
  setStatus(game.paused ? "已暫停" : "繼續作戰", game.paused ? "warn" : "");
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
  game.targetMode = order[(order.indexOf(game.targetMode) + 1) % order.length];
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
    if (game.maxTowerLevel >= 5) grantAchs(["tower_max"]);
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

function renderAchPanel() {
  achList.innerHTML = "";
  for (const a of ACHIEVEMENTS) {
    const li = document.createElement("li");
    const done = meta.achievements.includes(a.id);
    if (done) li.classList.add("done");
    li.innerHTML = `<strong>${done ? "✓ " : ""}${a.title}</strong><span>${a.desc}</span>`;
    achList.appendChild(li);
  }
}

btnAch.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  renderAchPanel();
  achPanel.hidden = !achPanel.hidden;
});
document.getElementById("ach-close").addEventListener("click", () => {
  achPanel.hidden = true;
});

function showTutorial() {
  if (meta.seenTutorial) {
    tutorial.hidden = true;
    return;
  }
  tutStep = 0;
  tutText.textContent = TUTORIAL[0];
  tutorial.hidden = false;
}

function advanceTutorial() {
  tutStep += 1;
  if (tutStep >= TUTORIAL.length) {
    tutorial.hidden = true;
    meta.seenTutorial = true;
    saveMeta(meta);
    return;
  }
  tutText.textContent = TUTORIAL[tutStep];
  tutorial.hidden = false;
}

document.getElementById("tut-next").addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  advanceTutorial();
});
document.getElementById("tut-skip").addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  tutorial.hidden = true;
  meta.seenTutorial = true;
  saveMeta(meta);
});

function frame(ts) {
  const dt = Math.min(0.05, (ts - (lastTs || ts)) / 1000);
  lastTs = ts;
  pulse += dt;

  if (autoWaveTimer > 0 && !game.paused) {
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
  drawBackground(ctx, W, H, game.path);
  drawPads(ctx, game.selectedPad, game.towers, game.pads);
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

// migrate old best score
try {
  const old = Number(localStorage.getItem("pg-towerdef-best") || 0);
  if (old > meta.best) {
    meta.best = old;
    saveMeta(meta);
  }
} catch {
  /* */
}

renderMapChips();
syncHud();
setStatus(game.message);
showTutorial();
requestAnimationFrame(frame);
