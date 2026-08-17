/**
 * Persistent progress: best score, map stars, achievements.
 */

const KEY = "pg-towerdef-meta-v1";

/** @typedef {{ id: string, title: string, desc: string }} AchDef */

/** @type {AchDef[]} */
export const ACHIEVEMENTS = [
  { id: "first_win", title: "初陣告捷", desc: "通關任一戰役地圖" },
  { id: "three_star", title: "完美防線", desc: "任一關拿到三星" },
  { id: "all_maps", title: "三關大師", desc: "三張地圖皆至少一星通關" },
  { id: "combo_20", title: "連殺達人", desc: "單場連殺達到 20" },
  { id: "hard_clear", title: "鐵壁", desc: "困難難度通關任一地圖" },
  { id: "endless_10", title: "無盡十波", desc: "無盡模式撐到第 10 波" },
  { id: "tower_max", title: "滿級火力", desc: "將一座塔升到 5 級" },
  { id: "kill_100", title: "百敵斬", desc: "累計擊殺 100 名敵人" },
];

/**
 * @typedef {{
 *   best: number,
 *   totalKills: number,
 *   stars: Record<string, number>,
 *   unlocked: string[],
 *   achievements: string[],
 *   seenTutorial: boolean,
 * }} Meta
 */

/** @returns {Meta} */
export function defaultMeta() {
  return {
    best: 0,
    totalKills: 0,
    stars: {},
    unlocked: ["serpentine"],
    achievements: [],
    seenTutorial: false,
  };
}

/** @returns {Meta} */
export function loadMeta() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultMeta();
    const parsed = { ...defaultMeta(), ...JSON.parse(raw) };
    if (!parsed.unlocked?.length) parsed.unlocked = ["serpentine"];
    return parsed;
  } catch {
    return defaultMeta();
  }
}

/**
 * @param {Meta} meta
 */
export function saveMeta(meta) {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    /* */
  }
  // KV 為權威；LS 僅快取
  void fetch(`/api/kv/${KEY}`, { method: "PUT", body: JSON.stringify(meta) }).catch(() => {});
}

/**
 * KV 為權威；本地快取過舊時以遠端為準
 * @param {Meta} meta
 * @returns {Promise<Meta>}
 */
export async function mergeMetaFromKv(meta) {
  try {
    const res = await fetch(`/api/kv/${KEY}`);
    if (!res.ok) return meta;
    const raw = JSON.parse((await res.text()) || "null");
    if (!raw) return meta;
    const merged = { ...meta };
    merged.best = Math.max(meta.best, Number(raw.best) || 0);
    merged.totalKills = Math.max(meta.totalKills, Number(raw.totalKills) || 0);
    if (raw.stars && typeof raw.stars === "object") {
      merged.stars = { ...(merged.stars || {}) };
      for (const [k, v] of Object.entries(raw.stars)) {
        const n = Number(v) || 0;
        merged.stars[k] = Math.max(merged.stars[k] || 0, n);
      }
    }
    if (Array.isArray(raw.unlocked)) {
      merged.unlocked = [...new Set([...(meta.unlocked || []), ...raw.unlocked])];
    }
    merged.seenTutorial = meta.seenTutorial || !!raw.seenTutorial;
    return merged;
  } catch {
    /* 無 KV 環境照玩 */
    return meta;
  }
}

/**
 * @param {string} mapId
 * @param {import('./game.js').Diff} diff
 */
export function starKey(mapId, diff) {
  return `${mapId}:${diff}`;
}

/**
 * Stars from remaining lives ratio.
 * @param {number} lives
 * @param {number} startLives
 */
export function calcStars(lives, startLives) {
  const r = lives / Math.max(1, startLives);
  if (r >= 0.8) return 3;
  if (r >= 0.45) return 2;
  return 1;
}

/**
 * @param {Meta} meta
 * @param {string} id
 */
export function unlockAch(meta, id) {
  if (meta.achievements.includes(id)) return false;
  meta.achievements.push(id);
  return true;
}
