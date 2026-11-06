// ============================================================================
// sprites.js — พิกเซลอาร์ตทั้งหมดวาดด้วยโค้ด (ไม่ต้องโหลดรูป) แล้วแคชไว้
// ============================================================================
// เส้นขอบทั้งเกม: น้ำตาลแดงเข้ม (นุ่มกว่าสีดำ เข้ากับงานพิกเซลแบบอบอุ่น)
const OUTLINE = '#4a2430';
const OUT_RGB = [0x4a, 0x24, 0x30];

const SKINS = ['#ffe6cf', '#f8cba3', '#e3a878', '#b8794e', '#7c4c30'];
const HAIR_COLORS = ['#3a2c3f', '#6b4430', '#b0703c', '#f0c96b', '#f08a6c', '#f5a3c7', '#8bb8f0', '#a98bf0', '#f4efe6', '#5cc39a', '#1c1c24', '#8a8a96', '#e8505b', '#ff9a3c', '#4a6cd0', '#2fa0a0'];
const CLOTH_COLORS = ['#ff8fab', '#ffb86b', '#ffe07a', '#8fd694', '#6cc6d9', '#7d9cf0', '#b48cf0', '#f4f1e8', '#5a5f7a', '#e8505b', '#3fa37a', '#c8a27a', '#2e2a3a', '#ffffff', '#ff6bd5', '#00b3a4', '#a33b54', '#3b4f8f', '#d6c3a5', '#8c6a4f'];
// ⭐ = เฉพาะแอดมิน (เซิร์ฟเวอร์ตัดออกถ้าคนทั่วไปใส่)
const HAIR_STYLES = [['short', 'สั้น'], ['long', 'ยาว'], ['bob', 'บ็อบ'], ['spiky', 'ชี้ฟู'], ['bun', 'จุก'], ['twin', 'แกละ'], ['curly', 'หยิก'], ['ponytail', 'หางม้า'], ['mohawk', 'โมฮอว์ก'], ['afro', 'แอฟโฟร'], ['side', 'ปัดข้าง'], ['buzz', 'เกรียน'], ['wavy', 'ลอนยาว'], ['rainbow', '⭐ ผมรุ้ง']];
const TOPS = [['tee', 'เสื้อยืด'], ['hoodie', 'ฮู้ด'], ['dress', 'เดรส'], ['shirt', 'เชิ้ต+ไทด์'], ['overall', 'เอี๊ยม'], ['jacket', 'แจ็กเก็ต'], ['stripe', 'เสื้อลาย'], ['tank', 'เสื้อกล้าม'], ['suit', 'สูท'], ['sweater', 'คอเต่า'], ['swim', 'ชุดว่ายน้ำ'], ['bikini', 'บิกินี่'], ['royal', '⭐ ชุดราชา'], ['princess', '⭐ ชุดเจ้าหญิง'], ['racer', '⭐ ชุดนักแข่ง']];
const ACCS = [['none', 'ไม่มี'], ['glasses', 'แว่น'], ['shades', 'แว่นดำ'], ['cap', 'แก๊ป'], ['beanie', 'บีนนี่'], ['cat', 'หูแมว'], ['bunny', 'หูกระต่าย'], ['flower', 'ดอกไม้'], ['bow', 'โบว์'], ['headphones', 'หูฟัง'], ['crown', 'มงกุฎ'], ['halo', 'วงแหวน'], ['wings', '⭐ ปีกนางฟ้า'], ['racehelmet', '⭐ หมวกนักแข่ง']];
const PETS = [['none', 'ไม่มี'], ['cat', 'แมว'], ['dog', 'หมา'], ['chick', 'ลูกเจี๊ยบ'], ['slime', 'สไลม์'], ['bunny', 'กระต่าย'], ['fish', 'ปลา'], ['dino', 'ไดโนเสาร์'], ['trex', '🦖 ที-เร็กซ์'], ['panda', 'หมีแพนด้า'], ['fox', 'จิ้งจอก'], ['penguin', 'เพนกวิน'], ['duck', 'เป็ด'], ['hamster', 'แฮมสเตอร์'], ['goose', 'ห่าน'], ['cow', 'วัว'], ['sheep', 'แกะ'], ['mallard', 'เป็ดหัวเขียว'], ['hen', 'แม่ไก่'], ['rooster', 'ไก่ตัวผู้'], ['pig', 'หมู'], ['goat', 'แพะ'], ['dragon', '⭐ มังกร'], ['unicorn', '⭐ ยูนิคอร์น'], ['cloud', '⭐ ก้อนเมฆ'], ['f1', '⭐ รถ F1']];
const ADMIN_ONLY = { hair: ['rainbow'], top: ['royal', 'princess', 'racer'], acc: ['wings', 'racehelmet'], pet: ['dragon', 'unicorn', 'cloud', 'f1'] };
// สีสัตว์เลี้ยง: ช่องแรก = สีธรรมชาติของแต่ละชนิด
const PET_COLORS = [null, '#f2a65a', '#c08552', '#8a8a9a', '#f4efe6', '#3a3150', '#ff8fab', '#7d9cf0', '#7ed37a', '#b48cf0', '#ffe07a', '#6cc6d9', '#e8505b', '#1c1c24', '#ff6bd5', '#00b3a4'];
// สี: เลือกจากชุดสี (เลข) หรือกำหนดเอง (#rrggbb)
const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const colOf = (v, pal) => (isHex(v) ? v.toLowerCase() : pal[v]);
const SEXES = [['m', 'ชาย'], ['f', 'หญิง']];
const DEFAULT_LOOK = { sex: 'm', skin: 1, hair: 'short', hc: 0, top: 'hoodie', tc: 5, bc: 8, acc: 'none', pet: 'none', pc: 0 };

function cleanLook(l) {
  const o = { ...DEFAULT_LOOK };
  if (!l || typeof l !== 'object') return o;
  const inRange = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
  const okCol = (v, n) => inRange(v, n) || isHex(v);
  if (inRange(l.skin, SKINS.length)) o.skin = l.skin;
  if (okCol(l.hc, HAIR_COLORS.length)) o.hc = isHex(l.hc) ? l.hc.toLowerCase() : l.hc;
  if (okCol(l.tc, CLOTH_COLORS.length)) o.tc = isHex(l.tc) ? l.tc.toLowerCase() : l.tc;
  if (okCol(l.bc, CLOTH_COLORS.length)) o.bc = isHex(l.bc) ? l.bc.toLowerCase() : l.bc;
  if (HAIR_STYLES.some((h) => h[0] === l.hair)) o.hair = l.hair;
  if (TOPS.some((h) => h[0] === l.top)) o.top = l.top;
  if (ACCS.some((h) => h[0] === l.acc)) o.acc = l.acc;
  if (PETS.some((h) => h[0] === l.pet)) o.pet = l.pet;
  if (l.sex === 'f' || l.sex === 'm') o.sex = l.sex;
  if (inRange(l.pc, PET_COLORS.length) || isHex(l.pc)) o.pc = isHex(l.pc) ? l.pc.toLowerCase() : l.pc;
  for (const k of ['k1', 'k2']) if (okCol(l[k], CLOTH_COLORS.length)) o[k] = isHex(l[k]) ? l[k].toLowerCase() : l[k]; // สีลายรถ F1
  return o;
}

// ---------- ยูทิลสี / แคนวาส ----------
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
// เติมเส้นขอบเข้มรอบพิกเซลที่ทึบ (ทำให้ทุกอย่างดูเป็นสไตล์เดียวกัน)
function addOutline(c, rgb = OUT_RGB) {
  const g = c.getContext('2d');
  const { width: w, height: h } = c;
  const src = g.getImageData(0, 0, w, h);
  const d = src.data;
  const out = g.createImageData(w, h);
  const o = out.data;
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] > 0) {
        o[i] = d[i]; o[i + 1] = d[i + 1]; o[i + 2] = d[i + 2]; o[i + 3] = d[i + 3];
      } else if (A(x - 1, y) > 120 || A(x + 1, y) > 120 || A(x, y - 1) > 120 || A(x, y + 1) > 120) {
        o[i] = rgb[0]; o[i + 1] = rgb[1]; o[i + 2] = rgb[2]; o[i + 3] = 255;
      }
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}
function mirror(c) {
  const m = mkCanvas(c.width, c.height);
  const g = m.getContext('2d');
  g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
  return m;
}
const spriteCache = new Map();
function cached(key, make) {
  let s = spriteCache.get(key);
  if (!s) {
    s = make();
    spriteCache.set(key, s);
    if (spriteCache.size > 900) spriteCache.delete(spriteCache.keys().next().value);
  }
  return s;
}
// ตัวช่วยวาดสี่เหลี่ยม (พิกัดพิกเซล)
function painter(g, ox = 0, oy = 0) {
  return (x, y, w, h, col) => {
    if (!col) return;
    g.fillStyle = col;
    g.fillRect(x + ox, y + oy, w, h);
  };
}

// ============================================================================
// ตัวละคร 22x36, จุดยึดที่เท้า (11, 35)
// ============================================================================
const CHAR_W = 22, CHAR_H = 36;
function charSprite(look, dir, frame, pose, blink) {
  const key = `c|${look.sex}|${look.skin}|${look.hair}|${look.hc}|${look.top}|${look.tc}|${look.bc}|${look.acc}|${dir}|${frame}|${pose}|${blink ? 1 : 0}`;
  return cached(key, () => {
    const flip = dir === 'right';
    const d = flip ? 'left' : dir;
    const c = mkCanvas(CHAR_W, CHAR_H);
    const g = c.getContext('2d');
    const sit = pose === 'sit';
    const bob = sit ? 2 : (frame === 1 || frame === 3) ? -1 : 0;
    const L = painter(g, 0, 4);          // ช่วงล่าง (ไม่เด้ง)
    const U = painter(g, 0, 4 + bob);    // ช่วงบน (เด้งตามจังหวะเดิน)

    const skin = SKINS[look.skin], skinD = shade(skin, -0.13);
    const rainbow = look.hair === 'rainbow';
    // ผมรุ้ง: วาดด้วยสีพิเศษก่อน แล้วค่อยแทนที่เป็นสีรุ้งตามแถว
    const hc0 = colOf(look.hc, HAIR_COLORS) || HAIR_COLORS[0];
    const hc = rainbow ? '#fe01fe' : hc0, hcL = rainbow ? '#fe02fe' : shade(hc0, 0.22), hcD = rainbow ? '#fe03fe' : shade(hc0, -0.22);
    const tc = colOf(look.tc, CLOTH_COLORS) || CLOTH_COLORS[5], tcD = shade(tc, -0.2), tcL = shade(tc, 0.2);
    const bc = colOf(look.bc, CLOTH_COLORS) || CLOTH_COLORS[8], bcD = shade(bc, -0.22);
    const top = look.top;
    const swim = top === 'swim' || top === 'bikini';
    const sleeve = top === 'tank' || swim ? skin : tc, sleeveD = top === 'tank' || swim ? skinD : tcD;
    const shoe = '#4a3a4a';
    const dress = look.top === 'dress';
    const fem = look.sex === 'f';
    // ผู้หญิง: ใส่กระโปรงอัตโนมัติ (ยกเว้นชุดเดรส/เอี๊ยม) ให้ต่างจากผู้ชายชัดๆ
    const princess = top === 'princess';
    const racer = top === 'racer';
    const skirt = fem && !dress && look.top !== 'overall' && !princess && !swim && !racer;
    const legC = racer ? tc : dress || skirt || swim ? skin : bc, legD = racer ? tcD : dress || skirt || swim ? skinD : bcD;
    const side = d === 'left';
    const EYE = '#2e2235';

    // ---------- ⭐ ปีกนางฟ้า (ด้านหลัง) ----------
    const wings = look.acc === 'wings';
    const drawWings = () => {
      const W = '#ffffff', WD = '#d9e4ff', fl = (frame === 1 || frame === 3) ? -1 : 0;
      if (d === 'up') { U(1, 15 + fl, 7, 9, W); U(14, 15 + fl, 7, 9, W); U(2, 18 + fl, 5, 1, WD); U(15, 18 + fl, 5, 1, WD); U(2, 21 + fl, 5, 1, WD); U(15, 21 + fl, 5, 1, WD); U(0, 16 + fl, 1, 6, W); U(21, 16 + fl, 1, 6, W); }
      else if (side) { U(12, 14 + fl, 8, 9, W); U(13, 17 + fl, 6, 1, WD); U(13, 20 + fl, 6, 1, WD); U(19, 15 + fl, 2, 5, W); }
      else { U(0, 15 + fl, 6, 9, W); U(16, 15 + fl, 6, 9, W); U(1, 18 + fl, 4, 1, WD); U(17, 18 + fl, 4, 1, WD); U(1, 21 + fl, 4, 1, WD); U(17, 21 + fl, 4, 1, WD); }
    };
    if (wings && d !== 'up') drawWings();
    // ---------- ⭐ ผ้าคลุมราชา (ด้านหลัง) ----------
    if (top === 'royal' && d !== 'up') { U(5, 19, 12, 10, '#a3203a'); U(5, 28, 12, 1, '#ffd34d'); }

    // ---------- ขา ----------
    if (sit) {
      if (d === 'down') { L(7, 27, 3, 2, legC); L(12, 27, 3, 2, legC); L(7, 29, 3, 1, shoe); L(12, 29, 3, 1, shoe); }
      else if (side) { L(6, 27, 6, 2, legC); L(5, 28, 2, 2, shoe); }
    } else if (side) {
      const a = frame === 1 ? -2 : frame === 3 ? 2 : 0;
      L(10 - a, 26, 2, 4, legD); L(9 - a, 30, 3, 1, shoe);
      L(10 + a, 26, 2, 4, legC); L(9 + a, 30, 3, 1, shoe);
    } else {
      const lu = frame === 1 ? 1 : 0, ru = frame === 3 ? 1 : 0;
      L(8, 26, 2, 4 - lu, legC); L(12, 26, 2, 4 - ru, legC);
      L(7, 30 - lu, 3, 1, shoe); L(12, 30 - ru, 3, 1, shoe);
    }

    // ---------- ฮู้ดด้านหลัง ----------
    if (look.top === 'hoodie' && d === 'up') U(6, 17, 10, 3, tcD);
    if (top === 'sweater') U(8, 17, 6, 2, tcL);

    // ---------- ลำตัว ----------
    const bodyC = swim ? skin : tc, bodyD = swim ? skinD : tcD;
    U(7, 19, 8, 7, bodyC);
    U(14, 19, 1, 7, bodyD); U(7, 25, 8, 1, bodyD);
    if (swim) {
      // ชุดว่ายน้ำ / บิกินี่ (สีตามสีเสื้อ ลายจุดสีอ่อน)
      if (fem && top === 'swim') { U(7, 20, 8, 7, tc); U(8, 19, 1, 1, tc); U(13, 19, 1, 1, tc); U(14, 20, 1, 7, tcD); U(7, 26, 8, 1, tcD); U(9, 21, 1, 1, tcL); U(12, 23, 1, 1, tcL); U(9, 24, 1, 1, tcL); U(10, 20, 2, 1, tcL); }
      else if (fem) { U(7, 20, 8, 2, tc); U(8, 19, 1, 1, tc); U(13, 19, 1, 1, tc); U(10, 20, 2, 2, tcD); U(14, 20, 1, 2, tcD); U(7, 25, 8, 2, tc); U(14, 25, 1, 2, tcD); U(10, 26, 2, 1, tcD); U(8, 20, 1, 1, tcL); U(12, 20, 1, 1, tcL); }
      else if (top === 'swim') { U(7, 24, 8, 4, tc); U(7, 24, 8, 1, tcD); U(10, 27, 2, 1, skinD); U(7, 25, 1, 3, tcL); U(14, 25, 1, 3, tcL); U(10, 25, 1, 1, '#ffffff'); }
      else { U(7, 25, 8, 2, tc); U(7, 25, 8, 1, tcD); U(10, 26, 2, 1, tcD); }
    }
    if (dress) { U(6, 23, 10, 3, tc); U(5, 25, 12, 2, tc); U(5, 27, 12, 1, tcD); U(15, 23, 1, 3, tcD); }
    if (princess) {
      // ⭐ ชุดเจ้าหญิง: กระโปรงบานยาวถึงพื้น 3 ชั้น เข็มขัดทอง แขนพอง ประกายวิบวับ
      const G1 = '#ffd34d', glint = (frame + (d === 'up' ? 1 : 0)) % 2;
      U(6, 24, 10, 2, tc); U(5, 26, 12, 2, tc); U(4, 28, 14, 2, tc); U(3, 30, 16, 1, tc);
      U(3, 31, 16, 1, tcD); U(13, 24, 3, 7, tcD); U(4, 29, 14, 1, tcL); U(5, 27, 12, 1, tcL);
      U(8, 25, 1, 5, tcL); U(11, 26, 1, 5, tcL); U(4, 30, 1, 1, G1); U(8, 31, 1, 1, G1); U(13, 31, 1, 1, G1); U(17, 30, 1, 1, G1);
      U(7, 23, 8, 1, G1);
      if (d !== 'up') { U(10, 23, 2, 1, '#ff6b8a'); U(9, 19, 4, 1, '#fff0f5'); U(10, 20, 2, 2, G1); U(10, 21, 1, 1, '#ff6b8a'); }
      U(5, 19, 2, 2, tcL); U(15, 19, 2, 2, tcL); U(5, 20, 1, 1, tc); U(16, 20, 1, 1, tcD);
      U(glint ? 6 : 14, glint ? 27 : 25, 1, 1, '#ffffff'); U(glint ? 15 : 7, glint ? 29 : 28, 1, 1, '#ffffff');
    }
    if (skirt) { U(7, 24, 8, 2, bc); U(6, 25, 10, 2, bc); U(5, 27, 12, 1, bc); U(5, 28, 12, 1, bcD); U(9, 26, 1, 2, bcD); U(13, 26, 1, 2, bcD); }
    if (fem) { U(7, 22, 1, 2, swim ? skinD : tcD); U(14, 22, 1, 2, swim ? skinD : tcD); } // เอวคอด
    else { U(6, 19, 10, 1, bodyC); U(15, 19, 1, 1, bodyD); }     // ไหล่กว้าง
    if (top === 'stripe') { for (const y of [20, 22, 24]) U(7, y, 8, 1, tcL); }
    if (racer) {
      // ⭐ ชุดนักแข่ง: ชุดหมีทั้งตัว คอปกขาว เข็มขัด แถบข้างลำตัว/ขา แพตช์สีบนอก
      const AC = colOf(look.bc, CLOTH_COLORS) || '#ff9a3c';
      L(side ? 9 : 7, 27, side ? 4 : 1, 1, tcL); if (!side) L(14, 27, 1, 1, tcL);
      const bolt = (x0) => { U(x0 + 2, 19, 2, 1, AC); U(x0 + 1, 20, 2, 1, AC); U(x0, 21, 4, 1, AC); U(x0 + 2, 22, 2, 1, AC); U(x0 + 1, 23, 2, 1, AC); U(x0 + 1, 21, 1, 1, '#ffffff'); };
      if (d === 'down') { U(9, 19, 4, 1, '#ffffff'); U(7, 24, 8, 1, '#2e2235'); U(10, 24, 2, 1, '#c8ccd8'); bolt(9); U(7, 20, 1, 4, AC); U(14, 20, 1, 4, AC); }
      else if (side) { U(7, 19, 3, 1, '#ffffff'); U(7, 24, 8, 1, '#2e2235'); bolt(9); }
      else { U(9, 19, 4, 1, '#ffffff'); U(7, 24, 8, 1, '#2e2235'); bolt(9); }
    }
    if (top === 'tank') { U(6, 19, 1, 1, skin); U(15, 19, 1, 1, skinD); U(7, 19, 1, 2, skin); U(14, 19, 1, 2, skinD); }
    if (top === 'sweater') { U(7, 25, 8, 1, tcL); U(7, 19, 8, 1, tcL); }
    if (side) {
      const sw = frame === 1 ? -1 : frame === 3 ? 1 : 0;
      U(10 + sw, 20, 2, 3, sleeveD); U(10 + sw, 23, 2, 1, skin);
    } else {
      const sl = frame === 1 ? -1 : 0, sr = frame === 3 ? -1 : 0;
      U(6, 20 + sl, 1, 2, sleeve); U(6, 22 + sl, 1, 2, skin);
      U(15, 20 + sr, 1, 2, sleeveD); U(15, 22 + sr, 1, 2, skinD);
    }
    if (d === 'down') {
      if (look.top === 'hoodie') { U(8, 19, 6, 1, tcD); U(9, 20, 1, 2, '#ffffff'); U(12, 20, 1, 2, '#ffffff'); U(8, 23, 6, 2, tcD); }
      if (look.top === 'tee') { U(9, 19, 4, 1, tcL); }
      if (look.top === 'shirt') { U(8, 19, 2, 1, '#ffffff'); U(12, 19, 2, 1, '#ffffff'); U(10, 19, 2, 1, '#e05a6a'); U(10, 20, 2, 3, '#c94a5a'); }
      if (look.top === 'overall') { U(8, 21, 6, 5, bc); U(8, 19, 1, 2, bc); U(13, 19, 1, 2, bc); U(8, 21, 1, 1, '#ffe07a'); U(13, 21, 1, 1, '#ffe07a'); U(10, 23, 2, 1, bcD); }
      if (dress) { U(9, 19, 4, 1, tcL); U(7, 23, 8, 1, tcD); }
      if (top === 'jacket') { U(9, 19, 4, 7, '#f4f1e8'); U(9, 19, 1, 7, tcD); U(12, 19, 1, 7, tcD); U(10, 21, 2, 1, tcL); }
      if (top === 'suit') { U(9, 19, 4, 4, '#ffffff'); U(10, 19, 2, 5, '#c94a5a'); U(8, 19, 1, 4, tcD); U(13, 19, 1, 4, tcD); U(10, 24, 1, 1, tcL); }
      if (top === 'royal') { U(7, 19, 8, 1, '#ffd34d'); U(6, 19, 1, 8, '#a3203a'); U(15, 19, 1, 8, '#a3203a'); U(10, 20, 2, 5, '#ffd34d'); U(10, 21, 2, 1, '#ff6b8a'); U(10, 23, 2, 1, '#6cc6d9'); }
      if (top === 'sweater') { U(9, 18, 4, 1, tcL); }
    } else if (side) {
      if (top === 'jacket') U(7, 19, 2, 7, '#f4f1e8');
      if (top === 'suit') { U(6, 19, 3, 3, '#ffffff'); U(7, 20, 1, 3, '#c94a5a'); }
      if (top === 'royal') { U(11, 19, 6, 10, '#a3203a'); U(11, 28, 6, 1, '#ffd34d'); U(7, 19, 4, 1, '#ffd34d'); }
      if (look.top === 'overall') { U(7, 21, 8, 5, bc); U(8, 19, 1, 2, bc); }
      if (look.top === 'hoodie') U(11, 18, 4, 2, tcD);
    } else if (look.top === 'overall') { U(7, 21, 8, 5, bc); U(8, 19, 1, 2, bc); U(13, 19, 1, 2, bc); }
    else if (top === 'royal') { U(5, 18, 12, 11, '#a3203a'); U(5, 28, 12, 1, '#ffd34d'); U(6, 18, 10, 1, '#ffd34d'); U(10, 21, 2, 3, '#ffd34d'); }
    if (wings && d === 'up') drawWings();

    // ---------- หัว ----------
    U(6, 5, 10, 1, skin); U(5, 6, 12, 1, skin); U(4, 7, 14, 10, skin); U(5, 17, 12, 1, skin); U(6, 18, 10, 1, skin);
    if (d === 'down') U(17, 8, 1, 8, skinD);
    if (side) U(4, 8, 1, 8, skinD);

    // ---------- หน้า ----------
    if (d === 'down') {
      if (blink) { U(7, 13, 2, 1, EYE); U(13, 13, 2, 1, EYE); }
      else { U(7, 12, 2, 2, EYE); U(13, 12, 2, 2, EYE); U(7, 12, 1, 1, '#ffffff'); U(13, 12, 1, 1, '#ffffff'); }
      U(5, 14, 2, 1, '#ff9fb0'); U(15, 14, 2, 1, '#ff9fb0');
      if (fem) {
        if (!blink) { U(7, 11, 2, 1, EYE); U(13, 11, 2, 1, EYE); U(7, 14, 2, 1, '#5a4f78'); U(13, 14, 2, 1, '#5a4f78'); }
        U(6, 11, 1, 1, EYE); U(15, 11, 1, 1, EYE); U(6, 12, 1, 1, EYE); U(15, 12, 1, 1, EYE); // ขนตางอน
        U(5, 14, 2, 2, '#ff7f9c'); U(15, 14, 2, 2, '#ff7f9c'); U(10, 15, 2, 1, '#e8506e'); U(10, 16, 2, 1, '#ff8fab');
      } else { U(6, 10, 3, 1, hcD); U(13, 10, 3, 1, hcD); U(10, 15, 2, 1, '#a8584f'); }
    } else if (side) {
      if (blink) U(5, 13, 2, 1, EYE);
      else { U(5, 12, 2, 2, EYE); U(5, 12, 1, 1, '#ffffff'); }
      U(4, 14, 2, 1, '#ff9fb0');
      if (fem) { U(4, 11, 1, 2, EYE); if (!blink) U(5, 11, 2, 1, EYE); U(4, 14, 2, 2, '#ff7f9c'); U(5, 15, 2, 1, '#e8506e'); }
      else { U(4, 10, 3, 1, hcD); U(6, 15, 1, 1, '#a8584f'); }
    }

    // ---------- ผม ----------
    const style = look.hair;
    // ส่วนบนที่ทุกทรงมี
    U(6, 3, 10, 1, hc); U(5, 4, 12, 1, hc); U(4, 5, 14, 4, hc);
    if (d === 'down') {
      if (style !== 'buzz' && style !== 'mohawk') { U(4, 9, 3, 3, hc); U(15, 9, 3, 3, hc); U(7, 9, 8, 1, hc); U(8, 10, 2, 1, hc); U(12, 10, 1, 1, hc); }
      if (style === 'short' || style === 'spiky') { U(4, 12, 1, 2, hc); U(17, 12, 1, 2, hc); }
      if (style === 'long') { U(3, 8, 2, 14, hc); U(17, 8, 2, 14, hc); U(3, 20, 2, 2, hcD); U(17, 20, 2, 2, hcD); }
      if (style === 'bob') { U(3, 8, 2, 9, hc); U(17, 8, 2, 9, hc); U(4, 16, 1, 1, hcD); U(17, 16, 1, 1, hcD); }
      if (style === 'twin') { U(1, 9, 3, 9, hc); U(18, 9, 3, 9, hc); U(1, 9, 3, 1, '#ff6b8a'); U(18, 9, 3, 1, '#ff6b8a'); U(1, 16, 3, 2, hcD); U(18, 16, 3, 2, hcD); }
      if (style === 'wavy' || style === 'rainbow') { U(3, 8, 2, 14, hc); U(17, 8, 2, 14, hc); U(2, 11, 1, 3, hc); U(19, 11, 1, 3, hc); U(2, 17, 1, 3, hc); U(19, 17, 1, 3, hc); U(3, 14, 2, 1, hcD); U(17, 14, 2, 1, hcD); U(3, 21, 2, 1, hcD); U(17, 21, 2, 1, hcD); }
      if (style === 'side') { U(4, 9, 7, 3, hc); U(4, 12, 4, 1, hc); U(5, 10, 3, 1, hcL); }
      if (style === 'ponytail') { U(4, 12, 1, 2, hc); U(17, 12, 1, 2, hc); U(18, 9, 2, 5, hc); }
      if (style === 'afro') { U(2, 8, 3, 8, hc); U(17, 8, 3, 8, hc); }
    } else if (d === 'up') {
      U(4, 9, 14, 8, hc); U(5, 17, 12, 1, hc); U(9, 18, 4, 1, skinD);
      U(5, 13, 12, 1, hcD);
      if (style === 'long') { U(4, 17, 14, 6, hc); U(5, 22, 12, 1, hcD); }
      if (style === 'bob') { U(3, 9, 16, 8, hc); U(4, 16, 14, 1, hcD); }
      if (style === 'twin') { U(1, 9, 3, 9, hc); U(18, 9, 3, 9, hc); U(1, 9, 3, 1, '#ff6b8a'); U(18, 9, 3, 1, '#ff6b8a'); }
      if (style === 'wavy' || style === 'rainbow') { U(3, 9, 16, 14, hc); U(4, 15, 14, 1, hcD); U(4, 22, 14, 1, hcD); U(2, 12, 1, 4, hc); U(19, 12, 1, 4, hc); }
      if (style === 'ponytail') { U(9, 16, 4, 1, '#ff6b8a'); U(9, 17, 4, 7, hc); U(10, 24, 2, 1, hc); U(10, 23, 2, 1, hcD); }
      if (style === 'afro') { U(2, 8, 18, 9, hc); }
    } else {
      U(11, 9, 7, 8, hc); U(12, 17, 5, 1, hc); U(4, 9, 4, 2, hc); U(4, 11, 1, 1, hc);
      U(13, 13, 4, 1, hcD);
      if (style === 'long') { U(13, 9, 5, 13, hc); U(13, 21, 5, 1, hcD); }
      if (style === 'bob') { U(12, 9, 6, 9, hc); U(12, 17, 6, 1, hcD); }
      if (style === 'twin') { U(17, 9, 3, 9, hc); U(17, 9, 3, 1, '#ff6b8a'); }
      if (style === 'wavy' || style === 'rainbow') { U(12, 9, 7, 14, hc); U(19, 12, 1, 4, hc); U(13, 15, 6, 1, hcD); U(13, 22, 6, 1, hcD); }
      if (style === 'ponytail') { U(17, 9, 1, 1, '#ff6b8a'); U(18, 9, 2, 8, hc); U(19, 16, 2, 2, hc); U(18, 15, 2, 1, hcD); }
      if (style === 'side') { U(4, 9, 3, 2, hc); }
      if (style === 'afro') { U(11, 8, 9, 10, hc); }
    }
    const shortStyle = style === 'short' || style === 'spiky' || style === 'bun';
    if (fem && shortStyle) { // ผู้หญิงผมสั้นก็ยังมีปอยผมยาวถึงไหล่
      if (d === 'down') { U(3, 8, 2, 11, hc); U(17, 8, 2, 11, hc); U(3, 18, 2, 1, hcD); U(17, 18, 2, 1, hcD); }
      else if (d === 'up') { U(4, 17, 14, 3, hc); U(5, 19, 12, 1, hcD); }
      else { U(12, 9, 6, 11, hc); U(12, 19, 6, 1, hcD); }
    }
    if (fem && (look.acc === 'none' || look.acc === 'glasses' || look.acc === 'shades') && d !== 'up') {
      const cx = side ? 7 : 14; U(cx, 6, 3, 2, '#ff6b8a'); U(cx + 1, 6, 1, 1, '#ffd0dc'); // กิ๊บติดผม
    }
    if (style === 'mohawk') { U(4, 7, 14, 2, skin); U(4, 5, 14, 2, skinD); U(5, 4, 12, 1, skinD); U(6, 3, 10, 1, skinD); U(9, -3, 4, 11, hc); U(10, -4, 2, 1, hc); U(10, -2, 1, 6, hcL); }
    if (style === 'afro') { U(2, 0, 18, 9, hc); U(1, 2, 20, 6, hc); U(4, -1, 14, 1, hc); for (const [x, y] of [[5, 1], [9, 0], [14, 1], [17, 3], [3, 4], [12, 3]]) U(x, y, 1, 1, hcL); }
    if (style === 'buzz') { U(4, 7, 14, 2, skin); U(4, 5, 14, 2, hcD); U(6, 3, 10, 2, hcD); U(5, 4, 12, 1, hcD); }
    if (style === 'spiky') { U(4, 3, 1, 2, hc); U(5, 2, 2, 1, hc); U(8, 1, 2, 2, hc); U(12, 1, 2, 2, hc); U(15, 2, 2, 1, hc); U(17, 3, 1, 2, hc); }
    if (style === 'bun') { U(8, 0, 6, 3, hc); U(9, -1, 4, 1, hc); U(9, 0, 2, 1, hcL); }
    if (style === 'curly') {
      U(3, 2, 16, 7, hc); U(2, 4, 18, 5, hc);
      if (d === 'down') { U(2, 9, 3, 6, hc); U(17, 9, 3, 6, hc); }
      else if (d === 'up') { U(2, 9, 18, 9, hc); }
      else { U(11, 9, 8, 9, hc); }
      for (const [x, y] of [[5, 3], [9, 2], [13, 3], [16, 5], [4, 6], [11, 5]]) U(x, y, 1, 1, hcL);
    }
    U(7, 4, 4, 1, hcL); U(6, 5, 2, 1, hcL);

    // ---------- เครื่องประดับ ----------
    const acc = look.acc;
    const DARK = '#3a3150';
    if (acc === 'glasses' && d !== 'up') {
      const fr = (x) => { U(x, 11, 4, 1, DARK); U(x, 14, 4, 1, DARK); U(x, 11, 1, 4, DARK); U(x + 3, 11, 1, 4, DARK); };
      if (side) { fr(4); U(8, 12, 4, 1, DARK); } else { fr(6); fr(12); U(10, 12, 2, 1, DARK); }
    }
    if (acc === 'shades' && d !== 'up') {
      if (side) { U(4, 12, 4, 2, DARK); U(8, 12, 4, 1, DARK); U(5, 12, 1, 1, '#8fa4ff'); }
      else { U(6, 12, 4, 2, DARK); U(12, 12, 4, 2, DARK); U(10, 12, 2, 1, DARK); U(7, 12, 1, 1, '#8fa4ff'); U(13, 12, 1, 1, '#8fa4ff'); }
    }
    if (acc === 'cap') {
      U(4, 3, 14, 5, '#e8505b'); U(4, 7, 14, 1, '#c23f4a'); U(7, 3, 4, 1, '#ff7a84');
      if (d === 'down') { U(4, 8, 14, 1, '#c23f4a'); U(10, 4, 2, 2, '#ffffff'); }
      if (side) U(1, 8, 6, 1, '#c23f4a');
    }
    if (acc === 'beanie') { U(4, 2, 14, 6, '#7d9cf0'); U(4, 6, 14, 2, '#5f7ed8'); U(9, 0, 4, 2, '#ffffff'); U(6, 3, 1, 3, '#a5bbff'); U(10, 3, 1, 3, '#a5bbff'); U(14, 3, 1, 3, '#a5bbff'); }
    if (acc === 'cat') { U(4, 1, 3, 3, hc); U(5, 0, 1, 1, hc); U(15, 1, 3, 3, hc); U(16, 0, 1, 1, hc); U(5, 2, 1, 1, '#ff9fb0'); U(16, 2, 1, 1, '#ff9fb0'); }
    if (acc === 'bunny') { U(6, -3, 2, 7, '#ffffff'); U(14, -3, 2, 7, '#ffffff'); U(6, -2, 1, 4, '#ffc0d0'); U(14, -2, 1, 4, '#ffc0d0'); }
    if (acc === 'flower') { const fx = side ? 6 : 14; U(fx, 3, 3, 1, '#ff8fab'); U(fx + 1, 2, 1, 3, '#ff8fab'); U(fx + 1, 3, 1, 1, '#ffe07a'); }
    if (acc === 'bow') { if (d === 'up') { U(8, 2, 2, 3, '#ff6b8a'); U(12, 2, 2, 3, '#ff6b8a'); U(10, 3, 2, 1, '#e04a6a'); } else { U(13, 2, 2, 3, '#ff6b8a'); U(17, 2, 2, 3, '#ff6b8a'); U(15, 3, 2, 1, '#e04a6a'); } }
    if (acc === 'headphones') {
      U(5, 2, 12, 1, DARK); U(4, 3, 1, 4, DARK); U(17, 3, 1, 4, DARK);
      if (side) { U(9, 9, 4, 5, DARK); U(10, 10, 2, 3, '#ff8fab'); }
      else { U(2, 9, 2, 5, DARK); U(18, 9, 2, 5, DARK); U(2, 10, 1, 3, '#ff8fab'); U(19, 10, 1, 3, '#ff8fab'); }
    }
    if (acc === 'crown') { U(6, 1, 10, 3, '#ffd34d'); U(6, 0, 1, 1, '#ffd34d'); U(10, -1, 2, 2, '#ffd34d'); U(15, 0, 1, 1, '#ffd34d'); U(8, 2, 1, 1, '#ff6b8a'); U(13, 2, 1, 1, '#6cc6d9'); U(7, 1, 2, 1, '#fff2a8'); }
    if (acc === 'halo') { U(7, -2, 8, 1, '#ffe680'); U(6, -1, 1, 1, '#ffe680'); U(15, -1, 1, 1, '#ffe680'); U(7, 0, 8, 1, '#ffe680'); }
    if (acc === 'racehelmet') {
      // ⭐ หมวกนักแข่ง: หมวกเต็มใบ เปิดหน้า (ยกบังลมขึ้น)
      const num3 = (x0, y0, col) => ['###', '..#', '.##', '..#', '###'].forEach((r, y) => { for (let x = 0; x < 3; x++) if (r[flip ? 2 - x : x] === '#') U(x0 + x, y0 + y, 1, 1, col); }); // เลข 3 (หันขวาภาพจะถูกกลับ → วาดกลับไว้ก่อน)
      const Hc = hc0, HD = shade(hc0, -0.18), HL = shade(hc0, 0.25), AC = colOf(look.bc, CLOTH_COLORS) || '#ff9a3c', VI = '#1d1f2e'; // สีหมวก = สีผม (ผมซ่อนใต้หมวก) · ลาย = สีกางเกง
      if (d === 'up') { U(5, 1, 12, 1, Hc); U(4, 2, 14, 1, Hc); U(3, 3, 16, 16, Hc); U(17, 4, 2, 14, HD); U(3, 15, 16, 1, AC); num3(9, 6, AC); U(5, 18, 12, 1, HD); }
      else if (side) {
        U(6, 1, 10, 1, Hc); U(5, 2, 13, 1, Hc); U(4, 3, 15, 7, Hc); U(10, 10, 9, 8, Hc); U(4, 17, 15, 2, Hc); U(17, 4, 2, 13, HD); U(4, 18, 15, 1, HD);
        U(3, 8, 7, 1, '#36c8ff'); U(3, 9, 7, 1, '#7a3fd0'); U(3, 8, 2, 1, '#ff3fa4'); U(5, 8, 1, 1, '#ffffff');
        num3(12, 11, AC); U(6, 3, 12, 1, AC); U(6, 4, 3, 1, HL);
      } else {
        U(5, 1, 12, 1, Hc); U(4, 2, 14, 1, Hc); U(3, 3, 16, 7, Hc); U(3, 10, 3, 8, Hc); U(16, 10, 3, 8, Hc); U(4, 17, 14, 2, Hc); U(17, 4, 2, 14, HD); U(4, 18, 14, 1, HD);
        for (let x = 5; x < 17; x++) { U(x, 8, 1, 1, ['#7a3fd0', '#36c8ff', '#ff3fa4'][Math.floor((x - 5) / 4)]); U(x, 9, 1, 1, ['#4a2a8a', '#1f8ab0', '#b02a74'][Math.floor((x - 5) / 4)]); } U(6, 8, 2, 1, '#ffffff');
        num3(10, 2, AC); U(6, 4, 2, 2, HL); U(3, 12, 2, 3, AC); U(17, 12, 2, 3, AC);
      }
    }

    // ---------- ท่าร้องเพลง / เต้น (NPC คอนเสิร์ต) ----------
    if ((pose === 'sing' || pose === 'dance') && d === 'down') {
      const OL = '#4a2430';
      const arm = (right, mode) => {
        const X = (x) => (right ? 21 - x : x), sc = right ? sleeveD : sleeve, sk = right ? skinD : skin;
        g.clearRect(right ? 15 : 6, 4 + bob + 20, 1, 4);
        if (mode === 'up') { U(X(5), 19, 1, 1, sc); U(X(4), 18, 1, 1, sc); U(X(3), 17, 1, 1, sc); U(X(2), 14, 1, 3, sk); U(right ? 19 : 1, 11, 2, 3, sk); }
        else if (mode === 'out') { U(X(5), 20, 1, 1, sc); U(X(4), 20, 1, 1, sc); U(X(3), 18, 1, 3, sk); }
      };
      if (pose === 'sing') {
        // มือขวาถือไมค์จ่อปาก (หัวไมค์มีขอบเข้ม เห็นชัดบนหน้า) อีกข้างโบกตามจังหวะ
        g.clearRect(15, 4 + bob + 20, 1, 4);
        U(15, 19, 1, 2, sleeveD); U(14, 18, 2, 2, skin); U(13, 18, 1, 1, OL); U(16, 18, 1, 1, OL); U(14, 17, 1, 1, OL);
        U(12, 16, 2, 1, '#1d1f2e'); U(13, 17, 1, 1, '#1d1f2e');
        U(9, 13, 4, 4, OL); U(10, 14, 2, 2, '#c8ccd8'); U(10, 14, 1, 1, '#ffffff');
        arm(false, frame % 4 < 2 ? 'out' : 'up');
      } else {
        const f = frame % 4;
        arm(false, f === 0 || f === 1 ? 'up' : 'out'); arm(true, f === 0 || f === 3 ? 'up' : 'out');
      }
    }
    if (rainbow) {
      // แทนที่สีพิเศษด้วยสีรุ้งไล่ตามแถว
      const RB = ['#ff5a6e', '#ff9a3c', '#ffd84d', '#7ed37a', '#5ab4ff', '#8f7dff', '#e07dff'];
      const im = g.getImageData(0, 0, CHAR_W, CHAR_H), dd = im.data;
      for (let y = 0; y < CHAR_H; y++) for (let x = 0; x < CHAR_W; x++) {
        const i = (y * CHAR_W + x) * 4;
        if (dd[i] === 0xfe && dd[i + 2] === 0xfe && dd[i + 1] >= 1 && dd[i + 1] <= 3 && dd[i + 3] > 0) {
          const base = RB[Math.floor((y + 2) / 3) % RB.length];
          const col = dd[i + 1] === 2 ? shade(base, 0.25) : dd[i + 1] === 3 ? shade(base, -0.2) : base;
          const [r, gg, bb] = hexToRgb(col); dd[i] = r; dd[i + 1] = gg; dd[i + 2] = bb;
        }
      }
      g.putImageData(im, 0, 0);
    }
    addOutline(c);
    return flip ? mirror(c) : c;
  });
}

// ============================================================================
// สัตว์เลี้ยง 14x14, จุดยึด (7, 13)
// ============================================================================
// ---------------- สัตว์ฟาร์มแบบละเอียด (ตัวใหญ่ขึ้น แรเงา 3 ระดับ เส้นขอบน้ำตาลเข้ม) ----------------
const FARM = { f1: [52, 15], cloud: [26, 13], cat: [19, 16], dog: [21, 17], chick: [12, 13], slime: [16, 13], bunny: [17, 17], fish: [20, 20], dino: [23, 20], trex: [27, 25], panda: [22, 22], fox: [23, 15], penguin: [13, 18], duck: [18, 16], hamster: [16, 13], dragon: [24, 21], unicorn: [24, 21], goose: [20, 22], cow: [28, 22], sheep: [24, 20], mallard: [20, 18], hen: [18, 18], rooster: [20, 20], pig: [24, 18], goat: [22, 22] };
const FARM_OUT = [74, 36, 48];
// สีลายรถ F1 จากชุดแต่งตัว (k1 = ลายหลัก, k2 = ขอบ/ปลายปีก)
const carCols = (l) => (l && l.pet === 'f1' ? [colOf(l.k1, CLOTH_COLORS) || '', colOf(l.k2, CLOTH_COLORS) || ''].join('|') : '');
function farmSprite(kind, frame, faceRight, pc, ac = '') {
  return cached(`f|${kind}|${frame}|${faceRight ? 1 : 0}|${pc}|${ac}`, () => {
    const [W, H] = FARM[kind];
    const c = mkCanvas(W + 3, H + 2), g = c.getContext('2d');
    const P = painter(g, 1, 1);
    const E = (cx, cy, rx, ry, col) => { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2))); P(cx - w, cy + y, w * 2 + 1, 1, col); } };
    const pick = (natural) => (isHex(pc) ? pc : PET_COLORS[pc]) || natural;
    const tone = (col) => [shade(col, 0.2), col, shade(col, -0.16), shade(col, -0.32)];
    const EYE = '#2b1a24', BLUSH = '#f4a3b4', PINK = '#f0a0b0';
    const st = frame % 2;
    // ขา: หน้า/หลังสลับกันตอนเดิน
    const legs = (xs, y0, len, col, hoof) => xs.forEach((x, i) => { const up = (i % 2 === 0) === !!st ? 1 : 0; P(x, y0, 1, len - up, col); if (hoof) P(x, y0 + len - up - 1, 1, 1, hoof); });
    if (kind === 'cloud') {
      // ⭐ ก้อนเมฆ: ฟูนุ่ม ลอยได้ ขี่ได้ (แอดมิน)
      const [hi, b, lo, lo2] = tone(pick('#ffffff')), sh = shade(pick('#ffffff') === '#ffffff' ? '#dfe8ff' : pick('#ffffff'), -0.05);
      E(13, 8, 11, 3, sh); E(13, 7, 11, 3, b);
      E(6, 5, 4, 3, b); E(12, 3, 5, 3, b); E(19, 5, 4, 3, b);
      E(11, 2, 3, 1, '#ffffff'); P(5, 3, 3, 1, '#ffffff'); P(18, 3, 3, 1, '#ffffff');
      P(3, 9, 20, 1, sh); P(6, 10, 14, 1, shade(sh, -0.08));
      P(9, 6, 1, 2, EYE); P(15, 6, 1, 2, EYE); P(11, 8, 3, 1, lo2); P(7, 8, 2, 1, BLUSH); P(16, 8, 2, 1, BLUSH);
      if (st) { P(1, 7, 1, 1, '#ffffff'); P(24, 6, 1, 1, '#ffffff'); }
    } else if (kind === 'f1') {
      // ⭐ รถ F1 ลาย "Pixel Hangout Racing" (ออกแบบเอง): ตัวรถทรงต่ำยาว สีเข้มด้าน (เปลี่ยนสีได้) สายฟ้าฟ้า-ชมพู เบอร์ 3 ยางซอฟต์แถบแดง
      const [ac1, ac2] = String(ac).split('|'), [hi, b, lo, lo2] = tone(pick('#2b2a3a')), CY = ac1 || '#36e0ff', PK = ac2 || '#ff3fa4', CF = '#15141c', CF2 = '#3a3950', TY = '#17151d', RIM = '#e8323c', WH = '#ffffff';
      // ปีกหลัง: แผ่นข้าง + ปีกหลัก + แฟลป DRS + บีมวิง
      P(46, 0, 6, 11, CF); P(44, 0, 8, 2, CF); P(45, 0, 6, 1, CY); P(45, 3, 6, 1, CF2); P(46, 2, 5, 1, PK); P(44, 8, 4, 1, CF2);
      // ฝาครอบเครื่อง + ครีบฉลาม (ลาดลงไปท้าย)
      for (let x = 26; x < 47; x++) { const y = 3 + Math.round((x - 26) * 0.22); P(x, y, 1, 11 - y, b); P(x, y, 1, 1, x < 40 ? hi : b); }
      for (let x = 30; x < 45; x++) P(x, 2 + Math.round((x - 30) * 0.2), 1, 1, CF2);
      P(25, 1, 4, 4, CF); P(26, 2, 2, 1, CF2); P(25, 1, 4, 1, CY);
      // แชสซี + ไซด์พอด (ใต้ท้องเว้า) + จมูก
      P(14, 6, 14, 5, b); P(14, 6, 10, 1, hi);
      P(22, 7, 18, 4, b); P(22, 10, 9, 1, lo2); P(23, 9, 6, 1, lo);
      P(2, 9, 14, 2, b); P(5, 8, 10, 1, b); P(0, 10, 3, 1, b); P(4, 8, 9, 1, hi); P(2, 10, 12, 1, lo);
      // ปีกหน้า 2 ชั้น + แผ่นข้าง
      P(0, 12, 12, 1, CF); P(1, 13, 10, 1, CF2); P(0, 9, 1, 5, CF); P(1, 12, 3, 1, PK);
      // พื้นรถ + ดิฟฟิวเซอร์
      P(13, 11, 34, 1, CF); P(14, 11, 30, 1, CF2); P(45, 10, 4, 2, CF);
      // ห้องนักขับ + halo
      P(18, 5, 8, 2, CF); P(16, 5, 1, 2, CF2); P(17, 3, 8, 1, CF2); P(16, 4, 1, 1, CF2); P(24, 4, 1, 2, CF2); P(21, 4, 1, 1, CF2);
      // ลายสายฟ้า (ฟ้า ขอบชมพู) ตามไซด์พอดถึงจมูก
      // สายฟ้าใหญ่บนไซด์พอด (ฟ้า ขอบล่างชมพู) + เส้นนำบนจมูก
      const BOLT = ['..........####', '........####..', '....#########.', '......####....', '....####......', '..####........'];
      BOLT.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') P(20 + x, 5 + y, 1, 1, (BOLT[y + 1] || '')[x] === '#' ? CY : PK); });
      P(4, 9, 14, 1, CY); P(4, 10, 14, 1, PK);
      // เบอร์ 3 บนฝาครอบเครื่อง (สีตัดกับตัวรถ · หันขวาจะถูกกลับด้าน → วาดกลับไว้ก่อน)
      const [r0, g0, b0] = hexToRgb(b), NUM = (r0 * 0.3 + g0 * 0.59 + b0 * 0.11) > 150 ? '#15141c' : WH;
      ['###', '..#', '.##', '..#', '###'].forEach((r, y) => { for (let x = 0; x < 3; x++) if (r[faceRight ? 2 - x : x] === '#') P(34 + x, 6 + y, 1, 1, NUM); });
      const wheel = (cx, cy) => {
        for (let y = -4; y <= 4; y++) { const w = Math.round(4 * Math.sqrt(Math.max(0, 1 - (y / 4.5) ** 2))); P(cx - w, cy + y, w * 2 + 1, 1, TY); }
        for (const [x, y] of [[-2, -3], [-1, -3], [0, -3], [1, -3], [2, -3], [-3, -2], [3, -2], [-3, -1], [3, -1], [-3, 0], [3, 0], [-3, 1], [3, 1], [-3, 2], [3, 2], [-2, 3], [-1, 3], [0, 3], [1, 3], [2, 3]]) P(cx + x, cy + y, 1, 1, RIM);
        P(cx - 1, cy - 1, 3, 3, '#43475e'); P(cx, cy, 1, 1, '#9aa0b8'); P(cx + (st ? -2 : 1), cy + (st ? 1 : -2), 1, 1, '#5a5f7a');
      };
      wheel(11, 10); wheel(42, 10);
    } else if (kind === 'cat') {
      const [hi, b, lo, lo2] = tone(pick('#f2a65a'));
      E(11, 10, 6, 3, lo); E(11, 9, 6, 3, b); P(7, 7, 8, 1, hi); P(10, 7, 1, 3, lo); P(13, 7, 1, 3, lo); P(8, 11, 6, 1, lo2);
      P(17, 3 + st, 1, 6, b); P(16, 2 + st, 1, 2, b); P(17, 3 + st, 1, 1, hi);
      E(4, 6, 4, 3, b); P(2, 4, 4, 1, hi); P(1, 1, 2, 3, b); P(1, 0, 1, 1, b); P(6, 1, 2, 3, b); P(7, 0, 1, 1, b); P(2, 2, 1, 1, BLUSH); P(6, 2, 1, 1, BLUSH);
      P(0, 7, 2, 2, '#f8eadc'); P(0, 7, 1, 1, '#e57a95'); P(2, 5, 1, 2, EYE); P(4, 8, 2, 1, BLUSH);
      legs([7, 9, 13, 15], 12, 3, b, lo2);
    } else if (kind === 'dog') {
      const [hi, b, lo, lo2] = tone(pick('#c08552'));
      E(12, 10, 6, 3, lo); E(12, 9, 6, 3, b); P(8, 7, 9, 1, hi); P(7, 10, 3, 2, '#f4ece0');
      P(18, 5 - st, 1, 4, b); P(19, 4 - st, 1, 2, b);
      E(5, 6, 4, 3, b); P(3, 4, 4, 1, hi); P(0, 6, 3, 3, '#f4e6d4'); P(0, 6, 1, 1, EYE); P(1, 8, 2, 1, '#e57a95');
      P(6, 3, 3, 6, lo2); P(7, 3, 1, 4, lo); P(3, 5, 1, 1, EYE); P(4, 5, 1, 1, '#ffffff'); P(3, 8, 1, 1, BLUSH);
      P(7, 8, 3, 1, '#e04040'); P(8, 9, 1, 1, '#ffd34d');
      legs([8, 10, 14, 16], 12, 4, b, lo2);
    } else if (kind === 'chick') {
      const [hi, b, lo, lo2] = tone(pick('#ffd84d'));
      E(6, 7, 5, 4, lo); E(6, 6, 5, 4, b); P(3, 3, 4, 1, hi); P(4, 2, 2, 1, hi); P(5, 0, 1, 2, b); P(6, 1, 1, 1, b);
      P(6, 7, 3, 2, lo); P(7, 7, 2, 1, lo2); P(0, 5, 2, 1, '#f0a040'); P(0, 6, 1, 1, '#cf7a2c'); P(3, 4, 1, 1, EYE); P(3, 7, 1, 1, BLUSH);
      legs([5, 7], 10, 2, '#f0a040'); P(4, 11, 2, 1, '#f0a040'); P(7, 11, 2, 1, '#f0a040');
    } else if (kind === 'slime') {
      const [hi, b, lo, lo2] = tone(pick('#7ed37a'));
      const sq = st ? 1 : 0;
      E(8, 8 + sq, 7 + sq, 4 - sq, lo); E(8, 7 + sq, 7 + sq, 4 - sq, b); E(7, 6 + sq, 4, 2 - sq, hi);
      P(4, 4 + sq * 2, 2, 1, '#ffffff'); P(4, 5 + sq * 2, 1, 1, '#ffffff');
      P(5, 7 + sq, 1, 2, EYE); P(10, 7 + sq, 1, 2, EYE); P(7, 10, 2, 1, lo2); P(3, 9, 1, 1, BLUSH); P(12, 9, 1, 1, BLUSH);
    } else if (kind === 'bunny') {
      const [hi, b, lo, lo2] = tone(pick('#f4efe6'));
      E(10, 11, 5, 4, lo); E(10, 10, 5, 4, b); P(7, 7, 6, 1, hi); P(15, 9, 2, 2, '#ffffff');
      E(4, 8, 3, 3, b); P(2, 6, 3, 1, hi);
      P(3, 0, 2, 6, b); P(4, 1, 1, 4, BLUSH); P(5, 1, 2, 5, lo); P(3, 0, 1, 1, hi);
      P(0, 9, 1, 1, '#e57a95'); P(2, 8, 1, 1, EYE); P(3, 10, 1, 1, BLUSH);
      P(6 - st, 14, 3, 1, lo); P(11 + st, 14, 3, 1, lo); P(7, 12, 1, 2, b); P(12, 12, 1, 2, b);
    } else if (kind === 'fish') {
      // ปลาในโหลแก้วกลม (มีน้ำ หินสี สาหร่าย ฟองอากาศ)
      const [hi, b, lo, lo2] = tone(pick('#ff9a3c'));
      const glass = 'rgba(214,240,255,.85)', water = 'rgba(120,196,255,.45)', shine = 'rgba(255,255,255,.9)';
      for (let y = -8; y <= 7; y++) { // ขอบโหล (วงรีโปร่ง)
        const w = Math.round(8 * Math.sqrt(Math.max(0, 1 - (y / 8.5) ** 2)));
        if (y < -5) continue;
        P(9 - w, 11 + y, 1, 1, glass); P(9 + w, 11 + y, 1, 1, glass);
        if (y === 7) P(9 - w, 11 + y, w * 2 + 1, 1, glass);
        else P(10 - w, 11 + y, w * 2 - 1, 1, y >= -3 ? water : 'rgba(230,245,255,.28)');
      }
      P(4, 5, 11, 1, glass); P(3, 4, 13, 1, 'rgba(235,248,255,.95)');
      P(3, 17, 4, 1, '#d2a86e'); P(7, 17, 3, 1, '#9cc77e'); P(10, 17, 4, 1, '#e8c890'); P(14, 17, 2, 1, '#c98a8a');
      P(14, 11 + st, 1, 6 - st, '#3fa37a'); P(15, 13, 1, 3, '#57bd8d'); P(13, 14, 1, 2, '#57bd8d');
      E(8, 12, 3, 2, lo); E(8, 11, 3, 2, b); P(6, 10, 3, 1, hi); P(9, 10, 1, 4, '#fff7ec');
      P(12, 10 - st, 1, 3, b); P(13, 9 - st, 1, 2, lo); P(13, 12 + st, 1, 2, lo); P(7, 9, 2, 1, lo);
      P(6, 11, 1, 1, EYE); P(5, 12, 1, 1, lo2);
      P(4, 8, 1, 4, shine); P(5, 7, 1, 1, shine); P(15, 9, 1, 2, 'rgba(255,255,255,.55)');
      P(7, 7 - st, 1, 1, shine); P(8, 5 + st, 1, 1, 'rgba(255,255,255,.7)');
    } else if (kind === 'dino') {
      const [hi, b, lo, lo2] = tone(pick('#7ed37a')), belly = '#f4e6b0';
      E(12, 12, 6, 4, lo); E(12, 11, 6, 4, b); P(8, 8, 8, 1, hi); E(11, 14, 4, 1, belly);
      P(17, 11, 4, 3, b); P(21, 12, 1, 1, b); P(17, 13, 4, 1, lo);
      for (const x of [9, 12, 15, 18]) { P(x, 7 - (x === 18 ? -3 : 0), 1, 1, '#ff9a3c'); }
      P(4, 6, 4, 6, b); P(1, 2, 7, 5, b); P(2, 1, 5, 1, b); P(2, 2, 4, 1, hi); P(0, 5, 3, 2, b); P(1, 6, 3, 1, '#ffffff');
      P(4, 3, 1, 1, EYE); P(5, 3, 1, 1, '#ffffff'); P(1, 3, 1, 1, lo2); P(7, 11, 2, 1, lo);
      P(9, 15, 2, 3 - st, lo); P(14, 15, 2, 2 + st, b); P(8, 18 - st, 3, 1, lo2); P(14, 17 + st, 3, 1, lo2);
    } else if (kind === 'trex') {
      // 🦖 ที-เร็กซ์: หัวโต ฟันแหลม แขนสั้นจิ๋ว หางยาว ขาหลังใหญ่ ลายทางบนหลัง
      const [hi, b, lo, lo2] = tone(pick('#6fae5a')), belly = '#f2e4b4', bellyD = '#dccb92', mouth = '#8a2f3e', TOOTH = '#fffdf4';
      // หาง (แกว่งปลายตอนเดิน)
      for (let i = 0; i < 11; i++) { const h = Math.max(1, 6 - Math.floor(i / 2)), y = 10 - Math.floor(i / 4) + (i > 7 ? st : 0); P(16 + i, y, 1, h, b); P(16 + i, y + h - 1, 1, 1, lo); if (i < 6) P(16 + i, y, 1, 1, hi); }
      // ขาข้างไกล (สีเข้ม)
      P(10, 16, 3, 3, lo); P(10, 18, 2, 4 - st, lo2); P(9, 21 - st, 4, 1, lo2);
      // ลำตัว + ท้อง + ลายบนหลัง
      E(14, 13, 6, 5, lo); E(14, 12, 6, 5, b); P(10, 8, 9, 1, hi); P(9, 9, 2, 1, hi);
      E(12, 15, 4, 2, belly); P(10, 17, 5, 1, bellyD);
      P(13, 8, 1, 3, lo2); P(16, 8, 1, 3, lo2); P(19, 10, 1, 3, lo2); P(22, 10, 1, 2, lo2);
      // คอ
      P(6, 6, 5, 7, b); P(6, 6, 1, 5, hi); P(7, 10, 3, 3, belly);
      // หัวโต
      P(1, 1, 10, 6, b); P(2, 0, 7, 1, b); P(0, 2, 1, 4, b); P(2, 1, 6, 1, hi); P(1, 2, 2, 1, hi);
      P(6, 1, 3, 1, lo); P(10, 3, 1, 3, lo); P(0, 3, 1, 1, lo2);
      P(7, 2, 1, 2, EYE); P(8, 2, 1, 1, '#ffffff'); P(8, 5, 2, 1, BLUSH);
      // ปาก: เดินแล้วอ้างับ (คำราม!)
      if (st) { P(0, 7, 9, 2, mouth); P(1, 7, 1, 1, TOOTH); P(4, 7, 1, 1, TOOTH); P(7, 7, 1, 1, TOOTH); P(2, 8, 1, 1, TOOTH); P(5, 8, 1, 1, TOOTH); P(1, 9, 8, 2, b); P(1, 10, 8, 1, lo); }
      else { P(0, 7, 9, 1, mouth); P(1, 7, 1, 1, TOOTH); P(4, 7, 1, 1, TOOTH); P(7, 7, 1, 1, TOOTH); P(1, 8, 8, 2, b); P(1, 9, 8, 1, lo); }
      // แขนสั้นจิ๋ว
      P(9, 12, 2, 1, lo); P(8, 12, 1, 2, lo); P(7, 13 + st, 1, 1, TOOTH);
      // ขาข้างใกล้: ต้นขาใหญ่ หน้าแข้ง เท้ามีเล็บ
      E(16, 15, 3, 3, b); P(15, 13, 3, 1, hi);
      P(16, 18, 2, 3 + st, b); P(17, 18, 1, 3 + st, lo);
      P(14, 21 + st, 5, 1, lo2); P(14, 21 + st, 1, 1, TOOTH); P(16, 21 + st, 1, 1, TOOTH);
    } else if (kind === 'panda') {
      // หมีแพนด้านั่งหันหน้า: หัวกลมโต หูกลมดำ วงตาเอียง แขนขาดำอ้วนกลม พุงขาว (เดินแล้วตัวโยก เท้าสลับ)
      const blk = pick('#34313f'), blkL = shade(blk, 0.14), blkD = shade(blk, -0.25), wh = '#f8f4ec', whS = '#ddd5ca', EYE2 = '#141219';
      const bob = st ? 1 : 0, Q = (x, y, w, h, c) => P(x, y + bob, w, h, c), M = (x, w) => 22 - x - w;
      const Eq = (cx, cy, rx, ry, col) => { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2))); Q(cx - w, cy + y, w * 2 + 1, 1, col); } };
      // ขา/เท้า (ไม่โยกตาม) ยกสลับตอนเดิน
      const lf = st ? 1 : 0;
      E(4, 19 - lf, 3, 2, blk); E(18, 19, 3, 2, blk); P(2, 19 - lf, 2, 2, blkL); P(19, 19, 2, 2, blkL);
      // ตัวดำ + พุงขาว + แขนดำอ้วน
      Eq(11, 15, 7, 5, blk); Eq(11, 17, 4, 3, whS); Eq(10, 17, 4, 3, wh);
      Eq(6, 16, 2, 3, blk); Eq(16, 15, 2, 3, blk); Q(5, 14, 2, 1, blkL); Q(15, 13, 2, 1, blkL); Q(16, 18, 2, 1, blkD);
      // หู
      Eq(4, 3, 2, 2, blk); Eq(18, 3, 2, 2, blk); Q(3, 2, 2, 1, blkL); Q(17, 2, 2, 1, blkL);
      // หัวกลมโต (แรเงาขวาล่าง)
      Eq(11, 7, 8, 6, whS); Eq(10, 7, 8, 5, wh); Q(6, 2, 7, 1, '#ffffff');
      // วงตาเอียง + ตา + จมูก + ปาก + แก้ม
      for (const [x, y, w] of [[6, 5, 2], [5, 6, 3], [4, 7, 4], [4, 8, 3]]) { Q(x, y, w, 1, blkL); Q(M(x, w), y, w, 1, blkL); }
      Q(6, 6, 1, 2, EYE2); Q(15, 6, 1, 2, EYE2); Q(6, 6, 1, 1, '#ffffff'); Q(15, 6, 1, 1, '#ffffff');
      Q(10, 9, 3, 1, EYE2); Q(11, 10, 1, 1, EYE2); Q(10, 11, 1, 1, whS); Q(12, 11, 1, 1, whS);
      Q(4, 10, 2, 1, BLUSH); Q(16, 10, 2, 1, BLUSH);
    } else if (kind === 'fox') {
      const [hi, b, lo, lo2] = tone(pick('#f08a3c')), dark = '#3a2a35';
      E(18, 7, 4, 2, b); P(21, 6, 1, 2, '#ffffff'); P(20, 8, 2, 1, '#ffffff'); P(16, 6, 4, 1, hi);
      E(11, 8, 6, 3, lo); E(11, 7, 6, 3, b); P(7, 5, 8, 1, hi); P(7, 9, 4, 1, '#f8eadc');
      E(4, 6, 3, 3, b); P(1, 2, 2, 2, b); P(1, 1, 1, 1, dark); P(5, 2, 2, 2, b); P(6, 1, 1, 1, dark);
      P(0, 7, 3, 2, '#f8eadc'); P(0, 7, 1, 1, EYE); P(2, 5, 1, 1, EYE); P(3, 8, 1, 1, BLUSH);
      legs([7, 9, 13, 15], 10, 4, dark);
    } else if (kind === 'penguin') {
      const [hi, b, lo, lo2] = tone(pick('#2e3550'));
      E(7, 9, 5, 7, lo); E(6, 8, 5, 7, b); E(5, 10, 3, 5, '#fbf8f2'); P(3, 2, 5, 1, hi);
      P(0, 5, 2, 1, '#f0a040'); P(1, 6, 1, 1, '#cf7a2c'); P(3, 4, 1, 1, '#ffffff'); P(4, 4, 1, 1, EYE); P(3, 7, 1, 1, BLUSH);
      P(10, 9 - st, 1, 4, lo2); P(9, 9 - st, 1, 1, lo2);
      P(3 - st, 16, 3, 1, '#f0a040'); P(7 + st, 16, 3, 1, '#f0a040');
    } else if (kind === 'duck') {
      const [hi, b, lo, lo2] = tone(pick('#f7f4ee'));
      E(10, 10, 6, 3, lo); E(10, 9, 6, 3, b); P(7, 7, 7, 1, hi); P(16, 6, 1, 2, b); P(8, 9, 5, 1, lo); P(9, 10, 3, 1, lo2);
      E(4, 5, 3, 3, b); P(2, 3, 3, 1, hi); P(0, 5, 2, 2, '#f0a040'); P(0, 6, 1, 1, '#cf7a2c'); P(3, 4, 1, 1, EYE); P(4, 7, 1, 1, BLUSH);
      legs([8, 11], 13, 2, '#f0a040'); P(7, 14, 2, 1, '#f0a040'); P(11, 14, 2, 1, '#f0a040');
    } else if (kind === 'hamster') {
      const [hi, b, lo, lo2] = tone(pick('#e8b070'));
      E(8, 7, 7, 4, lo); E(8, 6, 7, 4, b); P(4, 3, 8, 1, hi); E(6, 8, 4, 2, '#fff3e0');
      P(3, 1, 2, 2, b); P(3, 1, 1, 1, BLUSH); P(9, 1, 2, 2, b); P(10, 1, 1, 1, BLUSH);
      P(0, 6, 1, 1, '#e57a95'); P(2, 5, 1, 1, EYE); P(3, 7, 2, 1, BLUSH); P(11, 4, 2, 2, lo);
      P(3 + st, 11, 2, 1, lo2); P(10 - st, 11, 2, 1, lo2);
    } else if (kind === 'dragon') {
      const [hi, b, lo, lo2] = tone(pick('#8f5bd6')), belly = '#ffd8a8', gold = '#ffd34d';
      for (let y = 0; y < 8; y++) P(11 + y, 1 + y - st, 8 - y, 1, y % 3 === 2 ? lo2 : lo);
      P(11, 1 - st, 1, 8, hi);
      E(13, 13, 6, 4, lo); E(13, 12, 6, 4, b); P(9, 9, 8, 1, hi); E(12, 15, 4, 1, belly);
      P(19, 12, 3, 3, b); P(22, 11, 1, 2, b); P(22, 10, 1, 1, '#ff6b4a');
      P(5, 7, 4, 7, b); P(6, 8, 2, 5, belly);
      P(1, 3, 7, 5, b); P(2, 3, 4, 1, hi); P(0, 5, 2, 2, b); P(0, 5, 1, 1, lo2);
      P(5, 1, 1, 2, gold); P(7, 1, 1, 2, gold); P(4, 4, 1, 1, EYE); P(5, 4, 1, 1, '#ffffff'); P(2, 7, 1, 1, '#ffffff');
      if (st) { P(-1, 6, 1, 1, '#ff9a3c'); }
      P(10, 16, 2, 3 - st, lo); P(15, 16, 2, 2 + st, b); P(9, 18 - st, 3, 1, lo2); P(15, 17 + st, 3, 1, lo2);
    } else if (kind === 'unicorn') {
      const [hi, b, lo, lo2] = tone(pick('#fbf9f6')), gold = '#ffd34d', RB = ['#ff6b8a', '#ff9a3c', '#ffd84d', '#7ed37a', '#5ab4ff', '#8f7dff'];
      E(14, 11, 7, 4, lo); E(14, 10, 7, 4, b); P(9, 7, 10, 1, hi);
      P(5, 4, 4, 8, b); P(5, 4, 1, 6, hi);
      P(1, 3, 6, 4, b); P(2, 2, 4, 1, b); P(0, 5, 2, 2, '#f5c8d8'); P(0, 6, 1, 1, lo2);
      P(3, 0, 1, 2, gold); P(4, -1, 1, 2, gold); P(2, 1, 1, 1, shade(gold, -0.2));
      RB.forEach((col, i) => { P(8 + (i % 2), 2 + i * 2, 2, 2, col); });
      RB.forEach((col, i) => { if (i < 4) P(21 + (i % 2), 8 + i * 2 + st, 2, 2, col); });
      P(3, 4, 1, 1, EYE); P(4, 4, 1, 1, '#ffffff'); P(2, 6, 1, 1, BLUSH);
      legs([9, 11, 17, 19], 14, 6, b, gold); P(10, 14, 1, 2, lo); P(18, 14, 1, 2, lo);
    } else if (kind === 'goose') {
      const [hi, b, lo, lo2] = tone(pick('#f7f4ee'));
      P(4, 3, 2, 4, b); P(5, 6, 2, 4, b); P(6, 9, 2, 2, b); P(4, 3, 1, 3, hi);
      E(4, 2, 2, 2, b); P(3, 1, 2, 1, hi);
      P(0, 2, 2, 1, '#f0a040'); P(0, 3, 2, 1, '#cf7a2c'); P(3, 2, 1, 1, EYE);
      E(11, 13, 7, 3, lo); E(11, 12, 7, 3, b); P(17, 10, 1, 2, b); P(16, 9, 2, 1, b); P(6, 10, 6, 1, hi);
      P(9, 12, 6, 1, lo); P(14, 11, 2, 1, lo); P(10, 13, 4, 1, lo2); P(8, 15, 7, 1, lo);
      const leg = '#e8803a';
      legs([8, 12], 16, 3, leg); P(7 - (st ? 0 : 1), 18, 2, 1, leg); P(11 + (st ? 1 : 0), 18, 2, 1, leg);
    } else if (kind === 'cow') {
      const base = pick('#f4ece0'), [hi, b, lo, lo2] = tone(base), spot = base === '#f4ece0' ? '#2a2b38' : shade(base, -0.42), spH = shade(spot, 0.18);
      E(16, 10, 9, 5, lo); E(16, 9, 9, 5, b); P(9, 5, 14, 1, hi);
      P(13, 5, 5, 4, spot); P(14, 6, 2, 1, spH); P(19, 8, 4, 4, spot); P(11, 11, 3, 2, spot); P(22, 5, 2, 2, spot);
      P(25, 6, 1, 7, b); P(25, 12, 1, 2, spot);
      P(1, 3, 7, 7, b); P(2, 2, 5, 1, b); P(1, 3, 2, 3, spot); P(2, 2, 1, 1, spot); P(6, 4, 2, 4, lo);
      P(0, 7, 5, 3, PINK); P(1, 8, 1, 1, shade(PINK, -0.3)); P(3, 8, 1, 1, shade(PINK, -0.3));
      P(3, 4, 1, 2, EYE); P(4, 4, 1, 1, '#ffffff');
      P(7, 1, 3, 2, b); P(8, 2, 1, 1, PINK); P(1, 0, 1, 2, '#efe2c4'); P(5, 0, 1, 2, '#efe2c4');
      P(15, 14, 3, 2, PINK);
      legs([10, 12, 20, 22], 14, 6, lo, '#3a2a2a'); P(11, 14, 1, 2, b); P(21, 14, 1, 2, b);
    } else if (kind === 'sheep') {
      const [hi, b, lo, lo2] = tone(pick('#f6f3ee')), face = '#f2dcc0', faceD = '#dcbf9e', leg = '#3a2a35';
      E(14, 10, 8, 5, lo); E(14, 9, 8, 5, b); E(14, 8, 6, 3, hi);
      for (const [x, y] of [[8, 6], [11, 4], [15, 4], [19, 6], [21, 9], [9, 12], [13, 13], [18, 12]]) P(x, y, 2, 1, lo);
      for (const [x, y] of [[10, 7], [14, 6], [17, 8], [12, 10], [16, 10]]) P(x, y, 1, 1, hi);
      E(4, 8, 3, 3, face); P(1, 8, 1, 2, faceD); P(2, 4, 4, 2, b); P(3, 3, 2, 1, hi);
      P(7, 6, 2, 2, face); P(8, 7, 1, 1, BLUSH); P(2, 7, 1, 2, EYE); P(1, 10, 2, 1, BLUSH);
      legs([9, 11, 17, 19], 14, 4, leg);
    } else if (kind === 'mallard') {
      const [hi, b, lo, lo2] = tone(pick('#9b8a82')), head = '#2f8a52', headH = '#4fb070', leg = '#ee8a3a';
      E(11, 11, 7, 3, lo); E(11, 10, 7, 3, b); P(8, 9, 7, 2, '#d8cec6'); P(9, 9, 5, 1, '#ece6e0');
      P(16, 7, 3, 3, '#2a2530'); P(18, 7, 1, 1, '#ffffff'); P(17, 9, 1, 1, '#ffffff');
      E(5, 8, 2, 3, '#7a4636'); E(5, 3, 3, 3, head); P(3, 1, 3, 1, headH); P(4, 6, 3, 1, '#ffffff');
      P(0, 3, 3, 1, '#f2c84a'); P(0, 4, 2, 1, '#c99a2a'); P(4, 2, 1, 1, EYE);
      legs([9, 12], 14, 3, leg); P(8, 16, 2, 1, leg); P(12, 16, 2, 1, leg);
    } else if (kind === 'hen' || kind === 'rooster') {
      const roo = kind === 'rooster';
      const [hi, b, lo, lo2] = tone(pick('#a5502e')), red = '#e23c3c', redD = '#b82a2a', beak = '#f2b440';
      if (roo) { P(13, 1, 3, 9, '#2c5f52'); P(16, 2, 2, 7, '#2c5f52'); P(14, 2, 2, 5, '#3f8a72'); P(16, 3, 1, 3, '#5fb090'); P(12, 6, 2, 4, '#2c5f52'); }
      else { P(13, 4, 3, 5, lo); P(14, 3, 2, 2, b); P(14, 4, 1, 3, hi); }
      E(10, 11, 6, 4, lo); E(9, 10, 6, 4, b); P(6, 8, 5, 1, hi); P(8, 10, 5, 1, lo); P(9, 11, 4, 1, lo2); P(10, 12, 2, 1, lo);
      E(4, 5, 2, 3, b); P(3, 3, 2, 1, hi);
      if (roo) { P(3, 0, 4, 2, red); P(4, -1, 1, 1, red); P(6, 0, 1, 1, redD); } else { P(3, 1, 3, 1, red); P(4, 0, 1, 1, red); }
      P(1, 5, 2, 1, beak); P(1, 6, 1, 1, shade(beak, -0.3)); P(3, 7, 1, 2, red); P(4, 4, 1, 1, EYE);
      legs([8, 11], roo ? 15 : 14, 3, beak); P(7, roo ? 17 : 16, 2, 1, beak); P(11, roo ? 17 : 16, 2, 1, beak);
    } else if (kind === 'pig') {
      const [hi, b, lo, lo2] = tone(pick('#f4b2c2')), snout = shade(pick('#f4b2c2'), -0.12);
      E(13, 8, 9, 5, lo); E(13, 7, 9, 5, b); P(7, 3, 12, 1, hi); P(9, 4, 6, 1, hi); E(15, 10, 5, 1, lo);
      E(5, 8, 4, 4, b); P(3, 5, 4, 1, hi);
      P(0, 7, 2, 4, snout); P(0, 8, 1, 1, lo2); P(0, 10, 1, 1, lo2);
      P(5, 3, 4, 2, lo2); P(6, 2, 3, 1, lo2); P(6, 3, 2, 1, BLUSH); P(3, 7, 1, 2, EYE); P(4, 10, 2, 1, BLUSH); P(9, 5, 1, 6, lo);
      P(22, 5, 1, 2, b); P(23, 4, 1, 1, b); P(22, 3, 1, 1, b);
      legs([8, 10, 17, 19], 12, 4, lo, lo2);
    } else if (kind === 'goat') {
      const [hi, b, lo, lo2] = tone(pick('#f0e6d6')), horn = '#5a4438', hoof = '#4a3530';
      E(13, 12, 7, 4, lo); E(13, 11, 7, 4, b); P(8, 8, 11, 1, hi); P(20, 7, 1, 3, b); P(20, 6, 1, 1, b);
      P(6, 5, 3, 7, b); P(6, 5, 1, 5, hi); P(8, 7, 1, 4, lo);
      P(1, 3, 6, 4, b); P(2, 2, 4, 1, b); P(0, 4, 1, 2, b); P(2, 3, 2, 1, hi);
      P(4, 0, 2, 2, horn); P(5, -1, 2, 1, horn); P(7, 0, 1, 2, horn); P(7, 3, 2, 1, b); P(8, 3, 1, 1, PINK);
      P(2, 7, 2, 2, b); P(2, 9, 1, 1, lo); P(3, 4, 1, 1, EYE); P(1, 5, 1, 1, BLUSH);
      legs([9, 11, 16, 18], 15, 5, b, hoof); P(9, 15, 1, 1, lo); P(16, 15, 1, 1, lo);
    }
    addOutline(c, FARM_OUT);
    return faceRight ? mirror(c) : c;
  });
}
// โน้ตดนตรี: 'clef' = กุญแจซอล, 'n1' = ♪, 'n2' = ♫
const MUSIC_PIX = {
  clef: ['...#...', '..#.#..', '..#.#..', '..#.#..', '...##..', '...#...', '..##...', '.#.#...', '#..###.', '#.#.#.#', '#.#.#.#', '.#..#.#', '..###..', '....#..', '.##.#..', '.###...'],
  n1: ['...#..', '...##.', '...#.#', '...#..', '...#..', '.###..', '####..', '.##...'],
  n2: ['..######', '..#....#', '..######', '..#....#', '..#....#', '###..###', '###..###', '.#....#.'],
};
function musicSprite(kind, col = '#ffd34d') {
  return cached(`mu|${kind}|${col}`, () => {
    const rows = MUSIC_PIX[kind], c = mkCanvas(rows[0].length + 2, rows.length + 2), g = c.getContext('2d');
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') { g.fillStyle = x === 0 || y === 0 ? shade(col, 0.3) : col; g.fillRect(x + 1, y + 1, 1, 1); } });
    addOutline(c, [74, 36, 48]);
    return c;
  });
}
// ป้ายสถานะเสียงแบบ Discord: 'mic' = ปิดไมค์, 'hp' = ปิดหูฟัง (วงกลมแดง ไอคอนขาว มีขีดฆ่า)
function statusIcon(kind) {
  return cached('si|' + kind, () => {
    const N = 15, c = mkCanvas(N + 2, N + 2), g = c.getContext('2d'), P = painter(g, 1, 1);
    const RED = '#e8505b', RED_D = '#c23744', WH = '#ffffff';
    for (let y = 0; y < N; y++) { const w = Math.round(7.5 * Math.sqrt(Math.max(0, 1 - ((y - 7) / 7.6) ** 2))); P(7 - w, y, w * 2 + 1, 1, y > 10 ? RED_D : RED); }
    if (kind === 'mic') {
      P(6, 1, 3, 1, WH); P(5, 2, 5, 7, WH); P(6, 9, 3, 1, WH);
      P(3, 6, 1, 3, WH); P(11, 6, 1, 3, WH); P(4, 9, 1, 1, WH); P(10, 9, 1, 1, WH); P(5, 10, 5, 1, WH); P(7, 11, 1, 1, WH); P(5, 12, 5, 1, WH);
    } else {
      P(5, 2, 5, 1, WH); P(4, 3, 1, 1, WH); P(10, 3, 1, 1, WH); P(3, 4, 1, 1, WH); P(11, 4, 1, 1, WH); P(2, 5, 1, 3, WH); P(12, 5, 1, 3, WH);
      P(1, 7, 4, 5, WH); P(10, 7, 4, 5, WH); P(2, 8, 2, 3, RED_D); P(11, 8, 2, 3, RED_D);
    }
    for (let i = 2; i < 13; i++) { const col = i > 10 ? RED_D : RED; P(i - 1, i, 1, 1, col); P(i + 1, i, 1, 1, col); P(i, i - 1, 1, 1, col); }
    for (let i = 2; i < 13; i++) P(i, i, 1, 1, WH); // ขีดฆ่า
    addOutline(c, [74, 36, 48]);
    return c;
  });
}
function petSprite(kind, frame, faceRight, pc = 0, ac = '') {
  if (FARM[kind]) return farmSprite(kind, frame, faceRight, pc, ac);
  return cached(`p|${kind}|${frame}|${faceRight ? 1 : 0}|${pc}`, () => {
    const c = mkCanvas(16, 16);
    const g = c.getContext('2d');
    const P = painter(g, 1, 1);
    const EYE = '#2e2235';
    const step = frame % 2;
    const pick = (natural) => (isHex(pc) ? pc : PET_COLORS[pc]) || natural;
    if (kind === 'cat' || kind === 'dog') {
      const col = pick(kind === 'cat' ? '#f2a65a' : '#c08552');
      const dk = shade(col, -0.25);
      P(4, 6, 7, 4, col); P(1, 3, 5, 5, col);
      if (kind === 'cat') { P(1, 2, 1, 1, col); P(4, 2, 1, 1, col); P(10, 3 + step, 1, 3, col); P(11, 3 + step, 1, 1, col); P(6, 6, 1, 4, dk); P(8, 6, 1, 4, dk); }
      else { P(0, 4, 1, 3, dk); P(5, 3, 1, 3, dk); P(11, 5 - step, 1, 2, col); P(4, 7, 4, 2, '#f4efe6'); }
      P(2, 5, 1, 1, EYE); P(1, 6, 1, 1, kind === 'cat' ? '#ff8fab' : EYE);
      P(4, 10, 1, 2 - step, dk); P(9, 10, 1, 1 + step, dk); P(6, 10, 1, 1 + step, col); P(8, 10, 1, 2 - step, col);
    } else if (kind === 'chick') {
      const col = pick('#ffe07a');
      const y = step;
      P(3, 4 + y, 7, 6, col); P(4, 3 + y, 5, 1, col); P(5, 2 + y, 2, 1, col);
      P(8, 6 + y, 2, 2, shade(col, -0.12)); P(4, 5 + y, 1, 1, EYE); P(2, 6 + y, 1, 1, '#ff9a3c');
      P(5, 10, 1, 2, '#ff9a3c'); P(7, 10, 1, 2, '#ff9a3c');
    } else if (kind === 'slime') {
      const col = pick('#7ee0a0');
      if (step) { P(2, 7, 9, 5, col); P(3, 6, 7, 1, col); }
      else { P(3, 5, 7, 7, col); P(4, 4, 5, 1, col); }
      P(4, step ? 8 : 7, 1, 2, EYE); P(7, step ? 8 : 7, 1, 2, EYE); P(4, step ? 7 : 5, 2, 1, shade(col, 0.5)); P(3, 11, 7, 1, shade(col, -0.25));
    } else if (kind === 'bunny') {
      const col = pick('#ffffff');
      P(4, 6, 6, 5, col); P(2, 4, 4, 4, col); P(2, 0, 1, 4, col); P(4, 0 + step, 1, 4, col);
      P(2, 1, 1, 2, '#ffc0d0'); P(3, 5, 1, 1, EYE); P(2, 6, 1, 1, '#ff8fab'); P(9, 7, 2, 2, shade(col, -0.06));
      P(4, 11, 2, 1, shade(col, -0.1)); P(8, 11, 2, 1, shade(col, -0.1));
    } else if (kind === 'fish') {
      // ปลาลอยตัวในฟองน้ำ ว่ายตามเจ้าของ
      const col = pick('#ff9a3c');
      const y = step ? 1 : 0;
      P(1, 3, 11, 9, 'rgba(160,220,255,.35)'); P(2, 2, 9, 1, 'rgba(160,220,255,.35)'); P(2, 12, 9, 1, 'rgba(160,220,255,.35)');
      P(3, 5 + y, 6, 4, col); P(4, 4 + y, 4, 1, col); P(4, 9 + y, 4, 1, col);
      P(9, 5 + y - step, 2, 2, shade(col, -0.2)); P(9, 8 + y + step, 2, 2, shade(col, -0.2)); P(10, 6 + y, 1, 2, shade(col, -0.2));
      P(4, 6 + y, 1, 1, EYE); P(6, 5 + y, 1, 4, shade(col, 0.35)); P(2, 3, 1, 1, '#ffffff');
    } else if (kind === 'dino') {
      const col = pick('#7ed37a');
      const dk = shade(col, -0.28);
      P(1, 2, 6, 5, col); P(0, 4, 2, 3, col); P(5, 6, 6, 5, col); P(10, 7, 3, 2, col); P(12, 8, 1, 1, col);
      P(5, 9, 5, 2, '#f6e7b8'); P(2, 3, 1, 1, EYE); P(1, 6, 3, 1, '#ffffff');
      for (const [x, y2] of [[4, 1], [6, 5], [8, 5], [10, 6]]) P(x, y2, 1, 1, dk);
      P(4, 8, 2, 1, dk);
      P(6, 11, 2, 1 + step, dk); P(9, 11, 2, 2 - step, dk);
    } else if (kind === 'fox') {
      const col = pick('#f08a3c'), dk = shade(col, -0.25);
      P(4, 6, 7, 4, col); P(1, 3, 5, 5, col); P(1, 1, 1, 2, col); P(4, 1, 1, 2, col); P(1, 6, 2, 2, '#ffffff');
      P(10, 4 + step, 3, 4, col); P(11, 3 + step, 2, 1, col); P(12, 7 + step, 1, 1, '#ffffff'); P(11, 8 + step, 2, 1, '#ffffff');
      P(2, 5, 1, 1, EYE); P(0, 6, 1, 1, EYE); P(5, 8, 4, 1, '#ffffff');
      P(4, 10, 1, 2 - step, dk); P(9, 10, 1, 1 + step, dk); P(6, 10, 1, 1 + step, col); P(8, 10, 1, 2 - step, col);
    } else if (kind === 'penguin') {
      const col = pick('#2e3550');
      const y = step;
      P(3, 2 + y, 7, 9, col); P(4, 1 + y, 5, 1, col); P(4, 4 + y, 5, 6, '#ffffff'); P(5, 3 + y, 1, 1, EYE); P(8, 3 + y, 1, 1, EYE);
      P(6, 4 + y, 2, 1, '#ff9a3c'); P(2, 5 + y, 1, 4, col); P(10, 5 + y, 1, 4, col);
      P(4, 11, 2, 1, '#ff9a3c'); P(7, 11, 2, 1, '#ff9a3c');
    } else if (kind === 'duck') {
      const col = pick('#f4f1e8');
      const y = step;
      P(4, 6 + y, 8, 5, col); P(2, 2 + y, 4, 5, col); P(0, 4 + y, 2, 2, '#ff9a3c'); P(3, 3 + y, 1, 1, EYE); P(9, 7 + y, 3, 2, shade(col, -0.1)); P(11, 5 + y, 1, 2, col);
      P(5, 11, 1, 1, '#ff9a3c'); P(8, 11, 1, 1, '#ff9a3c');
    } else if (kind === 'hamster') {
      const col = pick('#e8b070');
      const y = step;
      P(2, 5 + y, 10, 6, col); P(3, 4 + y, 8, 1, col); P(3, 3 + y, 2, 1, col); P(9, 3 + y, 2, 1, col); P(3, 8 + y, 8, 3, '#fff3e0');
      P(4, 6 + y, 1, 1, EYE); P(9, 6 + y, 1, 1, EYE); P(6, 7 + y, 2, 1, '#ff8fab'); P(2, 7 + y, 1, 1, '#ff9fb0'); P(11, 7 + y, 1, 1, '#ff9fb0');
      P(4, 11, 1, 1, shade(col, -0.25)); P(9, 11, 1, 1, shade(col, -0.25));
    } else if (kind === 'dragon') {
      const col = pick('#8f5bd6'), dk = shade(col, -0.3), wing = shade(col, 0.25);
      P(5, 6, 6, 5, col); P(1, 3, 5, 4, col); P(0, 5, 2, 2, col); P(10, 7, 3, 2, col); P(12, 6, 1, 1, col); P(13, 5, 1, 1, '#ff6b4a');
      P(5, 1 - step, 5, 4 + step, wing); P(6, 0 - step, 3, 1, wing); P(6, 2, 3, 1, dk);
      P(2, 1, 1, 2, '#ffd34d'); P(4, 1, 1, 2, '#ffd34d'); P(2, 4, 1, 1, '#ffe07a'); P(5, 9, 5, 2, '#ffd8a8');
      P(5, 11, 2, 1 + step, dk); P(9, 11, 2, 2 - step, dk);
      if (step) { P(-1, 5, 1, 1, '#ff9a3c'); }
    } else if (kind === 'unicorn') {
      const col = pick('#ffffff'), dk = shade(col, -0.15);
      P(4, 5, 8, 5, col); P(1, 2, 4, 5, col); P(0, 4, 1, 2, col); P(2, -1, 1, 3, '#ffd34d'); P(1, 0, 1, 1, '#ffd34d');
      P(5, 2, 1, 1, '#ff6b8a'); P(5, 3, 2, 1, '#ffd84d'); P(6, 4, 2, 1, '#7ed37a'); P(4, 1, 1, 1, '#5ab4ff');
      P(11, 5 + step, 2, 4, '#ff9fd8'); P(12, 9 + step, 1, 1, '#8f7dff');
      P(2, 4, 1, 1, EYE); P(1, 6, 1, 1, '#ff9fb0');
      P(4, 10, 1, 2 - step, dk); P(6, 10, 1, 1 + step, col); P(9, 10, 1, 1 + step, dk); P(11, 10, 1, 2 - step, col);
    } else if (kind === 'panda') {
      const patch = pick('#2e2235');
      P(2, 3, 7, 6, '#ffffff'); P(5, 7, 7, 4, '#ffffff');
      P(2, 2, 2, 2, patch); P(7, 2, 2, 2, patch);
      P(3, 5, 2, 2, patch); P(6, 5, 2, 2, patch); P(4, 5, 1, 1, '#ffffff'); P(7, 5, 1, 1, '#ffffff');
      P(5, 7, 1, 1, '#2e2235'); P(5, 8, 7, 2, patch);
      P(5, 11, 2, 1 + step, patch); P(9, 11, 2, 2 - step, patch);
    }
    addOutline(c);
    return faceRight ? mirror(c) : c;
  });
}

// ============================================================================
// เฟอร์นิเจอร์ (มุมมอง 3/4) — จุดยึด = กึ่งกลางขอบล่าง
// ============================================================================
const WOOD = { l: '#e6b07a', m: '#c98d58', d: '#9a6438', dd: '#74482a' };
const COLORWAYS = [
  ['#7d9cf0', '#5f7ed8', '#a9bdff'], ['#ff8fab', '#e06c8c', '#ffc2d2'], ['#8fd694', '#62b56c', '#c2efc4'],
  ['#ffb86b', '#e0954a', '#ffd8a8'], ['#b48cf0', '#9068d6', '#d8c4ff'], ['#6cc6d9', '#4aa3b8', '#a8e6f2'],
];

// ต้นคริสต์มาสหลายขนาด: สร้างจากแบบเดียวกัน (ชั้นใบ สายรุ้งทอง ลูกบอล ไฟกะพริบ ดาวบนยอด กระถางแดง)
function xmasTreeDef(label, W, HH, tiers) {
  const cx = W / 2, top = 9, potH = 6 + Math.round(W / 20), bodyH = HH - top - potH + 2;
  const step = Math.floor(bodyH / (tiers + 0.3)), rows = step + 4, maxHalf = W / 2;
  const baseHalf = (k) => maxHalf * (0.45 + 0.55 * (tiers === 1 ? 1 : k / (tiers - 1)));
  const halfAt = (k, r) => Math.round(baseHalf(k) * (r + 2) / (rows + 1));
  const lights = [], orns = [], OC = ['#e8505b', '#5ab4ff', '#ffd34d', '#c070ff', '#ff9a3c'];
  for (let k = 0; k < tiers; k++) {
    const y0 = top + k * step, rl = rows - 3, hl = halfAt(k, rl), n = 2 + k;
    for (let i = 0; i < n; i++) lights.push([Math.round(cx - hl + 2 + (i + 0.5) * (2 * hl - 4) / n), y0 + rl - 1 + (i % 2)]);
    const ro = Math.round(rows * 0.55), ho = halfAt(k, ro);
    for (let i = 0; i < 1 + Math.floor(k / 2) + (k ? 1 : 0); i++) orns.push([Math.round(cx - ho + 2 + ((i * 0.6 + 0.3 + k * 0.17) % 1) * (2 * ho - 6)), y0 + ro, OC[(i + k * 2) % OC.length]]);
  }
  const big = W >= 50 ? 4 : 3;
  return { label, emo: '🎄', w: W, h: HH, solid: true, foot: Math.max(8, Math.round(W / 5)), fw: Math.round(W * 0.35), draw(P) {
    const D = '#2a6e44', M = '#3a8f55', L = '#5cb870', GOLD = '#ffd34d', pw = Math.round(W * 0.34), px = Math.round(cx - pw / 2);
    P(Math.round(cx - 3), HH - potH - 4, 6, 5, '#7a4a24');
    P(px, HH - potH, pw, potH, '#c8323c'); P(px, HH - potH, pw, 1, '#e8505b'); P(px, HH - potH + 2, pw, 1, GOLD); P(px + pw - 2, HH - potH, 2, potH, '#a8242e');
    for (let k = 0; k < tiers; k++) {
      const y0 = top + k * step;
      for (let r = 0; r < rows; r++) {
        const half = halfAt(k, r), y = y0 + r;
        if (y > HH - potH - 2) break;
        P(Math.round(cx - half), y, half * 2, 1, r === rows - 1 ? D : r < 2 ? L : M); P(Math.round(cx - half), y, 2, 1, L); P(Math.round(cx + half - 2), y, 2, 1, D);
      }
      const rg = Math.round(rows * 0.75), hw = halfAt(k, rg);
      for (let x = -hw + 2; x < hw - 1; x += 2) { const rr = rg + Math.round(x / 6); if (rr < rows && Math.abs(x) < halfAt(k, rr) - 1) P(Math.round(cx + x), y0 + rr, 1, 1, GOLD); }
    }
    for (const [x, y, c] of orns) { P(x, y, big, big, c); P(x, y, 1, 1, '#ffffff'); P(x + big - 1, y + big - 1, 1, 1, shade(c, -0.3)); }
    const sx = Math.round(cx) - 1;
    P(sx, 0, 2, 9, GOLD); P(sx - 3, 3, 8, 2, GOLD); P(sx - 2, 5, 2, 2, GOLD); P(sx + 2, 5, 2, 2, GOLD); P(sx - 1, 2, 4, 4, GOLD); P(sx, 3, 1, 1, '#fff6c8');
  },
  anim(ctx, ox, oy, t) {
    const COL = ['#ff5a5a', '#ffe066', '#5fd8ff', '#7dff8a', '#ff8fe0'], f = Math.floor(t * 2.5);
    lights.forEach(([x, y], i) => { if ((i + f) % 3 === 0) return; ctx.fillStyle = COL[(i + f) % COL.length]; ctx.fillRect(ox + x, oy + y, 2, 2); });
    if (Math.sin(t * 3) > 0.2) { const sx = Math.round(cx) - 1; ctx.fillStyle = '#fff6c8'; ctx.fillRect(ox + sx, oy - 2, 2, 2); ctx.fillRect(ox + sx - 5, oy + 3, 2, 1); ctx.fillRect(ox + sx + 5, oy + 3, 2, 1); }
  } };
}
const FURN = {
  rug: { label: 'พรม', emo: '🟫', w: 58, h: 34, floor: true, solid: false, variants: 4, draw(P, v) {
    const pal = [['#e8826e', '#f5b49a', '#c9604c'], ['#7d9cf0', '#b5c6ff', '#5f7ed8'], ['#8fd694', '#c9f0cb', '#5fae68'], ['#f5a3c7', '#ffd6e6', '#d27aa2']][v % 4];
    P(3, 0, 52, 34, pal[2]); P(1, 2, 56, 30, pal[2]); P(0, 4, 58, 26, pal[2]);
    P(3, 1, 52, 32, pal[0]); P(1, 3, 56, 28, pal[0]);
    for (let x = 6; x < 52; x += 4) { P(x, 4, 2, 1, pal[1]); P(x, 29, 2, 1, pal[1]); }
    for (let y = 6; y < 28; y += 4) { P(5, y, 1, 2, pal[1]); P(52, y, 1, 2, pal[1]); }
    P(25, 11, 8, 12, pal[1]); P(21, 15, 16, 4, pal[1]); P(27, 15, 4, 4, pal[0]);
    for (let y = 4; y < 30; y += 3) { P(0, y, 1, 1, pal[1]); P(57, y, 1, 1, pal[1]); }
  } },
  sofa: { label: 'โซฟา', emo: '🛋️', w: 46, h: 28, solid: true, foot: 12, variants: 6, facing: true,
    seats: (f) => (f ? [{ dx: -10, dy: -11, dir: 'up' }, { dx: 10, dy: -11, dir: 'up' }] : [{ dx: -10, dy: -5, dir: 'down' }, { dx: 10, dy: -5, dir: 'down' }]),
    draw(P, v, f) {
      const [m, d, l] = COLORWAYS[v % 6];
      if (!f) {
        P(2, 0, 42, 13, m); P(3, 1, 40, 2, l); P(22, 2, 1, 10, d);
        P(0, 7, 7, 17, m); P(39, 7, 7, 17, m); P(1, 7, 5, 2, l); P(40, 7, 5, 2, l);
        P(7, 12, 16, 9, l); P(23, 12, 16, 9, l); P(22, 12, 2, 9, m); P(7, 19, 32, 2, m);
        P(0, 21, 46, 4, d); P(2, 25, 3, 3, WOOD.dd); P(41, 25, 3, 3, WOOD.dd);
      } else {
        P(0, 6, 7, 16, m); P(39, 6, 7, 16, m); P(1, 6, 5, 2, l); P(40, 6, 5, 2, l);
        P(4, 0, 38, 22, m); P(5, 1, 36, 3, l); P(4, 18, 38, 4, d); P(22, 4, 2, 14, d);
        P(0, 22, 46, 3, d); P(2, 25, 3, 3, WOOD.dd); P(41, 25, 3, 3, WOOD.dd);
      }
    } },
  armchair: { label: 'อาร์มแชร์', emo: '💺', w: 24, h: 26, solid: true, foot: 11, variants: 6, facing: true,
    seats: (f) => [{ dx: 0, dy: f ? -11 : -5, dir: f ? 'up' : 'down' }],
    draw(P, v, f) {
      const [m, d, l] = COLORWAYS[(v + 3) % 6];
      if (!f) { P(3, 0, 18, 12, m); P(4, 1, 16, 2, l); P(0, 7, 5, 15, m); P(19, 7, 5, 15, m); P(5, 11, 14, 8, l); P(0, 19, 24, 4, d); P(2, 23, 2, 3, WOOD.dd); P(20, 23, 2, 3, WOOD.dd); }
      else { P(0, 6, 5, 15, m); P(19, 6, 5, 15, m); P(3, 0, 18, 20, m); P(4, 1, 16, 2, l); P(3, 17, 18, 3, d); P(0, 20, 24, 3, d); P(2, 23, 2, 3, WOOD.dd); P(20, 23, 2, 3, WOOD.dd); }
    } },
  beanbag: { label: 'บีนแบ็ก', emo: '🫘', w: 20, h: 15, solid: false, variants: 6, seats: () => [{ dx: 0, dy: -3, dir: 'down' }], draw(P, v) {
    const [m, d, l] = COLORWAYS[(v + 1) % 6];
    P(3, 1, 14, 13, m); P(1, 4, 18, 9, m); P(5, 0, 10, 1, m); P(2, 11, 16, 3, d); P(5, 2, 5, 2, l); P(4, 4, 2, 1, l);
  } },
  coffeeTable: { label: 'โต๊ะกาแฟ', emo: '☕', w: 32, h: 16, solid: true, foot: 9, draw(P) {
    P(0, 0, 32, 8, WOOD.l); P(1, 1, 30, 1, '#f2c896'); P(0, 8, 32, 4, WOOD.m); P(0, 11, 32, 1, WOOD.d);
    P(1, 12, 3, 4, WOOD.d); P(28, 12, 3, 4, WOOD.d);
    P(6, 2, 8, 4, '#7d9cf0'); P(7, 3, 6, 1, '#ffffff'); P(21, 2, 4, 4, '#ffffff'); P(25, 3, 1, 2, '#ffffff'); P(22, 3, 2, 2, '#9a6438');
  } },
  roundTable: { label: 'โต๊ะกลม', emo: '⚪', w: 26, h: 20, solid: true, foot: 9, draw(P) {
    P(4, 0, 18, 11, WOOD.l); P(2, 2, 22, 7, WOOD.l); P(0, 4, 26, 3, WOOD.l); P(5, 1, 8, 1, '#f2c896');
    P(2, 9, 22, 2, WOOD.m); P(4, 11, 18, 1, WOOD.d);
    P(11, 12, 4, 6, WOOD.d); P(7, 18, 12, 2, WOOD.dd);
    P(11, 3, 4, 4, '#ff8fab'); P(12, 1, 2, 2, '#8fd694');
  } },
  bookshelf: { label: 'ชั้นหนังสือ', emo: '📚', w: 30, h: 38, solid: true, foot: 8, draw(P) {
    P(0, 0, 30, 38, WOOD.d); P(1, 0, 28, 1, WOOD.m);
    const cols = ['#e8505b', '#ffb86b', '#ffe07a', '#8fd694', '#6cc6d9', '#7d9cf0', '#b48cf0', '#ff8fab', '#f4f1e8'];
    for (let s = 0; s < 3; s++) {
      const y0 = 3 + s * 11;
      P(2, y0, 26, 9, WOOD.dd);
      let x = 3, i = s * 3;
      while (x < 26) {
        const bw = 2 + ((i * 7) % 3), bh = 6 + ((i * 5) % 3);
        if (s === 0 && x > 18) { P(20, y0 + 3, 6, 6, '#c96a4a'); P(20, y0 + 1, 6, 3, '#62b56c'); P(22, y0, 2, 1, '#8fd694'); break; }
        P(x, y0 + 9 - bh, bw, bh, cols[i % cols.length]);
        P(x, y0 + 9 - bh, bw, 1, shade(cols[i % cols.length], 0.3));
        x += bw + 1; i++;
      }
      P(1, y0 + 9, 28, 2, WOOD.m);
    }
  } },
  plant: { label: 'ต้นไม้', emo: '🪴', w: 20, h: 30, solid: true, foot: 6, variants: 4, draw(P, v) {
    P(5, 22, 10, 8, '#c96a4a'); P(4, 21, 12, 2, '#e08a62'); P(6, 28, 8, 2, '#a85438'); P(6, 23, 2, 4, '#e08a62');
    const G = '#3fa37a', GL = '#8fd694', GD = '#2d7a5a';
    if (v === 0) { // มอนสเตอร่า
      P(3, 8, 7, 6, G); P(1, 10, 3, 3, G); P(11, 4, 7, 7, GL); P(16, 7, 3, 3, GL); P(6, 0, 7, 7, G); P(8, 14, 4, 7, GD);
      P(5, 10, 1, 2, GD); P(14, 6, 1, 2, '#62b56c'); P(9, 2, 1, 2, GD); P(12, 12, 6, 5, G); P(2, 15, 5, 4, GL);
    } else if (v === 1) { // เฟิร์น
      for (let i = 0; i < 6; i++) { P(9 - i, 4 + i * 3, 2 + i * 2, 2, i % 2 ? G : GL); }
      P(9, 2, 2, 19, GD);
    } else if (v === 2) { // กระบองเพชร
      P(8, 4, 5, 18, G); P(9, 3, 3, 1, G); P(3, 9, 3, 7, G); P(5, 14, 3, 2, G); P(15, 6, 3, 8, G); P(13, 12, 2, 2, G);
      P(9, 6, 1, 14, GL); P(10, 1, 2, 2, '#ff8fab'); for (const [x, y] of [[11, 8], [12, 13], [8, 17], [4, 11], [16, 9]]) P(x, y, 1, 1, '#f4f1e8');
    } else { // ดอกทานตะวัน
      P(9, 8, 2, 14, GD); P(5, 12, 4, 2, G); P(11, 15, 4, 2, G);
      P(5, 0, 10, 10, '#ffd34d'); P(3, 2, 14, 6, '#ffd34d'); P(7, 2, 6, 6, '#9a6438'); P(8, 3, 2, 2, '#74482a');
    }
  } },
  floorLamp: { label: 'โคมไฟตั้งพื้น', emo: '💡', w: 14, h: 34, solid: true, foot: 4, glow: true, draw(P) {
    P(2, 0, 10, 9, '#fff1c4'); P(1, 3, 12, 6, '#fff1c4'); P(2, 7, 10, 2, '#f0d48a'); P(3, 1, 4, 1, '#ffffff');
    P(6, 9, 2, 21, '#5a5f7a'); P(3, 30, 8, 3, '#43475e'); P(4, 33, 6, 1, '#2f3245');
  } },
  tv: { label: 'ทีวี', emo: '📺', w: 36, h: 30, solid: true, foot: 9, draw(P) {
    P(0, 18, 36, 10, WOOD.m); P(0, 18, 36, 2, WOOD.l); P(2, 21, 15, 6, WOOD.d); P(19, 21, 15, 6, WOOD.d); P(9, 23, 2, 2, '#ffd34d'); P(25, 23, 2, 2, '#ffd34d');
    P(2, 28, 3, 2, WOOD.dd); P(31, 28, 3, 2, WOOD.dd);
    P(3, 0, 30, 17, '#2f3245'); P(16, 17, 4, 1, '#2f3245');
  },
  anim(ctx, sx, sy, t) {
    const cols = ['#7d9cf0', '#ff8fab', '#8fd694', '#ffe07a'];
    const k = Math.floor(t * 1.5) % 4;
    ctx.fillStyle = cols[k]; ctx.fillRect(sx + 6, sy + 3, 26, 13);
    ctx.fillStyle = cols[(k + 1) % 4]; ctx.fillRect(sx + 6, sy + 11, 26, 5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 9 + (Math.floor(t * 8) % 18), sy + 7, 3, 3);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(sx + 7, sy + 4, 6, 1);
  } },
  arcade: { label: 'ตู้เกม', emo: '🕹️', w: 22, h: 36, solid: true, foot: 8, variants: 4, draw(P, v) {
    const [m, d, l] = COLORWAYS[[4, 1, 5, 0][v % 4]];
    P(1, 0, 20, 36, m); P(0, 2, 22, 32, m); P(1, 0, 20, 5, '#2f3245'); P(3, 1, 16, 3, '#ffe07a');
    P(3, 6, 16, 13, '#2f3245'); P(0, 20, 22, 5, d); P(5, 21, 2, 2, '#e8505b'); P(12, 21, 2, 2, '#6cc6d9'); P(16, 21, 2, 2, '#ffe07a');
    P(3, 26, 16, 8, d); P(9, 28, 4, 4, '#2f3245'); P(1, 2, 2, 30, l); P(0, 34, 22, 2, '#2f3245');
  },
  anim(ctx, sx, sy, t) {
    ctx.fillStyle = '#1a1a3a'; ctx.fillRect(sx + 5, sy + 8, 14, 11);
    const p = Math.floor(t * 6) % 10;
    ctx.fillStyle = '#ffe07a'; ctx.fillRect(sx + 6 + p, sy + 13, 3, 3);
    ctx.fillStyle = '#ff8fab'; for (let i = 0; i < 3; i++) ctx.fillRect(sx + 7 + ((p + i * 4) % 11), sy + 10, 1, 1);
    ctx.fillStyle = '#8fd694'; ctx.fillRect(sx + 5, sy + 17, 14, 1);
  } },
  fridge: { label: 'ตู้เย็น', emo: '🧊', w: 20, h: 36, solid: true, foot: 8, draw(P) {
    P(0, 0, 20, 36, '#cfeee6'); P(1, 0, 18, 2, '#ecfff9'); P(0, 13, 20, 1, '#8fc6b8'); P(17, 4, 1, 7, '#8fc6b8'); P(17, 16, 1, 10, '#8fc6b8');
    P(3, 4, 3, 3, '#ff8fab'); P(7, 6, 3, 3, '#ffe07a'); P(4, 18, 4, 3, '#7d9cf0'); P(18, 2, 2, 34, '#a8d8cc'); P(1, 34, 18, 2, '#8fc6b8');
  } },
  counter: { label: 'เคาน์เตอร์กาแฟ', emo: '☕', w: 36, h: 30, solid: true, foot: 10, draw(P) {
    P(0, 12, 36, 6, '#f4f1e8'); P(0, 12, 36, 1, '#ffffff'); P(0, 18, 36, 12, WOOD.m); P(2, 20, 15, 8, WOOD.d); P(19, 20, 15, 8, WOOD.d);
    P(8, 23, 2, 2, '#ffd34d'); P(26, 23, 2, 2, '#ffd34d');
    P(3, 0, 14, 13, '#5a5f7a'); P(4, 1, 12, 3, '#43475e'); P(6, 6, 8, 2, '#2f3245'); P(8, 9, 4, 3, '#ffffff'); P(13, 5, 2, 2, '#e8505b');
    P(22, 8, 4, 5, '#ff8fab'); P(27, 9, 4, 4, '#6cc6d9'); P(31, 4, 3, 9, '#8fd694');
  },
  anim(ctx, sx, sy, t) {
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    const k = Math.floor(t * 3) % 3;
    ctx.fillRect(sx + 10 + (k === 1 ? 1 : 0), sy - 1 - k, 1, 2);
    ctx.fillRect(sx + 25 - (k === 2 ? 1 : 0), sy + 4 - k, 1, 2);
  } },
  catBed: { label: 'ที่นอนแมว', emo: '🐈', w: 22, h: 14, solid: false, draw(P) {
    P(2, 3, 18, 11, '#e06c8c'); P(0, 5, 22, 7, '#e06c8c'); P(3, 4, 16, 7, '#ffc2d2');
  },
  anim(ctx, sx, sy, t) {
    const br = Math.sin(t * 2) > 0 ? 1 : 0;
    ctx.fillStyle = '#2e2235'; ctx.fillRect(sx + 5, sy + 4 - br, 13, 7 + br);
    ctx.fillStyle = '#f2a65a'; ctx.fillRect(sx + 6, sy + 5 - br, 11, 5 + br); ctx.fillRect(sx + 5, sy + 3 - br, 2, 2); ctx.fillRect(sx + 9, sy + 3 - br, 2, 2);
    ctx.fillStyle = '#c9803e'; ctx.fillRect(sx + 11, sy + 5 - br, 1, 4); ctx.fillRect(sx + 14, sy + 5 - br, 1, 4);
    ctx.fillStyle = '#2e2235'; ctx.fillRect(sx + 7, sy + 7 - br, 2, 1);
    const z = Math.floor(t) % 3;
    ctx.fillStyle = '#ffffff'; ctx.font = '6px monospace';
    ctx.fillText('z', sx + 17 + z, sy - 1 - z * 2);
  } },
  fishTank: { label: 'ตู้ปลา', emo: '🐠', w: 30, h: 28, solid: true, foot: 8, draw(P) {
    P(0, 16, 30, 12, WOOD.m); P(0, 16, 30, 2, WOOD.l); P(3, 19, 24, 7, WOOD.d);
    P(1, 0, 28, 16, '#8fd0f0'); P(1, 0, 28, 2, '#c8ecff'); P(1, 13, 28, 3, '#e8d5a6');
    P(4, 8, 2, 6, '#3fa37a'); P(5, 6, 1, 3, '#62b56c'); P(23, 9, 2, 5, '#62b56c'); P(20, 12, 3, 2, '#c96a4a');
  },
  anim(ctx, sx, sy, t) {
    const x1 = 4 + Math.floor((Math.sin(t * 0.9) + 1) * 9), x2 = 6 + Math.floor((Math.cos(t * 0.7) + 1) * 8);
    ctx.fillStyle = '#ff9a3c'; ctx.fillRect(sx + x1, sy + 5, 4, 2); ctx.fillRect(sx + x1 + (Math.cos(t * 0.9) > 0 ? -1 : 4), sy + 4, 1, 4);
    ctx.fillStyle = '#ffe07a'; ctx.fillRect(sx + x2, sy + 9, 3, 2);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(sx + 8, sy + 10 - (Math.floor(t * 3) % 8), 1, 1);
  } },
  whiteboard: { label: 'กระดาน', emo: '📋', w: 36, h: 30, solid: true, foot: 5, board: true, draw(P) {
    P(0, 0, 36, 22, '#c8ccd8'); P(1, 1, 34, 20, '#ffffff'); P(4, 4, 12, 1, '#7d9cf0'); P(4, 7, 18, 1, '#9aa0b8'); P(4, 10, 14, 1, '#9aa0b8');
    P(24, 4, 8, 8, '#ffe07a'); P(25, 13, 7, 5, '#ff8fab'); P(5, 14, 6, 4, '#8fd694'); P(14, 15, 6, 1, '#e8505b');
    P(4, 22, 2, 8, '#5a5f7a'); P(30, 22, 2, 8, '#5a5f7a'); P(0, 21, 36, 1, '#9aa0b8');
  } },
  // ---------------- ห้องประชุม ----------------
  confTable: { label: 'โต๊ะประชุม', emo: '🗂️', w: 104, h: 34, solid: true, foot: 22, draw(P) {
    P(0, 0, 104, 22, WOOD.l); P(2, 1, 100, 1, '#f2c896'); P(0, 22, 104, 6, WOOD.m); P(0, 27, 104, 1, WOOD.d);
    P(3, 28, 4, 6, WOOD.d); P(97, 28, 4, 6, WOOD.d); P(50, 28, 4, 6, WOOD.d);
    P(10, 5, 14, 9, '#9aa0b8'); P(11, 6, 12, 6, '#7ec8ff'); P(10, 14, 14, 2, '#c8ccd8');
    P(76, 6, 12, 9, '#f4f1e8'); P(77, 8, 9, 1, '#9aa0b8'); P(77, 10, 7, 1, '#9aa0b8');
    P(40, 6, 3, 8, '#8fd0f0'); P(40, 5, 3, 1, '#4aa3df'); P(60, 7, 3, 8, '#8fd0f0'); P(60, 6, 3, 1, '#4aa3df');
    P(48, 9, 8, 5, '#ff8fab'); P(50, 7, 4, 2, '#8fd694');
  } },
  meetChair: { label: 'เก้าอี้ประชุม', emo: '🪑', w: 16, h: 20, solid: false, facing: true, variants: 6,
    seats: (f) => [{ dx: 0, dy: f ? -4 : -6, dir: f ? 'up' : 'down', over: true }],
    draw(P, v, f) {
      const [m, d, l] = COLORWAYS[v % 6];
      if (f) { P(1, 0, 14, 9, m); P(2, 1, 12, 1, l); P(0, 8, 16, 4, d); P(1, 8, 14, 1, m); }
      else { P(1, 0, 14, 8, d); P(2, 1, 12, 1, m); P(0, 7, 16, 5, m); P(1, 7, 14, 1, l); }
      P(7, 12, 2, 3, '#5a5f7a'); P(2, 15, 12, 1, '#5a5f7a'); P(1, 16, 2, 2, '#2f3245'); P(13, 16, 2, 2, '#2f3245'); P(7, 16, 2, 2, '#2f3245');
    } },
  bigScreen: { label: 'จอนำเสนอ', emo: '🖥️', w: 66, h: 42, solid: true, foot: 6, draw(P) {
    P(0, 0, 66, 34, '#2f3245'); P(2, 2, 62, 30, '#1d1f2e'); P(30, 34, 6, 5, '#5a5f7a'); P(20, 39, 26, 3, '#43475e');
  },
  anim(ctx, sx, sy, t) {
    const slide = Math.floor(t / 4) % 3;
    ctx.fillStyle = '#fff7ec'; ctx.fillRect(sx + 3, sy + 3, 60, 28);
    ctx.fillStyle = '#5a4f78'; ctx.fillRect(sx + 7, sy + 6, 26, 2);
    if (slide === 0) {
      const hs = [8, 13, 10, 17, 20];
      hs.forEach((h, i) => { ctx.fillStyle = ['#ff8fab', '#7d9cf0', '#8fd694', '#ffb86b', '#b48cf0'][i]; ctx.fillRect(sx + 10 + i * 9, sy + 28 - h, 6, h); });
    } else if (slide === 1) {
      ctx.fillStyle = '#9aa0b8'; for (let i = 0; i < 4; i++) ctx.fillRect(sx + 9, sy + 12 + i * 4, 30 - i * 5, 2);
      ctx.fillStyle = '#ffe07a'; ctx.fillRect(sx + 44, sy + 11, 14, 14); ctx.fillStyle = '#ff8fab'; ctx.fillRect(sx + 48, sy + 15, 6, 6);
    } else {
      ctx.fillStyle = '#7ec8ff'; ctx.fillRect(sx + 16, sy + 12, 34, 14); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 22, sy + 17, 22, 3);
    }
  } },
  // ---------------- สวน ----------------
  tree: { label: 'ต้นไม้ใหญ่', emo: '🌳', w: 44, h: 60, solid: true, foot: 8, fw: 12, variants: 3, draw(P, v) {
    const [G, GL, GD] = [['#3fa37a', '#8fd694', '#2d7a5a'], ['#e8a0c0', '#ffd6e6', '#c27896'], ['#e0954a', '#ffd08a', '#b06a30']][v % 3];
    P(18, 36, 8, 22, WOOD.d); P(19, 36, 2, 20, WOOD.m); P(14, 56, 16, 4, WOOD.dd);
    P(8, 4, 28, 30, G); P(4, 10, 36, 20, G); P(12, 0, 20, 4, G); P(2, 16, 40, 10, G); P(10, 30, 24, 8, G);
    for (const [x, y] of [[12, 6], [24, 4], [8, 16], [30, 12], [18, 18], [34, 22], [12, 26], [26, 28]]) { P(x, y, 5, 4, GL); P(x + 1, y + 4, 4, 1, GD); }
    P(4, 26, 36, 4, GD);
    if (v === 0) for (const [x, y] of [[16, 12], [30, 20], [10, 22]]) P(x, y, 2, 2, '#ff6b6b');
  } },
  bench: { label: 'ม้านั่ง', emo: '🪵', w: 42, h: 22, solid: true, foot: 8, seats: () => [{ dx: -10, dy: -5, dir: 'down', over: true }, { dx: 10, dy: -5, dir: 'down', over: true }], draw(P) {
    P(0, 0, 42, 4, WOOD.m); P(0, 5, 42, 4, WOOD.m); P(0, 0, 42, 1, WOOD.l); P(0, 5, 42, 1, WOOD.l);
    P(0, 11, 42, 5, WOOD.l); P(0, 15, 42, 1, WOOD.d);
    P(3, 0, 3, 22, '#5a5f7a'); P(36, 0, 3, 22, '#5a5f7a');
  } },
  flowerBed: { label: 'แปลงดอกไม้', emo: '🌷', w: 38, h: 18, solid: true, foot: 10, variants: 3, draw(P, v) {
    P(0, 8, 38, 10, WOOD.m); P(0, 8, 38, 2, WOOD.l); P(2, 6, 34, 4, '#6b4430');
    const cols = [['#ff6b8a', '#ffe07a', '#ff8fab'], ['#7d9cf0', '#b48cf0', '#ffffff'], ['#ffb86b', '#e8505b', '#ffe07a']][v % 3];
    for (let i = 0; i < 7; i++) {
      const x = 3 + i * 5, h = 3 + (i % 3);
      P(x + 1, 7 - h, 1, h, '#3fa37a'); P(x, 4 - h, 3, 3, cols[i % 3]); P(x + 1, 5 - h, 1, 1, '#ffe07a');
    }
  } },
  pond: { label: 'บ่อน้ำ', emo: '🐟', w: 62, h: 34, floor: true, solid: true, foot: 30, draw(P) {
    P(6, 0, 50, 34, '#9aa0b8'); P(2, 4, 58, 26, '#9aa0b8'); P(0, 8, 62, 18, '#9aa0b8');
    P(8, 2, 46, 30, '#5ab4e0'); P(4, 6, 54, 22, '#5ab4e0'); P(2, 10, 58, 14, '#5ab4e0');
    P(10, 4, 20, 2, '#a8ddf5'); P(6, 8, 6, 2, '#a8ddf5');
    P(44, 20, 8, 5, '#3fa37a'); P(46, 19, 4, 1, '#8fd694'); P(47, 21, 2, 2, '#ff8fab');
    for (const [x, y] of [[4, 2], [56, 4], [58, 26], [2, 28], [30, 32]]) P(x, y, 4, 3, '#c8ccd8');
  },
  anim(ctx, sx, sy, t) {
    const fx = 14 + Math.floor((Math.sin(t * 0.8) + 1) * 14), fy = 13 + Math.floor(Math.sin(t * 1.3) * 3);
    ctx.fillStyle = '#ff9a3c'; ctx.fillRect(sx + fx, sy + fy, 5, 2); ctx.fillRect(sx + fx + (Math.cos(t * 0.8) > 0 ? -1 : 5), sy + fy - 1, 1, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 30 - fx / 3, sy + 22, 4, 2); ctx.fillRect(sx + 28 - fx / 3, sy + 23, 1, 1);
    const r = Math.floor(t * 2) % 6;
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(sx + 34 - r, sy + 8, 2 + r * 2, 1);
  } },  // ---------------- โรงหนัง ----------------
  projectorScreen: { label: 'จอโปรเจกเตอร์', emo: '📽️', w: 212, h: 72, solid: true, foot: 4, draw(P) {
    P(0, 0, 212, 70, '#1d1f2e'); P(0, 0, 212, 3, '#43475e'); P(2, 2, 208, 66, '#2f3245');
    P(6, 5, 200, 60, '#d8dce8'); P(6, 5, 200, 2, '#ffffff');
    P(0, 68, 212, 4, '#1d1f2e'); P(3, 69, 206, 1, '#43475e');
  },
  anim(ctx, sx, sy, t) {
    // ยังไม่ฉาย: จอขาวนวลๆ มีโลโก้ฟิล์มเบาๆ
    ctx.fillStyle = '#eef0f6'; ctx.fillRect(sx + 7, sy + 6, 198, 58);
    ctx.fillStyle = 'rgba(90,79,120,.35)';
    const cx = sx + 106, cy = sy + 35;
    ctx.fillRect(cx - 14, cy - 8, 28, 16); ctx.fillStyle = '#eef0f6'; for (let i = 0; i < 4; i++) { ctx.fillRect(cx - 12 + i * 7, cy - 6, 4, 2); ctx.fillRect(cx - 12 + i * 7, cy + 4, 4, 2); }
    ctx.fillStyle = 'rgba(90,79,120,.25)'; ctx.fillRect(cx - 20, cy + 12, 40, 2);
  } },
  cinemaSeat: { label: 'เก้าอี้โรงหนัง', emo: '💺', w: 16, h: 20, solid: true, foot: 6, variants: 3,
    seats: () => [{ dx: 0, dy: -8, dir: 'up' }],
    draw(P, v) {
      const [m, d, l] = [['#b02a3a', '#7a1626', '#d84a5a'], ['#3f5fb0', '#26387a', '#6a86d8'], ['#2f3245', '#1d1f2e', '#4a4f68']][v % 3];
      P(2, 0, 12, 6, d); P(3, 1, 10, 4, m);                // เบาะนั่ง
      P(0, 4, 3, 12, '#2f3245'); P(13, 4, 3, 12, '#2f3245'); // ที่วางแขน
      P(1, 7, 14, 11, m); P(1, 7, 14, 2, l); P(1, 16, 14, 2, d); P(7, 9, 2, 7, d); // พนักพิง (เห็นด้านหลัง)
      P(13, 3, 3, 2, '#ffd34d');                            // ที่วางแก้ว
      P(2, 18, 2, 2, '#1d1f2e'); P(12, 18, 2, 2, '#1d1f2e');
    } },
  vipSeat: { label: 'เก้าอี้ VIP', emo: '🛋️', w: 24, h: 24, solid: true, foot: 8, variants: 2,
    seats: () => [{ dx: 0, dy: -10, dir: 'up' }],
    draw(P, v) {
      const [m, d, l] = [['#2a2a30', '#141418', '#4a4a55'], ['#5a2a6e', '#3a1648', '#7e4a94']][v % 2];
      P(3, 0, 18, 8, d); P(4, 1, 16, 6, m);
      P(0, 5, 4, 14, '#d9a441'); P(20, 5, 4, 14, '#d9a441'); P(0, 5, 4, 1, '#f4d27a'); P(20, 5, 4, 1, '#f4d27a');
      P(1, 9, 22, 13, m); P(1, 9, 22, 2, l); P(1, 20, 22, 2, d); P(6, 12, 12, 1, d); P(6, 16, 12, 1, d);
      P(9, 10, 6, 2, '#d9a441'); P(10, 10, 4, 1, '#f4d27a');      // ตรา VIP
      P(21, 3, 3, 3, '#e8e8f0');                                    // แก้วเครื่องดื่ม
    } },
  vvipBed: { label: 'เตียง VVIP (2 คน)', emo: '🛏️', w: 56, h: 40, solid: true, foot: 30,
    seats: () => [{ dx: -12, dy: -14, dir: 'up', over: true }, { dx: 12, dy: -14, dir: 'up', over: true }],
    draw(P) {
      P(2, 2, 52, 28, '#f4ead2'); P(2, 2, 52, 2, '#ffffff');               // ที่นอน
      P(2, 4, 52, 14, '#b02a3a'); P(2, 4, 52, 2, '#d84a5a'); P(2, 16, 52, 2, '#7a1626'); // ผ้าห่มแดง
      for (let x = 6; x < 52; x += 8) P(x, 9, 4, 1, '#d9a441');
      P(5, 20, 20, 8, '#ffffff'); P(31, 20, 20, 8, '#ffffff'); P(5, 26, 20, 2, '#d9cfb6'); P(31, 26, 20, 2, '#d9cfb6'); // หมอน
      P(0, 28, 56, 10, '#3a2418'); P(0, 28, 56, 2, '#d9a441'); P(2, 31, 52, 5, '#5a3824'); // หัวเตียง (หันมาทางเรา)
      P(25, 32, 6, 3, '#d9a441'); P(26, 33, 4, 1, '#f4d27a');
      P(0, 0, 3, 30, '#3a2418'); P(53, 0, 3, 30, '#3a2418'); P(0, 38, 4, 2, '#1d1f2e'); P(52, 38, 4, 2, '#1d1f2e');
    } },
  popcorn: { label: 'ตู้ป๊อปคอร์น', emo: '🍿', w: 22, h: 34, solid: true, foot: 8, draw(P) {
    P(1, 20, 20, 12, '#b02a3a'); P(1, 20, 20, 2, '#d84a5a'); P(3, 24, 16, 6, '#ffd34d'); P(5, 26, 12, 2, '#b02a3a');
    P(0, 4, 22, 17, '#cfe8f7'); P(0, 4, 22, 1, '#ffffff'); P(0, 4, 1, 17, '#2f3245'); P(21, 4, 1, 17, '#2f3245');
    P(0, 0, 22, 5, '#b02a3a'); P(2, 1, 18, 2, '#ffd34d'); P(3, 32, 3, 2, '#1d1f2e'); P(16, 32, 3, 2, '#1d1f2e');
  },
  anim(ctx, sx, sy, t) {
    ctx.fillStyle = '#fff6d8';
    for (let i = 0; i < 14; i++) { const x = sx + 2 + ((i * 7) % 18), y = sy + 13 + ((i * 5) % 7); ctx.fillRect(x, y, 2, 2); }
    for (let i = 0; i < 3; i++) { const ph = (t * 1.6 + i / 3) % 1; ctx.fillRect(sx + 6 + i * 5, sy + 13 - Math.round(Math.sin(ph * Math.PI) * 6), 2, 2); }
  } },
  // ---------------- ทะเล + ภูเขา ----------------
  palm: { label: 'ต้นมะพร้าว', emo: '🌴', w: 40, h: 58, solid: true, foot: 6, fw: 10, draw(P) {
    P(17, 20, 5, 36, '#a8743c'); for (let y = 22; y < 56; y += 5) P(17, y, 5, 1, '#8a5a2c'); P(20, 20, 2, 36, '#c08a4c');
    P(14, 54, 12, 4, '#d4b378');
    const leaf = (x, y, w, dir) => { for (let i = 0; i < w; i++) { P(x + i * dir, y + Math.floor((i * i) / (w * 1.2)), 2, 3, i % 3 ? '#3f9a4a' : '#57b45e'); } };
    leaf(20, 14, 20, 1); leaf(18, 14, 18, -1); leaf(20, 10, 14, 1); leaf(18, 10, 14, -1); P(14, 6, 12, 10, '#3f9a4a'); P(16, 4, 8, 4, '#57b45e');
    P(16, 16, 4, 4, '#7a4a24'); P(21, 17, 4, 4, '#7a4a24'); P(17, 17, 1, 1, '#a8743c');
  } },
  parasol: { label: 'ร่มชายหาด', emo: '⛱️', w: 40, h: 40, solid: true, foot: 4, fw: 4, variants: 3, draw(P, v) {
    const [a, b] = [['#ff6b8a', '#ffffff'], ['#3fa6e0', '#ffe07a'], ['#7ed37a', '#ffffff']][v % 3];
    P(19, 10, 2, 30, '#efe6d6'); P(19, 38, 2, 2, '#a89c88');
    for (let r = 0; r < 12; r++) { const half = 4 + r * 1.5 | 0; for (let x = -half; x < half; x++) P(20 + x, 2 + r, 1, 1, ((x + 40) / 5 | 0) % 2 ? a : b); }
    P(18, 0, 4, 3, b);
  } },
  beachChair: { label: 'เก้าอี้ชายหาด', emo: '🪑', w: 18, h: 22, solid: true, foot: 6, variants: 3,
    seats: () => [{ dx: 0, dy: -5, dir: 'right' }],
    draw(P, v) {
      const [a, b] = [['#ff8fab', '#ffffff'], ['#6cc6d9', '#ffffff'], ['#ffe07a', '#ff9a3c']][v % 3];
      P(2, 18, 2, 4, '#c8a27a'); P(14, 18, 2, 4, '#c8a27a');
      for (let y = 0; y < 12; y++) P(1, y, 4, 1, y % 4 < 2 ? a : b);
      for (let x = 1; x < 17; x++) P(x, 12, 1, 6, ((x / 3) | 0) % 2 ? a : b);
      P(0, 0, 1, 18, '#c8a27a'); P(17, 12, 1, 6, '#c8a27a');
    } },
  towel: { label: 'ผ้าเช็ดตัว', emo: '🏖️', w: 34, h: 16, floor: true, solid: false, variants: 4,
    seats: () => [{ dx: 0, dy: -3, dir: 'down' }],
    draw(P, v) {
      const [a, b] = [['#ff6b8a', '#ffd6e0'], ['#3fa6e0', '#d6efff'], ['#ffb03a', '#fff1c8'], ['#8f7dff', '#e6e0ff']][v % 4];
      P(0, 0, 34, 16, a); for (let x = 2; x < 34; x += 6) P(x, 0, 3, 16, b); P(0, 0, 34, 1, '#ffffff'); P(0, 15, 34, 1, '#00000022');
    } },
  sandcastle: { label: 'ปราสาททราย', emo: '🏰', w: 26, h: 24, solid: true, foot: 8, draw(P) {
    P(2, 12, 22, 12, '#e8c886'); P(2, 12, 22, 2, '#f6dca4'); P(4, 4, 6, 10, '#e8c886'); P(16, 4, 6, 10, '#e8c886'); P(10, 8, 6, 6, '#e8c886');
    for (const x of [4, 8, 16, 20]) P(x, 2, 2, 2, '#e8c886'); P(11, 16, 4, 8, '#c8a462'); P(6, 7, 2, 2, '#c8a462'); P(18, 7, 2, 2, '#c8a462');
    P(12, 0, 1, 8, '#7a5236'); P(13, 0, 5, 3, '#ff6b8a');
  } },
  surfboard: { label: 'กระดานโต้คลื่น', emo: '🏄', w: 12, h: 40, solid: true, foot: 4, fw: 8, variants: 3, draw(P, v) {
    const [a, b] = [['#ff9a3c', '#ffffff'], ['#3fa6e0', '#ffe07a'], ['#ff6b8a', '#8f7dff']][v % 3];
    P(3, 0, 6, 2, a); P(2, 2, 8, 34, a); P(3, 36, 6, 3, a); P(5, 2, 2, 36, b); P(2, 14, 8, 2, b);
  } },
  pine: { label: 'ต้นสน', emo: '🌲', w: 30, h: 50, solid: true, foot: 6, fw: 10, variants: 2, draw(P, v) {
    const [a, b, c] = v % 2 ? ['#2f6e4a', '#3f8a5a', '#f4f8ff'] : ['#2f6e4a', '#3f8a5a', '#57a46c'];
    P(13, 40, 4, 10, '#7a5236');
    for (let tier = 0; tier < 4; tier++) { const y0 = 4 + tier * 9, w = 10 + tier * 5; for (let r = 0; r < 12; r++) { const half = Math.round((w * (r + 2)) / 14); P(15 - half, y0 + r, half * 2, 1, r < 3 ? c : r % 4 === 0 ? b : a); } }
    P(14, 0, 2, 5, a);
  } },
  rock: { label: 'ก้อนหิน', emo: '🪨', w: 26, h: 16, solid: true, foot: 10, variants: 2, draw(P, v) {
    const [a, b, c] = ['#9a9cab', '#b8bac8', '#787a89'];
    P(3, 4, 20, 12, a); P(1, 7, 24, 8, a); P(5, 2, 12, 4, b); P(4, 4, 10, 3, b); P(2, 13, 22, 3, c); P(18, 6, 5, 8, c);
    if (v % 2) { P(6, 10, 5, 2, '#7ed37a'); P(15, 11, 4, 1, '#7ed37a'); }
  } },
  campfire: { label: 'กองไฟ', emo: '🔥', w: 22, h: 18, solid: true, foot: 8, draw(P) {
    for (const [x, y] of [[1, 12], [5, 14], [11, 15], [16, 13], [19, 10], [2, 8]]) P(x, y, 4, 3, '#8d8f9e');
    P(3, 10, 16, 3, '#7a4a24'); P(5, 12, 12, 3, '#5a3418'); P(3, 10, 16, 1, '#9a6a3c');
  },
  anim(ctx, sx, sy, t) {
    const f = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(sx + x, sy + y, w, h); };
    const k = Math.sin(t * 9) > 0 ? 1 : 0, k2 = Math.sin(t * 7 + 1) > 0 ? 1 : 0;
    f(7, 2 + k, 8, 9 - k, '#ff6b2a'); f(8, 0 + k2, 3, 4, '#ff9a3c'); f(12, 1 + k, 3, 4, '#ff9a3c'); f(9, 4 + k, 4, 6, '#ffd34d'); f(10, 6, 2, 4, '#fff6c8');
    for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1; ctx.fillStyle = `rgba(200,200,210,${0.5 * (1 - ph)})`; ctx.fillRect(sx + 9 + Math.round(Math.sin(ph * 6 + i) * 3), sy - 2 - ph * 18, 3, 3); }
  } },
  logSeat: { label: 'ขอนไม้นั่ง', emo: '🪵', w: 36, h: 12, solid: true, foot: 8, seats: () => [{ dx: -9, dy: -4, dir: 'down', over: true }, { dx: 9, dy: -4, dir: 'down', over: true }], draw(P) {
    P(2, 2, 32, 9, '#8a5a2c'); P(2, 2, 32, 2, '#a8743c'); P(2, 9, 32, 2, '#6a4220'); P(0, 3, 4, 7, '#c8a26a'); P(1, 5, 2, 3, '#a8743c'); P(32, 3, 4, 7, '#c8a26a'); P(33, 5, 2, 3, '#a8743c');
    for (let x = 8; x < 30; x += 7) P(x, 5, 3, 1, '#6a4220');
  } },
  tent: { label: 'เต็นท์', emo: '⛺', w: 46, h: 36, solid: true, foot: 20, variants: 2, draw(P, v) {
    const [a, b] = v % 2 ? ['#3fa6e0', '#2f7fb0'] : ['#ff9a3c', '#d4762a'];
    for (let r = 0; r < 30; r++) { const half = Math.round((r * 22) / 30); P(23 - half, 4 + r, half, 1, a); P(23, 4 + r, half, 1, b); }
    for (let r = 10; r < 30; r++) { const half = Math.round(((r - 10) * 6) / 20); P(23 - half, 4 + r, half * 2, 1, '#3a2418'); }
    P(22, 0, 2, 6, '#7a5236'); P(0, 33, 3, 3, '#7a5236'); P(43, 33, 3, 3, '#7a5236');
  } },
  // ---------------- ห้องไหว้พระ ----------------
  prayerMat: { label: 'เบาะกราบ', emo: '🙏', w: 20, h: 10, floor: true, solid: false, variants: 3,
    seats: () => [{ dx: 0, dy: -2, dir: 'up', kneel: true }],
    draw(P, v) {
      const [m, d] = [['#c02f38', '#8f1d26'], ['#d9a441', '#a8752a'], ['#7a5cc0', '#4f3a8a']][v % 3];
      P(1, 1, 18, 8, m); P(0, 2, 20, 6, m); P(1, 8, 18, 1, d); P(3, 3, 14, 4, d); P(4, 4, 12, 2, m);
      P(0, 2, 1, 1, '#f4d27a'); P(19, 2, 1, 1, '#f4d27a'); P(0, 7, 1, 1, '#f4d27a'); P(19, 7, 1, 1, '#f4d27a');
    } },
  flowerVase: { label: 'แจกันดอกไม้บูชา', emo: '💐', w: 14, h: 26, solid: true, foot: 5, draw(P) {
    P(4, 14, 6, 10, '#f4ead2'); P(3, 16, 8, 6, '#f4ead2'); P(4, 14, 6, 1, '#d9a441'); P(3, 21, 8, 1, '#d9a441'); P(4, 24, 6, 2, '#a8752a');
    P(6, 6, 1, 8, '#4f8a3a'); P(3, 8, 1, 6, '#4f8a3a'); P(10, 7, 1, 7, '#4f8a3a');
    P(4, 2, 5, 5, '#ffb03a'); P(5, 3, 3, 3, '#ff8f2a'); P(1, 5, 4, 4, '#ffd34d'); P(9, 4, 4, 4, '#ffd34d'); P(10, 5, 2, 2, '#ffb03a');
    P(6, 0, 2, 2, '#fff6e0');
  } },
  offeringTable: { label: 'โต๊ะวางของถวาย', emo: '🍊', w: 40, h: 22, solid: true, foot: 9, draw(P) {
    // ตั่งเตี้ยสีแดงขอบทอง
    P(0, 10, 40, 6, '#a8242e'); P(0, 10, 40, 2, '#c02f38'); P(0, 15, 40, 1, '#d9a441'); P(1, 16, 38, 2, '#8f1d26');
    P(2, 18, 3, 4, '#6e141b'); P(35, 18, 3, 4, '#6e141b'); P(4, 12, 32, 1, '#d9a441');
    // พานผลไม้
    P(4, 8, 12, 2, '#d9a441'); P(7, 10, 6, 1, '#a8752a');
    P(5, 4, 4, 4, '#ff9a3a'); P(9, 3, 4, 5, '#ffb03a'); P(7, 1, 4, 4, '#62b56c'); P(12, 5, 3, 3, '#e8505b'); P(6, 4, 1, 1, '#ffd8a0');
    // แก้วน้ำ
    P(20, 3, 4, 7, '#cfe8f7'); P(20, 3, 4, 1, '#ffffff'); P(21, 6, 2, 3, '#9fd0ef');
    // พวงมาลัย
    P(27, 6, 10, 4, '#fff6e0'); P(28, 7, 8, 2, '#f4ead2'); P(31, 5, 2, 2, '#ff9a3a'); P(30, 9, 4, 1, '#e8505b'); P(31, 10, 2, 1, '#62b56c');
  } },
  chantTable: { label: 'โต๊ะวางบทสวดมนต์', emo: '📿', w: 26, h: 16, solid: true, foot: 8, draw(P) {
    P(0, 7, 26, 5, '#7a4a2a'); P(0, 7, 26, 1, '#a8752a'); P(1, 11, 24, 1, '#5a3420'); P(2, 12, 3, 4, '#5a3420'); P(21, 12, 3, 4, '#5a3420');
    P(4, 2, 10, 6, '#f4ead2'); P(4, 2, 10, 1, '#ffffff'); P(8, 2, 1, 6, '#d9cfb6'); P(5, 4, 2, 1, '#b5a88a'); P(10, 4, 2, 1, '#b5a88a'); P(5, 6, 2, 1, '#b5a88a'); P(10, 6, 2, 1, '#b5a88a');
    for (let i = 0; i < 6; i++) P(16 + (i % 3) * 2, 3 + Math.floor(i / 3) * 2, 2, 2, i % 2 ? '#8a5428' : '#a96c38'); // ประคำ
    P(18, 7, 2, 1, '#d9a441');
  } },
  lotusBowl: { label: 'อ่างบัว', emo: '🪷', w: 32, h: 18, solid: true, foot: 10, draw(P) {
    P(2, 6, 28, 10, '#7a4a2a'); P(0, 5, 32, 3, '#a8752a'); P(3, 8, 26, 4, '#3f7fa8'); P(4, 8, 24, 1, '#7ec8ff');
    P(6, 9, 6, 2, '#4f8a3a'); P(19, 10, 7, 2, '#4f8a3a');
    P(12, 1, 8, 6, '#ff9fbf'); P(14, 0, 4, 2, '#ffd0dc'); P(11, 4, 2, 3, '#e86a9a'); P(19, 4, 2, 3, '#e86a9a'); P(15, 3, 2, 2, '#ffe07a');
  } },
  templeBell: { label: 'ระฆัง', emo: '🔔', w: 24, h: 36, solid: true, foot: 5, draw(P) {
    P(1, 0, 22, 4, '#8f1d26'); P(1, 0, 22, 1, '#b02a33'); P(2, 4, 3, 30, '#8f1d26'); P(19, 4, 3, 30, '#8f1d26'); P(0, 33, 24, 3, '#6b3a1f');
  },
  anim(ctx, sx, sy, t) {
    const sw = Math.round(Math.sin(t * 1.6) * 1.2);
    ctx.fillStyle = '#9a6a2a'; ctx.fillRect(sx + 11, sy + 4, 2, 4);
    ctx.fillStyle = '#d9a441'; ctx.fillRect(sx + 8 + sw, sy + 8, 8, 4); ctx.fillRect(sx + 7 + sw, sy + 12, 10, 8); ctx.fillRect(sx + 6 + sw, sy + 19, 12, 3);
    ctx.fillStyle = '#f4d27a'; ctx.fillRect(sx + 8 + sw, sy + 9, 2, 10);
    ctx.fillStyle = '#a8752a'; ctx.fillRect(sx + 11 + sw, sy + 22, 2, 2);
  } },
  // ---------------- คาราโอเกะ ----------------
  speaker: { label: 'ลำโพง', emo: '🔊', w: 18, h: 32, solid: true, foot: 7, draw(P) {
    P(0, 0, 18, 32, '#2f3245'); P(1, 0, 16, 1, '#43475e'); P(0, 30, 18, 2, '#1d1f2e');
    P(5, 3, 8, 6, '#1d1f2e'); P(7, 5, 4, 2, '#5a5f7a');
    P(3, 12, 12, 13, '#1d1f2e'); P(1, 14, 16, 9, '#1d1f2e'); P(5, 15, 8, 7, '#43475e'); P(7, 17, 4, 3, '#5a5f7a');
  },
  anim(ctx, sx, sy, t) {
    const k = Math.sin(t * 9) > 0.2 ? 1 : 0;
    ctx.fillStyle = '#5a5f7a'; ctx.fillRect(sx + 5 - k, sy + 15 - k, 8 + k * 2, 7 + k * 2);
    ctx.fillStyle = '#9aa0b8'; ctx.fillRect(sx + 8, sy + 17, 2, 3);
    ctx.fillStyle = ['#ff5fa2', '#5fd8ff', '#ffe066'][Math.floor(t * 3) % 3]; ctx.fillRect(sx + 8, sy + 27, 2, 1);
  } },
  micStand: { label: 'ไมค์ร้องเพลง', emo: '🎤', w: 12, h: 30, solid: true, foot: 3, draw(P) {
    P(4, 0, 4, 6, '#43475e'); P(4, 0, 4, 1, '#9aa0b8'); P(5, 1, 1, 4, '#5a5f7a'); P(3, 6, 6, 1, '#2f3245');
    P(5, 7, 2, 20, '#9aa0b8'); P(5, 7, 1, 20, '#c8ccd8'); P(1, 27, 10, 2, '#5a5f7a'); P(2, 29, 8, 1, '#2f3245');
    P(6, 10, 4, 1, '#ff8fab');
  } },
  // ---------------- ผับ ----------------
  bottleShelf: { label: 'ชั้นขวดเครื่องดื่ม', emo: '🍾', w: 46, h: 34, solid: true, foot: 6, draw(P) {
    P(0, 0, 46, 34, WOOD.dd); P(1, 0, 44, 1, WOOD.d);
    const cols = ['#62b56c', '#c96a4a', '#ffd34d', '#7ec8ff', '#b48cf0', '#e8505b', '#f4f1e8'];
    for (let s = 0; s < 3; s++) {
      const y0 = 2 + s * 10;
      P(2, y0, 42, 8, '#3a2418');
      for (let i = 0; i < 7; i++) {
        const c = cols[(i + s * 3) % 7], x = 3 + i * 6, h = 5 + ((i + s) % 3);
        P(x + 1, y0 + 8 - h, 3, h, c); P(x + 2, y0 + 8 - h - 2, 1, 2, c); P(x + 1, y0 + 8 - h, 1, h, shade(c, 0.35));
      }
      P(1, y0 + 8, 44, 2, WOOD.d);
    }
  } },
  barCounter: { label: 'บาร์', emo: '🍺', w: 112, h: 39, solid: true, foot: 12, draw(P) {
    P(0, 9, 112, 8, '#c98d58'); P(0, 9, 112, 2, '#e6b07a'); P(0, 17, 112, 20, WOOD.dd); P(0, 35, 112, 2, '#3a2418');
    for (let x = 4; x < 108; x += 18) { P(x, 20, 14, 13, '#5a3824'); P(x + 1, 21, 12, 1, '#7a4e34'); }
    P(0, 17, 112, 1, '#ffd34d');
    // ก๊อกเบียร์ + แก้ว
    P(14, 1, 3, 8, '#c8ccd8'); P(12, 0, 7, 2, '#9aa0b8'); P(20, 1, 3, 8, '#c8ccd8'); P(18, 0, 7, 2, '#9aa0b8');
    P(44, 10, 5, 6, '#ffd34d'); P(44, 9, 5, 2, '#ffffff'); P(49, 11, 1, 3, '#f4f1e8');
    P(70, 10, 5, 6, '#ff8fab'); P(71, 9, 3, 1, '#8fd694'); P(92, 11, 6, 4, '#7ec8ff');
  } },
  barStool: { label: 'เก้าอี้บาร์', emo: '🪑', w: 14, h: 18, solid: false, variants: 6,
    seats: () => [{ dx: 0, dy: -7, dir: 'up', over: true }],
    draw(P, v) {
      const [m, d, l] = COLORWAYS[(v + 1) % 6];
      P(1, 0, 12, 5, m); P(2, 0, 10, 1, l); P(1, 4, 12, 1, d);
      P(6, 5, 2, 10, '#9aa0b8'); P(3, 10, 8, 1, '#9aa0b8'); P(3, 15, 8, 2, '#5a5f7a');
    } },
  dartboard: { label: 'ปาเป้า', emo: '🎯', w: 22, h: 34, solid: true, foot: 4, draw(P) {
    P(10, 18, 2, 14, WOOD.d); P(5, 31, 12, 3, WOOD.dd);
    P(3, 0, 16, 18, '#2f3245'); P(1, 2, 20, 14, '#2f3245');
    P(4, 2, 14, 14, '#f4f1e8'); P(3, 4, 16, 10, '#f4f1e8');
    P(6, 4, 10, 10, '#e8505b'); P(5, 6, 12, 6, '#e8505b'); P(8, 6, 6, 6, '#62b56c'); P(10, 8, 2, 2, '#e8505b');
    P(13, 5, 1, 3, '#ffd34d'); P(7, 9, 3, 1, '#7ec8ff');
  } },
  poolTable: { label: 'โต๊ะพูล', emo: '🎱', w: 66, h: 38, solid: true, foot: 28, draw(P) {
    P(0, 0, 66, 30, '#74482a'); P(1, 1, 64, 2, '#9a6438');
    P(4, 4, 58, 22, '#2f9a5a'); P(5, 5, 56, 1, '#4fb878');
    for (const [x, y] of [[3, 3], [31, 2], [60, 3], [3, 24], [31, 25], [60, 24]]) P(x, y, 3, 3, '#1d1f2e');
    P(0, 30, 66, 4, '#5a3824'); P(3, 34, 4, 4, '#3a2418'); P(59, 34, 4, 4, '#3a2418');
    P(14, 14, 3, 3, '#ffffff'); P(42, 10, 3, 3, '#e8505b'); P(46, 13, 3, 3, '#ffd34d'); P(42, 16, 3, 3, '#7d9cf0'); P(49, 10, 3, 3, '#2f3245');
    P(18, 15, 22, 1, '#e6b07a');
  } },
  // ---------------- 🎸 คอนเสิร์ต ----------------
  drumKit: { label: '🥁 กลองชุด', emo: '🥁', w: 38, h: 28, solid: true, foot: 10, draw(P) {
    const R = '#c8323c', RD = '#8f1d26', CH = '#c8ccd8', CD = '#7a8098', SK = '#f4ead2';
    P(3, 2, 1, 22, CD); P(0, 2, 8, 2, '#ffd34d'); P(1, 1, 6, 1, '#ffe98a'); P(34, 4, 1, 20, CD); P(30, 4, 8, 2, '#ffd34d');
    P(8, 7, 9, 6, R); P(8, 7, 9, 2, SK); P(8, 12, 9, 1, RD); P(21, 7, 9, 6, R); P(21, 7, 9, 2, SK); P(21, 12, 9, 1, RD);
    P(11, 12, 16, 14, R); P(13, 14, 12, 10, SK); P(17, 17, 4, 4, '#ffd34d'); P(11, 25, 16, 1, RD);
    P(1, 16, 8, 8, R); P(1, 16, 8, 2, SK); P(1, 23, 8, 1, RD); P(29, 16, 8, 8, R); P(29, 16, 8, 2, SK); P(29, 23, 8, 1, RD);
    for (const x of [2, 7, 30, 35]) P(x, 24, 1, 4, CD);
  } },
  synth: { label: '🎹 คีย์บอร์ด', emo: '🎹', w: 34, h: 24, solid: true, foot: 6, draw(P) {
    P(2, 0, 30, 10, '#2f3245'); P(3, 1, 28, 1, '#43475e'); P(4, 2, 8, 3, '#5fd8ff'); P(14, 3, 2, 2, '#ff6b8a'); P(18, 3, 2, 2, '#ffd34d'); P(22, 3, 2, 2, '#7dff8a'); P(26, 3, 3, 2, '#9aa0b8');
    P(2, 6, 30, 5, '#ffffff'); for (let x = 3; x < 32; x += 3) P(x, 6, 1, 5, '#c8ccd8'); for (let x = 4; x < 31; x += 3) if (x % 7 !== 0) P(x, 6, 2, 3, '#1d1f2e');
    P(2, 11, 30, 2, '#1d1f2e'); P(6, 13, 2, 9, '#5a5f7a'); P(26, 13, 2, 9, '#5a5f7a'); P(8, 16, 18, 1, '#5a5f7a'); P(4, 22, 6, 2, '#43475e'); P(24, 22, 6, 2, '#43475e');
  } },
  stageLight: { label: '💡 ไฟเวที', emo: '💡', w: 18, h: 32, solid: true, foot: 4, fw: 10, variants: 4, draw(P) {
    P(8, 12, 2, 16, '#5a5f7a'); P(3, 28, 12, 2, '#43475e'); P(2, 30, 3, 2, '#2f3245'); P(13, 30, 3, 2, '#2f3245');
    P(3, 1, 12, 11, '#2f3245'); P(4, 2, 10, 1, '#43475e'); P(2, 4, 1, 6, '#5a5f7a'); P(15, 4, 1, 6, '#5a5f7a'); P(5, 4, 8, 6, '#1d1f2e');
  },
  anim(ctx, sx, sy, t, it) {
    const C = ['#ff5fa2', '#5fd8ff', '#ffe066', '#7dff8a'][(it && it.v) || 0], on = Math.sin(t * 5 + ((it && it.x) || 0)) > -0.6;
    ctx.fillStyle = on ? C : '#3a3a4a'; ctx.fillRect(sx + 5, sy + 4, 8, 6); if (on) { ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 7, sy + 6, 3, 2); }
  } },
  // ---------------- 🎄 คริสต์มาส ----------------
  xmasTreeS: xmasTreeDef('🎄 ต้นคริสต์มาส (เล็ก)', 26, 40, 3),
  xmasTree: xmasTreeDef('🎄 ต้นคริสต์มาส (กลาง)', 40, 62, 4),
  xmasTreeL: xmasTreeDef('🎄 ต้นคริสต์มาส (ใหญ่)', 58, 90, 5),
  xmasTreeXL: xmasTreeDef('🎄 ต้นคริสต์มาส (ยักษ์)', 82, 126, 6),
  gift: { label: '🎁 กล่องของขวัญ', emo: '🎁', w: 16, h: 17, solid: true, foot: 6, variants: 4, draw(P, v) {
    const [b, r] = [['#e8505b', '#ffd34d'], ['#3fa35a', '#e8505b'], ['#3f7fe0', '#ffffff'], ['#a868e8', '#ff9fd8']][v % 4];
    P(1, 6, 14, 11, b); P(1, 15, 14, 2, shade(b, -0.22)); P(12, 6, 3, 11, shade(b, -0.12));
    P(0, 4, 16, 4, shade(b, 0.12)); P(0, 7, 16, 1, shade(b, -0.25));
    P(7, 4, 2, 13, r); P(0, 5, 16, 1, r);
    P(3, 0, 4, 3, r); P(9, 0, 4, 3, r); P(4, 1, 2, 1, shade(r, -0.25)); P(10, 1, 2, 1, shade(r, -0.25)); P(7, 2, 2, 2, shade(r, -0.15));
  } },
  giftPile: { label: '🎁 กองของขวัญ', emo: '🎁', w: 36, h: 24, solid: true, foot: 9, draw(P) {
    const box = (x, y, w, h, b, r) => { P(x, y + 3, w, h - 3, b); P(x, y + h - 2, w, 2, shade(b, -0.22)); P(x - 1, y + 1, w + 2, 3, shade(b, 0.12)); P(x + (w >> 1) - 1, y + 1, 2, h - 1, r); P(x - 1, y + 2, w + 2, 1, r); P(x + (w >> 1) - 4, y - 2, 3, 3, r); P(x + (w >> 1) + 1, y - 2, 3, 3, r); };
    box(3, 6, 16, 17, '#3fa35a', '#e8505b'); box(9, 1, 9, 8, '#ffd34d', '#c8323c'); box(19, 11, 14, 12, '#e8505b', '#ffffff'); box(29, 17, 6, 6, '#3f7fe0', '#ffd34d');
  } },
  snowman: { label: '⛄ ตุ๊กตาหิมะ', emo: '⛄', w: 22, h: 34, solid: true, foot: 7, variants: 2, draw(P, v) {
    const WH = '#ffffff', SH = '#d8e4f4', sc = v % 2 ? '#3f7fe0' : '#e8505b';
    const E = (cx, cy, rx, ry) => { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2))); P(cx - w, cy + y, w * 2 + 1, 1, WH); P(cx + w - 1, cy + y, 2, 1, SH); } };
    P(1, 13, 5, 1, '#7a5236'); P(0, 12, 2, 1, '#7a5236'); P(16, 13, 5, 1, '#7a5236'); P(20, 12, 2, 1, '#7a5236');
    E(11, 27, 8, 6); E(11, 18, 6, 5); E(11, 9, 5, 4); P(4, 32, 15, 1, SH);
    P(6, 4, 11, 2, '#2e2235'); P(8, 0, 7, 5, '#2e2235'); P(8, 3, 7, 1, sc);
    P(9, 8, 1, 1, '#2e2235'); P(13, 8, 1, 1, '#2e2235'); P(11, 10, 3, 1, '#ff9a3c'); P(9, 12, 1, 1, '#2e2235'); P(10, 12, 3, 1, '#2e2235'); P(13, 12, 1, 1, '#2e2235');
    P(6, 14, 11, 2, sc); P(13, 16, 3, 4, sc); P(13, 19, 3, 1, shade(sc, -0.25));
    P(11, 18, 1, 1, '#2e2235'); P(11, 21, 1, 1, '#2e2235'); P(11, 26, 1, 1, '#2e2235');
  } },
  candyCane: { label: '🍭 ลูกกวาดไม้เท้า', emo: '🍭', w: 12, h: 32, solid: true, foot: 3, fw: 6, draw(P) {
    const pts = [];
    for (let y = 31; y >= 6; y--) pts.push([7, y]);
    for (const [x, y] of [[7, 5], [7, 4], [6, 3], [5, 2], [4, 2], [3, 2], [2, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8]]) pts.push([x, y]);
    pts.forEach(([x, y], i) => P(x - 1, y - 1, 3, 3, Math.floor(i / 3) % 2 ? '#ffffff' : '#e8323c'));
    P(7, 8, 1, 22, 'rgba(255,255,255,.5)');
  } },
  reindeer: { label: '🦌 กวางเรนเดียร์', emo: '🦌', w: 32, h: 30, solid: true, foot: 8, facing: true, draw(P, v, f) {
    const B = '#a8743c', BD = '#7a5228', BL = '#c8945a', AN = '#d9b98a', HO = '#3a2418';
    const pp = f ? (x, y, w, h, c) => P(32 - x - w, y, w, h, c) : P;
    for (const x of [12, 14, 21, 23]) { pp(x, 20, 2, 9, x === 14 || x === 23 ? BD : B); pp(x, 28, 2, 2, HO); }
    for (let y = -5; y <= 5; y++) { const w = Math.round(9 * Math.sqrt(Math.max(0, 1 - (y / 5.5) ** 2))); pp(18 - w, 16 + y, w * 2 + 1, 1, y > 2 ? BD : y < -3 ? BL : B); }
    pp(14, 19, 8, 2, '#f0dcc0'); pp(27, 12, 3, 3, '#f4ece0');
    pp(8, 8, 5, 9, B); pp(8, 8, 1, 7, BL);
    pp(3, 5, 9, 6, B); pp(4, 4, 6, 1, BL); pp(1, 8, 4, 3, BL);
    pp(7, 6, 1, 1, '#2e2235'); pp(8, 6, 1, 1, '#ffffff'); pp(10, 3, 3, 2, BD);
    pp(5, 0, 1, 4, AN); pp(3, 1, 2, 1, AN); pp(8, 0, 1, 4, AN); pp(9, 1, 2, 1, AN); pp(6, 2, 2, 1, AN);
    pp(8, 13, 6, 2, '#c8323c'); pp(10, 15, 2, 2, '#ffd34d');
  },
  anim(ctx, sx, sy, t, it) {
    const on = Math.sin(t * 4) > -0.3, x = it && it.f ? 32 - 0 - 3 : 0;
    ctx.fillStyle = on ? '#ff3a3a' : '#a8242e'; ctx.fillRect(sx + x, sy + 8, 3, 3);
    if (on) { ctx.fillStyle = 'rgba(255,80,80,.3)'; ctx.fillRect(sx + x - 2, sy + 6, 7, 7); }
  } },
  sleigh: { label: '🛷 เลื่อนซานต้า', emo: '🛷', w: 46, h: 28, solid: true, foot: 12,
    seats: () => [{ dx: -10, dy: -5, dir: 'down' }, { dx: 10, dy: -5, dir: 'down' }],
    draw(P) {
      const R = '#c8323c', RD = '#8f1d26', RL = '#e8505b', G = '#ffd34d', GD = '#c8962a';
      P(2, 0, 42, 13, R); P(3, 1, 40, 2, RL); P(2, 0, 42, 1, G); for (let x = 6; x < 42; x += 8) P(x, 5, 3, 3, G);
      P(0, 6, 7, 18, R); P(39, 6, 7, 18, R); P(0, 6, 7, 1, G); P(39, 6, 7, 1, G); P(1, 9, 1, 12, RL);
      P(7, 12, 32, 8, '#6a1a3a'); P(7, 12, 32, 2, '#8a2a52');
      P(0, 20, 46, 5, R); P(0, 20, 46, 1, G); P(0, 24, 46, 1, RD);
      P(4, 25, 3, 2, GD); P(39, 25, 3, 2, GD); P(1, 27, 44, 1, G); P(44, 23, 2, 4, G); P(45, 22, 1, 1, G); P(0, 26, 2, 1, G);
    } },
  xmasWreath: { label: '💚 พวงหรีดคริสต์มาส', emo: '💚', w: 22, h: 25, solid: false, draw(P) {
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const d = Math.hypot(x, y); if (d <= 9.4 && d >= 4.6) P(11 + x, 10 + y, 1, 1, (x * 3 + y * 5) % 4 === 0 ? '#5cb870' : d > 8.2 ? '#2a6e44' : '#3a8f55'); }
    for (const [x, y] of [[4, 5], [16, 4], [18, 12], [6, 15], [11, 2], [2, 10]]) { P(x, y, 2, 2, '#e8323c'); P(x, y, 1, 1, '#ff9a9a'); }
    P(7, 17, 3, 3, '#e8323c'); P(12, 17, 3, 3, '#e8323c'); P(10, 18, 2, 2, '#b8242e'); P(8, 20, 2, 5, '#e8323c'); P(12, 20, 2, 5, '#e8323c');
  } },
  xmasLights: { label: '✨ ไฟประดับ', emo: '✨', w: 50, h: 34, solid: false, draw(P) {
    for (const x of [1, 46]) { for (let y = 3; y < 34; y++) P(x, y, 3, 1, Math.floor(y / 3) % 2 ? '#ffffff' : '#e8323c'); P(x - 1, 1, 5, 2, '#ffd34d'); }
    for (let x = 4; x < 46; x++) P(x, 5 + Math.round(9 * Math.sin(Math.PI * (x - 4) / 42)), 1, 1, '#2e3a2e');
  },
  anim(ctx, sx, sy, t) {
    const COL = ['#ff5a5a', '#ffe066', '#5fd8ff', '#7dff8a', '#ff8fe0'], f = Math.floor(t * 3);
    for (let i = 0, x = 7; x < 44; x += 5, i++) { const y = 5 + Math.round(9 * Math.sin(Math.PI * (x - 4) / 42)); const c = COL[(i + f) % COL.length]; ctx.fillStyle = c; ctx.fillRect(sx + x, sy + y + 1, 2, 3); if ((i + f) % 2) { ctx.fillStyle = c + '55'; ctx.fillRect(sx + x - 1, sy + y, 4, 5); } }
  } },
  gingerHouse: { label: '🏠 บ้านขนมปังขิง', emo: '🍪', w: 32, h: 30, solid: true, foot: 12, draw(P) {
    const BR = '#b5743c', BD = '#8a5228', IC = '#ffffff';
    P(3, 13, 26, 17, BR); P(3, 28, 26, 2, BD); P(24, 13, 5, 17, BD);
    for (let r = 0; r < 14; r++) { const half = r + 2; P(16 - half, r, half * 2, 1, r % 4 === 3 ? IC : '#8a4a24'); }
    P(0, 14, 32, 2, IC); for (let x = 1; x < 31; x += 3) P(x, 16, 1, 2, IC);
    P(13, 20, 6, 10, '#6a3a1a'); P(13, 20, 6, 1, IC); P(17, 25, 1, 1, '#ffd34d');
    P(6, 19, 5, 5, '#ffe9a0'); P(6, 19, 5, 1, IC); P(8, 19, 1, 5, IC); P(22, 19, 5, 5, '#ffe9a0'); P(22, 19, 5, 1, IC); P(24, 19, 1, 5, IC);
    for (const [x, y, c] of [[5, 26, '#e8505b'], [9, 27, '#3fa35a'], [21, 27, '#5ab4ff'], [26, 26, '#ffd34d'], [14, 5, '#e8505b'], [17, 8, '#3fa35a'], [11, 10, '#ffd34d']]) P(x, y, 2, 2, c);
    P(20, 0, 3, 5, '#c8323c'); P(20, 0, 3, 1, IC);
  } },
  snowPatch: { label: '❄️ ลานหิมะ', emo: '❄️', w: 60, h: 34, floor: true, solid: false, draw(P) {
    const rows = [[14, 32], [8, 44], [4, 52], [2, 56], [1, 58], [0, 60], [0, 60], [1, 58], [2, 56], [4, 52], [7, 46], [12, 36]];
    rows.forEach(([x, w], i) => { const y = 1 + i * 2.8 | 0; P(x, y, w, 3, '#f4f8ff'); });
    P(6, 26, 48, 3, '#dce6f4'); P(14, 30, 32, 2, '#dce6f4');
    for (const [x, y] of [[10, 8], [24, 5], [40, 10], [50, 16], [18, 18], [33, 22], [8, 20], [44, 25]]) P(x, y, 2, 1, '#cfdcf0');
  },
  anim(ctx, sx, sy, t) {
    for (let i = 0; i < 5; i++) { const ph = (t * 0.6 + i * 0.37) % 1; if (ph > 0.3) continue; ctx.fillStyle = '#ffffff'; const x = sx + ((i * 23) % 52) + 4, y = sy + ((i * 13) % 24) + 4; ctx.fillRect(x, y - 1, 1, 3); ctx.fillRect(x - 1, y, 3, 1); }
  } },
};

// ---------- สไปรต์เฟอร์นิเจอร์จาก FURN ----------
function furnSprite(type, v = 0, f = 0) {
  const d = FURN[type];
  return cached(`f|${type}|${v}|${f}`, () => {
    const c = mkCanvas(d.w + 2, d.h + 2);
    const g = c.getContext('2d');
    d.draw(painter(g, 1, 1), v || 0, f || 0);
    if (!d.floor) addOutline(c);
    return c;
  });
}

// ============================================================================
// โต๊ะทำงาน (แต่งได้) — สไปรต์ 40x40, เก้าอี้ 18x20
// ============================================================================
const DESK_COLORS = [
  ['ไม้โอ๊ก', '#e6b07a', '#c98d58', '#9a6438'], ['วอลนัท', '#a86e44', '#87522f', '#643a1e'], ['ขาว', '#f6f3ea', '#dad3c4', '#b2a896'],
  ['ชมพู', '#ffc6d6', '#f29ab4', '#cf7694'], ['มิ้นต์', '#c4f0e0', '#92d8c0', '#66b89d'], ['ดำ', '#5f6480', '#474b63', '#323548'],
];
const SETUPS = [['laptop', 'โน้ตบุ๊ก'], ['monitor', 'จอเดี่ยว'], ['dual', 'จอคู่'], ['crt', 'จอ CRT ย้อนยุค'], ['gaming', 'เกมมิ่ง RGB'], ['none', 'โต๊ะโล่ง']];
const DESK_ITEMS = [
  ['plant', '🪴 ต้นไม้'], ['cactus', '🌵 แคคตัส'], ['coffee', '☕ กาแฟ'], ['boba', '🧋 ชานม'], ['cat', '🐈 แมว'], ['lamp', '💡 โคม'],
  ['books', '📚 หนังสือ'], ['duck', '🦆 เป็ด'], ['robot', '🤖 ฟิกเกอร์'], ['notes', '📝 โน้ต'], ['photo', '🖼️ รูป'], ['donut', '🍩 โดนัท'],
];
const RUG_COLORS = [['none', 'ไม่มี', null], ['pink', 'ชมพู', '#ffc6d6'], ['blue', 'ฟ้า', '#b9cbff'], ['green', 'เขียว', '#c4f0c8'], ['yellow', 'เหลือง', '#ffe9a8'], ['purple', 'ม่วง', '#dcc8ff']];
const DEFAULT_DESK = { c: 0, s: 'monitor', ch: 5, items: ['plant', 'coffee'], rug: 'none' };

function cleanDesk(s) {
  const o = { ...DEFAULT_DESK, items: [...DEFAULT_DESK.items] };
  if (!s || typeof s !== 'object') return o;
  if (Number.isInteger(s.c) && s.c >= 0 && s.c < DESK_COLORS.length) o.c = s.c;
  if (SETUPS.some((x) => x[0] === s.s)) o.s = s.s;
  if (Number.isInteger(s.ch) && s.ch >= 0 && s.ch < COLORWAYS.length) o.ch = s.ch;
  if (Array.isArray(s.items)) o.items = s.items.filter((k) => DESK_ITEMS.some((x) => x[0] === k)).slice(0, 3);
  if (RUG_COLORS.some((x) => x[0] === s.rug)) o.rug = s.rug;
  return o;
}

function drawDeskItem(P, kind, x, y) {
  // x = กึ่งกลาง, y = ฐาน
  switch (kind) {
    case 'plant': P(x - 2, y - 3, 4, 3, '#c96a4a'); P(x - 3, y - 7, 6, 4, '#62b56c'); P(x - 1, y - 9, 2, 2, '#8fd694'); P(x - 4, y - 6, 1, 2, '#3fa37a'); P(x + 3, y - 6, 1, 2, '#3fa37a'); break;
    case 'cactus': P(x - 2, y - 3, 4, 3, '#e08a62'); P(x - 1, y - 9, 3, 6, '#3fa37a'); P(x - 3, y - 7, 2, 3, '#3fa37a'); P(x + 2, y - 8, 1, 3, '#3fa37a'); P(x, y - 10, 1, 1, '#ff8fab'); break;
    case 'coffee': P(x - 2, y - 4, 4, 4, '#ffffff'); P(x + 2, y - 3, 1, 2, '#ffffff'); P(x - 1, y - 4, 2, 1, '#9a6438'); break;
    case 'boba': P(x - 2, y - 6, 4, 6, '#f2d6b0'); P(x - 2, y - 2, 4, 2, '#5a3a2a'); P(x - 2, y - 7, 4, 1, '#ffffff'); P(x + 1, y - 10, 1, 4, '#ff8fab'); break;
    case 'cat': P(x - 4, y - 5, 8, 5, '#f2a65a'); P(x - 4, y - 7, 2, 2, '#f2a65a'); P(x + 2, y - 7, 2, 2, '#f2a65a'); P(x - 2, y - 4, 1, 1, '#2e2235'); P(x + 1, y - 4, 1, 1, '#2e2235'); P(x + 4, y - 2, 2, 1, '#f2a65a'); break;
    case 'lamp': P(x - 2, y - 1, 5, 1, '#5a5f7a'); P(x, y - 7, 1, 6, '#5a5f7a'); P(x - 2, y - 10, 5, 3, '#ffe07a'); P(x - 1, y - 8, 3, 1, '#fff6c8'); break;
    case 'books': P(x - 4, y - 2, 8, 2, '#e8505b'); P(x - 3, y - 4, 7, 2, '#7d9cf0'); P(x - 4, y - 6, 6, 2, '#ffe07a'); break;
    case 'duck': P(x - 2, y - 3, 5, 3, '#ffe07a'); P(x - 2, y - 6, 3, 3, '#ffe07a'); P(x - 3, y - 5, 1, 1, '#ff9a3c'); P(x - 1, y - 5, 1, 1, '#2e2235'); break;
    case 'robot': P(x - 2, y - 4, 4, 4, '#9aa0b8'); P(x - 2, y - 7, 4, 3, '#c8ccd8'); P(x - 1, y - 6, 1, 1, '#6cc6d9'); P(x + 1, y - 6, 1, 1, '#6cc6d9'); P(x, y - 9, 1, 2, '#e8505b'); break;
    case 'notes': P(x - 3, y - 3, 3, 3, '#ffe07a'); P(x, y - 4, 3, 3, '#ff8fab'); P(x - 2, y - 6, 3, 3, '#8fd694'); break;
    case 'photo': P(x - 3, y - 6, 6, 6, '#f4f1e8'); P(x - 2, y - 5, 4, 4, '#ffc6d6'); P(x - 1, y - 4, 1, 1, '#e8505b'); P(x + 1, y - 4, 1, 1, '#e8505b'); P(x - 1, y - 3, 3, 1, '#e8505b'); P(x, y - 2, 1, 1, '#e8505b'); break;
    case 'donut': P(x - 3, y - 3, 6, 3, '#d9a066'); P(x - 3, y - 4, 6, 2, '#ff8fab'); P(x - 1, y - 3, 2, 1, '#9a6438'); P(x - 2, y - 4, 1, 1, '#ffe07a'); P(x + 2, y - 4, 1, 1, '#7d9cf0'); break;
  }
}

function deskSprite(style) {
  const s = cleanDesk(style);
  return cached(`d|${s.c}|${s.s}|${s.items.join(',')}`, () => {
    const c = mkCanvas(42, 42);
    const g = c.getContext('2d');
    const P = painter(g, 1, 1);
    const [, l, m, d] = DESK_COLORS[s.c];
    // พื้นโต๊ะ + หน้าโต๊ะ + ขา
    P(1, 14, 38, 12, l); P(2, 15, 36, 1, shade(l, 0.25));
    P(1, 26, 38, 8, m); P(26, 27, 11, 6, d); P(30, 29, 3, 1, '#ffd34d');
    P(2, 34, 4, 5, d); P(34, 34, 4, 5, d);
    // ชุดคอม
    const scr = (x, y, w, h) => { P(x, y, w, h, '#3a3150'); P(x + 1, y + 1, w - 2, h - 3, '#7ec8ff'); P(x + 2, y + 2, Math.max(2, w - 8), 1, '#ffffff'); P(x + 2, y + 4, Math.max(2, w - 6), 1, '#c8ecff'); P(x + 2, y + 6, Math.max(2, w - 10), 1, '#ffd6e6'); };
    if (s.s === 'laptop') { P(13, 20, 14, 3, '#b0b4c4'); P(14, 21, 12, 1, '#d8dbe6'); P(13, 10, 14, 10, '#9aa0b8'); P(14, 11, 12, 8, '#7ec8ff'); P(15, 12, 6, 1, '#ffffff'); P(15, 14, 9, 1, '#c8ecff'); }
    if (s.s === 'monitor' || s.s === 'gaming') { scr(10, 2, 20, 14); P(18, 16, 4, 3, '#5a5f7a'); P(15, 19, 10, 1, '#5a5f7a'); }
    if (s.s === 'dual') { scr(3, 3, 17, 13); scr(20, 3, 17, 13); P(10, 16, 3, 3, '#5a5f7a'); P(27, 16, 3, 3, '#5a5f7a'); P(8, 19, 24, 1, '#5a5f7a'); }
    if (s.s === 'crt') { P(10, 2, 20, 18, '#e8dcc0'); P(11, 3, 18, 1, '#fff6e0'); P(12, 4, 16, 11, '#2f3245'); P(13, 5, 14, 9, '#5ad08a'); P(14, 6, 7, 1, '#c8ffd8'); P(14, 8, 10, 1, '#9cf0b8'); P(26, 17, 2, 1, '#e8505b'); }
    if (s.s !== 'none' && s.s !== 'laptop') { P(11, 21, 18, 3, '#e8e4ee'); P(12, 22, 16, 1, '#c8c4d0'); P(31, 21, 2, 3, '#e8e4ee'); }
    if (s.s === 'gaming') {
      const rgb = ['#e8505b', '#ffb86b', '#ffe07a', '#8fd694', '#6cc6d9', '#b48cf0'];
      rgb.forEach((col, i) => P(11 + i * 3, 24, 3, 1, col));
      P(32, 4, 6, 18, '#2f3245'); P(33, 6, 4, 2, '#b48cf0'); P(33, 10, 4, 1, '#6cc6d9'); P(33, 13, 4, 1, '#ff8fab');
    }
    // ของบนโต๊ะ: ช่องซ้าย, ช่องขวา, ช่องหลังซ้าย
    const slots = s.s === 'gaming' || s.s === 'dual' ? [[6, 24], [34, 24], [6, 18]] : [[6, 24], [34, 24], [6, 16]];
    s.items.forEach((k, i) => drawDeskItem(P, k, slots[i][0], slots[i][1]));
    addOutline(c);
    return c;
  });
}

function chairSprite(colorway) {
  return cached(`ch|${colorway}`, () => {
    const c = mkCanvas(18, 20);
    const P = painter(c.getContext('2d'), 1, 1);
    const [m, d, l] = COLORWAYS[colorway % COLORWAYS.length];
    P(2, 0, 12, 9, m); P(3, 1, 10, 1, l); P(1, 8, 14, 4, d); P(2, 8, 12, 1, m);
    P(7, 12, 2, 3, '#5a5f7a'); P(2, 15, 12, 1, '#5a5f7a'); P(1, 16, 2, 2, '#2f3245'); P(13, 16, 2, 2, '#2f3245'); P(7, 16, 2, 2, '#2f3245');
    addOutline(c);
    return c;
  });
}

// ไอคอนสถานะเล็ก 9x9 (วาดเป็นพิกเซล)
const STATUSES = [['', 'ไม่มี'], ['💻', 'ทำงาน'], ['🎧', 'โฟกัส'], ['☕', 'พักเบรก'], ['🍜', 'กินข้าว'], ['📚', 'อ่านหนังสือ'], ['🎮', 'เล่นเกม'], ['💤', 'ไม่อยู่']];
