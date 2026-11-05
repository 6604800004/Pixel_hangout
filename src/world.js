// ============================================================================
// world.js — แผนที่ห้อง พื้น ผนัง หน้าต่างตามเวลาจริง การชน และการหาเส้นทาง
// ============================================================================
const W = 512, H = 856, WALL = 58;
// ห้องไหว้พระอยู่ "ข้างบนสุด" เหนือห้องรวม (พิกัด y ติดลบ) — พระต้องอยู่สูงสุดในบ้าน
const TOP = -232;
// ผนังกั้นชั้นล่าง (ห้องประชุม + สวน)
const LOWER_Y = 352, LOWER_FLOOR = 382, DIVIDER_X = 300;
const DOORS = [{ x: 214, w: 32, zone: 'meet' }, { x: 392, w: 32, zone: 'garden' }];
// ชั้นล่างสุด: ห้องคาราโอเกะ (ซ้าย) + ผับ (ขวา) — เข้าผับจากสวน, เข้าคาราโอเกะจากในผับ
const LOWER2_Y = 600, LOWER2_FLOOR = 630, DIVIDER2_X = 256;
const DOOR_PUB = { x: 424, w: 32, y: LOWER2_Y, zone: 'pub' };
const DOOR_KARAOKE = { x: DIVIDER2_X, y: 740, h: 34, zone: 'karaoke', side: true };
const DANCE = { x: 84, y: 692, w: 88, h: 44 };
// ห้องไหว้พระ: อยู่บนสุด เข้าทางประตูที่ผนังด้านบนของห้องรวม
const SHRINE_FLOOR = TOP + 30;
const DOOR_SHRINE = { x: 224, w: 32, y: 0, zone: 'shrine', up: true };
const ALTAR = { x: 192, y: SHRINE_FLOOR, w: 128, h: 76 }; // โต๊ะหมู่บูชา + พระพุทธรูป (ส่วนหนึ่งของห้อง ย้ายไม่ได้)
const PILLARS = [70, 442];
const ZONES = {
  hall: { id: 'hall', name: 'ห้องรวม', icon: '🏠' },
  meet: { id: 'meet', name: 'ห้องประชุม', icon: '🔒' },
  garden: { id: 'garden', name: 'สวน', icon: '🌿' },
  karaoke: { id: 'karaoke', name: 'ห้องคาราโอเกะ', icon: '🎤' },
  pub: { id: 'pub', name: 'ผับ', icon: '🍻' },
  shrine: { id: 'shrine', name: 'ห้องไหว้พระ', icon: '🙏' },
};
function zoneAt(x, y) {
  if (y < 0) return 'shrine';
  if (y < LOWER_Y + 16) return 'hall';
  if (y < LOWER2_Y + 16) return x < DIVIDER_X + 3 ? 'meet' : 'garden';
  return x < DIVIDER2_X + 3 ? 'karaoke' : 'pub';
}
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
  // ---- ห้องประชุม ----
  { t: 'bigScreen', x: 150, y: 404 }, { t: 'whiteboard', x: 44, y: 410 }, { t: 'plant', v: 0, x: 272, y: 404 },
  { t: 'meetChair', x: 112, y: 456, v: 0, f: 0 }, { t: 'meetChair', x: 150, y: 456, v: 1, f: 0 }, { t: 'meetChair', x: 188, y: 456, v: 2, f: 0 },
  { t: 'confTable', x: 150, y: 486 },
  { t: 'meetChair', x: 112, y: 506, v: 3, f: 1 }, { t: 'meetChair', x: 150, y: 506, v: 4, f: 1 }, { t: 'meetChair', x: 188, y: 506, v: 5, f: 1 },
  { t: 'plant', v: 1, x: 20, y: 590 }, { t: 'plant', v: 3, x: 282, y: 590 },
  // ---- สวน ----
  { t: 'flowerBed', v: 0, x: 336, y: 404 }, { t: 'tree', v: 0, x: 348, y: 470 }, { t: 'tree', v: 1, x: 482, y: 446 },
  { t: 'pond', x: 430, y: 530 }, { t: 'bench', x: 350, y: 572 }, { t: 'flowerBed', v: 2, x: 486, y: 590 },
  { t: 'flowerBed', v: 1, x: 486, y: 486 }, { t: 'beanbag', v: 4, x: 400, y: 590 }, { t: 'floorLamp', x: 318, y: 540 },
  // ---- ห้องคาราโอเกะ ----
  { t: 'bigScreen', x: 128, y: 680 }, { t: 'speaker', x: 66, y: 682 }, { t: 'speaker', x: 190, y: 682 },
  { t: 'micStand', x: 106, y: 716 }, { t: 'micStand', x: 150, y: 716 },
  { t: 'coffeeTable', x: 128, y: 782 }, { t: 'sofa', x: 98, y: 816, v: 4, f: 1 }, { t: 'sofa', x: 158, y: 816, v: 1, f: 1 },
  { t: 'beanbag', v: 5, x: 36, y: 780 }, { t: 'beanbag', v: 2, x: 220, y: 790 }, { t: 'plant', v: 2, x: 18, y: 850 }, { t: 'plant', v: 0, x: 238, y: 850 },
  // ---- ผับ ----
  { t: 'bottleShelf', x: 344, y: 666 }, { t: 'bottleShelf', x: 396, y: 666 }, { t: 'barCounter', x: 366, y: 704 },
  { t: 'barStool', x: 326, y: 722 }, { t: 'barStool', x: 352, y: 722 }, { t: 'barStool', x: 378, y: 722 }, { t: 'barStool', x: 404, y: 722 },
  { t: 'tv', x: 482, y: 676 }, { t: 'dartboard', x: 496, y: 760 }, { t: 'poolTable', x: 424, y: 800 },
  { t: 'roundTable', x: 304, y: 800 }, { t: 'armchair', x: 278, y: 806, v: 2 }, { t: 'armchair', x: 330, y: 806, v: 5 },
  { t: 'plant', v: 1, x: 498, y: 850 }, { t: 'floorLamp', x: 270, y: 700 },
  // ---- ห้องไหว้พระ (ข้างบนสุด) ----
  { t: 'prayerMat', x: 216, y: -84 }, { t: 'prayerMat', x: 256, y: -84 }, { t: 'prayerMat', x: 296, y: -84 },
  { t: 'prayerMat', x: 216, y: -44 }, { t: 'prayerMat', x: 256, y: -44 }, { t: 'prayerMat', x: 296, y: -44 },
  { t: 'flowerVase', x: 170, y: -130 }, { t: 'flowerVase', x: 342, y: -130 },
  { t: 'templeBell', x: 120, y: -128 }, { t: 'lotusBowl', x: 44, y: -14 }, { t: 'lotusBowl', x: 468, y: -14 },
  { t: 'plant', v: 0, x: 140, y: -10 }, { t: 'plant', v: 0, x: 372, y: -10 },
  { t: 'offeringTable', x: 160, y: -88 }, { t: 'offeringTable', x: 352, y: -88 },
  { t: 'chantTable', x: 96, y: -48 }, { t: 'chantTable', x: 416, y: -48 },
];
const LAYOUT_VERSION = 5;
const LAYOUT_V2_FROM = 25; // ของชิ้นที่ def25 ขึ้นไปมาในเวอร์ชัน 2 (ห้องประชุม + สวน)
const LAYOUT_V3_FROM = 45; // def45 ขึ้นไปมาในเวอร์ชัน 3 (คาราโอเกะ + ผับ)
const LAYOUT_V4_FROM = 73; // def73 ขึ้นไปมาในเวอร์ชัน 4–5 (ห้องไหว้พระ — v5 ย้ายขึ้นไปอยู่บนสุด)

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
// หน้าต่างในห้องประชุม (บนผนังด้านหน้าห้อง)
const LOWER_WINDOWS = [{ x: 256, y: 360, w: 26, h: 16 }];
const CLOCK = { x: 176, y: 26 };

function buildBackground() {
  const c = mkCanvas(W, H - TOP);
  const g = c.getContext('2d');
  g.translate(0, -TOP); // วาดด้วยพิกัดโลก (รวมส่วนที่ y ติดลบของห้องไหว้พระ)
  const P = painter(g);
  let seed = 11;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  // ---- พื้นไม้ (โซนนั่งเล่น) ----
  const planks = ['#d9a374', '#d29b6b', '#dcaa7c'];
  for (let y = WALL, row = 0; y < LOWER_Y; y += 8, row++) {
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
  for (let y = WALL; y < LOWER_Y; y += 16) {
    for (let x = WORK_X; x < W; x += 16) {
      const alt = ((x - WORK_X) / 16 + (y - WALL) / 16) % 2 === 0;
      P(x, y, 16, 16, alt ? '#a9bdd4' : '#b4c7dc');
      P(x + 3, y + 3, 1, 1, '#9cb0c8'); P(x + 11, y + 9, 1, 1, '#9cb0c8'); P(x + 7, y + 13, 1, 1, '#c2d3e6');
    }
  }
  P(WORK_X - 2, WALL, 3, LOWER_Y - WALL, '#8a6a52');
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
  // ---- ชั้นล่าง: ห้องประชุม (พรมม่วง) ----
  for (let y = LOWER_Y; y < H; y += 12) for (let x = 0; x < DIVIDER_X + 3; x += 12) {
    P(x, y, 12, 12, ((x / 12 + y / 12) | 0) % 2 ? '#cbb8dc' : '#c3afd6');
    P(x + 5, y + 5, 2, 2, '#b8a2cc');
  }
  // ---- ชั้นล่าง: สวน (หญ้า + ทางเดินหิน) ----
  for (let y = LOWER_Y; y < H; y += 4) for (let x = DIVIDER_X + 3; x < W; x += 4) {
    const r = rnd();
    P(x, y, 4, 4, r < 0.5 ? '#92d07c' : r < 0.85 ? '#88c773' : '#9cd886');
    if (r > 0.96) P(x + 1, y + 1, 1, 2, '#6fb25e');
    if (r > 0.993) { P(x, y, 2, 2, ['#ffffff', '#ffe07a', '#ff8fab'][Math.floor(rnd() * 3)]); }
  }
  for (let i = 0; i < 9; i++) {
    const sx = 400 + Math.round(Math.sin(i * 0.9) * 8), sy = LOWER_FLOOR + 4 + i * 13;
    P(sx, sy, 14, 8, '#c8ccd8'); P(sx + 1, sy + 1, 12, 2, '#e2e5ee'); P(sx, sy + 7, 14, 1, '#9aa0b8');
  }
  // ---- ผนังกั้น: หน้าผนังห้องประชุม / รั้วต้นไม้ของสวน ----
  const doorAt = (x) => DOORS.some((d) => x >= d.x && x < d.x + d.w);
  for (let x = 0; x < W; x++) {
    if (doorAt(x)) continue;
    const garden = x >= DIVIDER_X + 3;
    // หน้าผนัง
    if (!garden) {
      P(x, LOWER_Y + 6, 1, LOWER_FLOOR - LOWER_Y - 6, (x % 10) < 4 ? '#e2cfee' : '#eadbf4');
      P(x, LOWER_FLOOR - 6, 1, 6, x % 16 === 8 ? '#8f7aa8' : '#a892c0');
      P(x, LOWER_FLOOR - 7, 1, 1, '#c6b2da');
    } else {
      const k = (x * 7) % 11;
      P(x, LOWER_Y + 6, 1, LOWER_FLOOR - LOWER_Y - 6, k < 5 ? '#4f9a5c' : '#5fae68');
      if (k === 2) P(x, LOWER_Y + 10 + (x % 9), 1, 2, '#8fd694');
      if (k === 7 && x % 3 === 0) P(x, LOWER_Y + 14 + (x % 7), 1, 1, '#ff8fab');
      P(x, LOWER_FLOOR - 3, 1, 3, '#3f7d4a');
    }
    // สันผนัง
    P(x, LOWER_Y, 1, 6, garden ? '#3f7d4a' : '#5a4560');
    P(x, LOWER_Y, 1, 1, garden ? '#5fae68' : '#7a6380');
  }
  // ช่องประตู: พื้นต่อเนื่อง + วงกบ + พรมเช็ดเท้า
  for (const d of DOORS) {
    const garden = d.zone === 'garden';
    for (let y = LOWER_Y; y < LOWER_FLOOR; y += 4) for (let x = d.x; x < d.x + d.w; x += 4) P(x, y, 4, 4, garden ? '#92d07c' : (((x + y) / 4) | 0) % 2 ? '#cbb8dc' : '#c3afd6');
    P(d.x - 2, LOWER_Y, 2, LOWER_FLOOR - LOWER_Y, '#fff6e8'); P(d.x + d.w, LOWER_Y, 2, LOWER_FLOOR - LOWER_Y, '#fff6e8');
    P(d.x - 3, LOWER_Y, 1, LOWER_FLOOR - LOWER_Y, '#c8bba8'); P(d.x + d.w + 2, LOWER_Y, 1, LOWER_FLOOR - LOWER_Y, '#c8bba8');
    P(d.x + 3, LOWER_Y - 9, d.w - 6, 7, garden ? '#8fd694' : '#ff8fab'); P(d.x + 4, LOWER_Y - 8, d.w - 8, 5, garden ? '#a9e6ae' : '#ffc2d2');
  }
  // ผนังกั้นห้องประชุม | สวน
  P(DIVIDER_X, LOWER_Y, 6, H - LOWER_Y, '#5a4560'); P(DIVIDER_X, LOWER_Y, 1, H - LOWER_Y, '#7a6380'); P(DIVIDER_X + 5, LOWER_Y, 1, H - LOWER_Y, '#3a2c3f');
  // ป้ายห้องประชุม
  P(28, LOWER_Y + 9, 40, 11, '#3a3150'); P(30, LOWER_Y + 11, 36, 7, '#5a4f78');
  for (let i = 0; i < 6; i++) P(33 + i * 5, LOWER_Y + 13, 3, 3, '#ffe07a');
  // ================= ชั้นล่างสุด: คาราโอเกะ + ผับ =================
  // พื้นคาราโอเกะ: พรมกรมท่ามีประกายดาว
  for (let y = LOWER2_FLOOR; y < H; y += 8) for (let x = 0; x < DIVIDER2_X + 3; x += 8) {
    P(x, y, 8, 8, ((x / 8 + y / 8) | 0) % 2 ? '#2f2a5a' : '#352f66');
    if (rnd() > 0.9) P(x + 3, y + 3, 1, 1, ['#ff8fab', '#7ec8ff', '#ffe07a'][Math.floor(rnd() * 3)]);
  }
  // ขอบเวทีเต้น
  P(DANCE.x - 3, DANCE.y - 3, DANCE.w + 6, DANCE.h + 6, '#1d1b3a'); P(DANCE.x - 2, DANCE.y - 2, DANCE.w + 4, 1, '#ffe07a');
  // พื้นผับ: ไม้สีเข้ม
  for (let y = LOWER2_FLOOR, row = 0; y < H; y += 8, row++) {
    let x = DIVIDER2_X + 3 - ((row * 19) % 36);
    while (x < W) {
      const len = 26 + Math.floor(rnd() * 22);
      P(Math.max(x, DIVIDER2_X + 3), y, len, 8, ['#7a4e34', '#6f4630', '#84573a'][Math.floor(rnd() * 3)]);
      P(Math.max(x, DIVIDER2_X + 3), y, len, 1, '#946446'); P(x + len - 1, y, 1, 8, '#4f3020');
      x += len;
    }
  }
  // ผนังหน้า (เว้นประตูผับ)
  for (let x = 0; x < W; x++) {
    if (x >= DOOR_PUB.x && x < DOOR_PUB.x + DOOR_PUB.w) continue;
    const pub = x >= DIVIDER2_X + 3;
    if (!pub) {
      P(x, LOWER2_Y + 6, 1, LOWER2_FLOOR - LOWER2_Y - 6, (x % 12) < 6 ? '#3a2f6e' : '#41357a');
      P(x, LOWER2_FLOOR - 4, 1, 4, '#231d47');
    } else {
      const brick = ((x + (((LOWER2_Y + 6) / 6) | 0) * 7) % 14) === 0;
      P(x, LOWER2_Y + 6, 1, LOWER2_FLOOR - LOWER2_Y - 6, '#9a4a3a');
      for (let y = LOWER2_Y + 11; y < LOWER2_FLOOR - 4; y += 6) P(x, y, 1, 1, '#7a3428');
      if (brick) P(x, LOWER2_Y + 6, 1, LOWER2_FLOOR - LOWER2_Y - 10, '#7a3428');
      P(x, LOWER2_FLOOR - 4, 1, 4, '#4f3020');
    }
    P(x, LOWER2_Y, 1, 6, pub ? '#4f3020' : '#231d47');
    P(x, LOWER2_Y, 1, 1, pub ? '#6f4630' : '#3a2f6e');
  }
  // ประตูผับจากสวน
  { const d = DOOR_PUB;
    for (let y = LOWER2_Y; y < LOWER2_FLOOR; y += 4) for (let x = d.x; x < d.x + d.w; x += 4) P(x, y, 4, 4, ((x + y) / 4 | 0) % 2 ? '#7a4e34' : '#84573a');
    P(d.x - 2, LOWER2_Y, 2, LOWER2_FLOOR - LOWER2_Y, '#e0954a'); P(d.x + d.w, LOWER2_Y, 2, LOWER2_FLOOR - LOWER2_Y, '#e0954a');
    P(d.x + 3, LOWER2_Y - 9, d.w - 6, 7, '#ffb86b'); P(d.x + 4, LOWER2_Y - 8, d.w - 8, 5, '#ffd8a8');
  }
  // ผนังกั้นคาราโอเกะ | ผับ (มีประตูตรงกลาง)
  const k = DOOR_KARAOKE;
  P(DIVIDER2_X, LOWER2_Y, 6, k.y - LOWER2_Y, '#231d47'); P(DIVIDER2_X, k.y + k.h, 6, H - k.y - k.h, '#231d47');
  P(DIVIDER2_X, LOWER2_Y, 1, k.y - LOWER2_Y, '#3a2f6e'); P(DIVIDER2_X, k.y + k.h, 1, H - k.y - k.h, '#3a2f6e');
  P(DIVIDER2_X - 1, k.y - 2, 8, 2, '#ff8fab'); P(DIVIDER2_X - 1, k.y + k.h, 8, 2, '#ff8fab');
  // ================= ห้องไหว้พระ =================
  // พื้นไม้สักขัดเงา
  for (let y = SHRINE_FLOOR, row = 0; y < 0; y += 6, row++) {
    let x = -((row * 23) % 40);
    while (x < W) {
      const len = 30 + Math.floor(rnd() * 24);
      P(Math.max(0, x), y, len, 6, ['#b5763f', '#a96c38', '#bd7f46'][Math.floor(rnd() * 3)]);
      P(Math.max(0, x), y, len, 1, '#c98d55'); P(x + len - 1, y, 1, 6, '#8a5428');
      x += len;
    }
  }
  // พรมแดงทางเดินตรงกลาง (จากหน้าโต๊ะหมู่ลงมา) + พรมจากประตู
  P(232, ALTAR.y + ALTAR.h, 48, 0 - ALTAR.y - ALTAR.h, '#a8242e'); P(234, ALTAR.y + ALTAR.h, 44, 0 - ALTAR.y - ALTAR.h, '#c02f38');
  P(232, ALTAR.y + ALTAR.h, 2, 0 - ALTAR.y - ALTAR.h, '#e0b04a'); P(278, ALTAR.y + ALTAR.h, 2, 0 - ALTAR.y - ALTAR.h, '#e0b04a');
  // ผนังขาวครีมขอบทอง ลายกนกเรียบๆ (เว้นประตู)
  for (let x = 0; x < W; x++) {
    P(x, TOP, 1, 6, '#6b3a1f'); P(x, TOP, 1, 1, '#8a5428');
    P(x, TOP + 6, 1, SHRINE_FLOOR - TOP - 6, '#f4ead2');
    P(x, TOP + 8, 1, 2, '#d9a441'); P(x, SHRINE_FLOOR - 6, 1, 2, '#d9a441'); P(x, SHRINE_FLOOR - 4, 1, 4, '#8a5428');
    const k2 = x % 10; if (k2 < 5) P(x, TOP + 12 + Math.abs(2 - k2), 1, 1, '#d9a441');
  }
  // ขอบล่างห้องไหว้พระ (ด้านบนของผนังห้องรวม)
  P(0, -4, W, 4, '#6b3a1f'); P(0, -4, W, 1, '#8a5428');
  // ประตูเข้าห้องไหว้พระ (กรอบทอง)
  // ประตูขึ้นห้องไหว้พระ: เจาะผนังด้านบนของห้องรวม (บันไดไม้ + กรอบทอง)
  { const d = DOOR_SHRINE;
    P(d.x, -4, d.w, WALL + 4, '#a96c38');
    for (let y = -2; y < WALL; y += 6) { P(d.x, y, d.w, 1, '#c98d55'); P(d.x, y + 5, d.w, 1, '#8a5428'); }
    P(d.x + 10, -4, 12, WALL + 4, '#c02f38'); P(d.x + 10, -4, 1, WALL + 4, '#e0b04a'); P(d.x + 21, -4, 1, WALL + 4, '#e0b04a');
    P(d.x - 3, -4, 3, WALL + 4, '#d9a441'); P(d.x + d.w, -4, 3, WALL + 4, '#d9a441');
    P(d.x - 3, -4, 1, WALL + 4, '#f4d27a'); P(d.x + d.w + 2, -4, 1, WALL + 4, '#a8752a');
  }
  // เสาแดงหัวเสาทอง
  for (const px of PILLARS) {
    P(px - 7, SHRINE_FLOOR - 6, 14, 84, '#8f1d26'); P(px - 7, SHRINE_FLOOR - 6, 3, 84, '#b02a33'); P(px + 4, SHRINE_FLOOR - 6, 3, 84, '#6e141b');
    P(px - 9, SHRINE_FLOOR - 8, 18, 6, '#d9a441'); P(px - 9, SHRINE_FLOOR + 72, 18, 6, '#d9a441'); P(px - 8, SHRINE_FLOOR + 6, 16, 2, '#d9a441');
  }
  // ---- โต๊ะหมู่บูชา + พระพุทธรูป ----
  { const cx = 256, top = SHRINE_FLOOR;
    // ฉากหลังแดงขอบทอง
    P(cx - 52, top - 22, 104, 58, '#d9a441'); P(cx - 50, top - 20, 100, 55, '#7a1f24'); P(cx - 46, top - 16, 92, 47, '#8f2a2f');
    for (let i = 0; i < 9; i++) P(cx - 44 + i * 11, top - 14, 2, 2, '#d9a441');
    // โต๊ะหมู่ 3 ชั้น
    const tier = (y, w, h) => { P(cx - w / 2, y, w, h, '#d9a441'); P(cx - w / 2, y, w, 2, '#f4d27a'); P(cx - w / 2, y + h - 2, w, 2, '#a8752a'); P(cx - w / 2 + 3, y + 3, w - 6, h - 6, '#c98f35'); };
    tier(top + 34, 84, 10); tier(top + 44, 106, 12); tier(top + 56, 126, 14);
    for (const lx of [cx - 60, cx + 56]) P(lx, top + 70, 4, 6, '#a8752a');
    // พระพุทธรูปปางสมาธิ (สีทอง)
    const G1 = '#f0c75a', G2 = '#e0ac3c', G3 = '#b98425';
    P(cx - 18, top + 28, 36, 6, G2); P(cx - 18, top + 28, 36, 1, G1); // ฐานบัว
    for (let i = 0; i < 6; i++) P(cx - 17 + i * 6, top + 31, 4, 3, i % 2 ? G3 : G1);
    P(cx - 17, top + 20, 34, 9, G2); P(cx - 17, top + 20, 34, 2, G1);    // ขัดสมาธิ
    P(cx - 12, top + 4, 24, 18, G2); P(cx - 12, top + 4, 4, 18, G1);     // องค์
    P(cx - 4, top + 6, 2, 14, G3);                                       // จีวรเฉียง
    P(cx - 6, top + 18, 12, 4, G1); P(cx - 2, top + 18, 4, 2, G3);       // พระหัตถ์ประสาน
    P(cx - 6, top - 9, 12, 13, G1); P(cx - 7, top - 6, 1, 7, G2); P(cx + 6, top - 6, 1, 7, G2); // พระเศียร
    P(cx - 6, top - 9, 12, 3, G3);                                        // พระเกศา
    P(cx - 2, top - 13, 4, 4, G2); P(cx - 1, top - 17, 2, 4, G1);        // พระเกตุมาลา
    P(cx - 4, top - 3, 3, 1, G3); P(cx + 1, top - 3, 3, 1, G3); P(cx - 1, top + 1, 2, 1, G3); // หลับตาสงบ
    P(cx - 3, top + 3, 6, 2, G2);                                         // พระศอ
    // แจกัน พวงมาลัย บนชั้นกลาง
    for (const fx of [cx - 46, cx + 42]) { P(fx, top + 48, 4, 6, '#f4ead2'); P(fx - 1, top + 44, 6, 4, '#ffb03a'); P(fx, top + 43, 1, 1, '#ffd34d'); P(fx + 3, top + 44, 1, 1, '#ff8f2a'); }
    // เชิงเทียน 2 ข้าง + กระถางธูป (เปลวไฟ/ควันวาดแบบเคลื่อนไหว)
    for (const kx of [cx - 32, cx + 30]) { P(kx - 1, top + 41, 4, 3, '#d9a441'); P(kx, top + 32, 2, 9, '#fff6e0'); }
    P(cx - 6, top + 48, 12, 6, '#7a4a2a'); P(cx - 7, top + 47, 14, 2, '#a8752a');
    for (const ix of [cx - 3, cx, cx + 3]) P(ix, top + 40, 1, 8, '#b0413a');
    // พวงมาลัยห้อยหน้าโต๊ะ
    for (let i = 0; i < 12; i++) P(cx - 60 + i * 10 + 3, top + 72 + (i % 2), 4, 3, i % 3 ? '#fff6e0' : '#ff9a3a');
  }
  // ---- ขอบห้อง ----
  P(0, TOP, 3, H - TOP, '#3a2c3f'); P(W - 3, TOP, 3, H - TOP, '#3a2c3f'); P(0, H - 3, W, 3, '#3a2c3f'); P(0, TOP, W, 3, '#3a2c3f');
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
  for (const w of LOWER_WINDOWS) {
    ctx.fillStyle = '#fff6e8'; ctx.fillRect(w.x - 2, w.y - 2, w.w + 4, w.h + 4);
    const gr = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
    gr.addColorStop(0, sky.top); gr.addColorStop(1, sky.bot);
    ctx.fillStyle = gr; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#fff6e8'; ctx.fillRect(w.x + w.w / 2 - 1, w.y, 2, w.h);
  }
  // ---- คาราโอเกะ: ป้ายนีออน + ลูกบอลดิสโก้ + พื้นเต้นไฟวิบวับ ----
  const neon = ['#ff5fa2', '#5fd8ff', '#ffe066', '#b47dff'];
  const on = Math.floor(t * 2) % 6 !== 0;
  ctx.fillStyle = on ? neon[Math.floor(t / 2) % 4] : '#5a4f78';
  for (let i = 0; i < 7; i++) ctx.fillRect(18 + i * 9, LOWER2_Y + 12, 6, 2), ctx.fillRect(18 + i * 9, LOWER2_Y + 18, 6, 2), ctx.fillRect(18 + i * 9 + (i % 2) * 4, LOWER2_Y + 14, 2, 4);
  const bx = 128, by = LOWER2_Y + 16;
  ctx.fillStyle = '#9aa0b8'; ctx.fillRect(bx, LOWER2_Y + 6, 1, 4);
  ctx.fillStyle = '#c8ccd8'; ctx.fillRect(bx - 4, by - 5, 9, 10); ctx.fillRect(bx - 5, by - 3, 11, 6);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = neon[(i + Math.floor(t * 4)) % 4]; ctx.fillRect(bx - 4 + ((i * 3) % 9), by - 4 + ((i * 5) % 8), 2, 2); }
  for (let gy = 0; gy < DANCE.h; gy += 11) for (let gx = 0; gx < DANCE.w; gx += 11) {
    const k2 = (gx / 11 + gy / 11 + Math.floor(t * 3)) % 4;
    ctx.fillStyle = neon[k2]; ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 4 + gx);
    ctx.fillRect(DANCE.x + gx, DANCE.y + gy, 10, 10);
  }
  ctx.globalAlpha = 1;
  // ---- ห้องไหว้พระ: รัศมีทอง + เปลวเทียน + ควันธูป ----
  { const cx = 256, top = SHRINE_FLOOR;
    const glow = ctx.createRadialGradient(cx, top - 2, 2, cx, top - 2, 26);
    glow.addColorStop(0, `rgba(255,226,140,${0.45 + 0.08 * Math.sin(t * 1.5)})`); glow.addColorStop(1, 'rgba(255,226,140,0)');
    ctx.fillStyle = glow; ctx.fillRect(cx - 26, top - 28, 52, 52);
    for (const [i, kx] of [[0, cx - 32], [1, cx + 30]]) {
      const f = Math.sin(t * 9 + i * 2) > 0 ? 1 : 0;
      ctx.fillStyle = '#ffb03a'; ctx.fillRect(kx, top + 29 - f, 2, 3 + f);
      ctx.fillStyle = '#fff2a8'; ctx.fillRect(kx, top + 30, 1, 2);
      ctx.fillStyle = 'rgba(255,200,90,0.18)'; ctx.fillRect(kx - 3, top + 25, 8, 9);
    }
    ctx.fillStyle = '#ff5a2a'; for (const ix of [cx - 3, cx, cx + 3]) ctx.fillRect(ix, top + 39, 1, 1);
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.35 + i / 3) % 1;
      ctx.fillStyle = `rgba(230,225,215,${0.5 * (1 - ph)})`;
      ctx.fillRect(Math.round(cx + Math.sin(ph * 7 + i) * 3) - 1, Math.round(top + 38 - ph * 26), 2, 2);
    }
  }
  // ---- ผับ: ป้ายนีออน PUB ----
  ctx.fillStyle = Math.floor(t * 1.3) % 7 ? '#ffb86b' : '#7a4e34';
  const px = 470, py = LOWER2_Y + 10;
  ctx.fillRect(px, py, 2, 12); ctx.fillRect(px, py, 6, 2); ctx.fillRect(px + 5, py, 2, 6); ctx.fillRect(px, py + 5, 6, 2);
  ctx.fillRect(px + 10, py, 2, 12); ctx.fillRect(px + 15, py, 2, 12); ctx.fillRect(px + 10, py + 10, 7, 2);
  ctx.fillRect(px + 20, py, 2, 12); ctx.fillRect(px + 20, py, 6, 2); ctx.fillRect(px + 20, py + 5, 6, 2); ctx.fillRect(px + 20, py + 10, 7, 2); ctx.fillRect(px + 25, py + 1, 2, 4); ctx.fillRect(px + 26, py + 6, 2, 5);
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
    const fw = d.fw || d.w - 2;
    list.push({ x: it.x - fw / 2, y: it.y - d.foot, w: fw, h: d.foot });
  }
  for (const s of DESK_SLOTS) list.push({ x: s.x - 19, y: s.y - 14, w: 38, h: 14 });
  // ผนังชั้นล่าง (เว้นช่องประตู)
  let x0 = 0;
  for (const d of [...DOORS].sort((a, b) => a.x - b.x)) { list.push({ x: x0, y: LOWER_Y - 2, w: d.x - x0, h: LOWER_FLOOR - LOWER_Y + 2 }); x0 = d.x + d.w; }
  list.push({ x: x0, y: LOWER_Y - 2, w: W - x0, h: LOWER_FLOOR - LOWER_Y + 2 });
  list.push({ x: DIVIDER_X - 1, y: LOWER_Y - 2, w: 8, h: LOWER2_Y - LOWER_Y + 2 });
  // ผนังชั้นล่างสุด (เว้นประตูผับ) + ผนังกั้นคาราโอเกะ|ผับ (เว้นประตู)
  list.push({ x: 0, y: LOWER2_Y - 2, w: DOOR_PUB.x, h: LOWER2_FLOOR - LOWER2_Y + 2 });
  list.push({ x: DOOR_PUB.x + DOOR_PUB.w, y: LOWER2_Y - 2, w: W - DOOR_PUB.x - DOOR_PUB.w, h: LOWER2_FLOOR - LOWER2_Y + 2 });
  list.push({ x: DIVIDER2_X - 1, y: LOWER2_Y - 2, w: 8, h: DOOR_KARAOKE.y - LOWER2_Y + 2 });
  list.push({ x: DIVIDER2_X - 1, y: DOOR_KARAOKE.y + DOOR_KARAOKE.h, w: 8, h: H - DOOR_KARAOKE.y - DOOR_KARAOKE.h });
  // ผนังด้านบนของห้องรวม = ผนังกั้นห้องไหว้พระ (เว้นประตู) + โต๊ะหมู่บูชา + เสา
  list.push({ x: 0, y: -6, w: DOOR_SHRINE.x, h: WALL + 6 });
  list.push({ x: DOOR_SHRINE.x + DOOR_SHRINE.w, y: -6, w: W - DOOR_SHRINE.x - DOOR_SHRINE.w, h: WALL + 6 });
  list.push({ x: ALTAR.x - 4, y: SHRINE_FLOOR, w: ALTAR.w + 8, h: ALTAR.h });
  for (const px of PILLARS) list.push({ x: px - 9, y: SHRINE_FLOOR, w: 18, h: 78 });
  return list;
}
function hitsRects(rects, x, y) {
  if (x < 9 || x > W - 9 || y < SHRINE_FLOOR + 5 || y > H - 5) return true;
  for (const r of rects) if (x + 5 > r.x && x - 5 < r.x + r.w && y + 2 > r.y && y - 3 < r.y + r.h) return true;
  return false;
}

// ---------- หาเส้นทาง (A* บนตาราง 4px) ----------
const CELL = 4, GW = W / CELL, GH = (H - TOP) / CELL; // แถวที่ 0 = y TOP
function buildGrid(rects) {
  const grid = new Uint8Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) grid[gy * GW + gx] = hitsRects(rects, gx * CELL + 2, gy * CELL + 2 + TOP) ? 1 : 0;
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
  let s = toCell(sy - TOP, GH) * GW + toCell(sx, GW);
  let goal = toCell(ty - TOP, GH) * GW + toCell(tx, GW);
  const prefix = [];
  if (grid[s]) {
    // เริ่มจากในเฟอร์นิเจอร์ (เช่นเพิ่งลุกจากโซฟา): ออกไปช่องว่างใกล้สุดก่อน
    const f = nearestFree(s);
    if (f < 0) return null;
    s = f;
    prefix.push({ x: (f % GW) * CELL + 2, y: ((f / GW) | 0) * CELL + 2 + TOP });
  }
  if (grid[goal]) {
    // เป้าหมายอยู่ในของ: หาช่องว่างที่ใกล้ที่สุด
    const best = nearestFree(goal);
    if (best < 0) return null;
    goal = best;
  }
  if (s === goal) return prefix.concat([{ x: (goal % GW) * CELL + 2, y: ((goal / GW) | 0) * CELL + 2 + TOP }]);
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
  while (heap.length && iter++ < 60000) {
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
  const pts = cells.map((c) => ({ x: (c % GW) * CELL + 2, y: ((c / GW) | 0) * CELL + 2 + TOP }));
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
    d.seats(it.f || 0).forEach((s, i) => seats.push({ id: `${it.id}:${i}`, x: it.x + s.dx, y: it.y + s.dy, dir: s.dir, kind: 'furn', over: !!s.over, itemY: it.y, pray: it.t === 'prayerMat' }));
  }
  for (const s of DESK_SLOTS) seats.push({ id: `desk:${s.id}`, x: s.x, y: s.y + CHAIR_DY - 3, dir: 'up', kind: 'desk', slot: s.id, over: true, itemY: s.y + CHAIR_DY });
  return seats;
}
