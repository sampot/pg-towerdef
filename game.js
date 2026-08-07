/**
 * Tower defense — polished single-path campaign + endless.
 * Genre homage for entertainment; not a commercial franchise clone.
 */

export const W = 360;
export const H = 520;

/** @typedef {{ x: number, y: number }} Pt */

export const PATH = /** @type {Pt[]} */ ([
  { x: -24, y: 70 },
  { x: 290, y: 70 },
  { x: 290, y: 165 },
  { x: 70, y: 165 },
  { x: 70, y: 260 },
  { x: 310, y: 260 },
  { x: 310, y: 355 },
  { x: 50, y: 355 },
  { x: 50, y: 450 },
  { x: 200, y: 450 },
  { x: 200, y: 540 },
]);

export const PADS = /** @type {Pt[]} */ ([
  { x: 55, y: 32 },
  { x: 135, y: 32 },
  { x: 215, y: 32 },
  { x: 40, y: 115 },
  { x: 180, y: 115 },
  { x: 330, y: 115 },
  { x: 180, y: 210 },
  { x: 40, y: 210 },
  { x: 330, y: 210 },
  { x: 180, y: 305 },
  { x: 250, y: 305 },
  { x: 120, y: 400 },
  { x: 260, y: 400 },
  { x: 330, y: 400 },
  { x: 100, y: 490 },
  { x: 280, y: 490 },
]);

/**
 * @typedef {'arrow'|'cannon'|'frost'} TowerKind
 * @typedef {'scout'|'grunt'|'brute'|'swarm'|'boss'} EnemyKind
 * @typedef {'easy'|'normal'|'hard'} Diff
 * @typedef {'first'|'strong'|'close'} TargetMode
 */

/** @type {Record<TowerKind, { name: string, blurb: string, cost: number, range: number, rate: number, dmg: number, splash: number, slow: number, color: string, color2: string }>} */
export const TOWERS = {
  arrow: {
    name: "箭塔",
    blurb: "射速快，單體點殺",
    cost: 55,
    range: 100,
    rate: 0.38,
    dmg: 14,
    splash: 0,
    slow: 0,
    color: "#3d8bfd",
    color2: "#1d4ed8",
  },
  cannon: {
    name: "炮塔",
    blurb: "慢射、範圍爆炸",
    cost: 95,
    range: 88,
    rate: 1.05,
    dmg: 32,
    splash: 40,
    slow: 0,
    color: "#e85d04",
    color2: "#9a3412",
  },
  frost: {
    name: "冰塔",
    blurb: "減速並持續輸出",
    cost: 75,
    range: 84,
    rate: 0.62,
    dmg: 10,
    splash: 0,
    slow: 0.5,
    color: "#4cc9f0",
    color2: "#0891b2",
  },
};

/** @type {Record<EnemyKind, { name: string, hp: number, speed: number, reward: number, r: number, armor: number }>} */
export const ENEMY_BASE = {
  scout: { name: "斥候", hp: 28, speed: 62, reward: 5, r: 7, armor: 0 },
  grunt: { name: "士兵", hp: 55, speed: 42, reward: 8, r: 9, armor: 0 },
  brute: { name: "重甲", hp: 140, speed: 28, reward: 16, r: 12, armor: 0.18 },
  swarm: { name: "蟲群", hp: 18, speed: 55, reward: 3, r: 5.5, armor: 0 },
  boss: { name: "首領", hp: 520, speed: 24, reward: 60, r: 16, armor: 0.22 },
};

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
      const seg = PATH_LEN[i] - PATH_LEN[i - 1] || 1;
      const t = (d - PATH_LEN[i - 1]) / seg;
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
 * @param {Diff} diff
 */
export function wavePlan(wave, diff) {
  const diffMul = diff === "easy" ? 0.75 : diff === "hard" ? 1.35 : 1;
  const speedMul = diff === "easy" ? 0.9 : diff === "hard" ? 1.12 : 1;
  /** @type {{ kind: EnemyKind, delay: number, hpMul: number, speedMul: number }[]} */
  const plan = [];
  const push = (kind, n, gap) => {
    for (let i = 0; i < n; i++) {
      plan.push({
        kind,
        delay: plan.length ? plan[plan.length - 1].delay + gap : 0.15,
        hpMul: diffMul * (1 + (wave - 1) * 0.12),
        speedMul: speedMul * (1 + Math.min(0.35, (wave - 1) * 0.02)),
      });
    }
  };

  if (wave % 5 === 0) {
    push("grunt", 4 + Math.floor(wave / 3), 0.55);
    push("brute", 2 + Math.floor(wave / 5), 0.7);
    push("boss", 1, 1.2);
  } else if (wave % 3 === 0) {
    push("scout", 5 + wave, 0.32);
    push("swarm", 8 + wave, 0.18);
    push("grunt", 3 + Math.floor(wave / 2), 0.45);
  } else if (wave % 2 === 0) {
    push("grunt", 6 + wave, 0.42);
    push("brute", 1 + Math.floor(wave / 4), 0.75);
    push("scout", 3, 0.35);
  } else {
    push("grunt", 5 + wave, 0.48);
    push("scout", 2 + Math.floor(wave / 2), 0.38);
  }
  return plan;
}

let _id = 1;
function nid() {
  return _id++;
}

/**
 * @typedef {{
 *   id: number, kind: TowerKind, pad: number, x: number, y: number,
 *   level: number, cool: number, kills: number,
 * }} Tower
 * @typedef {{
 *   id: number, kind: EnemyKind, x: number, y: number,
 *   hp: number, maxHp: number, speed: number, baseSpeed: number,
 *   dist: number, reward: number, slowT: number, armor: number, r: number,
 *   hitFlash: number,
 * }} Enemy
 * @typedef {{
 *   x: number, y: number, vx: number, vy: number,
 *   dmg: number, splash: number, slow: number, life: number,
 *   color: string, targetId: number | null, kind: TowerKind,
 * }} Shot
 */

export class TowerDefGame {
  constructor() {
    /** @type {'ready'|'playing'|'won'|'lost'} */
    this.status = "ready";
    /** @type {Diff} */
    this.diff = "normal";
    /** @type {'campaign'|'endless'} */
    this.mode = "campaign";
    this.maxWaves = 15;
    this.message = "選難度後開局，建造防線";
    this.gold = 150;
    this.lives = 20;
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.speed = 1;
    this.autoWave = false;
    /** @type {TargetMode} */
    this.targetMode = "first";
    /** @type {(Tower|null)[]} */
    this.towers = PADS.map(() => null);
    /** @type {Enemy[]} */
    this.enemies = [];
    /** @type {Shot[]} */
    this.shots = [];
    /** @type {{ kind: EnemyKind, delay: number, hpMul: number, speedMul: number }[]} */
    this.queue = [];
    this.queueT = 0;
    this.waveClear = true;
    /** @type {TowerKind} */
    this.selectedKind = "arrow";
    /** @type {number | null} */
    this.selectedPad = null;
    this.enemiesKilled = 0;
    this.goldEarned = 0;
  }

  /**
   * @param {Diff} [diff]
   * @param {'campaign'|'endless'} [mode]
   */
  start(diff = this.diff, mode = this.mode) {
    this.diff = diff;
    this.mode = mode;
    this.status = "playing";
    this.gold = diff === "easy" ? 180 : diff === "hard" ? 120 : 150;
    this.lives = diff === "easy" ? 25 : diff === "hard" ? 15 : 20;
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.speed = 1;
    this.towers = PADS.map(() => null);
    this.enemies = [];
    this.shots = [];
    this.queue = [];
    this.queueT = 0;
    this.waveClear = true;
    this.selectedPad = null;
    this.enemiesKilled = 0;
    this.goldEarned = 0;
    this.maxWaves = 15;
    this.message =
      mode === "endless"
        ? "無盡模式 · 建造後按下一波"
        : `戰役 ${diff === "easy" ? "簡單" : diff === "hard" ? "困難" : "普通"} · 共 ${this.maxWaves} 波`;
  }

  upgradeCost(t) {
    return Math.round(TOWERS[t.kind].cost * (0.65 + t.level * 0.55));
  }

  sellValue(t) {
    let spent = TOWERS[t.kind].cost;
    for (let lv = 1; lv < t.level; lv++) {
      spent += Math.round(TOWERS[t.kind].cost * (0.65 + lv * 0.55));
    }
    return Math.round(spent * 0.6);
  }

  /**
   * @param {number} pad
   */
  tryBuild(pad) {
    if (this.status !== "playing") return { ok: false, reason: "notplaying" };
    if (pad < 0 || pad >= PADS.length || this.towers[pad]) return { ok: false, reason: "bad" };
    const def = TOWERS[this.selectedKind];
    if (this.gold < def.cost) return { ok: false, reason: "gold" };
    this.gold -= def.cost;
    const p = PADS[pad];
    this.towers[pad] = {
      id: nid(),
      kind: this.selectedKind,
      pad,
      x: p.x,
      y: p.y,
      level: 1,
      cool: 0.15,
      kills: 0,
    };
    this.selectedPad = pad;
    return { ok: true };
  }

  tryUpgrade() {
    if (this.selectedPad == null) return { ok: false };
    const t = this.towers[this.selectedPad];
    if (!t || t.level >= 5) return { ok: false, reason: "max" };
    const cost = this.upgradeCost(t);
    if (this.gold < cost) return { ok: false, reason: "gold" };
    this.gold -= cost;
    t.level += 1;
    return { ok: true, cost };
  }

  trySell() {
    if (this.selectedPad == null) return { ok: false };
    const t = this.towers[this.selectedPad];
    if (!t) return { ok: false };
    const refund = this.sellValue(t);
    this.gold += refund;
    this.towers[this.selectedPad] = null;
    this.selectedPad = null;
    return { ok: true, refund };
  }

  startWave() {
    if (this.status !== "playing" || !this.waveClear) return false;
    if (this.mode === "campaign" && this.wave >= this.maxWaves) return false;
    this.wave += 1;
    this.queue = wavePlan(this.wave, this.diff);
    this.queueT = 0;
    this.waveClear = false;
    this.combo = 0;
    this.message = `第 ${this.wave} 波${this.mode === "campaign" ? `／${this.maxWaves}` : ""}`;
    return true;
  }

  /**
   * @param {Tower} t
   */
  towerStats(t) {
    const base = TOWERS[t.kind];
    const lv = t.level;
    return {
      range: base.range * (1 + (lv - 1) * 0.07),
      rate: base.rate / (1 + (lv - 1) * 0.1),
      dmg: base.dmg * (1 + (lv - 1) * 0.38),
      splash: base.splash * (1 + (lv - 1) * 0.12),
      slow: base.slow,
      color: base.color,
      color2: base.color2,
    };
  }

  /**
   * @param {Tower} t
   * @param {ReturnType<TowerDefGame['towerStats']>} st
   */
  pickTarget(t, st) {
    /** @type {Enemy[]} */
    const inRange = [];
    for (const e of this.enemies) {
      if (Math.hypot(e.x - t.x, e.y - t.y) <= st.range) inRange.push(e);
    }
    if (!inRange.length) return null;
    if (this.targetMode === "strong") {
      return inRange.reduce((a, b) => (a.hp >= b.hp ? a : b));
    }
    if (this.targetMode === "close") {
      return inRange.reduce((a, b) =>
        Math.hypot(a.x - t.x, a.y - t.y) <= Math.hypot(b.x - t.x, b.y - t.y) ? a : b,
      );
    }
    return inRange.reduce((a, b) => (a.dist >= b.dist ? a : b));
  }

  /**
   * @param {number} dtRaw
   */
  update(dtRaw) {
    /** @type {string[]} */
    const events = [];
    /** @type {{ x: number, y: number, text: string, color: string }[]} */
    const floats = [];
    if (this.status !== "playing") return { events, floats };

    const dt = dtRaw * this.speed;

    if (this.queue.length) {
      this.queueT += dt;
      while (this.queue.length && this.queueT >= this.queue[0].delay) {
        const s = this.queue.shift();
        if (!s) break;
        const base = ENEMY_BASE[s.kind];
        const p = pointOnPath(0);
        const hp = base.hp * s.hpMul;
        this.enemies.push({
          id: nid(),
          kind: s.kind,
          x: p.x,
          y: p.y,
          hp,
          maxHp: hp,
          speed: base.speed * s.speedMul,
          baseSpeed: base.speed * s.speedMul,
          dist: 0,
          reward: Math.round(base.reward * (1 + this.wave * 0.04)),
          slowT: 0,
          armor: base.armor,
          r: base.r,
          hitFlash: 0,
        });
        events.push("spawn");
      }
    }

    for (const e of this.enemies) {
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.slowT > 0) {
        e.slowT -= dt;
        e.speed = e.baseSpeed * 0.42;
      } else e.speed = e.baseSpeed;
      e.dist += e.speed * dt;
      const p = pointOnPath(e.dist);
      e.x = p.x;
      e.y = p.y;
    }

    const leaked = this.enemies.filter((e) => e.dist >= PATH_TOTAL);
    for (const e of leaked) {
      const dmg = e.kind === "boss" ? 3 : e.kind === "brute" ? 2 : 1;
      this.lives -= dmg;
      this.combo = 0;
      events.push("leak");
      floats.push({ x: e.x, y: e.y, text: `-${dmg}♥`, color: "#ff6b6b" });
    }
    this.enemies = this.enemies.filter((e) => e.dist < PATH_TOTAL && e.hp > 0);

    if (this.lives <= 0) {
      this.lives = 0;
      this.status = "lost";
      this.message = `防線失守 · 第 ${this.wave} 波 · ${this.score} 分`;
      events.push("lose");
      return { events, floats };
    }

    for (const t of this.towers) {
      if (!t) continue;
      t.cool = Math.max(0, t.cool - dt);
      if (t.cool > 0) continue;
      const st = this.towerStats(t);
      const best = this.pickTarget(t, st);
      if (!best) continue;
      t.cool = st.rate;
      const ang = Math.atan2(best.y - t.y, best.x - t.x);
      const spd = t.kind === "cannon" ? 240 : 320;
      this.shots.push({
        x: t.x + Math.cos(ang) * 10,
        y: t.y + Math.sin(ang) * 10,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        dmg: st.dmg,
        splash: st.splash,
        slow: st.slow,
        life: 0.85,
        color: st.color,
        targetId: best.id,
        kind: t.kind,
      });
      events.push(t.kind);
    }

    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
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
      let hitPos = null;
      for (const e of this.enemies) {
        if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + 5) {
          hitPos = { x: s.x, y: s.y };
          break;
        }
      }
      if (!hitPos) continue;
      s.life = 0;
      events.push(s.kind === "cannon" ? "boom" : "hit");
      const rad = s.splash > 0 ? s.splash : 16;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - hitPos.x, e.y - hitPos.y);
        if (d > rad) continue;
        const fall = s.splash > 0 ? 1 - (d / rad) * 0.45 : 1;
        let dmg = s.dmg * fall * (1 - e.armor);
        dmg = Math.max(1, Math.round(dmg));
        e.hp -= dmg;
        e.hitFlash = 0.12;
        if (s.slow > 0) e.slowT = Math.max(e.slowT, 1.5);
        floats.push({
          x: e.x + (Math.random() - 0.5) * 10,
          y: e.y - e.r - 4,
          text: `-${dmg}`,
          color: s.kind === "frost" ? "#7dd3fc" : s.kind === "cannon" ? "#fb923c" : "#fff",
        });
        if (e.hp <= 0) {
          e.hp = 0;
          this.gold += e.reward;
          this.goldEarned += e.reward;
          this.combo += 1;
          this.bestCombo = Math.max(this.bestCombo, this.combo);
          const bonus = Math.min(20, this.combo);
          this.score += e.reward * 2 + bonus;
          this.enemiesKilled += 1;
          events.push("kill");
          // credit tower
          for (const tw of this.towers) {
            if (tw && Math.hypot(tw.x - e.x, tw.y - e.y) < this.towerStats(tw).range + 20) {
              /* approximate — credit nearest shooter via last shot */
            }
          }
          floats.push({ x: e.x, y: e.y, text: `+${e.reward}g`, color: "#fbbf24" });
        }
      }
      // credit kill to firing tower roughly via selected shot origin — skip for simplicity
    }

    // attach kills to towers that last hit — simplified: any tower in range of dead enemies already gone
    this.shots = this.shots.filter((s) => s.life > 0);
    this.enemies = this.enemies.filter((e) => e.hp > 0);

    if (!this.queue.length && !this.enemies.length && !this.waveClear && this.wave > 0) {
      this.waveClear = true;
      const bonus = 25 + this.wave * 6;
      this.gold += bonus;
      this.goldEarned += bonus;
      if (this.mode === "campaign" && this.wave >= this.maxWaves) {
        this.status = "won";
        this.score += this.lives * 15;
        this.message = `戰役通關！${this.score} 分 · 連殺最佳 ×${this.bestCombo}`;
        events.push("win");
      } else {
        this.message = `波次清除 · +${bonus} 金幣`;
        events.push("waveClear");
        if (this.autoWave) {
          // flag for app to auto-start next wave after short delay
          events.push("autoWave");
        }
      }
    }

    return { events, floats };
  }
}

export function loadBest() {
  try {
    return Number(localStorage.getItem("pg-towerdef-best") || 0) || 0;
  } catch {
    return 0;
  }
}

/**
 * @param {number} score
 */
export function saveBest(score) {
  try {
    const prev = loadBest();
    if (score > prev) localStorage.setItem("pg-towerdef-best", String(score));
  } catch {
    /* */
  }
}
