/**
 * Mini tower defense — single path, wave survival.
 * Genre homage, not a commercial clone.
 */

export const W = 360;
export const H = 480;

/** @typedef {{ x: number, y: number }} Pt */

/** Path waypoints (enemy march). */
export const PATH = /** @type {Pt[]} */ ([
  { x: -20, y: 80 },
  { x: 280, y: 80 },
  { x: 280, y: 180 },
  { x: 80, y: 180 },
  { x: 80, y: 280 },
  { x: 300, y: 280 },
  { x: 300, y: 380 },
  { x: 40, y: 380 },
  { x: 40, y: 500 },
]);

/** Pre-placed build pads (not on path). */
export const PADS = /** @type {Pt[]} */ ([
  { x: 60, y: 40 },
  { x: 140, y: 40 },
  { x: 220, y: 40 },
  { x: 320, y: 130 },
  { x: 180, y: 130 },
  { x: 40, y: 130 },
  { x: 180, y: 230 },
  { x: 320, y: 230 },
  { x: 40, y: 230 },
  { x: 180, y: 330 },
  { x: 240, y: 330 },
  { x: 140, y: 430 },
  { x: 220, y: 430 },
  { x: 300, y: 430 },
]);

/**
 * @typedef {'arrow'|'cannon'|'frost'} TowerKind
 * @typedef {{
 *   kind: TowerKind,
 *   name: string,
 *   cost: number,
 *   range: number,
 *   rate: number,
 *   dmg: number,
 *   splash: number,
 *   slow: number,
 *   color: string,
 * }} TowerDef
 */

/** @type {Record<TowerKind, TowerDef>} */
export const TOWERS = {
  arrow: {
    kind: "arrow",
    name: "箭塔",
    cost: 50,
    range: 95,
    rate: 0.45,
    dmg: 12,
    splash: 0,
    slow: 0,
    color: "#3d8bfd",
  },
  cannon: {
    kind: "cannon",
    name: "炮塔",
    cost: 90,
    range: 85,
    rate: 1.1,
    dmg: 28,
    splash: 36,
    slow: 0,
    color: "#e85d04",
  },
  frost: {
    kind: "frost",
    name: "冰塔",
    cost: 70,
    range: 80,
    rate: 0.7,
    dmg: 8,
    splash: 0,
    slow: 0.45,
    color: "#4cc9f0",
  },
};

/**
 * @typedef {{
 *   id: number,
 *   kind: TowerKind,
 *   pad: number,
 *   x: number,
 *   y: number,
 *   level: number,
 *   cool: number,
 * }} Tower
 *
 * @typedef {{
 *   id: number,
 *   x: number,
 *   y: number,
 *   hp: number,
 *   maxHp: number,
 *   speed: number,
 *   baseSpeed: number,
 *   dist: number,
 *   reward: number,
 *   slowT: number,
 *   tint: string,
 * }} Enemy
 *
 * @typedef {{
 *   x: number, y: number,
 *   tx: number, ty: number,
 *   vx: number, vy: number,
 *   dmg: number,
 *   splash: number,
 *   slow: number,
 *   life: number,
 *   color: string,
 *   targetId: number | null,
 * }} Shot
 */

let _id = 1;
function nid() {
  return _id++;
}

/** Cumulative path lengths. */
const PATH_LEN = (() => {
  const lens = [0];
  let acc = 0;
  for (let i = 1; i < PATH.length; i++) {
    acc += Math.hypot(PATH[i].x - PATH[i - 1].x, PATH[i].y - PATH[i - 1].y);
    lens.push(acc);
  }
  return lens;
})();

export const PATH_TOTAL = PATH_LEN[PATH_LEN.length - 1];

/**
 * @param {number} dist
 * @returns {Pt}
 */
export function pointOnPath(dist) {
  const d = Math.max(0, Math.min(PATH_TOTAL, dist));
  for (let i = 1; i < PATH.length; i++) {
    if (d <= PATH_LEN[i]) {
      const seg = PATH_LEN[i] - PATH_LEN[i - 1];
      const t = seg > 0 ? (d - PATH_LEN[i - 1]) / seg : 0;
      return {
        x: PATH[i - 1].x + (PATH[i].x - PATH[i - 1].x) * t,
        y: PATH[i - 1].y + (PATH[i].y - PATH[i - 1].y) * t,
      };
    }
  }
  return { ...PATH[PATH.length - 1] };
}

/**
 * @param {number} wave
 */
export function wavePlan(wave) {
  const n = 6 + wave * 2;
  const hp = 40 + wave * 18;
  const speed = 38 + Math.min(28, wave * 2.5);
  const reward = 6 + Math.floor(wave / 2);
  /** @type {{ hp: number, speed: number, reward: number, tint: string, delay: number }[]} */
  const spawns = [];
  for (let i = 0; i < n; i++) {
    const boss = wave > 2 && i === n - 1;
    spawns.push({
      hp: boss ? hp * 3.2 : hp * (0.85 + Math.random() * 0.3),
      speed: boss ? speed * 0.7 : speed,
      reward: boss ? reward * 5 : reward,
      tint: boss ? "#c77dff" : wave % 3 === 0 ? "#ff6b6b" : "#f4a261",
      delay: i * (0.55 - Math.min(0.25, wave * 0.02)),
    });
  }
  return spawns;
}

export class TowerDefGame {
  constructor() {
    /** @type {'ready'|'playing'|'won'|'lost'} */
    this.status = "ready";
    this.message = "選塔後點空地建造，再按「下一波」";
    this.gold = 120;
    this.lives = 20;
    this.wave = 0;
    this.maxWaves = 12;
    this.score = 0;
    /** @type {(Tower|null)[]} */
    this.towers = PADS.map(() => null);
    /** @type {Enemy[]} */
    this.enemies = [];
    /** @type {Shot[]} */
    this.shots = [];
    /** @type {{ hp: number, speed: number, reward: number, tint: string, delay: number }[]} */
    this.queue = [];
    this.queueT = 0;
    this.waveClear = true;
    /** @type {TowerKind} */
    this.selectedKind = "arrow";
    /** @type {number | null} */
    this.selectedPad = null;
  }

  reset() {
    this.status = "ready";
    this.message = "選塔後點空地建造，再按「下一波」";
    this.gold = 120;
    this.lives = 20;
    this.wave = 0;
    this.score = 0;
    this.towers = PADS.map(() => null);
    this.enemies = [];
    this.shots = [];
    this.queue = [];
    this.queueT = 0;
    this.waveClear = true;
    this.selectedPad = null;
  }

  start() {
    this.reset();
    this.status = "playing";
    this.message = "建造防禦塔，準備迎接第一波";
  }

  /**
   * @param {number} pad
   */
  tryBuild(pad) {
    if (this.status !== "playing") return { ok: false, reason: "notplaying" };
    if (pad < 0 || pad >= PADS.length) return { ok: false, reason: "badpad" };
    if (this.towers[pad]) return { ok: false, reason: "occupied" };
    const def = TOWERS[this.selectedKind];
    if (this.gold < def.cost) return { ok: false, reason: "gold" };
    this.gold -= def.cost;
    const p = PADS[pad];
    this.towers[pad] = {
      id: nid(),
      kind: def.kind,
      pad,
      x: p.x,
      y: p.y,
      level: 1,
      cool: 0.2,
    };
    this.selectedPad = pad;
    return { ok: true };
  }

  /**
   * Upgrade selected tower.
   */
  tryUpgrade() {
    if (this.selectedPad == null) return { ok: false };
    const t = this.towers[this.selectedPad];
    if (!t || t.level >= 3) return { ok: false, reason: "max" };
    const cost = Math.round(TOWERS[t.kind].cost * (0.7 + t.level * 0.5));
    if (this.gold < cost) return { ok: false, reason: "gold" };
    this.gold -= cost;
    t.level += 1;
    return { ok: true, cost };
  }

  trySell() {
    if (this.selectedPad == null) return { ok: false };
    const t = this.towers[this.selectedPad];
    if (!t) return { ok: false };
    const refund = Math.round(TOWERS[t.kind].cost * 0.5 * t.level);
    this.gold += refund;
    this.towers[this.selectedPad] = null;
    this.selectedPad = null;
    return { ok: true, refund };
  }

  startWave() {
    if (this.status !== "playing" || !this.waveClear) return false;
    if (this.wave >= this.maxWaves) return false;
    this.wave += 1;
    this.queue = wavePlan(this.wave);
    this.queueT = 0;
    this.waveClear = false;
    this.message = `第 ${this.wave}／${this.maxWaves} 波`;
    return true;
  }

  /**
   * @param {Tower} t
   */
  towerStats(t) {
    const base = TOWERS[t.kind];
    const mul = 1 + (t.level - 1) * 0.35;
    return {
      range: base.range * (1 + (t.level - 1) * 0.08),
      rate: base.rate / (1 + (t.level - 1) * 0.12),
      dmg: base.dmg * mul,
      splash: base.splash * (1 + (t.level - 1) * 0.1),
      slow: base.slow,
      color: base.color,
    };
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    /** @type {string[]} */
    const events = [];
    if (this.status !== "playing") return { events };

    // spawn queue
    if (this.queue.length) {
      this.queueT += dt;
      while (this.queue.length && this.queueT >= this.queue[0].delay) {
        const s = this.queue.shift();
        if (!s) break;
        const p = pointOnPath(0);
        this.enemies.push({
          id: nid(),
          x: p.x,
          y: p.y,
          hp: s.hp,
          maxHp: s.hp,
          speed: s.speed,
          baseSpeed: s.speed,
          dist: 0,
          reward: s.reward,
          slowT: 0,
          tint: s.tint,
        });
        events.push("spawn");
      }
    }

    // enemies move
    for (const e of this.enemies) {
      if (e.slowT > 0) {
        e.slowT -= dt;
        e.speed = e.baseSpeed * 0.45;
      } else {
        e.speed = e.baseSpeed;
      }
      e.dist += e.speed * dt;
      const p = pointOnPath(e.dist);
      e.x = p.x;
      e.y = p.y;
    }

    // leaks
    const leaked = this.enemies.filter((e) => e.dist >= PATH_TOTAL);
    for (const e of leaked) {
      this.lives -= 1;
      events.push("leak");
      this.score = Math.max(0, this.score - 5);
    }
    this.enemies = this.enemies.filter((e) => e.dist < PATH_TOTAL && e.hp > 0);

    if (this.lives <= 0) {
      this.lives = 0;
      this.status = "lost";
      this.message = `防線失守 · 撐到第 ${this.wave} 波`;
      events.push("lose");
      return { events };
    }

    // towers shoot
    for (const t of this.towers) {
      if (!t) continue;
      t.cool = Math.max(0, t.cool - dt);
      if (t.cool > 0) continue;
      const st = this.towerStats(t);
      let best = /** @type {Enemy | null} */ (null);
      let bestD = Infinity;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - t.x, e.y - t.y);
        if (d <= st.range && e.dist < bestD) {
          best = e;
          bestD = e.dist;
        }
      }
      if (best) {
        t.cool = st.rate;
        const ang = Math.atan2(best.y - t.y, best.x - t.x);
        const spd = 280;
        this.shots.push({
          x: t.x,
          y: t.y,
          tx: best.x,
          ty: best.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          dmg: st.dmg,
          splash: st.splash,
          slow: st.slow,
          life: 0.9,
          color: st.color,
          targetId: best.id,
        });
        events.push(t.kind === "cannon" ? "cannon" : t.kind === "frost" ? "frost" : "arrow");
      }
    }

    // shots
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      // home slightly
      const tgt = this.enemies.find((e) => e.id === s.targetId);
      if (tgt) {
        const ang = Math.atan2(tgt.y - s.y, tgt.x - s.x);
        const spd = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(ang) * spd;
        s.vy = Math.sin(ang) * spd;
      }
    }

    for (const s of this.shots) {
      if (s.life <= 0) continue;
      let hit = false;
      for (const e of this.enemies) {
        if (Math.hypot(e.x - s.x, e.y - s.y) < 14) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
      s.life = 0;
      events.push("hit");
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - s.x, e.y - s.y);
        const rad = s.splash > 0 ? s.splash : 14;
        if (d <= rad) {
          const fall = s.splash > 0 ? 1 - (d / rad) * 0.4 : 1;
          e.hp -= s.dmg * fall;
          if (s.slow > 0) e.slowT = Math.max(e.slowT, 1.4);
          if (e.hp <= 0) {
            this.gold += e.reward;
            this.score += e.reward * 2;
            e.hp = 0;
            events.push("kill");
          }
        }
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);
    this.enemies = this.enemies.filter((e) => e.hp > 0);

    if (!this.queue.length && !this.enemies.length && !this.waveClear && this.wave > 0) {
      this.waveClear = true;
      this.gold += 20 + this.wave * 5;
      if (this.wave >= this.maxWaves) {
        this.status = "won";
        this.message = `全數擊退！得分 ${this.score}`;
        events.push("win");
      } else {
        this.message = `波次清除 · 金幣 +${20 + this.wave * 5} · 可繼續建造`;
        events.push("waveClear");
      }
    }

    return { events };
  }
}
