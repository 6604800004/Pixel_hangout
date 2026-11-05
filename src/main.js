// ============================================================================
// main.js — ตัวเกม: เดิน นั่ง จัดห้อง แต่งตัว แต่งโต๊ะ แชต อีโมต และวาดทุกเฟรม
// ============================================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LAND_Q = '(max-height: 500px) and (orientation: landscape)';
const isLand = () => matchMedia(LAND_Q).matches; // มือถือแนวนอน
const isMobile = () => matchMedia('(max-width: 760px), ' + LAND_Q).matches;
const EMOTES = ['👋', '😂', '❤️', '👍', '🎉', '😮', '🔥', '😴', '🥳', '✨', '🙏'];
const SPEED = 72;

// ---- ล็อกหน้าเว็บไม่ให้ซูม/เลื่อนทั้งหน้า (Safari บน iPad/iPhone ชอบเลื่อนจน UI ด้านบนไปอยู่ใต้แถบเบราว์เซอร์) ----
const isTyping = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
const resetPageScroll = () => { if (isTyping()) return; if (window.scrollX || window.scrollY) window.scrollTo(0, 0); document.documentElement.scrollTop = document.body.scrollTop = 0; };
// ถ้าหน้าถูกซูมค้างไว้แล้ว (scale > 1) ยอมให้บีบนิ้วออกได้ ไม่งั้นจะติดอยู่
const pageZoomed = () => !!(window.visualViewport && window.visualViewport.scale > 1.02);
['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) => document.addEventListener(ev, (e) => { if (!pageZoomed()) e.preventDefault(); }, { passive: false }));
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1 && !pageZoomed()) e.preventDefault(); // กันซูมทั้งหน้าด้วยสองนิ้ว (ซูมแผนที่ยังใช้ได้ตามปกติ)
}, { passive: false });
function checkPageZoom() {
  const z = pageZoomed();
  let tip = document.getElementById('zoomTip');
  if (z && !tip) {
    tip = document.createElement('button'); tip.id = 'zoomTip'; tip.className = 'zoomtip';
    tip.textContent = '🔍 หน้าเว็บถูกซูมอยู่ — ใช้สองนิ้วบีบเข้าเพื่อกลับขนาดปกติ';
    document.body.append(tip);
  }
  if (tip) {
    tip.classList.toggle('hidden', !z);
    if (z) { const v = window.visualViewport; tip.style.left = v.offsetLeft + v.width / 2 + 'px'; tip.style.top = v.offsetTop + 8 + 'px'; tip.style.transform = `translateX(-50%) scale(${1 / v.scale})`; }
  }
}
if (window.visualViewport) { ['resize', 'scroll'].forEach((ev) => window.visualViewport.addEventListener(ev, checkPageZoom)); setTimeout(checkPageZoom, 500); }
window.addEventListener('scroll', resetPageScroll, { passive: true });
document.addEventListener('focusout', () => setTimeout(resetPageScroll, 60));
// คีย์บอร์ดมือถือ: ให้แผงแชตพอดีกับพื้นที่ที่เหลือเหนือคีย์บอร์ด จะได้เห็นช่องพิมพ์เสมอ
function fitVisualViewport() {
  const v = window.visualViewport; if (!v) return;
  const r = document.documentElement.style;
  r.setProperty('--vvh', Math.round(v.height) + 'px');
  r.setProperty('--vvt', Math.round(v.offsetTop) + 'px');
  const box = document.getElementById('msgs');
  if (box && isTyping()) box.scrollTop = box.scrollHeight;
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => { fitVisualViewport(); setTimeout(resetPageScroll, 60); });
  window.visualViewport.addEventListener('scroll', fitVisualViewport);
  fitVisualViewport();
}
document.addEventListener('focusin', () => setTimeout(fitVisualViewport, 300));

const canvas = $('#game');
const ctx = canvas.getContext('2d');
const buf = mkCanvas(2, 2);
const bctx = buf.getContext('2d');
const BG = buildBackground();

const G = {
  net: null, joined: false, voice: null,
  me: {
    nick: '', look: cleanLook(lsGet('pixel.look', DEFAULT_LOOK)), st: '', x: 250, y: 322, dir: 'down',
    walk: 0, ft: 0, frame: 0, sit: null, path: null, pendingSeat: null, bubble: null, seed: 0.3,
  },
  mySay: [], keys: new Set(),
  others: new Map(), peerCount: 1, firstPeersAt: 0,
  furnDocs: null, furniture: [], desks: new Map(), chatDocs: [], settings: {},
  messages: new Map(),
  rects: [], grid: null, seats: [],
  edit: false, selected: null, drag: null, pan: null, camManual: false,
  zoomAdj: 0, scale: 2, cam: { x: 0, y: 0, ready: false }, view: { cw: 1, ch: 1, dpr: 1 },
  myDesk: null, myDeskStyle: cleanDesk(lsGet('pixel.desk', DEFAULT_DESK)),
  emotes: [], unread: 0, chatOpen: !isMobile(),
  presPending: {}, presLast: 0, actionSig: '', lastActions: 0, bubbleHits: [], musicHits: [],
  zone: 'hall', boardDocs: [], boardOpen: null, layoutV: 1, settingsLoaded: false, music: { sp: null, manual: lsGet('pixel.music', null) },
};
G.me.pet = { x: G.me.x + 10, y: G.me.y, face: false, ft: 0 };

// ---------------------------------------------------------------- ยูทิล ----
let toastT;
function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms);
}
let actx = null;
function sfx(notes, vol = 0.05) {
  try {
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC(); }
    if (actx.state === 'suspended') actx.resume();
    let t = actx.currentTime + 0.01;
    for (const f of notes) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.1); t += 0.07;
    }
  } catch {}
}
const SFX = { join: () => sfx([523, 784, 1046]), leave: () => sfx([784, 523]), msg: () => sfx([1175], 0.03), pop: () => sfx([880, 1320], 0.03), sit: () => sfx([440], 0.03) };
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function wrapText(c, text, maxW, maxLines) {
  const words = segmenter ? [...segmenter.segment(text)].map((s) => s.segment) : text.split(/(\s+)/);
  const lines = []; let line = '';
  for (const w of words) {
    if (c.measureText(line + w).width <= maxW) { line += w; continue; }
    if (line) { lines.push(line); line = ''; }
    if (c.measureText(w).width <= maxW) { line = w.trimStart(); continue; }
    for (const ch of Array.from(w)) { if (c.measureText(line + ch).width > maxW && line) { lines.push(line); line = ''; } line += ch; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = Array.from(lines[maxLines - 1]).slice(0, -1).join('') + '…'; }
  return lines;
}
// วางข้อความกึ่งกลางเอง (บางเบราว์เซอร์/ส่วนขยายทำให้ textAlign = center ไม่ทำงาน)
function fillCenter(c, text, cx, y) {
  c.textAlign = 'left';
  c.fillText(text, Math.round(cx - c.measureText(text).width / 2), y);
}
function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
function myBy() { return G.net.uid || G.net.myKey || 'me'; }
function lookColor(look) { return CLOTH_COLORS[cleanLook(look).tc]; }
function headCanvas(look, size = 26) {
  const c = mkCanvas(18, 18);
  c.getContext('2d').drawImage(charSprite(cleanLook(look), 'down', 0, 'stand', false), 2, 6, 18, 18, 0, 0, 18, 18);
  c.style.width = c.style.height = size + 'px';
  return c;
}

// ------------------------------------------------------------- presence ----
function pres(patch) { Object.assign(G.presPending, patch); }
function flushPres(now) {
  if (!G.joined || !Object.keys(G.presPending).length || now - G.presLast < 90) return;
  G.net.setPresence(G.presPending);
  G.presPending = {}; G.presLast = now;
}
function fullPresence() {
  const me = G.me;
  return {
    n: me.nick, l: me.look, x: Math.round(me.x), y: Math.round(me.y), d: me.dir, m: 0, s: me.sit || '', st: me.st,
    say: G.mySay, em: null, dk: G.myDesk ? { slot: G.myDesk, style: G.myDeskStyle } : null, dr: null,
    uid: G.net.uid || null, mic: G.voice && G.voice.mic ? 1 : 0, cam: G.voice && G.voice.cam ? 1 : 0,
    mu: currentMusic() ? { ...currentMusic() } : null,
    mr: G.micSet.r, mc: G.micSet.c,
  };
}

// ========================================================= โลก + เฟอร์นิเจอร์ ====
function effectiveFurniture() {
  const base = G.furnDocs && G.furnDocs.length
    ? G.furnDocs.filter((d) => FURN[d.t])
    : DEFAULT_LAYOUT.map((d, i) => ({ ...d, id: 'def' + i, virtual: true }));
  // ของที่คนอื่นกำลังลากอยู่ (เห็นสดๆ)
  const live = new Map();
  for (const rt of G.others.values()) if (rt.p.dr && rt.p.dr.id) live.set(rt.p.dr.id, rt.p.dr);
  return base.map((it) => {
    const dr = live.get(it.id);
    return dr && Number.isFinite(dr.x) ? { ...it, x: dr.x, y: dr.y } : it;
  });
}
function rebuildWorld() {
  G.furniture = effectiveFurniture();
  G.rects = solidRects(G.furniture);
  G.grid = buildGrid(G.rects);
  G.seats = allSeats(G.furniture);
  G.seatById = new Map(G.seats.map((x) => [x.id, x]));
}

function deskInfo(slot) {
  if (slot === G.myDesk) return { mine: true, style: G.myDeskStyle, name: G.me.nick, look: G.me.look };
  for (const rt of G.others.values()) if (rt.p.dk && rt.p.dk.slot === slot) return { style: cleanDesk(rt.p.dk.style), name: rt.p.n || 'เพื่อน', look: rt.p.l, key: rt.key };
  const doc = G.desks.get(slot);
  if (doc && doc.uid !== undefined) return { style: cleanDesk(doc.style), name: doc.n || 'เพื่อน', look: doc.l, uid: doc.uid };
  return null;
}

// ================================================================ ตัวละคร ====
function standUp() {
  if (!G.me.sit) return;
  G.me.sit = null;
  pres({ s: '' });
}
function sitOn(seat) {
  const me = G.me;
  me.path = null; me.pendingSeat = null;
  me.x = seat.x; me.y = seat.y; me.dir = seat.dir; me.sit = seat.id;
  pres({ x: me.x, y: me.y, d: me.dir, s: seat.id, m: 0 });
  SFX.sit();
  // นั่งเบาะกราบหน้าพระ = พนมมือไหว้ 🙏
  if (seat.pray) setTimeout(() => { if (G.me.sit === seat.id) { pres({ em: { e: '🙏', ts: Date.now() } }); G.emotes.push({ key: 'me', e: '🙏', start: performance.now(), dx: 0 }); toast('🙏 สาธุ', 2000); } }, 400);
}
function walkTo(x, y, seat) {
  standUp();
  G.me.pendingBoard = null; G.me.pendingScreen = null;
  const path = findPath(G.grid, G.me.x, G.me.y, x, y);
  if (!path) { toast('ไปตรงนั้นไม่ได้'); return; }
  G.me.path = path;
  G.me.pendingSeat = seat || null;
  G.camManual = false;
}
function seatTaken(seatId) {
  for (const rt of G.others.values()) if (rt.p.s === seatId) return true;
  return false;
}

function updateMe(dt) {
  const me = G.me;
  let vx = 0, vy = 0;
  const k = G.keys;
  if (k.has('ArrowLeft') || k.has('KeyA')) vx -= 1;
  if (k.has('ArrowRight') || k.has('KeyD')) vx += 1;
  if (k.has('ArrowUp') || k.has('KeyW')) vy -= 1;
  if (k.has('ArrowDown') || k.has('KeyS')) vy += 1;
  let moved = false;
  if (vx || vy) {
    me.path = null; me.pendingSeat = null; standUp();
    const len = Math.hypot(vx, vy); vx /= len; vy /= len;
    const step = SPEED * Math.min(dt, 0.05);
    const inside = hitsRects(G.rects, me.x, me.y);
    if (inside || !hitsRects(G.rects, me.x + vx * step, me.y)) { me.x += vx * step; moved = true; }
    if (inside || !hitsRects(G.rects, me.x, me.y + vy * step)) { me.y += vy * step; moved = true; }
    me.x = clamp(me.x, LEFT + 6, W - 6); me.y = clamp(me.y, SHRINE_FLOOR + 2, H - 4);
  } else if (me.path && me.path.length) {
    const t = me.path[0];
    const dx = t.x - me.x, dy = t.y - me.y, d = Math.hypot(dx, dy);
    const step = SPEED * Math.min(dt, 0.05);
    if (d <= step) {
      me.x = t.x; me.y = t.y; me.path.shift();
      if (!me.path.length) {
        me.path = null;
        if (me.pendingScreen) { const sc = G.furniture.find((f) => f.id === me.pendingScreen); me.pendingScreen = null; if (sc) openScreenModal(sc); }
        if (me.pendingBoard) { const bd = G.furniture.find((f) => f.id === me.pendingBoard); me.pendingBoard = null; if (bd) openBoard(bd); }
        if (me.pendingSeat) {
          const seat = me.pendingSeat;
          if (Math.hypot(seat.x - me.x, seat.y - me.y) < 26 && !seatTaken(seat.id)) sitOn(seat);
          me.pendingSeat = null;
        }
      }
    } else { vx = dx / d; vy = dy / d; me.x += vx * step; me.y += vy * step; }
    moved = true;
  }
  if (moved && (vx || vy)) me.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
  if (moved) { me.ft += dt; me.frame = Math.floor(me.ft * 8) % 4; }
  else { me.frame = 0; me.ft = 0; }
  if (moved) { pres({ x: Math.round(me.x * 2) / 2, y: Math.round(me.y * 2) / 2, d: me.dir, m: 1, t: netNow() }); me.wasMoving = true; }
  else if (me.wasMoving) { me.wasMoving = false; pres({ x: Math.round(me.x * 2) / 2, y: Math.round(me.y * 2) / 2, d: me.dir, m: 0, t: netNow() }); lsSet('pixel.pos', { x: me.x, y: me.y }); }
  me.walking = moved;
}

function updatePet(owner, pet, dt) {
  const side = owner.dir === 'left' ? 1 : owner.dir === 'right' ? -1 : (pet.x >= owner.x ? 1 : -1);
  const tx = owner.x + side * 13, ty = owner.y + (owner.dir === 'up' ? 6 : 2);
  const dx = tx - pet.x, dy = ty - pet.y, d = Math.hypot(dx, dy);
  if (d > 60) { pet.x = tx; pet.y = ty; }
  else if (d > 2) {
    const sp = Math.min(d, (owner.walking ? 80 : 40) * dt);
    pet.x += (dx / d) * sp; pet.y += (dy / d) * sp; pet.ft += dt;
    if (Math.abs(dx) > 1) pet.face = dx > 0;
  } else pet.ft = 0;
  if (!owner.walking && d <= 2) pet.face = owner.x > pet.x;
}

// ---- เดินลื่นแบบเกมออนไลน์: เก็บตำแหน่งพร้อมเวลาที่เพื่อนส่ง แล้ววาดย้อนหลังเล็กน้อยระหว่างสองจุด ----
const netNow = () => (G.net && G.net.now ? G.net.now() : Date.now());
function addSnap(rt, x, y, d, ts) {
  const now = netNow();
  const t = Number.isFinite(ts) ? ts : now - (rt.off || 0);
  // ประมาณความหน่วง + ความแกว่งของเน็ตของคนนี้ (ปรับตัวเองตลอด)
  const lag = now - t;
  if (rt.off == null || lag < rt.off) rt.off = lag; else rt.off += (lag - rt.off) * 0.01;
  const jit = lag - rt.off;
  rt.jit = rt.jit == null ? jit : rt.jit + (jit - rt.jit) * (jit > rt.jit ? 0.35 : 0.02);
  const s = rt.snaps || (rt.snaps = []);
  const last = s[s.length - 1];
  if (last && t <= last.t) { if (last.x === x && last.y === y) return; s.length = 0; } // เวลาถอยหลัง (เพื่อนรีโหลด) = เริ่มใหม่
  if (last && last.x === x && last.y === y && last.d === d) { last.t2 = t; return; }
  if (last && t - last.t < 600) rt.iv = rt.iv == null ? t - last.t : rt.iv + (t - last.t - rt.iv) * 0.1; // ระยะห่างระหว่างตำแหน่งที่ส่งมา
  s.push({ t, x, y, d });
  if (s.length > 40) s.splice(0, s.length - 40);
}
function snapPos(rt) {
  const s = rt.snaps;
  if (!s || !s.length) return null;
  const delay = clamp((rt.iv || 100) + (rt.jit || 0) * 2 + 30, 100, 450);
  const rT = netNow() - (rt.off || 0) - delay;
  while (s.length > 2 && s[1].t <= rT) s.shift();
  const a = s[0];
  if (rT <= a.t || s.length === 1) {
    // ยังไม่มีจุดถัดไป: ถ้ากำลังเดินอยู่ ไหลต่อไปตามทิศเดิมได้นิดหน่อย (ไม่เกิน 0.15 วิ) แทนการหยุดกึก
    if (s.length === 1 && rt.vel && rT > a.t && rt.p.m) { const k = Math.min(rT - a.t, 150) / 1000; return { x: a.x + rt.vel.x * k, y: a.y + rt.vel.y * k, d: a.d }; }
    return { x: a.x, y: a.y, d: a.d };
  }
  const b = s[1];
  if (Math.hypot(b.x - a.x, b.y - a.y) > 120) return { x: b.x, y: b.y, d: b.d }; // วาร์ป (นั่ง/ย้ายห้อง)
  if (rT > b.t) {
    // ตำแหน่งถัดไปมาช้า: ไหลต่อตามทิศเดิมได้นิดหน่อย (ไม่เกิน 0.15 วิ) แทนการหยุดกึก
    if (rt.p.m && rt.vel) { const k = Math.min(rT - b.t, 200) / 1000; return { x: b.x + rt.vel.x * k, y: b.y + rt.vel.y * k, d: b.d }; }
    return { x: b.x, y: b.y, d: b.d };
  }
  const k = clamp((rT - a.t) / Math.max(1, b.t - a.t), 0, 1);
  const span = Math.max(1, b.t - a.t) / 1000;
  rt.vel = { x: clamp((b.x - a.x) / span, -SPEED * 2, SPEED * 2), y: clamp((b.y - a.y) / span, -SPEED * 2, SPEED * 2) };
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, d: b.d };
}
function updateOthers(dt) {
  for (const rt of G.others.values()) {
    const p = rt.p;
    if (!Number.isFinite(p.x)) continue;
    const ox = rt.x, oy = rt.y;
    const sp = snapPos(rt);
    if (sp) {
      if (Math.hypot(sp.x - rt.x, sp.y - rt.y) > 120) { rt.x = sp.x; rt.y = sp.y; }
      else { const a = 1 - Math.exp(-dt * 30); rt.x += (sp.x - rt.x) * a; rt.y += (sp.y - rt.y) * a; }
    } else { rt.x = p.x; rt.y = p.y; }
    const moved = Math.hypot(rt.x - ox, rt.y - oy) / Math.max(dt, 0.001);
    rt.walking = moved > 8;
    const d = (sp && sp.d) || p.d;
    if (rt.walking && Math.abs(rt.x - ox) + Math.abs(rt.y - oy) > 0.05) rt.dir = Math.abs(rt.x - ox) > Math.abs(rt.y - oy) ? (rt.x > ox ? 'right' : 'left') : (rt.y > oy ? 'down' : 'up');
    else rt.dir = ['up', 'down', 'left', 'right'].includes(d) ? d : 'down';
    if (rt.walking && !p.s) { rt.ft += dt; rt.frame = Math.floor(rt.ft * 8) % 4; } else { rt.frame = 0; rt.ft = 0; }
    rt.look = cleanLook(p.l);
    updatePet(rt, rt.pet, dt);
  }
}

// ================================================================ คนในห้อง ====
function onPeers(list) {
  const now = performance.now();
  if (!G.firstPeersAt) G.firstPeersAt = now;
  const settled = now - G.firstPeersAt > 2500;
  const seen = new Set();
  let furnitureMoved = false;
  for (const peer of list) {
    if (peer.kind === 'agent') continue;
    if (peer.isMe) continue;
    const p = peer.p || {};
    seen.add(peer.key);
    let rt = G.others.get(peer.key);
    const isNew = !rt;
    if (!rt) {
      rt = { key: peer.key, by: peer.by, p, x: p.x || 250, y: p.y || 320, dir: 'down', ft: 0, frame: 0, walking: false, seed: Math.random() * 5, lastEm: p.em && p.em.ts, saySeen: new Set(), bubble: null, announced: false };
      rt.pet = { x: rt.x + 10, y: rt.y, face: false, ft: 0 };
      G.others.set(peer.key, rt);
    }
    const prevDr = rt.p.dr && rt.p.dr.id;
    rt.p = p; rt.by = peer.by; rt.guest = peer.guest;
    rt.look = cleanLook(p.l);
    if ((p.dr && p.dr.id) || prevDr) furnitureMoved = true;
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) addSnap(rt, p.x, p.y, p.d, p.t);
    if (Number.isFinite(p.x) && !rt.announced) {
      rt.announced = true;
      if (settled) { addSys(`${p.n || 'เพื่อน'} เข้ามาในห้อง`); SFX.join(); }
      if (isNew || !Number.isFinite(rt.x)) { rt.x = p.x; rt.y = p.y; rt.pet.x = p.x + 10; rt.pet.y = p.y; rt.snaps = []; }
    }
    // อีโมตใหม่
    if (p.em && p.em.ts && p.em.ts !== rt.lastEm) {
      rt.lastEm = p.em.ts;
      if (!isNew && EMOTES.includes(p.em.e)) G.emotes.push({ key: peer.key, e: p.em.e, start: now, dx: Math.random() * 10 - 5 });
    }
    // ข้อความใหม่
    if (Array.isArray(p.say)) {
      for (const m of p.say.slice(-3)) {
        if (!m || typeof m.i !== 'string' || typeof m.t !== 'string' || rt.saySeen.has(m.i)) continue;
        rt.saySeen.add(m.i);
        const fresh = !isNew && !G.messages.has(m.i);
        addMessage({ id: m.i, by: peer.by || p.uid || peer.key, n: p.n, l: p.l, text: m.t.slice(0, 200), ts: Number(m.ts) || Date.now() });
        if (fresh) { rt.bubble = { id: m.i, text: m.t.slice(0, 200), until: now + 6000, lines: null }; SFX.msg(); }
      }
    }
  }
  for (const key of [...G.others.keys()]) {
    if (!seen.has(key)) {
      const rt = G.others.get(key);
      if (rt.announced) { addSys(`${rt.p.n || 'เพื่อน'} ออกจากห้อง`); SFX.leave(); }
      G.others.delete(key);
      if (rt.p.dr) furnitureMoved = true;
    }
  }
  G.peerCount = 1 + [...G.others.values()].filter((r) => Number.isFinite(r.p.x)).length;
  $('#onlineCount').textContent = G.peerCount;
  if (furnitureMoved && !G.drag) rebuildWorld();
  if (!$('#people').classList.contains('hidden') && !G.peopleQueued) { G.peopleQueued = true; setTimeout(() => { G.peopleQueued = false; renderPeople(); }, 400); }
  if (G.voice) G.voice.syncPeers([...G.others.keys()]);
}

// ================================================================== แชต ====
G.chatDeleted = new Set();
G.isAdmin = !!lsGet('pixel.admin', '');
function addMessage(m) {
  if (G.messages.has(m.id) || G.chatDeleted.has(m.id)) return;
  G.messages.set(m.id, m);
  if (G.messages.size > 150) {
    const oldest = [...G.messages.values()].sort((a, b) => a.ts - b.ts)[0];
    G.messages.delete(oldest.id);
  }
  if (!m.sys && m.by !== myBy() && !G.chatOpen) { G.unread++; updateBadge(); }
  scheduleChatRender();
}
function addSys(text) { addMessage({ id: 'sys' + randomId(6), sys: true, text, ts: Date.now() }); }
let chatRenderQueued = false;
function scheduleChatRender() {
  if (chatRenderQueued) return;
  chatRenderQueued = true;
  requestAnimationFrame(() => { chatRenderQueued = false; renderChat(); });
}
function renderChat() {
  const box = $('#msgs');
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
  box.innerHTML = '';
  const list = [...G.messages.values()].sort((a, b) => a.ts - b.ts);
  if (!list.length) { const e = document.createElement('div'); e.className = 'sys'; e.textContent = 'ยังไม่มีข้อความ ทักเพื่อนได้เลย 👋'; box.append(e); }
  let prev = null;
  for (const m of list) {
    if (m.sys) { const e = document.createElement('div'); e.className = 'sys' + (m.help ? ' help' : ''); e.textContent = m.text; box.append(e); prev = null; continue; }
    const row = document.createElement('div');
    const cont = prev && prev.by === m.by && m.ts - prev.ts < 180000;
    row.className = 'msg' + (cont ? ' cont' : '');
    if (!cont) {
      row.append(headCanvas(m.l));
      const meta = document.createElement('div'); meta.className = 'meta';
      const b = document.createElement('b'); b.textContent = m.n || 'เพื่อน'; b.style.color = shade(lookColor(m.l), -0.35);
      const t = document.createElement('time'); t.textContent = new Date(m.ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      meta.append(b, t); row.append(meta);
    }
    const tx = document.createElement('div'); tx.className = 'text'; tx.textContent = m.text;
    row.append(tx);
    if (G.isAdmin) {
      // แอดมิน: แตะ ✕ แล้วแตะ "ลบ" อีกครั้งเพื่อยืนยัน
      row.classList.add('adm');
      const del = document.createElement('button'); del.type = 'button'; del.className = 'mdel'; del.textContent = '✕'; del.title = 'ลบข้อความนี้';
      del.onclick = (e) => {
        e.stopPropagation();
        if (!del.classList.contains('arm')) { del.classList.add('arm'); del.textContent = 'ลบ'; setTimeout(() => { del.classList.remove('arm'); del.textContent = '✕'; }, 3000); return; }
        G.net.admin('delchat', lsGet('pixel.admin', '') || '', m.id);
      };
      row.append(del);
    }
    box.append(row);
    prev = m;
  }
  if (atBottom) box.scrollTop = box.scrollHeight;
}
// คำสั่งแอดมินในแชต (ไม่ถูกส่งเป็นข้อความ): admin <รหัส> · kick all · kick ชื่อ
// รายการคำสั่ง: ทุกคนเห็นคำสั่งทั่วไป · แอดมินเห็นคำสั่งแอดมินเพิ่ม
function showHelp() {
  const lines = [
    '📖 คำสั่งที่ทุกคนใช้ได้ (พิมพ์ในแชต ไม่ขึ้นให้คนอื่นเห็น)',
    '👉 poke ชื่อ — สะกิดเฉพาะคน (หรือ สะกิด ชื่อ / ชื่อ poke / poke all)',
    '🎧 bg on · bg off — เปิด/ปิด ได้ยินเสียงตอนพับจอหรือสลับแอป',
    '🩺 ตรวจเสียง — ดูว่าทำไมพูด/ได้ยินใครไม่ได้ (หรือ diag)',
    '🚪 ออก — ออกจากห้องหรือออกจากเว็บ (หรือ leave / exit / ปุ่ม 🚪 มุมขวาบน)',
    '❓ help — ดูคำสั่งทั้งหมด (หรือ คำสั่ง / ?)',
    '🔑 admin รหัส — เข้าโหมดแอดมิน (เฉพาะคนที่มีรหัส)',
    'ปุ่มลัด: แตะตัวละครตัวเอง = หันทิศ · คอม: R หัน, E นั่ง, Enter แชต',
  ];
  if (G.isAdmin) lines.push(
    '',
    '🛡️ คำสั่งแอดมิน (เครื่องนี้เป็นแอดมินอยู่)',
    '👢 kick ชื่อ · kick all — เตะออก (กลับเข้าได้ทันที)',
    '⏳ ชื่อ kick delay 1m — เตะ + ห้ามเข้าตามเวลา (30s, 5m, 1h · all kick delay 10m)',
    '🧹 clear chat — ล้างแชตทั้งหมด (หรือ ล้างแชท)',
    '✏️ แตะ ✏️ ข้างชื่อห้องในแถบห้องเสียง (ซ้ายมือ) — ตั้งชื่อห้องใหม่',
    '✕ แตะ ✕ ที่ข้อความ แล้วแตะ "ลบ" — ลบทีละข้อความ',
    '🚪 admin off — เลิกเป็นแอดมินในเครื่องนี้',
  );
  addMessage({ id: 'sys' + randomId(6), sys: true, help: true, text: lines.join('\n'), ts: Date.now() });
  if (!G.chatOpen) setChatOpen(true);
}
function chatCommand(text) {
  if (/^\/?(leave|exit|quit|ออก|ออกจากห้อง|ออกจากเว็บ)$/i.test(text.trim())) { askLeave(); return true; }
  if (!G.net) return false;
  if (/^\/?(help|คำสั่ง|\?|commands?)$/i.test(text)) { showHelp(); return true; }
  if (/^\/?(diag|ตรวจเสียง|เช็คเสียง|เช็กเสียง)$/i.test(text)) { openVoiceDiag(); return true; }
  if (/^\/?admin\s+(off|logout|ออก)$/i.test(text)) { lsSet('pixel.admin', null); G.isAdmin = false; scheduleChatRender(); addSys('เลิกเป็นแอดมินในเครื่องนี้แล้ว'); return true; }
  // สะกิด: poke ชื่อ / สะกิด ชื่อ / ชื่อ poke
  let p = text.match(/^\/?(?:poke|สะกิด|สกิด|จิ้ม)\s+(.+)$/i) || text.match(/^(.+?)\s+(?:poke|สะกิด|สกิด)$/i);
  if (p) { pokeByName(p[1].trim()); return true; }
  // ได้ยินเสียงตอนพับจอ: bg on/off · พับจอ เปิด/ปิด
  p = text.match(/^\/?(?:bg|background|พับจอ|เสียงพื้นหลัง|ฟังตอนพับจอ)\s*(on|off|เปิด|ปิด)?$/i);
  if (p) { const v = (p[1] || '').toLowerCase(); setBgAudio(v ? v === 'on' || v === 'เปิด' : !G.bgAudio); return true; }
  if (!G.net.admin) return false;
  let m = text.match(/^\/?admin\s+(\S+)$/i);
  if (m) { G.pendingAdminKey = m[1]; G.net.admin('login', m[1]); return true; }
  if (/^\/?(clear chat|clearchat|ล้างแช[ทต]|ลบแช[ทต]ทั้งหมด)$/i.test(text)) { G.net.admin('delchat', lsGet('pixel.admin', '') || '', 'all'); return true; }
  // เวลาห้ามเข้า: 30s / 1m / 2h (หรือ วิ / นาที / ชม.) — ไม่ใส่หน่วย = นาที
  const UNIT = '(\\d+(?:\\.\\d+)?)\\s*(s|sec|m|min|h|hr|วิ|วินาที|นาที|ชม\\.?|ชั่วโมง)?';
  const toMs = (n, u = 'm') => Number(n) * (/^(s|sec|วิ|วินาที)$/i.test(u) ? 1000 : /^(h|hr|ชม\.?|ชั่วโมง)$/i.test(u) ? 3600000 : 60000);
  const key = lsGet('pixel.admin', '') || '';
  m = text.match(new RegExp('^(.+?)\\s+(?:kick|เตะ)\\s+delay\\s+' + UNIT + '$', 'i'));        // หมี kick delay 1m
  if (m) { G.net.admin('kick', key, m[1].trim(), toMs(m[2], m[3])); return true; }
  m = text.match(new RegExp('^\\/?(?:kick|เตะ)\\s+(.+?)\\s+delay\\s+' + UNIT + '$', 'i'));    // kick หมี delay 1m
  if (m) { G.net.admin('kick', key, m[1].trim(), toMs(m[2], m[3])); return true; }
  m = text.match(/^\/?(?:kick|เตะ)\s+(.+)$/i);                                             // kick หมี / kick all
  if (m) { G.net.admin('kick', key, m[1].trim(), 0); return true; }
  return false;
}
function sendChat(text) {
  text = text.trim().slice(0, 200);
  if (!text) return;
  if (chatCommand(text)) return;
  const ts = Date.now();
  const m = { i: randomId(9), t: text, ts };
  G.mySay = [...G.mySay.slice(-2), m];
  pres({ say: G.mySay });
  addMessage({ id: m.i, by: myBy(), n: G.me.nick, l: G.me.look, text, ts });
  G.me.bubble = { id: m.i, text, until: performance.now() + 6000, lines: null };
  if (G.net.hasDb && G.net.canWrite !== false) {
    G.net.set('chat', m.i, { uid: G.net.uid || '', n: G.me.nick, l: G.me.look, text, ts }).then(pruneChat).catch(() => {});
  }
  const box = $('#msgs'); requestAnimationFrame(() => (box.scrollTop = box.scrollHeight));
}
function pruneChat() {
  if (G.chatDocs.length < 80) return;
  const old = [...G.chatDocs].sort((a, b) => a.ts - b.ts).slice(0, 12);
  (async () => { for (const d of old) { try { await G.net.del('chat', d.id); } catch { break; } } })();
}
function updateBadge() {
  const b = $('#chatBadge');
  b.textContent = G.unread > 9 ? '9+' : G.unread;
  b.classList.toggle('hidden', !G.unread);
}
function setChatOpen(open) {
  G.chatOpen = open;
  $('#chat').classList.toggle('closed', !open);
  $('[data-tool="chat"]').classList.toggle('active', open);
  if (open) { G.unread = 0; updateBadge(); renderChat(); const box = $('#msgs'); box.scrollTop = box.scrollHeight; if (!isMobile()) $('#chatInput').focus(); }
}
$('#chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  sendChat($('#chatInput').value);
  $('#chatInput').value = '';
  if (!isMobile()) $('#chatInput').blur();
});
$('#chatClose').onclick = () => setChatOpen(false);
$('#helpBtn').onclick = () => showHelp();

// ================================================================ โต๊ะ ====
async function claimDesk(slot) {
  const info = deskInfo(slot);
  if (info && !info.mine) { toast(`โต๊ะนี้เป็นของ ${info.name} แล้ว`); return; }
  if (G.myDesk && G.myDesk !== slot) await releaseDesk(true);
  G.myDesk = slot;
  pres({ dk: { slot, style: G.myDeskStyle } });
  await saveDesk();
  const seat = G.seats.find((s) => s.id === `desk:${slot}`);
  if (seat) sitOn(seat);
  toast('ได้โต๊ะแล้ว! กด 🎨 แต่งโต๊ะ เพื่อตกแต่ง');
  SFX.pop();
}
async function saveDesk() {
  if (!G.myDesk) return;
  lsSet('pixel.desk', G.myDeskStyle);
  pres({ dk: { slot: G.myDesk, style: G.myDeskStyle } });
  if (G.net.hasDb && G.net.canWrite !== false && (G.net.uid || G.net.mode !== 'claude')) {
    try { await G.net.set('desks', G.myDesk, { uid: G.net.uid || '', n: G.me.nick, l: G.me.look, style: G.myDeskStyle, ts: Date.now() }); }
    catch { /* ดูอย่างเดียว: ยังเห็นโต๊ะผ่าน presence ตอนออนไลน์ */ }
  }
}
async function releaseDesk(silent) {
  if (!G.myDesk) return;
  const slot = G.myDesk;
  if (G.me.sit === `desk:${slot}`) standUp();
  G.myDesk = null;
  pres({ dk: null });
  const doc = G.desks.get(slot);
  if (doc && (doc.uid === (G.net.uid || '') || G.net.mode !== 'claude')) { try { await G.net.del('desks', slot); } catch {} }
  if (!silent) toast('คืนโต๊ะแล้ว');
}
function goToMyDesk() {
  if (G.myDesk) {
    const seat = G.seats.find((s) => s.id === `desk:${G.myDesk}`);
    if (seat) { if (G.me.sit === seat.id) openDeskEditor(); else walkTo(seat.x, seat.y + 6, seat); }
    return;
  }
  // ยังไม่มีโต๊ะ: พาไปโต๊ะว่างที่ใกล้ที่สุด
  const free = DESK_SLOTS.filter((s) => !deskInfo(s.id)).sort((a, b) => Math.hypot(a.x - G.me.x, a.y - G.me.y) - Math.hypot(b.x - G.me.x, b.y - G.me.y));
  if (!free.length) { toast('โต๊ะเต็มหมดแล้ว 🥲'); return; }
  walkTo(free[0].x, free[0].y + CHAIR_DY + 4);
  toast('เดินไปโต๊ะว่าง แล้วกด "จองโต๊ะนี้"');
}

// ============================================================= จัดห้อง ====
function canEditRoom() {
  if (G.net.canWrite === false) { toast('คุณมีสิทธิ์ดูอย่างเดียว — ให้เจ้าของห้องแชร์แบบ Contributor ขึ้นไปเพื่อจัดห้อง'); return false; }
  return true;
}
async function materializeDefaults() {
  if (!G.furniture.some((f) => f.virtual)) return true;
  try {
    for (const it of G.furniture) {
      const { id, virtual, ...data } = it;
      await G.net.set('furniture', id, { t: data.t, x: data.x, y: data.y, v: data.v || 0, f: data.f || 0 });
    }
    return true;
  } catch { toast('บันทึกห้องไม่สำเร็จ'); return false; }
}
async function saveItem(it) {
  if (!(await materializeDefaults())) return;
  try { await G.net.set('furniture', it.id, { t: it.t, x: Math.round(it.x), y: Math.round(it.y), v: it.v || 0, f: it.f || 0 }); }
  catch { toast('บันทึกไม่สำเร็จ'); }
}
function setEdit(on) {
  if (on && !canEditRoom()) return;
  G.edit = on; G.selected = null; G.camManual = false;
  $('#editTray').classList.toggle('hidden', !on);
  $('[data-tool="edit"]').classList.toggle('active', on);
  if (on) { closeTrays('editTray'); toast('แตะของเพื่อเลือก ลากเพื่อย้าย · ลากพื้นเพื่อเลื่อนกล้อง'); }
  updateSelBar();
}
function buildPalette() {
  const box = $('#paletteList');
  box.innerHTML = '';
  for (const [type, d] of Object.entries(FURN)) {
    const b = document.createElement('button');
    b.className = 'fb';
    const spr = furnSprite(type, 0, 0);
    const c = mkCanvas(spr.width, spr.height);
    c.getContext('2d').drawImage(spr, 0, 0);
    b.append(c);
    const l = document.createElement('span'); l.textContent = d.label; b.append(l);
    b.onclick = async () => {
      if (!(await materializeDefaults())) return;
      const it = { id: 'f' + randomId(8), t: type, x: Math.round(clamp(G.me.x, LEFT + 30, W - 30)), y: Math.round(clamp(G.me.y - 20, SHRINE_FLOOR + d.h * 0.4, H - 8)), v: 0, f: 0 };
      if (G.furnDocs) G.furnDocs = [...G.furnDocs, it];
      rebuildWorld();
      G.selected = it.id;
      await saveItem(it);
      SFX.pop();
    };
    box.append(b);
  }
}
function itemAt(wx, wy) {
  const items = [...G.furniture].sort((a, b) => ((FURN[a.t].floor ? 1 : 0) - (FURN[b.t].floor ? 1 : 0)) || (b.y - a.y));
  for (const it of items) {
    const d = FURN[it.t];
    if (wx >= it.x - d.w / 2 - 1 && wx <= it.x + d.w / 2 + 1 && wy >= it.y - d.h - 1 && wy <= it.y + 1) return it;
  }
  return null;
}
function updateSelBar() {
  const bar = $('#selBar');
  const it = G.edit && G.selected && G.furniture.find((f) => f.id === G.selected);
  if (!it) { bar.classList.add('hidden'); return; }
  const d = FURN[it.t];
  bar.classList.remove('hidden');
  $('[data-sel="color"]', bar).classList.toggle('hidden', !d.variants);
  $('[data-sel="flip"]', bar).classList.toggle('hidden', !d.facing);
  const sx = (it.x - G.cam.x) * G.scale, sy = (it.y - d.h - G.cam.y) * G.scale;
  bar.style.left = clamp(sx, 110, G.view.cw - 110) + 'px';
  bar.style.top = clamp(sy - 6, 110, G.view.ch - 60) + 'px';
}
$('#selBar').addEventListener('click', async (e) => {
  const act = e.target.closest('[data-sel]')?.dataset.sel;
  const it = G.furniture.find((f) => f.id === G.selected);
  if (!act || !it) return;
  const d = FURN[it.t];
  if (act === 'color') it.v = ((it.v || 0) + 1) % d.variants;
  if (act === 'flip') it.f = it.f ? 0 : 1;
  if (act === 'delete') {
    if (!(await materializeDefaults())) return;
    G.selected = null;
    if (G.furnDocs) G.furnDocs = G.furnDocs.filter((f) => f.id !== it.id);
    rebuildWorld(); updateSelBar();
    try { await G.net.del('furniture', it.id); } catch { toast('ลบไม่สำเร็จ'); }
    return;
  }
  if (G.furnDocs) G.furnDocs = G.furnDocs.map((f) => (f.id === it.id ? { ...it } : f));
  rebuildWorld();
  await saveItem(it);
});
$('#editDone').onclick = () => setEdit(false);

// ============================================================ อินพุต ====
const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
window.addEventListener('keydown', (e) => {
  if (!G.joined || !$('#modal').classList.contains('hidden')) return;
  if (typing()) { if (e.key === 'Escape') document.activeElement.blur(); return; }
  const mv = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
  if (mv.includes(e.code)) { G.keys.add(e.code); e.preventDefault(); G.camManual = false; return; }
  if (e.key === 'Enter') { e.preventDefault(); setChatOpen(true); $('#chatInput').focus(); }
  if (e.code === 'KeyR' && !G.me.sit) { e.preventDefault(); turnMe(); return; }
  if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); $('#actions .pbtn')?.click(); }
  if (e.key === 'Escape') { if (G.edit) setEdit(false); closeTrays(); $('#people').classList.add('hidden'); }
  if (G.edit && G.selected && (e.key === 'Delete' || e.key === 'Backspace')) $('[data-sel="delete"]').click();
  if (G.edit && G.selected && e.code === 'KeyR') $('[data-sel="flip"]').click();
});
window.addEventListener('keyup', (e) => G.keys.delete(e.code));
window.addEventListener('blur', () => G.keys.clear());

const pointers = new Map();
let pinch = null, holdTimer = 0;
const TURN_ORDER = ['down', 'left', 'up', 'right'];
function turnMe(dir) {
  const me = G.me;
  me.dir = dir || TURN_ORDER[(TURN_ORDER.indexOf(me.dir) + 1) % 4];
  pres({ d: me.dir });
}
const toWorld = (sx, sy) => ({ x: sx / G.scale + G.cam.x, y: sy / G.scale + G.cam.y });
canvas.addEventListener('pointerdown', (e) => {
  if (!G.joined) return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: G.zoomAdj }; G.drag = null; G.pan = null; return; }
  closeTrays();
  for (const h of G.bubbleHits) if (Math.abs(e.clientX - h.x) < h.r && Math.abs(e.clientY - h.y) < h.r) { openFocus(h.key); return; }
  const w = toWorld(e.clientX, e.clientY);
  if (G.edit) {
    const it = itemAt(w.x, w.y);
    if (it) { G.selected = it.id; G.drag = { id: it.id, ox: w.x - it.x, oy: w.y - it.y, moved: false }; }
    else { G.selected = null; G.pan = { sx: e.clientX, sy: e.clientY, mx: G.cam.cx, my: G.cam.cy }; }
    updateSelBar();
    return;
  }
  for (const h of G.musicHits) if (e.clientX >= h.x0 && e.clientX <= h.x1 && e.clientY >= h.y0 && e.clientY <= h.y1) { window.open(h.u, '_blank', 'noopener'); return; }
  // แตะตัวละครของตัวเอง (ตอนยืนอยู่) = หันไปทางถัดไป
  if (!G.me.sit && !(G.me.path && G.me.path.length) && Math.abs(w.x - G.me.x) < 10 && w.y < G.me.y + 3 && w.y > G.me.y - 34) { turnMe(); return; }
  // แตะที่นั่ง/โต๊ะ = เดินไปนั่ง
  let target = null;
  const it = itemAt(w.x, w.y);
  if (it && SCREEN_TYPES.has(it.t)) {
    if (nearScreen(it)) openScreenModal(it);
    else { walkTo(it.x, it.y + 14); G.me.pendingScreen = it.id; }
    return;
  }
  if (it && FURN[it.t].board) {
    if (Math.abs(G.me.x - it.x) < 24 && G.me.y > it.y - 4 && G.me.y < it.y + 24) openBoard(it);
    else { walkTo(it.x, it.y + 12); G.me.pendingBoard = it.id; }
    return;
  }
  if (it && FURN[it.t].seats) {
    const seats = G.seats.filter((s) => s.id.startsWith(it.id + ':') && !seatTaken(s.id));
    if (seats.length) target = seats.sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y))[0];
  }
  if (!target) {
    for (const s of DESK_SLOTS) {
      if (w.x > s.x - 21 && w.x < s.x + 21 && w.y > s.y - 40 && w.y < s.y + CHAIR_DY + 4) {
        const seat = G.seats.find((x) => x.id === `desk:${s.id}`);
        const info = deskInfo(s.id);
        if (info && info.mine) target = seat;
        else { walkTo(seat.x, seat.y + 8); return; }
      }
    }
  }
  if (target) walkTo(target.x, target.y + 4, target);
  else { walkTo(w.x, w.y); G.holding = true; }
});
canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const r = Math.hypot(a.x - b.x, a.y - b.y) / pinch.d;
    G.zoomAdj = clamp(Math.round(pinch.z + Math.log2(r) * 2), -1, 3);
    return;
  }
  const w = toWorld(e.clientX, e.clientY);
  if (G.drag) {
    const it = G.furniture.find((f) => f.id === G.drag.id);
    if (!it) return;
    it.x = clamp(Math.round(w.x - G.drag.ox), LEFT + 10, W - 10);
    it.y = clamp(Math.round(w.y - G.drag.oy), SHRINE_FLOOR + 4, H - 4);
    G.drag.moved = true;
    pres({ dr: { id: it.id, x: it.x, y: it.y } });
    updateSelBar();
  } else if (G.pan) {
    G.camManual = true;
    G.cam.mx = clamp(G.pan.mx - (e.clientX - G.pan.sx) / G.scale, LEFT, W);
    G.cam.my = clamp(G.pan.my - (e.clientY - G.pan.sy) / G.scale, TOP, H);
    G.cam.cx = G.cam.mx; G.cam.cy = G.cam.my;
  } else if (G.holding && performance.now() - holdTimer > 160) {
    holdTimer = performance.now();
    walkTo(w.x, w.y);
  }
});
async function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  G.holding = false; G.pan = null;
  if (G.drag) {
    const drag = G.drag; G.drag = null;
    const it = G.furniture.find((f) => f.id === drag.id);
    pres({ dr: null });
    if (it && drag.moved) {
      if (G.furnDocs) G.furnDocs = G.furnDocs.map((f) => (f.id === it.id ? { ...f, x: it.x, y: it.y } : f));
      const copy = { ...it };
      rebuildWorld();
      await saveItem(copy);
    }
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); G.zoomAdj = clamp(G.zoomAdj + (e.deltaY < 0 ? 1 : -1), -1, 3); }, { passive: false });
$('#zoomIn').onclick = () => (G.zoomAdj = clamp(G.zoomAdj + 1, -1, 3));
$('#zoomOut').onclick = () => (G.zoomAdj = clamp(G.zoomAdj - 1, -1, 3));

// ============================================================ วาด ====
// เครื่องช้า: ลดความละเอียดการวาดลงอัตโนมัติ (ภาพพิกเซลยังคมเหมือนเดิม แต่เบาเครื่องกว่ามาก)
let dprCap = 2, slowT = 0, fastT = 0;
function perfAdapt(dt) {
  if (document.hidden) return;
  if (dt > 1 / 38) { slowT += dt; fastT = 0; } else { fastT += dt; slowT = Math.max(0, slowT - dt * 0.5); }
  if (slowT > 3 && dprCap > 1) { dprCap = Math.max(1, dprCap - 0.5); slowT = 0; resize(); }
}
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const cw = window.innerWidth, ch = window.innerHeight;
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  G.view = { cw, ch, dpr };
}
window.addEventListener('resize', resize);
resize();

// ตำแหน่งย่อยระดับพิกเซลจอ (1/scale) — ตัวละครเดินลื่นไม่กระตุกทีละพิกเซลโลก
const snap = (v) => Math.round(v * (G.scale || 1)) / (G.scale || 1);
function drawSprite(c, s, x, y) { c.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height + 1)); }
function drawShadow(c, x, y, w = 12) {
  c.fillStyle = 'rgba(46,34,53,.22)';
  c.fillRect(snap(x - w / 2 + 1), snap(y - 1), w - 2, 3);
  c.fillRect(snap(x - w / 2), snap(y), w, 1);
}
function drawCharacter(c, ch, t) {
  const look = ch.look;
  const pose = ch.sit ? 'sit' : 'stand';
  const blink = ((t + ch.seed * 3) % 4.1) < 0.13;
  if (look.pet !== 'none' && ch.pet) { /* สัตว์เลี้ยงวาดแยก */ }
  if (!ch.sit) drawShadow(c, ch.x, ch.y);
  const s = charSprite(look, ch.dir, ch.frame, pose, blink);
  const shake = ch.shakeUntil && performance.now() < ch.shakeUntil ? Math.round(Math.sin(t * 60) * 1.5) : 0; // โดนสะกิด = สั่นดุ๊กดิ๊ก
  c.drawImage(s, snap(ch.x - 11 + shake), snap(ch.y - 35));
}
function drawPet(c, ch, t) {
  const pet = ch.pet;
  const frame = pet.ft > 0 ? Math.floor(pet.ft * 8) % 2 : Math.floor(t * 1.5) % 2 && ch.look.pet === 'slime' ? 1 : 0;
  drawShadow(c, pet.x, pet.y, 8);
  const fly = ch.look.pet === 'fish' ? 8 + Math.round(Math.sin(t * 3 + ch.seed) * 1.5) : 0;
  const s = petSprite(ch.look.pet, ch.look.pet === 'fish' ? Math.floor(t * 3) % 2 : frame, pet.face, ch.look.pc || 0);
  c.drawImage(s, snap(pet.x - 8), snap(pet.y - 15 - fly));
}

function render(t) {
  const { cw, ch, dpr } = G.view;
  const base = Math.max(2, Math.floor(Math.min(cw / 440, ch / 300)));
  G.scale = clamp(base + G.zoomAdj, 1, 7);
  const scale = G.scale;
  const bw = cw / scale, bh = ch / scale; // ขนาดที่มองเห็นในหน่วยพิกเซลโลก
  // วาดบัฟเฟอร์ที่ความละเอียดจอ (ไม่ใช่ความละเอียดโลก) เพื่อให้กล้อง/ตัวละครเลื่อนได้ทีละพิกเซลจอ
  const pw = Math.ceil(cw), ph = Math.ceil(ch);
  if (buf.width !== pw || buf.height !== ph) { buf.width = pw; buf.height = ph; }

  // กล้อง
  const me = G.me;
  // กล้องตามจุดกึ่งกลาง (ตัวละคร หรือจุดที่ลากไว้ตอนจัดห้อง) — ซูมเข้า/ออกแล้วตัวละครยังอยู่กลางจอเสมอ
  // เผื่อที่ให้แผงแชตด้านขวาบนจอใหญ่ ให้อยู่กลางพื้นที่ที่มองเห็นจริง
  const vw = bw - (G.chatOpen && !isMobile() ? 330 / scale : 0);
  let tx, ty;
  if (G.camManual && Number.isFinite(G.cam.mx)) { tx = G.cam.mx; ty = G.cam.my; }
  else { tx = me.x; ty = me.y - 16; }
  if (!G.cam.ready) { G.cam.cx = tx; G.cam.cy = ty; G.cam.ready = true; }
  const ca = 1 - Math.exp(-(G.frameDt || 1 / 60) * 10);
  G.cam.cx += (tx - G.cam.cx) * ca; G.cam.cy += (ty - G.cam.cy) * ca;
  if (Math.abs(tx - G.cam.cx) < 0.05) G.cam.cx = tx;
  if (Math.abs(ty - G.cam.cy) < 0.05) G.cam.cy = ty;
  // มือถือ: ถ้ามีหน้าต่าง YouTube/แชร์จอบังกลางจอ ให้ตัวละครอยู่กลางพื้นที่ที่เหลือด้านล่าง
  // ระหว่างปรับรัศมีไมค์: ซ่อนหน้าต่างวิดีโอ แล้วให้ตัวละคร+วงอยู่กลางพื้นที่เหนือแผง
  const pop = document.getElementById('micPop');
  const popTop = pop && !pop.classList.contains('hidden') ? pop.getBoundingClientRect().top : 0;
  const topOff = popTop ? (isMobile() ? 96 : 0) : (G.dockBottom || 0);
  const botOff = popTop ? ch - popTop : isLand() ? 52 : 86; // แถบเครื่องมือด้านล่าง
  const camX = Math.round((G.cam.cx - vw / 2) * scale) / scale, camY = Math.round((G.cam.cy - (topOff + ch - botOff) / 2 / scale) * scale) / scale;
  G.cam.x = camX; G.cam.y = camY;

  const b = bctx;
  b.setTransform(scale, 0, 0, scale, -Math.round(camX * scale), -Math.round(camY * scale));
  b.imageSmoothingEnabled = false;
  b.fillStyle = '#2e2235'; b.fillRect(camX, camY, bw, bh);
  b.drawImage(BG, LEFT, TOP);
  const sky = drawLiveWall(b, new Date(), t);

  // ชั้นพื้น: พรม, พรมใต้โต๊ะ, ที่นอนแมว
  const animItems = [];
  for (const it of G.furniture) {
    const d = FURN[it.t];
    if (!d.floor) continue;
    drawSprite(b, furnSprite(it.t, it.v || 0, it.f || 0), it.x, it.y);
  }
  const deskInfos = new Map(DESK_SLOTS.map((s) => [s.id, deskInfo(s.id)]));
  for (const s of DESK_SLOTS) {
    const info = deskInfos.get(s.id);
    const rug = info && RUG_COLORS.find((r) => r[0] === info.style.rug);
    if (rug && rug[2]) {
      b.fillStyle = shade(rug[2], -0.18); b.fillRect(s.x - 27, s.y - 22, 54, 44);
      b.fillStyle = rug[2]; b.fillRect(s.x - 26, s.y - 21, 52, 42);
      b.fillStyle = shade(rug[2], 0.4); for (let x = s.x - 23; x < s.x + 24; x += 4) { b.fillRect(x, s.y - 19, 2, 1); b.fillRect(x, s.y + 18, 2, 1); }
    }
  }

  // ของที่ต้องเรียงตามความลึก
  const list = [];
  for (const it of G.furniture) {
    const d = FURN[it.t];
    if (d.floor) continue;
    list.push({ y: it.y, kind: 'f', it });
  }
  for (const s of DESK_SLOTS) {
    list.push({ y: s.y, kind: 'desk', s });
    list.push({ y: s.y + CHAIR_DY, kind: 'chair', s });
  }
  const chars = [me, ...[...G.others.values()].filter((r) => Number.isFinite(r.p.x))];
  for (const c of chars) {
    if (c !== me) c.sit = c.p.s || null;
    const seat = c.sit && G.seatById && G.seatById.get(c.sit);
    list.push({ y: seat && seat.over ? seat.itemY + 0.5 : c.y + 0.2, kind: 'char', c });
    if (c.look.pet !== 'none') list.push({ y: c.pet.y, kind: 'pet', c });
  }
  list.sort((a, b2) => a.y - b2.y);
  for (const o of list) {
    if (o.kind === 'f') {
      const d = FURN[o.it.t];
      const spr = furnSprite(o.it.t, o.it.v || 0, o.it.f || 0);
      drawSprite(b, spr, o.it.x, o.it.y);
      if (d.anim) d.anim(b, Math.round(o.it.x - spr.width / 2) + 1, Math.round(o.it.y - spr.height + 1) + 1, t, o.it);
      if (d.board) drawBoardThumbs(b, o.it, Math.round(o.it.x - spr.width / 2) + 1, Math.round(o.it.y - spr.height + 1) + 1);
      if (SCREEN_TYPES.has(o.it.t) && o.it.t !== 'speaker') drawScreenThumb(b, o.it, Math.round(o.it.x - spr.width / 2) + 1, Math.round(o.it.y - spr.height + 1) + 1);
    } else if (o.kind === 'desk') {
      const info = deskInfos.get(o.s.id);
      drawSprite(b, deskSprite(info ? info.style : { c: 2, s: 'none', items: [] }), o.s.x, o.s.y);
    } else if (o.kind === 'chair') {
      const info = deskInfos.get(o.s.id);
      drawSprite(b, chairSprite(info ? info.style.ch : 5), o.s.x, o.s.y + CHAIR_DY);
    } else if (o.kind === 'char') drawCharacter(b, o.c, t);
    else if (o.kind === 'pet') drawPet(b, o.c, t);
  }
  for (const it of G.furniture) {
    const d = FURN[it.t];
    if (d.floor && d.anim) { const spr = furnSprite(it.t, it.v || 0, 0); d.anim(b, Math.round(it.x - spr.width / 2) + 1, Math.round(it.y - spr.height + 1) + 1, t, it); }
  }

  // กรอบของในโหมดจัดห้อง
  if (G.edit) {
    for (const it of G.furniture) {
      const d = FURN[it.t];
      const sel = it.id === G.selected;
      b.fillStyle = sel ? '#ff8fab' : 'rgba(255,255,255,.55)';
      const x0 = Math.round(it.x - d.w / 2 - 2), y0 = Math.round(it.y - d.h - 2), ww = d.w + 4, hh = d.h + 4;
      const dash = (t * 8) | 0;
      for (let i = 0; i < ww; i += 2) if (((i >> 1) + dash) % 2) { b.fillRect(x0 + i, y0, 1, 1); b.fillRect(x0 + i, y0 + hh, 1, 1); }
      for (let i = 0; i < hh; i += 2) if (((i >> 1) + dash) % 2) { b.fillRect(x0, y0 + i, 1, 1); b.fillRect(x0 + ww, y0 + i, 1, 1); }
    }
  }

  drawHearingRange(b, t);
  // เป้าหมายที่แตะ
  if (me.path && me.path.length && !G.edit) {
    const goal = me.path[me.path.length - 1];
    const k = Math.floor(t * 4) % 2;
    b.fillStyle = '#ff8fab';
    b.fillRect(Math.round(goal.x) - 3 - k, Math.round(goal.y), 2, 1); b.fillRect(Math.round(goal.x) + 2 + k, Math.round(goal.y), 2, 1);
    b.fillRect(Math.round(goal.x), Math.round(goal.y) - 2 - k, 1, 2); b.fillRect(Math.round(goal.x), Math.round(goal.y) + 1 + k, 1, 2);
  }

  // กลางคืน: หรี่ห้องแล้วเปิดไฟ
  if (sky.night > 0) {
    b.fillStyle = `rgba(30,22,74,${sky.night})`;
    b.fillRect(camX, camY, bw, bh);
    b.globalCompositeOperation = 'lighter';
    const light = (x, y, r, col) => {
      const gr = b.createRadialGradient(x, y, 2, x, y, r);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = gr; b.fillRect(x - r, y - r, r * 2, r * 2);
    };
    for (const it of G.furniture) {
      if (it.t === 'floorLamp') light(it.x, it.y - 26, 56, 'rgba(255,190,110,.32)');
      if (it.t === 'tv') light(it.x, it.y - 18, 34, 'rgba(120,150,255,.22)');
      if (it.t === 'arcade') light(it.x, it.y - 22, 26, 'rgba(255,140,200,.2)');
      if (it.t === 'fishTank') light(it.x, it.y - 18, 26, 'rgba(120,220,255,.2)');
    }
    for (const s of DESK_SLOTS) {
      const info = deskInfos.get(s.id);
      if (!info) continue;
      if (info.style.items.includes('lamp')) light(s.x - 12, s.y - 24, 34, 'rgba(255,210,120,.3)');
      if (info.style.s !== 'none') light(s.x, s.y - 30, 24, 'rgba(140,200,255,.18)');
    }
    b.globalCompositeOperation = 'source-over';
  }

  // ขึ้นจอ
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2e2235'; ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(buf, 0, 0, pw, ph, 0, 0, pw, ph);
  drawOverlay(t, chars, deskInfos, camX, camY, scale);
}

function drawOverlay(t, chars, deskInfos, camX, camY, scale) {
  const c = ctx;
  const now = performance.now();
  const S = (x, y) => [(x - camX) * scale, (y - camY) * scale];
  G.bubbleHits = [];
  G.musicHits = [];
  drawDoorLabels(c, camX, camY, scale);
  placeCinemaPanel(camX, camY, scale);
  // ป้ายชื่อโต๊ะ
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const s of DESK_SLOTS) {
    const info = deskInfos.get(s.id);
    const near = Math.hypot(G.me.x - s.x, G.me.y - s.y) < 70;
    if (!info && !near) continue;
    const [sx, sy] = S(s.x, s.y + CHAIR_DY + 3);
    const label = info ? info.name : 'โต๊ะว่าง';
    c.font = '500 10px Mitr, sans-serif';
    const w = c.measureText(label).width + 12;
    c.fillStyle = info ? (info.mine ? '#ffe07a' : '#fff7ec') : 'rgba(255,247,236,.7)';
    c.strokeStyle = '#2e2235'; c.lineWidth = 2;
    rrect(c, sx - w / 2, sy - 1, w, 15, 5); c.fill(); c.stroke();
    c.fillStyle = '#2e2235'; fillCenter(c, label, sx, sy + 7);
  }
  // ตัวละคร: ชื่อ สถานะ บับเบิล วิดีโอ
  const sorted = [...chars].sort((a, b) => a.y - b.y);
  for (const ch of sorted) {
    const p = ch === G.me ? null : ch.p;
    const [sx, sy0] = S(ch.x, ch.y);
    if (sx < -150 || sx > G.view.cw + 150 || sy0 < -80 || sy0 > G.view.ch + 200) continue;
    let top = sy0 - (ch.sit ? 33 : 35) * scale;
    const away = ch !== G.me && (G.voice ? !G.audible.has(ch.key) : zoneAt(ch.x, ch.y) !== G.zone);
    c.globalAlpha = away && G.voice ? 0.5 : 1;
    const key = ch === G.me ? G.net.myKey : ch.key;
    const speaking = G.voice && G.voice.speaking(key);
    // วิดีโอ (เวอร์ชันมีเสียง)
    const vid = G.voice && G.voice.videoFor(key);
    if (vid && vid.readyState >= 2 && vid.videoWidth) {
      const r = isMobile() ? 24 : 30;
      const cx = sx, cy = top - r - 4;
      c.save();
      rrect(c, cx - r, cy - r, r * 2, r * 2, 8); c.clip();
      const vw = vid.videoWidth, vh = vid.videoHeight, k = Math.max((2 * r) / vw, (2 * r) / vh);
      if (ch === G.me) { c.translate(cx, cy); c.scale(-1, 1); c.drawImage(vid, -vw * k / 2, -vh * k / 2, vw * k, vh * k); }
      else c.drawImage(vid, cx - vw * k / 2, cy - vh * k / 2, vw * k, vh * k);
      c.restore();
      if (ch !== G.me && (isBlackVideo(key, vid) || p.hid)) {
        c.fillStyle = 'rgba(46,34,53,.85)'; rrect(c, cx - r, cy - r, r * 2, r * 2, 8); c.fill();
        c.fillStyle = '#fff7ec'; c.font = `500 ${isMobile() ? 9 : 10}px Mitr, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        if (p.hid) { c.fillText('📱 พับจอ', cx, cy - 6); c.fillText('อยู่', cx, cy + 7); }
        else { c.fillText('⚫ ภาพดำ', cx, cy - 6); c.fillText('แตะดูสาเหตุ', cx, cy + 7); }
      }
      c.strokeStyle = speaking ? '#3fd07a' : '#2e2235'; c.lineWidth = 3;
      rrect(c, cx - r, cy - r, r * 2, r * 2, 8); c.stroke();
      G.bubbleHits.push({ x: cx, y: cy, r, key });
      top = cy - r - 4;
    }
    // ป้ายชื่อ
    const name = (ch === G.me ? G.me.nick : p.n) || 'เพื่อน';
    const st = (ch === G.me ? G.me.st : p.st) || '';
    const micOff = G.voice && (ch === G.me ? !G.voice.mic : p.mic === 0);
    const sharing = ch === G.me ? !!(G.voice && G.voice.screenTrack) : p.scr === 1;
    const label = (sharing ? '🖥️ ' : '') + (st ? st + ' ' : '') + name + (micOff ? ' 🔇' : '');
    c.font = '500 12px Mitr, sans-serif';
    const w = c.measureText(label).width + 14;
    const ly = top - 20;
    c.fillStyle = speaking ? '#3fd07a' : ch === G.me ? '#ff8fab' : 'rgba(46,34,53,.88)';
    rrect(c, sx - w / 2, ly, w, 18, 6); c.fill();
    c.fillStyle = '#ffffff'; fillCenter(c, label, sx, ly + 9.5);
    top = ly;
    // เพลงที่กำลังฟัง
    const mu = ch === G.me ? currentMusic() : (p.mu && typeof p.mu.t === 'string' ? p.mu : null);
    if (mu) {
      const lab = '🎵 ' + musicLabel(mu);
      c.font = '500 11px Mitr, sans-serif';
      const mw = c.measureText(lab).width + 12, my = top - 17;
      c.fillStyle = mu.s === 'sp' ? '#1db954' : '#5a4f78';
      rrect(c, sx - mw / 2, my, mw, 15, 5); c.fill();
      c.fillStyle = '#ffffff'; fillCenter(c, lab, sx, my + 8);
      const u = safeSpotifyUrl(mu.u);
      if (u) G.musicHits.push({ x0: sx - mw / 2, y0: my, x1: sx + mw / 2, y1: my + 15, u });
      top = my;
    }
    // บับเบิลแชต
    const bub = ch === G.me ? G.me.bubble : ch.bubble;
    if (bub && bub.until > now) {
      c.font = '400 13px Mitr, sans-serif';
      if (!bub.lines) bub.lines = wrapText(c, bub.text, 170, 3);
      const bw = Math.max(...bub.lines.map((l) => c.measureText(l).width)) + 18;
      const bh = bub.lines.length * 17 + 10;
      const by = top - bh - 9;
      const bx = clamp(sx, bw / 2 + 6, G.view.cw - bw / 2 - 6);
      const life = bub.until - now;
      c.globalAlpha = clamp(Math.min(life / 300, (6000 - life) / 120), 0, 1);
      c.fillStyle = '#ffffff'; c.strokeStyle = '#2e2235'; c.lineWidth = 2.5;
      rrect(c, bx - bw / 2, by, bw, bh, 8); c.fill(); c.stroke();
      const tx = clamp(sx, bx - bw / 2 + 12, bx + bw / 2 - 12);
      c.beginPath(); c.moveTo(tx - 5, by + bh - 1); c.lineTo(tx, by + bh + 6); c.lineTo(tx + 5, by + bh - 1); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(tx - 5, by + bh); c.lineTo(tx, by + bh + 6); c.lineTo(tx + 5, by + bh); c.stroke();
      c.fillStyle = '#2e2235';
      bub.lines.forEach((l, i) => fillCenter(c, l, bx, by + 5 + 8.5 + i * 17));
      c.globalAlpha = 1;
      top = by;
    } else if (bub) { if (ch === G.me) G.me.bubble = null; else ch.bubble = null; }
    ch._top = top;
    c.globalAlpha = 1;
  }
  // อีโมต
  G.emotes = G.emotes.filter((e) => now - e.start < 2200);
  for (const e of G.emotes) {
    const ch = e.key === 'me' ? G.me : G.others.get(e.key);
    if (!ch) continue;
    const [sx] = S(ch.x, ch.y);
    const k = (now - e.start) / 2200;
    const pop = k < 0.12 ? k / 0.12 : 1;
    c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    c.font = `${Math.round(28 * (0.5 + pop * 0.5))}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    fillCenter(c, e.e, sx + e.dx + Math.sin(k * 10) * 3, (ch._top ?? 0) - 16 - k * 50);
    c.globalAlpha = 1;
  }
}

// ============================================================ แอ็กชัน ====
function updateActions() {
  const box = $('#actions');
  const me = G.me;
  const acts = [];
  let hint = '';
  if (!G.edit && !me.sit && !me.path) {
    const bd = G.furniture.find((it) => FURN[it.t].board && Math.abs(me.x - it.x) < 24 && me.y > it.y - 4 && me.y < it.y + 24);
    if (bd) acts.push(['🖼️ เปิดกระดาน', 'board:' + bd.id]);
    const sc = G.furniture.find((it) => SCREEN_TYPES.has(it.t) && nearScreen(it));
    if (sc) acts.push([sc.t === 'speaker' ? '🔊 เปิดเพลงที่ลำโพง' : '📺 YouTube บนจอ', 'screen:' + sc.id]);
  }
  if (!G.edit) {
    if (me.sit) {
      acts.push(['ลุกขึ้น', 'stand']);
      if (G.myDesk && me.sit === `desk:${G.myDesk}`) acts.push(['🎨 แต่งโต๊ะ', 'deskEdit']);
    } else if (!me.path) {
      let best = null, bd = 22;
      for (const s of G.seats) {
        const d = Math.hypot(s.x - me.x, (s.y - me.y) * 1.2);
        if (d < bd && !seatTaken(s.id)) { bd = d; best = s; }
      }
      if (best) {
        if (best.kind === 'desk') {
          const info = deskInfo(best.slot);
          if (!info) acts.push(['✨ จองโต๊ะนี้', 'claim:' + best.slot]);
          else if (info.mine) { acts.push(['🪑 นั่ง', 'sit:' + best.id]); acts.push(['🎨 แต่งโต๊ะ', 'deskEdit']); }
          else hint = `โต๊ะของ ${info.name}`;
        } else acts.push(['🪑 นั่ง', 'sit:' + best.id]);
      }
    }
  }
  const sig = acts.map((a) => a[1]).join('|') + '#' + hint;
  if (sig === G.actionSig) return;
  G.actionSig = sig;
  box.innerHTML = '';
  if (hint) { const h = document.createElement('div'); h.className = 'hint'; h.textContent = hint; box.append(h); }
  acts.forEach(([label, act], i) => {
    const btn = document.createElement('button');
    btn.className = 'pbtn' + (i === 0 ? ' pink' : '');
    btn.textContent = label;
    btn.onclick = () => {
      if (act === 'stand') standUp();
      else if (act === 'deskEdit') openDeskEditor();
      else if (act.startsWith('claim:')) claimDesk(act.slice(6));
      else if (act.startsWith('screen:')) { const it = G.furniture.find((f) => f.id === act.slice(7)); if (it) openScreenModal(it); }
      else if (act.startsWith('board:')) { const it = G.furniture.find((f) => f.id === act.slice(6)); if (it) openBoard(it); }
      else if (act.startsWith('sit:')) { const s = G.seats.find((x) => x.id === act.slice(4)); if (s) sitOn(s); }
      G.actionSig = '';
    };
    box.append(btn);
  });
}

// =========================================================== ถาด/เมนู ====
function closeTrays(except) {
  for (const id of ['emoteTray', 'statusTray']) if (id !== except) $('#' + id).classList.add('hidden');
  $('[data-tool="emote"]').classList.toggle('active', except === 'emoteTray' && !$('#emoteTray').classList.contains('hidden'));
  $('[data-tool="status"]').classList.toggle('active', except === 'statusTray' && !$('#statusTray').classList.contains('hidden'));
}
function toggleTray(id) {
  const el = $('#' + id);
  const show = el.classList.contains('hidden');
  if (G.edit) setEdit(false);
  el.classList.toggle('hidden', !show);
  closeTrays(id);
}
function buildTrays() {
  const et = $('#emoteTray'); et.innerHTML = '';
  for (const e of EMOTES) {
    const b = document.createElement('button'); b.className = 'emo'; b.textContent = e;
    b.onclick = () => { pres({ em: { e, ts: Date.now() } }); G.emotes.push({ key: 'me', e, start: performance.now(), dx: 0 }); SFX.pop(); };
    et.append(b);
  }
  const st = $('#statusTray'); st.innerHTML = '';
  const mb = document.createElement('button'); mb.className = 'st';
  const mi = document.createElement('i'); mi.textContent = '🎵';
  const ms = document.createElement('span'); ms.textContent = 'เพลงที่ฟัง';
  mb.append(mi, ms); mb.onclick = () => { $('#statusTray').classList.add('hidden'); closeTrays(); openMusic(); };
  st.append(mb);
  for (const [e, label] of STATUSES) {
    const b = document.createElement('button'); b.className = 'st' + (G.me.st === e ? ' sel' : '');
    const i = document.createElement('i'); i.textContent = e || '➖';
    const s = document.createElement('span'); s.textContent = label;
    b.append(i, s);
    b.onclick = () => { G.me.st = e; lsSet('pixel.status', e); pres({ st: e }); $('#statusIcon').textContent = e || '💬'; buildTrays(); $('#statusTray').classList.add('hidden'); closeTrays(); };
    st.append(b);
  }
}
$('#toolbar').addEventListener('click', (e) => {
  const tool = e.target.closest('[data-tool]')?.dataset.tool;
  if (!tool) return;
  if (tool === 'look') openCreator(false);
  if (tool === 'desk') { if (G.edit) setEdit(false); goToMyDesk(); }
  if (tool === 'edit') setEdit(!G.edit);
  if (tool === 'emote') toggleTray('emoteTray');
  if (tool === 'status') toggleTray('statusTray');
  if (tool === 'chat') setChatOpen(!G.chatOpen);
});
$('#roomChip').onclick = () => { const p = $('#people'); p.classList.toggle('hidden'); G.peopleSig = ''; if (!p.classList.contains('hidden')) renderPeople(); };
// ออกจากห้อง: รีโหลดหน้าเพื่อปิดไมค์/กล้อง/การเชื่อมต่อทั้งหมด แล้วกลับไปหน้าเข้าห้อง
// ไม่ใช้ confirm() เพราะบางแอป (LINE/IG/Facebook) บล็อกกล่องยืนยัน ทำให้กดออกไม่ได้เลย
$('#leaveTop').onclick = () => askLeave();
$('#leaveBtn').onclick = () => askLeave();
function askLeave() {
  $('#people').classList.add('hidden');
  openModal((card) => {
    card.classList.add('leave-card');
    card.append(el('h2', null, '👋 จะออกแล้วเหรอ?'));
    card.append(el('p', 'sub', 'ออกแล้ว ไมค์และกล้องจะปิดทันที'));
    const b1 = el('button', 'pbtn pink big', '🚪 ออกจากห้อง (กลับหน้าแรก)'); b1.onclick = () => doLeave('room');
    const b2 = el('button', 'pbtn big', '❌ ออกจากเว็บ'); b2.onclick = () => doLeave('site');
    const b3 = el('button', 'pbtn big ghost', 'อยู่ต่อ'); b3.onclick = () => closeModal();
    const col = el('div', 'leave-col'); col.append(b1, b2, b3); card.append(col);
  });
}
function hangUp() {
  try { G.voice && G.voice.shutdown && G.voice.shutdown(); } catch {}
  try { keepAlive(false); } catch {}
  try { document.querySelectorAll('iframe').forEach((f) => f.remove()); } catch {}
  try { G.net.stop && G.net.stop(); } catch {}
}
function doLeave(mode) {
  hangUp();
  G.joined = false;
  if (mode === 'room') { try { sessionStorage.setItem('pixel.left', '1'); } catch {} location.reload(); return; }
  // ออกจากเว็บ: 1) ลองปิดแท็บ/หน้าต่าง 2) ย้อนกลับไปหน้าก่อนหน้า (เปิดจาก LINE/IG = ปิดหน้าเว็บกลับไปแชท)
  // 3) ถ้ายังอยู่ ไปหน้าว่างเปล่า (ออกจากเว็บไปแล้วจริงๆ) — เบราว์เซอร์ไม่อนุญาตให้เว็บปิดแท็บที่ผู้ใช้เปิดเองโดยตรง
  try { window.close(); } catch {}
  setTimeout(() => { try { if (history.length > 1) history.back(); } catch {} }, 150);
  setTimeout(() => { try { location.replace('about:blank'); } catch {} }, 900);
  setTimeout(() => {
    for (const e of document.body.children) e.style.display = 'none';
    const bye = document.createElement('div'); document.body.append(bye);
    bye.outerHTML = '<div class="bye"><div class="bye-card"><div class="bye-emo">👋</div><h2>ออกจากเว็บแล้ว</h2><p>ไมค์ กล้อง และการเชื่อมต่อปิดหมดแล้ว<br>ปิดแท็บนี้ได้เลย (หรือกดปุ่มย้อนกลับ/ปัดแอปทิ้ง)</p><button class="pbtn pink big" id="byeBack">กลับเข้าเว็บอีกครั้ง</button></div></div>';
    document.getElementById('byeBack').onclick = () => location.reload();
    try { history.replaceState(null, '', location.pathname); } catch {}
  }, 1600);
}
// ปิดแท็บ/ปัดแอปทิ้ง: ตัดการเชื่อมต่อทันที เพื่อนจะเห็นว่าออกแล้วเลย ไม่ค้างอยู่ในห้อง
window.addEventListener('pagehide', (e) => { if (!e.persisted && G.joined) hangUp(); });
$$('[data-close]').forEach((b) => (b.onclick = () => $('#' + b.dataset.close).classList.add('hidden')));

function renderPeople() {
  const ul = $('#peopleList');
  const rows = [{ me: true, n: G.me.nick, l: G.me.look, st: G.me.st, desk: G.myDesk, z: zoneAt(G.me.x, G.me.y), mu: currentMusic() }];
  for (const rt of G.others.values()) if (Number.isFinite(rt.p.x)) rows.push({ rt, n: rt.p.n, l: rt.p.l, st: rt.p.st, desk: rt.p.dk && rt.p.dk.slot, guest: rt.guest, z: zoneAt(rt.p.x, rt.p.y), mu: rt.p.mu });
  for (const r of rows) if (r.rt) r.vs = voiceStatus(r.rt);
  const sig = JSON.stringify(rows.map((r) => [r.n, r.l, r.st, r.desk, r.z, r.mu && r.mu.t, r.guest, !!r.me, r.vs || '']));
  if (sig === G.peopleSig && ul.children.length) return;
  G.peopleSig = sig;
  ul.innerHTML = '';
  for (const r of rows) {
    const li = document.createElement('li');
    const cv = mkCanvas(22, 36);
    cv.getContext('2d').drawImage(charSprite(cleanLook(r.l), 'down', 0, 'stand', false), 0, 0);
    const who = document.createElement('div'); who.className = 'who';
    const b = document.createElement('b'); b.textContent = (r.n || 'เพื่อน') + (r.me ? ' (คุณ)' : '');
    const sm = document.createElement('small');
    const stl = STATUSES.find((s) => s[0] === r.st);
    sm.textContent = [`${ZONES[r.z].icon} ${zoneName(r.z)}`, stl && stl[0] ? `${stl[0]} ${stl[1]}` : '', r.desk ? `โต๊ะ ${r.desk.slice(1)}` : '', r.mu && typeof r.mu.t === 'string' ? `🎵 ${musicLabel(r.mu)}` : '', r.guest ? 'แขก' : ''].filter(Boolean).join(' · ');
    who.append(b, sm);
    if (r.vs) { const vs = document.createElement('small'); vs.className = 'vstat'; vs.textContent = r.vs; who.append(vs); }
    li.append(cv, who);
    if (r.rt) {
      const go = document.createElement('button'); go.className = 'pbtn sm'; go.textContent = '🚶 ไปหา';
      go.onclick = () => { walkTo(r.rt.x + 14, r.rt.y + 4); $('#people').classList.add('hidden'); };
      const pk = document.createElement('button'); pk.className = 'pbtn sm'; pk.textContent = '👉'; pk.title = 'สะกิด';
      pk.onclick = () => pokeByName(r.n || '');
      // ปรับเสียงคนนี้เฉพาะในเครื่องเรา
      const vb = document.createElement('button'); vb.className = 'pbtn sm'; vb.textContent = peerVolIcon(r.rt); vb.title = 'ปรับเสียงคนนี้ (เฉพาะเรา)';
      const id = peerId(r.rt);
      vb.onclick = () => { G.peopleVolOpen = G.peopleVolOpen === id ? null : id; G.peopleSig = ''; renderPeople(); };
      const acts = document.createElement('div'); acts.className = 'acts';
      acts.append(vb, pk, go); who.append(acts);
      ul.append(li);
      if (G.peopleVolOpen === id) { const vli = document.createElement('li'); vli.className = 'pvol-li'; vli.append(peerVolRow(r.rt, vb)); ul.append(vli); }
      continue;
    }
    ul.append(li);
  }
  const note = $('#shareNote');
  note.textContent = G.net.mode === 'claude'
    ? 'ชวนเพื่อน: กด Share ที่หน้านี้บน claude.ai แล้วเชิญเพื่อน (ให้สิทธิ์ Contributor/Editor เพื่อจองโต๊ะและจัดห้องได้)'
    : G.net.mode === 'ws' ? 'ส่งลิงก์หน้านี้ให้เพื่อนได้เลย ใครมีลิงก์ก็เข้ามาได้' : (G.net.reason || 'โหมดเล่นคนเดียว');
}

// ========================================================== โมดัล ====
function openModal(build) {
  const card = $('#card');
  card.innerHTML = '';
  card.className = 'card';
  card.scrollTop = 0;
  build(card);
  $('#modal').classList.remove('hidden');
}
function closeModal() { $('#modal').classList.add('hidden'); G.previewLoop = null; G.voicePanelOpen = false; G.boardOpen = null; G.musicOpen = false; }
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function optRow(label, items, isSel, onPick, kind = 'chip') {
  const o = el('div', 'opt');
  o.append(el('span', null, label));
  const row = el('div', 'row');
  const paint = () => {
    row.innerHTML = '';
    items.forEach((it, i) => {
      const b = el('button', kind === 'sw' ? 'sw' : 'ch');
      b.type = 'button';
      if (kind === 'sw') { b.style.background = it; b.setAttribute('aria-label', it); } else b.textContent = it[1];
      if (isSel(it, i)) b.classList.add('sel');
      b.onclick = () => { onPick(it, i); paint(); };
      row.append(b);
    });
  };
  paint(); o.append(row);
  return o;
}
function startPreview(cv, drawFn) {
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const loop = (ms) => {
    if (G.previewLoop !== loop) return;
    g.clearRect(0, 0, cv.width, cv.height);
    drawFn(g, ms / 1000);
    requestAnimationFrame(loop);
  };
  G.previewLoop = loop;
  requestAnimationFrame(loop);
}

function openCreator(first) {
  const draft = { ...G.me.look };
  let nick = G.me.nick || G.net.profileName || lsGet('pixel.nick', '') || '';
  openModal((card) => {
    card.classList.add('split');
    card.append(el('h2', null, first ? 'สร้างตัวละครของคุณ ✨' : 'แต่งตัวละคร'));
    card.append(el('p', 'sub', first ? 'แต่งให้น่ารักแล้วเข้าห้องไปหาเพื่อนกัน' : 'เปลี่ยนแล้วเพื่อนเห็นทันที'));
    const wrap = el('div', 'creator');
    const stage = el('div', 'stage');
    const cv = mkCanvas(56, 56);
    stage.append(cv);
    const turn = el('div', 'turn');
    const dice = el('button', 'pbtn sm', '🎲 สุ่ม');
    dice.type = 'button';
    turn.append(dice);
    stage.append(turn);
    // หมุนดูตัวละครเอง (◀ ▶ หรือปัดซ้าย/ขวาบนรูป) — ทิศที่เลือกจะเป็นทิศที่ตัวละครหันตอนเข้าห้อง
    let manualDir = null;
    const spin = (k) => { const cur = manualDir || G.me.dir || 'down'; manualDir = TURN_ORDER[(TURN_ORDER.indexOf(cur) + k + 4) % 4]; };
    const rot = el('div', 'rot');
    const rl = el('button', 'pbtn sm', '◀'), rr = el('button', 'pbtn sm', '▶'), ra = el('button', 'pbtn sm', '🔄');
    rl.type = rr.type = ra.type = 'button'; rl.title = 'หันซ้าย'; rr.title = 'หันขวา'; ra.title = 'หมุนอัตโนมัติ';
    rl.onclick = () => spin(1); rr.onclick = () => spin(-1); ra.onclick = () => (manualDir = null);
    rot.append(rl, ra, rr);
    let sx0 = null;
    cv.addEventListener('pointerdown', (e) => (sx0 = e.clientX));
    cv.addEventListener('pointerup', (e) => { if (sx0 != null && Math.abs(e.clientX - sx0) > 24) spin(e.clientX < sx0 ? 1 : -1); sx0 = null; });
    cv.style.touchAction = 'pan-y';
    const sticky = el('div', 'stage-wrap'); sticky.append(stage, rot); wrap.append(sticky);
    const opts = el('div', 'opts');
    const nameField = el('label', 'field opt');
    nameField.append(el('span', null, 'ชื่อเล่น'));
    const nameInput = el('input');
    nameInput.maxLength = 16; nameInput.placeholder = 'เช่น ภพ'; nameInput.value = nick;
    nameInput.oninput = () => (nick = nameInput.value);
    nameField.append(nameInput);
    opts.append(nameField);
    if (first && G.net.mode === 'ws' && G.net.needPassword) {
      const pw = el('label', 'field opt');
      pw.append(el('span', null, 'รหัสผ่านห้อง'));
      const pi = el('input'); pi.type = 'password'; pi.oninput = () => (G.net.password = pi.value);
      pw.append(pi); opts.append(pw);
    }
    const sections = () => [
      optRow('เพศ', SEXES, (it) => draft.sex === it[0], (it) => (draft.sex = it[0])),
      optRow('สีผิว', SKINS, (_, i) => draft.skin === i, (_, i) => (draft.skin = i), 'sw'),
      optRow('ทรงผม', HAIR_STYLES, (it) => draft.hair === it[0], (it) => (draft.hair = it[0])),
      optRow('สีผม', HAIR_COLORS, (_, i) => draft.hc === i, (_, i) => (draft.hc = i), 'sw'),
      optRow('เสื้อ', TOPS, (it) => draft.top === it[0], (it) => (draft.top = it[0])),
      optRow('สีเสื้อ', CLOTH_COLORS, (_, i) => draft.tc === i, (_, i) => (draft.tc = i), 'sw'),
      optRow('สีกางเกง / เอี๊ยม', CLOTH_COLORS, (_, i) => draft.bc === i, (_, i) => (draft.bc = i), 'sw'),
      optRow('เครื่องประดับ', ACCS, (it) => draft.acc === it[0], (it) => (draft.acc = it[0])),
      optRow('สัตว์เลี้ยงคู่ใจ', PETS, (it) => draft.pet === it[0], (it) => (draft.pet = it[0])),
      optRow('สีสัตว์เลี้ยง (ช่องแรก = สีธรรมชาติ)', PET_COLORS.map((c) => c || 'linear-gradient(135deg,#f2a65a,#7ed37a 50%,#7d9cf0)'), (_, i) => (draft.pc || 0) === i, (_, i) => (draft.pc = i), 'sw'),
    ];
    const secBox = el('div', 'opts');
    const paintSections = () => { secBox.innerHTML = ''; sections().forEach((s) => secBox.append(s)); };
    paintSections();
    opts.append(secBox);
    wrap.append(opts);
    card.append(wrap);
    dice.onclick = () => {
      const r = (a) => Math.floor(Math.random() * a.length);
      Object.assign(draft, { pc: r(PET_COLORS), skin: r(SKINS), hair: HAIR_STYLES[r(HAIR_STYLES)][0], hc: r(HAIR_COLORS), top: TOPS[r(TOPS)][0], tc: r(CLOTH_COLORS), bc: r(CLOTH_COLORS), acc: ACCS[r(ACCS)][0], pet: PETS[r(PETS)][0] });
      paintSections(); SFX.pop();
    };
    const foot = el('div', 'foot');
    if (!first) { const cancel = el('button', 'pbtn', 'ยกเลิก'); cancel.onclick = closeModal; foot.append(cancel); }
    const ok = el('button', 'pbtn pink', first ? 'เข้าห้อง ✨' : 'บันทึก');
    ok.onclick = () => {
      nick = nick.trim().slice(0, 16);
      if (!nick) { nameInput.focus(); toast('ใส่ชื่อเล่นก่อนนะ'); return; }
      G.me.nick = nick;
      G.me.look = cleanLook(draft);
      lsSet('pixel.look', G.me.look); lsSet('pixel.nick', nick);
      G.net.savePrivate({ look: G.me.look, nick, desk: G.myDeskStyle });
      if (manualDir && !G.me.sit) G.me.dir = manualDir;
      closeModal();
      if (first) join();
      else { pres({ n: nick, l: G.me.look, d: G.me.dir }); if (G.myDesk) saveDesk(); }
    };
    foot.append(ok);
    card.append(foot);
    if (first) card.append(el('p', 'tip', G.net.mode === 'claude'
      ? 'ห้องนี้เป็นหน้าเว็บบน claude.ai — คนที่คุณแชร์ให้จะเข้ามาเดินเล่นด้วยกันได้ทันที'
      : G.net.mode === 'ws' ? 'คุยเสียงและเปิดกล้องได้จากปุ่มมุมขวาบนหลังเข้าห้อง' : (G.net.reason || '')));
    const dirs = ['down', 'right', 'up', 'left'];
    startPreview(cv, (g, t) => {
      const dir = manualDir || dirs[Math.floor(t / 1.4) % 4];
      const frame = manualDir ? 0 : Math.floor(t * 6) % 4;
      const L = cleanLook(draft);
      g.fillStyle = 'rgba(46,34,53,.2)'; g.fillRect(19, 47, 18, 3);
      g.drawImage(charSprite(L, dir, frame, 'stand', (t % 3.3) < 0.12), 17, 13);
      if (L.pet !== 'none') { g.fillRect(38, 48, 10, 2); g.drawImage(petSprite(L.pet, Math.floor(t * 4) % 2, false, L.pc), 35, L.pet === 'fish' ? 28 + Math.round(Math.sin(t * 3)) : 35); }
    });
    if (!nick) setTimeout(() => nameInput.focus(), 50);
  });
}

function openDeskEditor() {
  if (!G.myDesk) { goToMyDesk(); return; }
  const draft = cleanDesk(G.myDeskStyle);
  openModal((card) => {
    card.classList.add('split');
    card.append(el('h2', null, 'แต่งโต๊ะทำงาน 🖥️'));
    card.append(el('p', 'sub', 'เลือกได้ตามใจ เพื่อนๆ จะเห็นโต๊ะของคุณ'));
    const wrap = el('div', 'creator');
    const stage = el('div', 'stage');
    const cv = mkCanvas(64, 64);
    stage.append(cv); const sticky = el('div', 'stage-wrap'); sticky.append(stage); wrap.append(sticky);
    const opts = el('div', 'opts');
    const sec = el('div', 'opts');
    const paint = () => {
      sec.innerHTML = '';
      sec.append(optRow('สีโต๊ะ', DESK_COLORS.map((d) => [d[0], d[0]]), (_, i) => draft.c === i, (_, i) => (draft.c = i)));
      sec.append(optRow('ชุดคอม', SETUPS, (it) => draft.s === it[0], (it) => (draft.s = it[0])));
      sec.append(optRow('สีเก้าอี้', COLORWAYS.map((c) => c[0]), (_, i) => draft.ch === i, (_, i) => (draft.ch = i), 'sw'));
      sec.append(optRow('ของบนโต๊ะ (เลือกได้ 3 อย่าง)', DESK_ITEMS, (it) => draft.items.includes(it[0]), (it) => {
        if (draft.items.includes(it[0])) draft.items = draft.items.filter((k) => k !== it[0]);
        else if (draft.items.length < 3) draft.items = [...draft.items, it[0]];
        else toast('วางได้สูงสุด 3 อย่าง');
      }));
      sec.append(optRow('พรมใต้โต๊ะ', RUG_COLORS, (it) => draft.rug === it[0], (it) => (draft.rug = it[0])));
    };
    paint();
    opts.append(sec); wrap.append(opts); card.append(wrap);
    const foot = el('div', 'foot');
    const rel = el('button', 'pbtn danger', 'คืนโต๊ะ');
    rel.onclick = () => { closeModal(); releaseDesk(); };
    const cancel = el('button', 'pbtn', 'ยกเลิก'); cancel.onclick = closeModal;
    const ok = el('button', 'pbtn pink', 'บันทึก');
    ok.onclick = () => { G.myDeskStyle = cleanDesk(draft); closeModal(); saveDesk(); G.net.savePrivate({ look: G.me.look, nick: G.me.nick, desk: G.myDeskStyle }); SFX.pop(); };
    foot.append(rel, cancel, ok);
    card.append(foot);
    startPreview(cv, (g) => {
      const st = cleanDesk(draft);
      const rug = RUG_COLORS.find((r) => r[0] === st.rug);
      if (rug && rug[2]) { g.fillStyle = shade(rug[2], -0.18); g.fillRect(5, 13, 54, 46); g.fillStyle = rug[2]; g.fillRect(6, 14, 52, 44); }
      const ds = deskSprite(st);
      g.drawImage(ds, 32 - 21, 44 - 41);
      g.drawImage(chairSprite(st.ch), 32 - 9, 44 + CHAIR_DY - 19);
    });
  });
}

function openCallModal() {
  const url = G.settings.call || '';
  openModal((card) => {
    card.append(el('h2', null, 'ห้องคุยเสียง 🎧'));
    card.append(el('p', 'sub', 'หน้าเว็บบน claude.ai เปิดไมค์/กล้องไม่ได้ เลยใช้ลิงก์ห้องเสียงที่พวกเราใช้กันอยู่แล้ว (Discord, Google Meet, LINE ฯลฯ) — ตั้งครั้งเดียว ทุกคนกดเข้าได้เลย'));
    if (url) {
      const a = el('a', 'pbtn pink', '🎧 เข้าห้องเสียงเลย');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.style.textDecoration = 'none'; a.style.fontSize = '16px'; a.style.padding = '10px 18px';
      card.append(a);
      card.append(el('p', 'tip', url));
    }
    if (G.net.canWrite !== false && G.net.hasDb) {
      const f = el('label', 'field opt');
      f.style.marginTop = '14px';
      f.append(el('span', null, url ? 'เปลี่ยนลิงก์' : 'วางลิงก์ห้องเสียง'));
      const inp = el('input'); inp.placeholder = 'https://discord.gg/… หรือ https://meet.google.com/…'; inp.value = url;
      f.append(inp); card.append(f);
      const foot = el('div', 'foot');
      const cancel = el('button', 'pbtn', 'ปิด'); cancel.onclick = closeModal;
      const save = el('button', 'pbtn pink', 'บันทึกลิงก์');
      save.onclick = async () => {
        const v = inp.value.trim();
        if (v && !/^https:\/\/[^\s]+$/i.test(v)) { toast('ลิงก์ต้องขึ้นต้นด้วย https://'); return; }
        try { await G.net.set('settings', 'room', { ...G.settings, call: v }); toast('บันทึกลิงก์แล้ว'); closeModal(); }
        catch { toast('บันทึกไม่สำเร็จ'); }
      };
      foot.append(cancel, save); card.append(foot);
    } else {
      if (!url) card.append(el('p', 'tip', 'ยังไม่มีใครตั้งลิงก์ห้องเสียง ให้เจ้าของห้องตั้งให้นะ'));
      const foot = el('div', 'foot'); const c = el('button', 'pbtn', 'ปิด'); c.onclick = closeModal; foot.append(c); card.append(foot);
    }
  });
}
$('#callBtn').onclick = openCallModal;
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && G.joined) { G.voicePanelOpen = false; closeModal(); } });

// ============================================================== เสียง (Node) ====
function setupVoice() {
  const V = makeVoice(G.net, (kind, msg) => {
    if (kind === 'error') toast(msg);
    if (kind === 'unlock') toast('แตะหน้าจอหนึ่งครั้งเพื่อเปิดเสียงเพื่อน');
    if (kind === 'mic-dead') { pres({ md: 1 }); toast('⚠️ ไมค์เปิดอยู่แต่ไม่มีเสียงเข้าเลย — ลองเลือกไมค์ตัวอื่นในตั้งค่าเสียง ⚙️ หรือปิดแอปอื่นที่ใช้ไมค์ แล้วรีเฟรช', 8000); }
    if (kind === 'mic-alive') pres({ md: null });
    if (kind === 'unlock-mic' && !G.unlockMicShown) { G.unlockMicShown = true; setTimeout(() => (G.unlockMicShown = false), 20000); toast('👆 แตะหน้าจอ 1 ครั้ง เพื่อให้เสียงของคุณไปถึงเพื่อน', 6000); }
    if (kind === 'media') { pres({ mic: V.mic ? 1 : 0, cam: V.cam ? 1 : 0, scr: V.screenTrack ? 1 : 0 }); paintVoiceButtons(); syncShare(); if (G.voicePanelOpen) paintVoiceSettings(); }
  });
  G.voice = V;
  V.remoteMicOn = (key) => { const rt = G.others.get(key); return !!(rt && rt.p.mic === 1); };
  V.remoteCamOn = (key) => { const rt = G.others.get(key); return !!(rt && rt.p.cam === 1); };
  ['micBtn', 'camBtn', 'deafBtn', 'voiceSetBtn'].forEach((id) => $('#' + id).classList.remove('hidden'));
  $('#voiceSetBtn').onclick = openVoiceSettings;
  if (V.canShare) { $('#shareBtn').classList.remove('hidden'); $('#shareBtn').onclick = () => (V.screenTrack ? V.stopScreen() : V.startScreen()); }
  $('#callBtn').classList.add('hidden');
  $('#micBtn').onclick = () => V.toggleMic();
  $('#camBtn').onclick = () => V.toggleCam();
  $('#deafBtn').onclick = () => V.toggleDeaf();
  document.addEventListener('pointerdown', () => V.unlock(), { once: true });
  paintVoiceButtons();
}
function paintVoiceButtons() {
  const V = G.voice;
  $('#micBtn').textContent = V.mic ? '🎙️' : '🔇'; $('#micBtn').classList.toggle('off', !V.mic); $('#micBtn').title = V.mic ? 'ปิดไมค์' : 'เปิดไมค์';
  $('#camBtn').classList.toggle('on', V.cam); $('#camBtn').title = V.cam ? 'ปิดกล้อง' : 'เปิดกล้อง';
  $('#deafBtn').textContent = V.deaf ? '🔈' : '🔊'; $('#deafBtn').classList.toggle('off', V.deaf);
  $('#shareBtn').classList.toggle('on', !!V.screenTrack); $('#shareBtn').title = V.screenTrack ? 'หยุดแชร์จอ' : 'แชร์จอ';
}
// ---------- หน้าต่างตั้งค่าไมค์ / กล้อง / ฟังเสียงตัวเอง ----------
let voiceDevs = [];
async function openVoiceSettings() {
  voiceDevs = await G.voice.devices();
  G.voicePanelOpen = true;
  openModal(() => {});
  paintVoiceSettings();
  const loop = () => {
    if ($('#modal').classList.contains('hidden') || !G.voicePanelOpen) { G.voicePanelOpen = false; return; }
    const bar = $('#vMeter');
    if (bar) bar.style.width = Math.min(100, G.voice.level() * 700) + '%';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
function paintVoiceSettings() {
  const V = G.voice, st = V.settings;
  const card = $('#card');
  card.innerHTML = '';
  card.append(el('h2', null, 'ไมค์ กล้อง และเสียง 🎙️'));
  card.append(el('p', 'sub', 'ทดสอบเสียงตัวเองได้ก่อนคุยกับเพื่อน — การตั้งค่าจะจำไว้ในเครื่องนี้'));
  const grid = el('div', 'vset');
  // ---- ซ้าย: กล้อง ----
  const left = el('div');
  const prev = el('div', 'cam-prev');
  if (V.cam && V.videoTrack) {
    const v = el('video'); v.muted = true; v.autoplay = true; v.playsInline = true; v.setAttribute('playsinline', '');
    v.srcObject = new MediaStream([V.videoTrack]); if (st.facing !== 'user') v.classList.add('back');
    v.play().catch(() => {}); prev.append(v);
  } else prev.textContent = '📷 กล้องปิดอยู่';
  left.append(prev);
  const vb = el('div', 'vbtns');
  const camB = el('button', 'pbtn sm' + (V.cam ? ' on' : ''), V.cam ? '📷 ปิดกล้อง' : '📷 เปิดกล้อง');
  camB.onclick = () => V.toggleCam();
  vb.append(camB);
  if (isMobile() || voiceDevs.filter((d) => d.kind === 'videoinput').length > 1) {
    const flip = el('button', 'pbtn sm', '🔄 กล้องหน้า/หลัง');
    flip.onclick = () => V.switchCamera('', st.facing === 'user' ? 'environment' : 'user');
    vb.append(flip);
  }
  left.append(vb);
  const camSel = deviceSelect('videoinput', st.camId || V.videoTrack?.getSettings().deviceId, (id) => V.switchCamera(id, 'user'));
  if (camSel) { const o = el('div', 'opt'); o.style.marginTop = '12px'; o.append(el('span', null, 'เลือกกล้อง'), camSel); left.append(o); }
  grid.append(left);
  // ---- ขวา: ไมค์ + ฟังเสียงตัวเอง ----
  const right = el('div', 'opts');
  const micO = el('div', 'opt');
  micO.append(el('span', null, 'ไมโครโฟน'));
  const micSel = deviceSelect('audioinput', st.micId || V.audioTrack?.getSettings().deviceId, (id) => V.setOption('micId', id));
  if (micSel) micO.append(micSel);
  const meter = el('div', 'vmeter'); const fill = el('i'); fill.id = 'vMeter'; meter.append(fill); micO.append(meter);
  const mrow = el('div', 'vbtns');
  if (!V.audioTrack) {
    const allow = el('button', 'pbtn sm pink', '🎙️ อนุญาตไมค์เพื่อทดสอบ');
    allow.onclick = async () => { if (await V.ensureMic()) { voiceDevs = await V.devices(); paintVoiceSettings(); } };
    mrow.append(allow);
  }
  const micB = el('button', 'pbtn sm' + (V.mic ? ' on' : ' off'), V.mic ? '🎙️ เพื่อนได้ยินคุณอยู่ (กดเพื่อปิด)' : '🔇 ไมค์ปิดกับเพื่อน (กดเพื่อเปิด)');
  micB.onclick = () => V.toggleMic();
  mrow.append(micB); micO.append(mrow);
  right.append(micO);

  const mon = el('div', 'mon');
  const monChk = el('label', 'chk');
  const mc = el('input'); mc.type = 'checkbox'; mc.checked = !!st.monitor;
  mc.onchange = () => V.setMonitor(mc.checked);
  monChk.append(mc, el('b', null, '🎧 ฟังเสียงตัวเอง'));
  mon.append(monChk);
  const vol = el('input'); vol.type = 'range'; vol.min = '0'; vol.max = '1.5'; vol.step = '0.05'; vol.value = String(st.monVol);
  vol.oninput = () => V.setMonitorVolume(Number(vol.value));
  vol.disabled = !st.monitor;
  mon.append(vol);
  mon.append(el('p', 'warn', 'ใส่หูฟังก่อนเปิด ไม่งั้นเสียงจะวนจากลำโพงเข้าไมค์จนหอน · ฟังได้แม้ปิดไมค์กับเพื่อนอยู่ (เพื่อนไม่ได้ยิน)'));
  right.append(mon);

  // ---- รัศมีไมค์ (ห้องรวม) ----
  const mr = el('div', 'mon');
  mr.style.borderColor = MIC_COLORS[G.micSet.c];
  mr.append(el('b', null, '⭕ รัศมีไมค์ (ห้องรวม)'));
  mr.append(el('p', 'tip', 'เสียงคุณไปถึงเฉพาะคนที่อยู่ในวงนี้ (ในห้องประชุมและสวนได้ยินทั้งห้องเสมอ) ดูวงได้รอบตัวละครตอนเปิดหน้านี้'));
  const colRow = el('div', 'row'); colRow.style.marginTop = '8px';
  MIC_COLORS.forEach((c, i) => {
    const b = el('button', 'sw' + (G.micSet.c === i ? ' sel' : '')); b.type = 'button'; b.style.background = c;
    b.onclick = () => { setMic({ c: i }); paintVoiceSettings(); };
    colRow.append(b);
  });
  mr.append(colRow);
  const rl = el('div', 'vbtns'); rl.style.alignItems = 'center';
  const rangeLabel = el('span', 'tip', '');
  const paintR = () => (rangeLabel.textContent = `ระยะ ${micRangeName(G.micSet.r)}${G.micSet.r < MIC_R_WHOLE ? ` (${G.micSet.r})` : ' — ทุกคนในห้องรวมได้ยิน'}`);
  const rr = el('input'); rr.type = 'range'; rr.min = String(MIC_R_MIN); rr.max = String(MIC_SLIDER_MAX); rr.step = '5'; rr.value = String(micToSlider(G.micSet.r));
  rr.style.accentColor = MIC_COLORS[G.micSet.c];
  rr.oninput = () => { setMic({ r: micFromSlider(rr.value) }); paintR(); };
  paintR();
  mr.append(rr); rl.append(rangeLabel); mr.append(rl);
  right.append(mr);

  const dg = el('button', 'pbtn sm', '🩺 ตรวจเสียง (พูด/ได้ยินใครไม่ได้?)'); dg.onclick = () => { G.voicePanelOpen = false; openVoiceDiag(); };
  right.append(dg);
  const bg = el('div', 'opt');
  bg.append(el('span', null, 'ตอนพับจอ / สลับไปแอปอื่น'));
  const bgl = el('label', 'chk'); const bgc = el('input'); bgc.type = 'checkbox'; bgc.checked = !!G.bgAudio;
  bgc.onchange = () => setBgAudio(bgc.checked);
  bgl.append(bgc, el('span', null, 'ยังได้ยินเสียงเพื่อน/เพลงต่อ (ปิด = พับจอแล้วปิดเสียงและไมค์ชั่วคราว)'));
  bg.append(bgl, el('p', 'tip', 'พิมพ์ในแชตก็ได้: bg on / bg off · iPhone อาจหยุดคลิป YouTube เองเมื่อล็อกจอ'));
  right.append(bg);

  const opt = el('div', 'opt');
  opt.append(el('span', null, 'คุณภาพเสียง'));
  const chk = (label, key) => {
    const l = el('label', 'chk'); const c = el('input'); c.type = 'checkbox'; c.checked = !!st[key];
    c.onchange = () => V.setOption(key, c.checked); l.append(c, el('span', null, label)); return l;
  };
  opt.append(chk('ตัดเสียงรบกวน (พัดลม แอร์ เสียงคีย์บอร์ด)', 'ns'), chk('ตัดเสียงสะท้อน (ปิดได้ถ้าใส่หูฟัง เสียงจะเป็นธรรมชาติขึ้น)', 'ec'), chk('ปรับความดังไมค์อัตโนมัติ', 'agc'), chk('เสียงคุณภาพสูง Opus 128 kbps', 'hq'));
  right.append(opt);
  if (V.canPickSpeaker) {
    const spk = deviceSelect('audiooutput', st.spkId, (id) => V.setSpeaker(id));
    if (spk) { const o = el('div', 'opt'); o.append(el('span', null, 'ลำโพง / หูฟัง'), spk); right.append(o); }
  }
  grid.append(right);
  card.append(grid);
  const foot = el('div', 'foot');
  const done = el('button', 'pbtn pink', 'เสร็จ');
  done.onclick = () => { G.voicePanelOpen = false; closeModal(); };
  foot.append(done);
  card.append(foot);
}
function deviceSelect(kind, current, onPick) {
  const list = voiceDevs.filter((d) => d.kind === kind && d.deviceId);
  if (!list.length) return null;
  const sel = el('select');
  list.forEach((d, i) => {
    const o = el('option', null, d.label || `${kind === 'audioinput' ? 'ไมค์' : kind === 'videoinput' ? 'กล้อง' : 'ลำโพง'} ${i + 1}`);
    o.value = d.deviceId; if (d.deviceId === current) o.selected = true; sel.append(o);
  });
  sel.onchange = () => onPick(sel.value);
  return sel;
}

function openFocus(key) {
  const v = G.voice && G.voice.videoFor(key);
  if (!v) return;
  const fv = $('#focusVideo');
  fv.srcObject = v.srcObject; fv.play().catch(() => {});
  G.focusKey = key;
  $('#focus').classList.remove('hidden');
}
// ภาพขยาย: ถ้าเขาปิดกล้อง/ภาพหยุด ให้ปิดหน้าต่างเอง (ไม่ค้างจอดำ)
setInterval(() => {
  if ($('#focus').classList.contains('hidden') || !G.focusKey) return;
  if (G.focusKey !== G.net.myKey && !(G.voice && G.voice.videoFor(G.focusKey))) { $('#focus').classList.add('hidden'); $('#focusVideo').srcObject = null; G.focusKey = null; return; }
  const cap = $('#focusCap'), msg = camProblem(G.focusKey);
  cap.textContent = msg; cap.classList.toggle('hidden', !msg);
}, 500);
// ทำไมภาพกล้องเพื่อนดำ (ใช้ทั้งในวงกลมเหนือหัวและหน้าขยาย)
function camProblem(key) {
  const rt = G.others.get(key);
  if (!rt) return '';
  if (rt.p.hid) return '📱 เขาพับจอ/ล็อกจอ/สลับแอปอยู่ — มือถือจะหยุดกล้องจนกว่าจะกลับมาเปิดหน้าเว็บ';
  const st = G.blackSt && G.blackSt.get(key);
  if (st && st.black) return '⚫ ภาพที่ส่งมาจากเครื่องเขาเป็นสีดำ — ให้เขาเปิดหน้าเว็บค้างไว้ (อย่าล็อกจอ) เปิดผ่าน Safari/Chrome (ไม่ใช่ในแอป LINE/IG) แล้วปิด-เปิดกล้องใหม่';
  return '';
}
// ตรวจว่าภาพกล้องเพื่อนดำล้วนไหม (สุ่มดูภาพเล็กๆ ทุก 0.7 วิ) — ดำนานเกิน 2 วิ = ขอภาพใหม่จากเครื่องเขา
const blackCv = mkCanvas(8, 8), blackCtx = blackCv.getContext('2d', { willReadFrequently: true });
function isBlackVideo(key, vid) {
  const st = (G.blackSt || (G.blackSt = new Map())).get(key) || { at: 0, since: 0, black: false };
  const now = performance.now();
  if (now - st.at > 700) {
    st.at = now;
    let mx = 255;
    try { blackCtx.drawImage(vid, 0, 0, 8, 8); const d = blackCtx.getImageData(0, 0, 8, 8).data; mx = 0; for (let i = 0; i < d.length; i += 4) mx = Math.max(mx, d[i], d[i + 1], d[i + 2]); } catch {}
    if (mx < 14) { st.since = st.since || now; if (now - st.since > 2000) { st.black = true; G.voice.reportBlack(key); } }
    else { st.since = 0; st.black = false; }
    G.blackSt.set(key, st);
  }
  return st.black;
}
$('#focus').onclick = () => { $('#focus').classList.add('hidden'); $('#focusVideo').srcObject = null; };

// ============================================================== เริ่ม ====
async function join() {
  const net = G.net;
  G.joined = true;
  $('#hud').classList.remove('hidden');
  setChatOpen(G.chatOpen);
  const pos = lsGet('pixel.pos', null);
  if (pos && pos.y < H && pos.y > TOP && !hitsRects(G.rects, pos.x, pos.y)) { G.me.x = pos.x; G.me.y = pos.y; }
  else { G.me.x = 230 + Math.random() * 40; G.me.y = 318; }
  G.me.pet.x = G.me.x + 12; G.me.pet.y = G.me.y;
  G.me.st = lsGet('pixel.status', '');
  $('#statusIcon').textContent = G.me.st || '💬';
  buildPalette(); buildTrays();
  if (net.mode === 'ws') { setupVoice(); net.start(); }
  if (net.mode === 'ws' && G.bgAudio) keepAlive(true); // ต้องเริ่มจากการกดปุ่ม (iOS)
  G.net.setPresence(fullPresence());
  G.presLast = performance.now();
  G.zone = zoneAt(G.me.x, G.me.y);
  setTimeout(spPoll, 1500);
  if (net.mode === 'claude' && net.canWrite === false) showBanner('คุณมีสิทธิ์ดูอย่างเดียว: เดิน แชต อีโมตได้ แต่ห้อง/โต๊ะจะไม่ถูกบันทึก');
  if (net.mode === 'solo') showBanner(net.reason);
  if (net.mode === 'ws' && G.inAppBrowser) showBanner('กำลังเปิดในแอปแชต — ไมค์/กล้องอาจใช้ไม่ได้ ให้กด ⋯ แล้วเลือก "เปิดใน Safari/Chrome"');
  setTimeout(() => toast(isMobile() ? 'แตะพื้นเพื่อเดิน · แตะโซฟา/โต๊ะเพื่อไปนั่ง' : 'เดินด้วยลูกศร/WASD หรือคลิกพื้น · E = นั่ง · Enter = แชต'), 500);
  SFX.join();
}
function showBanner(text) {
  const b = $('#banner');
  if (G.updateBanner) return;
  b.textContent = text; b.classList.remove('hidden');
  setTimeout(() => { if (!G.updateBanner) b.classList.add('hidden'); }, 9000);
}

let lastT = performance.now();
let actT = 0, selT = 0;
function frame(ms) {
  const dt = Math.min(0.1, (ms - lastT) / 1000);
  G.frameDt = dt || 1 / 60;
  lastT = ms;
  perfAdapt(dt);
  const t = ms / 1000;
  if (G.grid) {
    if (G.joined) {
      updateMe(dt);
      updatePet(G.me, G.me.pet, dt);
      updateOthers(dt);
      if (G.voice) G.voice.tick(dt);
      flushPres(ms);
      if ((actT += dt) > 0.15) { actT = 0; updateActions(); updateZones(); }
      if (G.edit && (selT += dt) > 0.05) { selT = 0; updateSelBar(); }
    }
    render(t);
  }
  requestAnimationFrame(frame);
}

(async function boot() {
  const net = await pickNet();
  G.net = net;
  const dot = $('#connDot');
  net.onStatus((s) => { dot.className = 'dot' + (s === 'online' ? '' : s === 'solo' ? ' solo' : ' off'); });
  if (net.onSys) net.onSys((m) => {
    if (m.admin === true && G.pendingAdminKey) lsSet('pixel.admin', G.pendingAdminKey);
    if (m.admin === false) lsSet('pixel.admin', null);
    if (typeof m.admin === 'boolean') { G.isAdmin = m.admin; scheduleChatRender(); }
    G.pendingAdminKey = null;
    addSys((m.kind === 'info' ? '' : '🛡️ ') + m.message); toast(m.message, 4000);
  });
  if (net.onUpdate) net.onUpdate(() => {
    // มีเวอร์ชันใหม่: ถ้าไม่ได้กำลังพิมพ์/เปิดหน้าต่างอยู่ โหลดใหม่แล้วเข้าห้องให้เองเลย (จำว่าเปิดไมค์อยู่ไหม)
    const busy = () => isTyping() || !$('#modal').classList.contains('hidden') || G.edit;
    const go = () => {
      try { sessionStorage.setItem('pixel.autojoin', JSON.stringify({ mic: !!(G.voice && G.voice.mic), at: Date.now() })); } catch {}
      location.reload();
    };
    const tryGo = () => { if (!busy()) go(); else setTimeout(tryGo, 3000); };
    setTimeout(tryGo, 1500 + Math.random() * 2500);
    const b = $('#banner');
    b.textContent = '🔄 มีอัปเดตใหม่ — แตะตรงนี้เพื่อโหลดใหม่'; b.classList.remove('hidden');
    b.style.pointerEvents = 'auto'; b.style.cursor = 'pointer'; b.style.zIndex = '30'; b.onclick = () => location.reload();
    G.updateBanner = true;
  });
  if (net.onPoke) net.onPoke(pokeReceived);
  if (net.onChatDel) net.onChatDel((ids) => {
    const list = ids === 'all' ? [...G.messages.values()].filter((x) => !x.sys).map((x) => x.id) : ids;
    for (const id of list) { G.chatDeleted.add(id); G.messages.delete(id); }
    // ลบบับเบิลเหนือหัวของข้อความที่ถูกลบด้วย
    for (const ch of [G.me, ...G.others.values()]) if (ch.bubble && (ids === 'all' || list.includes(ch.bubble.id))) ch.bubble = null;
    G.mySay = G.mySay.filter((x) => ids !== 'all' && !list.includes(x.i));
    scheduleChatRender();
  });
  if (net.onError) net.onError((m) => {
    // โดนเตะ: รีโหลดหน้าเพื่อปิดไมค์/กล้องทั้งหมดทันที แล้วแจ้งเตือนหลังโหลดเสร็จ
    if (m.kicked && G.joined) { try { sessionStorage.setItem('pixel.kicked', m.message || 'คุณถูกเตะออกจากห้อง'); } catch {} location.reload(); return; }
    toast(m.message || 'เข้าห้องไม่ได้', 4000); G.joined = false; $('#hud').classList.add('hidden'); openCreator(true); });
  if (net.onWriteDenied) net.onWriteDenied(() => showBanner('คุณมีสิทธิ์ดูอย่างเดียว: ห้อง/โต๊ะจะไม่ถูกบันทึก'));
  if (net.mode === 'ws') {
    try { const cfg = await (await fetch('/config')).json(); net.needPassword = cfg.needPassword; if (cfg.roomName) $('#roomName').textContent = cfg.roomName; document.title = cfg.roomName + ' · Pixel Hangout'; } catch {}
  }
  rebuildWorld();
  net.watch('furniture', (docs) => { G.furnDocs = docs; if (!G.drag) rebuildWorld(); maybeMigrateLayout(); });
  net.watch('desks', (docs) => {
    G.desks = new Map(docs.map((d) => [d.id, d]));
    // กลับมาแล้วจำโต๊ะตัวเองได้
    if (!G.myDesk && net.uid) {
      const mine = docs.find((d) => d.uid && d.uid === net.uid);
      if (mine) { G.myDesk = mine.id; G.myDeskStyle = cleanDesk(mine.style); if (G.joined) pres({ dk: { slot: G.myDesk, style: G.myDeskStyle } }); }
    }
    if (G.myDesk && net.uid && net.mode !== 'solo') {
      const d = G.desks.get(G.myDesk);
      if (d && d.uid && d.uid !== net.uid) { G.myDesk = null; pres({ dk: null }); }
    }
  });
  net.watch('chat', (docs) => {
    G.chatDocs = docs;
    for (const d of docs) if (typeof d.text === 'string') addMessage({ id: d.id, by: d.uid || d.id, n: d.n, l: d.l, text: d.text.slice(0, 200), ts: Number(d.ts) || 0 });
  });
  net.watch('settings', (docs) => {
    const s = docs.find((d) => d.id === 'room');
    G.settings = s ? { call: typeof s.call === 'string' ? s.call : '' } : {};
    $('#callBtn').classList.toggle('on', !!G.settings.call);
    const nm = docs.find((d) => d.id === 'names');
    G.roomNames = {};
    if (nm) for (const z of Object.keys(ZONES)) if (typeof nm[z] === 'string' && nm[z].trim()) G.roomNames[z] = nm[z].trim().slice(0, 40);
    G.roomsSig = '';
    const lv = docs.find((d) => d.id === 'layout');
    G.layoutV = lv && Number(lv.v) || 1;
    G.settingsLoaded = true;
    maybeMigrateLayout();
  });
  net.watch('screens', (docs) => {
    G.screens = new Map(docs.filter((d) => d && typeof d.v === 'string' && /^[\w-]{11}$/.test(d.v)).map((d) => [d.id, d]));
    syncScreens();
  });
  net.watch('board', (docs) => {
    G.boardDocs = docs.filter((d) => d && typeof d.b === 'string');
    if (G.boardOpen) paintBoard();
  });
  net.onPeers(onPeers);
  if (net.onMove) net.onMove((key, p) => { const rt = G.others.get(key); if (rt && rt.p === p) addSnap(rt, p.x, p.y, p.d, p.t); else if (rt) { Object.assign(rt.p, { x: p.x, y: p.y, d: p.d, m: p.m, t: p.t }); addSnap(rt, p.x, p.y, p.d, p.t); } });
  // ข้อมูลส่วนตัว (จำตัวละครข้ามเครื่อง)
  const priv = await net.loadPrivate();
  if (priv) {
    if (priv.look) G.me.look = cleanLook(priv.look);
    if (priv.nick) G.me.nick = String(priv.nick).slice(0, 16);
    if (priv.desk) G.myDeskStyle = cleanDesk(priv.desk);
  } else G.me.nick = net.profileName || lsGet('pixel.nick', '');
  $('#loading').classList.add('hidden');
  spHandleRedirect();
  openCreator(true);
  // กลับเข้าห้องอัตโนมัติหลังอัปเดต
  try {
    const aj = JSON.parse(sessionStorage.getItem('pixel.autojoin') || 'null');
    sessionStorage.removeItem('pixel.autojoin');
    if (aj && Date.now() - aj.at < 60000) setTimeout(() => {
      const btn = document.querySelector('#card .foot .pbtn.pink');
      if (btn && !$('#modal').classList.contains('hidden')) btn.click();
      toast('🔄 อัปเดตแล้ว กลับเข้าห้องให้อัตโนมัติ', 3000);
      if (aj.mic) setTimeout(() => { if (G.voice && !G.voice.mic) G.voice.toggleMic().catch(() => {}); setTimeout(() => { if (G.voice && !G.voice.mic) toast('กดปุ่มไมค์อีกครั้งเพื่อเปิดไมค์', 5000); }, 2500); }, 1200);
    }, 400);
  } catch {}
  try { if (sessionStorage.getItem('pixel.left')) { sessionStorage.removeItem('pixel.left'); toast('👋 ออกจากห้องแล้ว — กดเข้าห้องเพื่อกลับมาได้ทุกเมื่อ', 4000); } } catch {}
  try { const k = sessionStorage.getItem('pixel.kicked'); if (k) { sessionStorage.removeItem('pixel.kicked'); toast('👢 ' + k, 6000); } } catch {}
  requestAnimationFrame(frame);
})();
