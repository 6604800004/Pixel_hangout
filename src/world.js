// ============================================================================
// world.js — แผนที่ห้อง พื้น ผนัง หน้าต่างตามเวลาจริง การชน และการหาเส้นทาง
// ============================================================================
const W = 512, H = 352, WALL = 58;
const WORK_X = 256;
const KITCHEN = { x: 4, y: 262, w: 132, h: 86 };
const DESK_SLOTS = [
  { id: 'd1', x: 300, y: 114 }, { id: 'd2', x: 366, y: 114 }, { id: 'd3', x: 432, y: 114 },
  { id: 'd4', x: 300, y: 200 }, { id: 'd5', x: 366, y: 200 }, { id: 'd6', x: 432, y: 200 },
];
const CHAIR_DY = 14;
const DEFAULT_LAYOUT = [
  { t: 'bookshelf', x: 30, y: 86 }, { t: 'plant', v: 0, x: 60, y: 80 }, { t: 'tv', x: 124, y: 88 },
  { t: 'plant', v: 3, x: 166, y: 80 }, { t: 'arcade', x: 200, y: 92, v: 0 }, { t: 'rug', v: 0, x: 124, y: 156 },
  { t: 'coffeeTable', x: 124, y: 136 }, { t: 'sofa', x: 124, y: 182, v: 0, f: 1 }, { t: 'beanbag', x: 74, y: 152, v: 1 },
  { t: 'beanbag', x: 176, y: 152, v: 3 }, { t: 'floorLamp', x: 230, y: 176 }, { t: 'catBed', x: 44, y: 214 },
  { t: 'fishTank', x: 206, y: 240 }, { t: 'plant', v: 1, x: 16, y: 252 }, { t: 'fridge', x: 22, y: 300 },
  { t: 'counter', x: 60, y: 300 }, { t: 'roundTable', x: 92, y: 334 }, { t: 'whiteboard', x: 488, y: 96 },
  { t: 'plant', v: 2, x: 270, y: 78 }, { t: 'rug', v: 1, x: 384, y: 308 }, { t: 'roundTable', x: 384, y: 306 },
  { t: 'armchair', x: 352, y: 312, v: 1 }, { t: 'armchair', x: 416, y: 312, v: 4 }, { t: 'plant', v: 0, x: 496, y: 342 },
  { t: 'plant', v: 1, x: 236, y: 342 },
];

// ---------- ท้องฟ้าตามเวลาจริงของคนดู ----------
function skyAt(date) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 6 && h < 8) return { top: '#ffb38a', bot: '#ffe1a8', night: 0.1, sun: true };
  if (h >= 8 && h < 16.5) return { top: '#7ec4ff', bot: '#cfeaff', night: 0, sun: true };
  if (h >= 16.5 && h < 18.5) return { top: '#ff8f7a', bot: '#ffd08a', night: 0.12, sun: true };
  if (h >= 18.5 && h < 19.5) return { top: '#6a5aa8', bot: '#f29ab4', night: 0.22, sun: false };
  return { top: '#1d1b45', bot: '#3a3a78', night: 0.34, sun: false };
}

const WINDOWS = [{ x: 74, y: 10, w: 38, h: 30 }, { x: 302, y: 10, w: 38, h: 30 }, { x: 382, y: 10, w: 38, h: 30 }];
const CLOCK = { x: 238, y: 26 };

function buildBackground() {
  const c = mkCanvas(W, H);
  const g = c.getContext('2d');
  const P = painter(g);
  let seed = 11;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  // ---- พื้นไม้ (โซนนั่งเล่น) ----
  const planks = ['#d9a374', '#d29b6b', '#dcaa7c'];
  for (let y = WALL, row = 0; y < H; y += 8, row++) {
    let x = -((row * 23) % 40);
    while (x < WORK_X) {
      const len = 30 + Math.floor(rnd() * 26);
      P(x, y, len, 8, planks[Math.floor(rnd() * 3)]);
      P(x, y, len, 1, '#e4b58a');
      P(x + len - 1, y, 1, 8, '#b98457');
      if (rnd() > 0.5) P(x + 6 + Math.floor(rnd() * (len - 12)), y + 3 + Math.floor(rnd() * 3), 3, 1, '#c68f60');
      x += len;
    }
    P(0, y + 7, WORK_X, 1, '#bd8759');
  }
  // ---- พรมปูพื้น (โซนทำงาน) ----
  for (let y = WALL; y < H; y += 16) {
    for (let x = WORK_X; x < W; x += 16) {
      const alt = ((x - WORK_X) / 16 + (y - WALL) / 16) % 2 === 0;
      P(x, y, 16, 16, alt ? '#a9bdd4' : '#b4c7dc');
      P(x + 3, y + 3, 1, 1, '#9cb0c8'); P(x + 11, y + 9, 1, 1, '#9cb0c8'); P(x + 7, y + 13, 1, 1, '#c2d3e6');
    }
  }
  P(WORK_X - 2, WALL, 3, H - WALL, '#8a6a52');
  // ---- กระเบื้องครัว ----
  for (let y = KITCHEN.y; y < KITCHEN.y + KITCHEN.h; y += 10) {
    for (let x = KITCHEN.x; x < KITCHEN.x + KITCHEN.w; x += 10) {
      P(x, y, 10, 10, ((x / 10 + y / 10) | 0) % 2 ? '#f4ebdd' : '#e6d6c2');
    }
  }
  P(KITCHEN.x, KITCHEN.y, KITCHEN.w, 1, '#c8b49a'); P(KITCHEN.x + KITCHEN.w, KITCHEN.y, 1, KITCHEN.h, '#c8b49a');
  // ---- ผนัง ----
  P(0, 0, WORK_X, WALL, '#f2d3c0');
  for (let x = 4; x < WORK_X; x += 10) P(x, 0, 4, 38, '#ecc7b2');
  for (let x = 6; x < WORK_X; x += 20) for (let y = 6; y < 36; y += 12) P(x, y, 1, 1, '#ffffff');
  P(WORK_X, 0, W - WORK_X, WALL, '#cfe0f0');
  for (let x = WORK_X + 4; x < W; x += 10) P(x, 0, 4, 38, '#c3d6ea');
  P(0, 38, WORK_X, 14, WOOD.m); P(0, 38, WORK_X, 2, WOOD.l); for (let x = 8; x < WORK_X; x += 16) P(x, 42, 1, 8, WOOD.d);
  P(WORK_X, 38, W - WORK_X, 14, '#93abc9'); P(WORK_X, 38, W - WORK_X, 2, '#b4c8e0'); for (let x = WORK_X + 8; x < W; x += 16) P(x, 42, 1, 8, '#7d95b4');
  P(0, 52, W, 6, '#7a5236'); P(0, 52, W, 1, '#9a6a48');
  P(WORK_X - 4, 0, 8, WALL, '#e6dccd'); P(WORK_X - 4, 0, 1, WALL, '#fff6e8'); P(WORK_X + 3, 0, 1, WALL, '#c8bba8');
  // ---- กรอบหน้าต่าง (ท้องฟ้าวาดสดทุกเฟรม) ----
  for (const w of WINDOWS) {
    P(w.x - 3, w.y - 3, w.w + 6, w.h + 6, '#fff6e8'); P(w.x - 3, w.y - 3, w.w + 6, 1, '#ffffff');
    P(w.x - 5, w.y + w.h + 2, w.w + 10, 3, '#e6dccd');
    P(w.x - 6, w.y - 6, 4, w.h + 8, '#ff8fab'); P(w.x + w.w + 2, w.y - 6, 4, w.h + 8, '#ff8fab');
    P(w.x - 7, w.y - 7, w.w + 14, 2, '#c96a8a');
  }
  // ---- โปสเตอร์แมว ----
  P(186, 10, 22, 26, '#2e2235'); P(187, 11, 20, 24, '#fff6e8'); P(189, 13, 16, 15, '#8fd0f0');
  P(192, 18, 10, 9, '#f2a65a'); P(192, 16, 2, 2, '#f2a65a'); P(200, 16, 2, 2, '#f2a65a'); P(194, 21, 1, 1, '#2e2235'); P(199, 21, 1, 1, '#2e2235'); P(196, 23, 2, 1, '#ff8fab');
  P(190, 30, 14, 2, '#e8505b');
  // ---- บอร์ดก๊อก (โซนทำงาน) ----
  P(440, 10, 34, 26, '#9a6438'); P(442, 12, 30, 22, '#d6a46a');
  P(445, 15, 7, 7, '#ffe07a'); P(455, 14, 7, 6, '#ff8fab'); P(464, 16, 6, 7, '#8fd694'); P(447, 24, 8, 7, '#ffffff'); P(458, 23, 9, 8, '#6cc6d9');
  for (const [x, y] of [[448, 15], [458, 14], [466, 16], [450, 24], [462, 23]]) P(x, y, 1, 1, '#e8505b');
  // ---- ป้ายห้อง ----
  P(268, 16, 26, 10, '#3a3150'); P(270, 18, 22, 6, '#5a4f78');
  // ---- นาฬิกา ----
  const cx = CLOCK.x, cy = CLOCK.y;
  for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) {
    const d = x * x + y * y;
    if (d <= 81) P(cx + x, cy + y, 1, 1, d > 64 ? '#9a6438' : '#fff6e8');
  }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; P(Math.round(cx + Math.sin(a) * 6), Math.round(cy - Math.cos(a) * 6), 1, 1, '#c8b49a'); }
  // ---- ขอบห้อง ----
  P(0, 0, 3, H, '#3a2c3f'); P(W - 3, 0, 3, H, '#3a2c3f'); P(0, H - 3, W, 3, '#3a2c3f');
  return c;
}

function drawLiveWall(ctx, now, t) {
  const sky = skyAt(now);
  for (const w of WINDOWS) {
    const gr = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
    gr.addColorStop(0, sky.top); gr.addColorStop(1, sky.bot);
    ctx.fillStyle = gr; ctx.fillRect(w.x, w.y, w.w, w.h);
    if (sky.sun) {
      ctx.fillStyle = '#fff6c8'; ctx.fillRect(w.x + 26, w.y + 5, 6, 6); ctx.fillRect(w.x + 25, w.y + 6, 8, 4);
      ctx.fillStyle = '#ffffff';
      const cx = w.x + ((Math.floor(t * 2 + w.x) % (w.w + 16)) - 12);
      ctx.fillRect(cx, w.y + 15, 10, 3); ctx.fillRect(cx + 2, w.y + 13, 5, 2);
    } else {
      ctx.fillStyle = '#fff6c8'; ctx.fillRect(w.x + 26, w.y + 4, 6, 6); ctx.fillStyle = sky.top; ctx.fillRect(w.x + 28, w.y + 3, 5, 5);
      ctx.fillStyle = '#ffffff';
      for (const [sx, sy] of [[5, 6], [14, 3], [10, 14], [20, 10], [31, 18], [4, 21], [17, 22]]) {
        if ((Math.floor(t * 2) + sx) % 5) ctx.fillRect(w.x + sx, w.y + sy, 1, 1);
      }
    }
    ctx.fillStyle = '#fff6e8'; ctx.fillRect(w.x + w.w / 2 - 1, w.y, 2, w.h); ctx.fillRect(w.x, w.y + w.h / 2 - 1, w.w, 2);
  }
  // เข็มนาฬิกา
  const hrs = (now.getHours() % 12) + now.getMinutes() / 60;
  const hand = (a, len, col) => {
    ctx.fillStyle = col;
    for (let i = 0; i <= len; i++) ctx.fillRect(Math.round(CLOCK.x + Math.sin(a) * i), Math.round(CLOCK.y - Math.cos(a) * i), 1, 1);
  };
  hand((hrs / 12) * Math.PI * 2, 4, '#2e2235');
  hand((now.getMinutes() / 60) * Math.PI * 2, 6, '#5a4f78');
  ctx.fillStyle = '#e8505b'; ctx.fillRect(CLOCK.x, CLOCK.y, 1, 1);
  return sky;
}

// ---------- การชน ----------
function solidRects(furniture) {
  const list = [];
  for (const it of furniture) {
    const d = FURN[it.t];
    if (!d || !d.solid) continue;
    const fw = d.w - 2;
    list.push({ x: it.x - fw / 2, y: it.y - d.foot, w: fw, h: d.foot });
  }
  for (const s of DESK_SLOTS) list.push({ x: s.x - 19, y: s.y - 14, w: 38, h: 14 });
  return list;
}
function hitsRects(rects, x, y) {
  if (x < 9 || x > W - 9 || y < WALL + 5 || y > H - 5) return true;
  for (const r of rects) if (x + 5 > r.x && x - 5 < r.x + r.w && y + 2 > r.y && y - 3 < r.y + r.h) return true;
  return false;
}

// ---------- หาเส้นทาง (A* บนตาราง 4px) ----------
const CELL = 4, GW = W / CELL, GH = H / CELL;
function buildGrid(rects) {
  const grid = new Uint8Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) grid[gy * GW + gx] = hitsRects(rects, gx * CELL + 2, gy * CELL + 2) ? 1 : 0;
  return grid;
}
function findPath(grid, sx, sy, tx, ty) {
  const toCell = (v, max) => Math.max(0, Math.min(max - 1, Math.floor(v / CELL)));
  const nearestFree = (cell) => {
    const gx0 = cell % GW, gy0 = (cell / GW) | 0;
    let best = -1, bd = 1e9;
    for (let r = 1; r < 14 && best < 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = gx0 + dx, y = gy0 + dy;
      if (x < 0 || y < 0 || x >= GW || y >= GH || grid[y * GW + x]) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = y * GW + x; }
    }
    return best;
  };
  let s = toCell(sy, GH) * GW + toCell(sx, GW);
  let goal = toCell(ty, GH) * GW + toCell(tx, GW);
  const prefix = [];
  if (grid[s]) {
    // เริ่มจากในเฟอร์นิเจอร์ (เช่นเพิ่งลุกจากโซฟา): ออกไปช่องว่างใกล้สุดก่อน
    const f = nearestFree(s);
    if (f < 0) return null;
    s = f;
    prefix.push({ x: (f % GW) * CELL + 2, y: ((f / GW) | 0) * CELL + 2 });
  }
  if (grid[goal]) {
    // เป้าหมายอยู่ในของ: หาช่องว่างที่ใกล้ที่สุด
    const best = nearestFree(goal);
    if (best < 0) return null;
    goal = best;
  }
  if (s === goal) return prefix.concat([{ x: (goal % GW) * CELL + 2, y: ((goal / GW) | 0) * CELL + 2 }]);
  const N = GW * GH;
  const gScore = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap = [];
  const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const gx = goal % GW, gyy = (goal / GW) | 0;
  const hfn = (i) => { const dx = Math.abs((i % GW) - gx), dy = Math.abs(((i / GW) | 0) - gyy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  gScore[s] = 0; push(s, hfn(s));
  let iter = 0;
  while (heap.length && iter++ < 20000) {
    const [, cur] = pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % GW, cy = (cur / GW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const ni = ny * GW + nx;
      if (grid[ni] && ni !== s) continue;
      if (dx && dy && (grid[cy * GW + nx] || grid[ny * GW + cx])) continue;
      const ng = gScore[cur] + (dx && dy ? 1.414 : 1);
      if (ng < gScore[ni]) { gScore[ni] = ng; came[ni] = cur; push(ni, ng + hfn(ni)); }
    }
  }
  if (came[goal] < 0 && goal !== s) return null;
  const cells = [];
  for (let c = goal; c !== -1 && c !== s; c = came[c]) cells.push(c);
  cells.reverse();
  // ลดจุดที่เรียงเป็นเส้นตรง
  const pts = cells.map((c) => ({ x: (c % GW) * CELL + 2, y: ((c / GW) | 0) * CELL + 2 }));
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = out[out.length - 1], b = pts[i], n = pts[i + 1];
    if (a && n && Math.sign(b.x - a.x) === Math.sign(n.x - b.x) && Math.sign(b.y - a.y) === Math.sign(n.y - b.y) && (b.x - a.x) * (n.y - b.y) === (b.y - a.y) * (n.x - b.x)) continue;
    out.push(b);
  }
  if (out.length) out[out.length - 1] = { x: Math.abs(tx - out[out.length - 1].x) < 4 ? tx : out[out.length - 1].x, y: Math.abs(ty - out[out.length - 1].y) < 4 ? ty : out[out.length - 1].y };
  return prefix.concat(out);
}

// ---------- ที่นั่ง ----------
function allSeats(furniture) {
  const seats = [];
  for (const it of furniture) {
    const d = FURN[it.t];
    if (!d || !d.seats) continue;
    d.seats(it.f || 0).forEach((s, i) => seats.push({ id: `${it.id}:${i}`, x: it.x + s.dx, y: it.y + s.dy, dir: s.dir, kind: 'furn' }));
  }
  for (const s of DESK_SLOTS) seats.push({ id: `desk:${s.id}`, x: s.x, y: s.y + CHAIR_DY - 3, dir: 'up', kind: 'desk', slot: s.id });
  return seats;
}
