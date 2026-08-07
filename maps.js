/**
 * Three arena layouts for campaign progression.
 * @typedef {{ x: number, y: number }} Pt
 * @typedef {{ id: string, name: string, blurb: string, path: Pt[], pads: Pt[] }} MapDef
 */

/** @type {MapDef[]} */
export const MAPS = [
  {
    id: "serpentine",
    name: "蜿蜒谷",
    blurb: "經典 S 形路徑，空地均衡",
    path: [
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
    ],
    pads: [
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
    ],
  },
  {
    id: "crossroads",
    name: "十字關",
    blurb: "中段交錯，需兼顧兩側火力",
    path: [
      { x: 40, y: -20 },
      { x: 40, y: 180 },
      { x: 320, y: 180 },
      { x: 320, y: 320 },
      { x: 40, y: 320 },
      { x: 40, y: 460 },
      { x: 280, y: 460 },
      { x: 280, y: 540 },
    ],
    pads: [
      { x: 120, y: 60 },
      { x: 200, y: 60 },
      { x: 280, y: 60 },
      { x: 120, y: 130 },
      { x: 200, y: 130 },
      { x: 100, y: 240 },
      { x: 180, y: 240 },
      { x: 260, y: 240 },
      { x: 120, y: 390 },
      { x: 200, y: 390 },
      { x: 280, y: 390 },
      { x: 160, y: 500 },
      { x: 240, y: 500 },
      { x: 320, y: 500 },
    ],
  },
  {
    id: "spiral",
    name: "螺旋堡",
    blurb: "長路徑高壓，空地偏外側",
    path: [
      { x: 180, y: -20 },
      { x: 180, y: 100 },
      { x: 60, y: 100 },
      { x: 60, y: 220 },
      { x: 300, y: 220 },
      { x: 300, y: 340 },
      { x: 100, y: 340 },
      { x: 100, y: 440 },
      { x: 260, y: 440 },
      { x: 260, y: 540 },
    ],
    pads: [
      { x: 100, y: 40 },
      { x: 260, y: 40 },
      { x: 320, y: 100 },
      { x: 120, y: 160 },
      { x: 220, y: 160 },
      { x: 40, y: 280 },
      { x: 180, y: 280 },
      { x: 340, y: 280 },
      { x: 40, y: 400 },
      { x: 180, y: 390 },
      { x: 320, y: 390 },
      { x: 60, y: 500 },
      { x: 180, y: 500 },
      { x: 320, y: 500 },
    ],
  },
];

/**
 * @param {string} id
 */
export function getMap(id) {
  return MAPS.find((m) => m.id === id) || MAPS[0];
}

/**
 * @param {Pt[]} path
 */
export function pathLengths(path) {
  const lens = [0];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    acc += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    lens.push(acc);
  }
  return lens;
}
