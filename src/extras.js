// ============================================================================
// extras.js — โซนห้อง/ไมค์แยกโซน, กระดานแนบรูป, เพลงที่กำลังฟัง (Spotify), อัปเดตแผนผังห้อง
// ============================================================================

// ---------------------------------------------------------------- โซน ----
function othersInZone(z) {
  const keys = new Set();
  for (const rt of G.others.values()) if (Number.isFinite(rt.p.x) && zoneAt(rt.p.x, rt.p.y) === z) keys.add(rt.key);
  return keys;
}
// ห้องรวม: เสียงไปได้ไกลตาม "รัศมีไมค์" ของแต่ละคน (ปรับเองได้) ไกลเกินจะไม่ได้ยินเลย
// ห้องประชุม / สวน: ได้ยินทุกคนในห้องเดียวกัน
// รัศมีไมค์ในห้องรวม: 60–260 = ได้ยินเฉพาะคนใกล้ๆ · WHOLE = ได้ยินทั้งห้องรวม (ค่าเริ่มต้นใหม่)
const MIC_R_MIN = 60, MIC_R_MAX = 260, MIC_R_WHOLE = 999, MIC_R_DEFAULT = MIC_R_WHOLE, MIC_HYST = 20;
const MIC_SLIDER_MAX = 280; // เลื่อนสุด = ทั้งห้อง
const micFromSlider = (v) => (Number(v) >= MIC_SLIDER_MAX ? MIC_R_WHOLE : Number(v));
const micToSlider = (r) => (r >= MIC_R_WHOLE ? MIC_SLIDER_MAX : r);
const clampMic = (r) => { const n = Number(r); if (!n) return MIC_R_DEFAULT; return n >= MIC_R_WHOLE ? MIC_R_WHOLE : clamp(n, MIC_R_MIN, MIC_R_MAX); };
const MIC_COLORS = ['#3fd07a', '#ff8fab', '#7d9cf0', '#ffe07a', '#b48cf0', '#6cc6d9', '#ffb86b', '#ffffff', '#e8505b'];
G.micSet = Object.assign({ r: MIC_R_DEFAULT, c: 0 }, lsGet('pixel.mic', {}));
// เดิมค่าเริ่มต้นคือ 130 (ได้ยินแค่คนใกล้ๆ) ทำให้คนในห้องรวมไม่ได้ยินกัน → ปรับเป็นทั้งห้อง
// ครั้งเดียว: ทุกคนเริ่มที่ "ทั้งห้อง" (เคยตั้งกระซิบ/ปกติไว้ทำให้คนในห้องรวมไม่ได้ยิน)
if (G.micSet.v !== 3) { G.micSet.r = MIC_R_WHOLE; G.micSet.v = 3; lsSet('pixel.mic', G.micSet); }
G.micSet.r = clampMic(G.micSet.r);
if (!(G.micSet.c >= 0 && G.micSet.c < MIC_COLORS.length)) G.micSet.c = 0;
G.audible = new Set(); G.sendTo = new Set();
const ZONE_TIPS = {
  hall: 'ได้ยินเฉพาะคนที่อยู่ในรัศมีไมค์',
  meet: 'ห้องส่วนตัว — ได้ยินทุกคนในห้อง คนข้างนอกไม่ได้ยิน',
  garden: 'ได้ยินทุกคนในสวน',
  karaoke: 'ห้องส่วนตัว — ร้องเพลงได้เต็มที่ คนข้างนอกไม่ได้ยิน',
  pub: 'ห้องส่วนตัว — ได้ยินทุกคนในผับ คนข้างนอกไม่ได้ยิน',
  shrine: 'ห้องส่วนตัว เงียบสงบ — ได้ยินเฉพาะคนในห้อง · นั่งเบาะกราบเพื่อไหว้พระ 🙏',
  concert: 'เวทีใหญ่ จอ LED ไฟเวที ขึ้นไปร้องเพลงได้ — แอดมินเรียกนักร้อง/นักเต้น NPC ได้ 🎸',
  cinema: 'ห้องส่วนตัว — แตะจอใหญ่เพื่อฉายหนังจาก YouTube แล้วเลือกที่นั่ง ธรรมดา / VIP / เตียง VVIP 🍿',
  mountain: 'ได้ยินทุกคนบนเขา · นั่งล้อมกองไฟที่ขอนไม้ได้ 🔥',
  beach: 'ได้ยินทุกคนบนชายหาด · นั่งเก้าอี้ชายหาด/ผ้าเช็ดตัวได้ 🏖️ (ใส่ชุดว่ายน้ำได้ที่ 👕)',
};
const peerRange = (p) => clampMic(p.mr);
const peerRingColor = (p) => MIC_COLORS[Number.isInteger(p.mc) && p.mc >= 0 && p.mc < MIC_COLORS.length ? p.mc : 0];
function setMic(patch) {
  Object.assign(G.micSet, patch);
  G.micSet.r = clampMic(Math.round(G.micSet.r));
  lsSet('pixel.mic', G.micSet);
  pres({ mr: G.micSet.r, mc: G.micSet.c });
}
function updateZones() {
  if (!G.joined) return;
  const dock = $('#dock');
  G.dockBottom = isMobile() && !isLand() && [...dock.children].some((c) => !c.classList.contains('hidden') && !c.classList.contains('big') && !c.classList.contains('free') && !c.classList.contains('onscreen')) ? Math.min(dock.getBoundingClientRect().bottom, G.view.ch * 0.6) : 0;
  const z = zoneAt(G.me.x, G.me.y);
  const hear = new Set(), send = new Set();
  for (const rt of G.others.values()) {
    if (!Number.isFinite(rt.p.x) || zoneAt(rt.p.x, rt.p.y) !== z) continue;
    if (G.voice) G.voice.setUserMuted(rt.key, peerVol(rt).m || peerVol(rt).v === 0);
    if (z !== 'hall') { hear.add(rt.key); send.add(rt.key); if (G.voice) G.voice.setVolume(rt.key, peerVol(rt).v); continue; }
    const d = Math.hypot(rt.x - G.me.x, rt.y - G.me.y);
    const theirR = peerRange(rt.p), myR = G.micSet.r;
    if (d < myR + (G.sendTo.has(rt.key) ? MIC_HYST : 0)) send.add(rt.key);
    if (d < theirR + (G.audible.has(rt.key) ? MIC_HYST : 0)) {
      hear.add(rt.key);
      const fall = theirR >= MIC_R_WHOLE ? 1 : clamp(1 - (d - theirR * 0.55) / (theirR * 0.45 + MIC_HYST), 0.2, 1);
      if (G.voice) G.voice.setVolume(rt.key, fall * peerVol(rt).v);
    }
  }
  G.audible = hear; G.sendTo = send;
  if (z !== G.zone) {
    G.zone = z;
    toast(`${ZONES[z].icon} ${zoneName(z)}` + (G.voice && ZONE_TIPS[z] ? ' — ' + ZONE_TIPS[z] : ''), 3200);
  }
  const chip = $('#zoneChip');
  const n = othersInZone(z).size + 1;
  const label = `${ZONES[z].icon} ${zoneName(z)} · ${G.voice && z === 'hall' ? `ได้ยิน ${hear.size} คน` : `${n} คน`}`;
  if (chip.textContent !== label) chip.textContent = label;
  if (G.voice) { G.voice.setAudience(send, hear); G.voice.setScreenAudience(othersInZone(z)); }
}
// วงรัศมีไมค์ (เฉพาะห้องรวม): ของเราตอนเปิดไมค์/ตอนตั้งค่า, ของเพื่อนตอนเขากำลังพูด
function ring(b, x, y, r, color, alpha, t) {
  b.globalAlpha = alpha;
  b.fillStyle = color;
  const n = Math.max(60, Math.round(r * 1.5)), off = t * 0.05;
  for (let i = 0; i < n; i += 2) {
    const a = (i / n) * Math.PI * 2 + off;
    b.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.75), 2, 2);
  }
  b.globalAlpha = 1;
}
function drawHearingRange(b, t) {
  if (!G.voice || G.zone !== 'hall') return;
  for (const rt of G.others.values()) {
    if (!Number.isFinite(rt.p.x) || zoneAt(rt.p.x, rt.p.y) !== 'hall' || !G.voice.speaking(rt.key) || peerRange(rt.p) >= MIC_R_WHOLE) continue;
    ring(b, rt.x, rt.y, peerRange(rt.p), peerRingColor(rt.p), 0.35, t);
  }
  const editing = G.voicePanelOpen || !$('#micPop').classList.contains('hidden');
  if ((G.voice.mic || editing) && G.micSet.r < MIC_R_WHOLE) ring(b, G.me.x, G.me.y, G.micSet.r, MIC_COLORS[G.micSet.c], editing ? 0.95 : 0.7, t);
}

// วาดป้ายชื่อห้องที่ประตู (บนจอ)
function drawDoorLabels(c, camX, camY, scale) {
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '500 11px Mitr, sans-serif';
  for (const d of [...DOORS, DOOR_PUB, DOOR_KARAOKE, DOOR_SHRINE, DOOR_CINEMA]) {
    const Z = ZONES[d.zone];
    const sx = d.side ? (d.x + (d.left ? 40 : 44) - camX) * scale : (d.x + d.w / 2 - camX) * scale;
    const sy = d.side ? (d.y + d.h / 2 - camY) * scale : d.up ? (WALL + 12 - camY) * scale : ((d.y || LOWER_Y) - 16 - camY) * scale;
    const nm0 = zoneName(d.zone); const label = `${Z.icon} ${nm0.length > 22 ? nm0.slice(0, 21) + '…' : nm0}`;
    const w = c.measureText(label).width + 14;
    c.fillStyle = 'rgba(46,34,53,.82)';
    rrect(c, sx - w / 2, sy - 9, w, 18, 6); c.fill();
    c.fillStyle = '#fff7ec'; fillCenter(c, label, sx, sy + 0.5);
  }
}

// ------------------------------------------------------------ กระดาน ----
const boardImgs = new Map();
function boardImg(doc) {
  let e = boardImgs.get(doc.id);
  if (!e) {
    const img = new Image();
    e = { img, ready: false };
    img.onload = () => (e.ready = true);
    img.src = G.net.boardUrl(doc.id, doc);
    boardImgs.set(doc.id, e);
  }
  return e;
}
function docsForBoard(id) {
  return G.boardDocs.filter((d) => d.b === id).sort((a, b) => b.ts - a.ts);
}
function drawBoardThumbs(c, it, sx, sy) {
  if (!G.net || !G.net.board) return;
  const docs = docsForBoard(it.id);
  if (!docs.length) return;
  const prev = c.imageSmoothingEnabled;
  c.imageSmoothingEnabled = true;
  docs.slice(0, 6).forEach((d, i) => {
    const x = sx + 2 + (i % 3) * 11, y = sy + 2 + Math.floor(i / 3) * 9;
    c.fillStyle = '#ffffff'; c.fillRect(x - 1, y - 1, 12, 10);
    const e = boardImg(d);
    if (e.ready) {
      const iw = e.img.naturalWidth, ih = e.img.naturalHeight, k = Math.max(10 / iw, 8 / ih);
      const cw = 10 / k, ch = 8 / k;
      c.drawImage(e.img, (iw - cw) / 2, (ih - ch) / 2, cw, ch, x, y, 10, 8);
    } else { c.fillStyle = '#c8ccd8'; c.fillRect(x, y, 10, 8); }
    c.fillStyle = '#e8505b'; c.fillRect(x + 4, y - 2, 2, 2);
  });
  c.imageSmoothingEnabled = prev;
}
function hoursLeft(d) {
  const ms = (G.net.boardTtl || 86400000) - (Date.now() - d.ts);
  if (ms <= 0) return 'กำลังลบ';
  const h = Math.floor(ms / 3600000);
  return h >= 1 ? `เหลือ ${h} ชม.` : `เหลือ ${Math.max(1, Math.round(ms / 60000))} นาที`;
}
function openBoard(it) {
  if (!G.net.board) { toast('การแนบรูปบนกระดานใช้ได้ในเวอร์ชันเซิร์ฟเวอร์ (onrender.com)'); return; }
  G.boardOpen = it.id;
  G.boardClearArm = false;
  openModal(() => {});
  paintBoard();
}
function paintBoard() {
  const id = G.boardOpen;
  if (!id) return;
  const docs = docsForBoard(id);
  const max = G.net.boardMax || 20;
  const card = $('#card');
  card.innerHTML = '';
  card.append(el('h2', null, '📋 กระดาน'));
  card.append(el('p', 'sub', `แนบรูปแล้ว ${docs.length}/${max} รูป · ทุกคนในห้องเห็น · รูปจะถูกลบอัตโนมัติภายใน 24 ชั่วโมง`));
  const grid = el('div', 'bgrid');
  if (!docs.length) grid.append(el('p', 'tip', 'กระดานยังว่างอยู่ — กด 📎 แนบรูป เพื่อปักรูปแรก'));
  for (const d of docs) {
    const tile = el('div', 'btile');
    const img = el('img');
    img.src = G.net.boardUrl(d.id, d); img.alt = ''; img.loading = 'lazy';
    img.onclick = () => openImage(img.src);
    const meta = el('div', 'bmeta');
    meta.append(el('b', null, d.n || 'เพื่อน'), el('small', null, hoursLeft(d)));
    const del = el('button', 'x', '🗑️');
    del.title = 'เอารูปนี้ออก';
    del.onclick = async () => { try { await G.net.del('board', d.id); } catch {} };
    tile.append(img, meta, del);
    grid.append(tile);
  }
  card.append(grid);
  const status = el('p', 'tip'); status.id = 'boardStatus';
  card.append(status);
  const foot = el('div', 'foot');
  const input = el('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.hidden = true;
  input.onchange = () => uploadImages([...input.files], id);
  const clear = el('button', 'pbtn danger', G.boardClearArm ? 'กดอีกครั้งเพื่อลบทั้งหมด' : '🧹 เคลียร์กระดาน');
  clear.disabled = !docs.length;
  clear.onclick = () => {
    if (!G.boardClearArm) { G.boardClearArm = true; paintBoard(); setTimeout(() => { G.boardClearArm = false; if (G.boardOpen) paintBoard(); }, 4000); return; }
    G.boardClearArm = false; G.net.clearBoard(id); toast('เคลียร์กระดานแล้ว'); SFX.pop();
  };
  const close = el('button', 'pbtn', 'ปิด'); close.onclick = closeModal;
  const add = el('button', 'pbtn pink', '📎 แนบรูป');
  add.disabled = docs.length >= max;
  add.onclick = () => input.click();
  foot.append(input, clear, close, add);
  card.append(foot);
}
async function compressImage(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch {
    bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  }
  const w0 = bmp.width, h0 = bmp.height, k = Math.min(1, 1600 / Math.max(w0, h0));
  const w = Math.round(w0 * k), h = Math.round(h0 * k);
  const c = mkCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
  return { blob, w, h };
}
async function uploadImages(files, boardId) {
  const status = () => $('#boardStatus');
  const room = (G.net.boardMax || 20) - docsForBoard(boardId).length;
  const list = files.filter((f) => /^image\//.test(f.type)).slice(0, Math.max(0, room));
  if (files.length > list.length) toast(`กระดานรับได้อีก ${Math.max(0, room)} รูป`);
  let done = 0;
  for (const f of list) {
    if (status()) status().textContent = `กำลังอัปโหลด ${done + 1}/${list.length}…`;
    try {
      const { blob, w, h } = await compressImage(f);
      await G.net.uploadBoard(boardId, blob, { n: G.me.nick, w, h });
      done++;
    } catch (e) {
      toast(e && e.code === 'full' ? 'กระดานเต็มแล้ว' : 'อัปโหลดรูปไม่สำเร็จ');
      break;
    }
  }
  if (status()) status().textContent = done ? `ปักรูปแล้ว ${done} รูป 📌` : '';
  if (done) { SFX.pop(); addSys(`${G.me.nick} ปักรูป ${done} รูปบนกระดาน`); }
}
function openImage(src) {
  const f = $('#focus');
  $('#focusVideo').classList.add('hidden');
  let img = $('#focusImg');
  if (!img) { img = el('img'); img.id = 'focusImg'; f.append(img); }
  img.src = src; img.classList.remove('hidden');
  f.classList.remove('hidden');
}
$('#focus').addEventListener('click', () => { const img = $('#focusImg'); if (img) { img.classList.add('hidden'); img.removeAttribute('src'); } $('#focusVideo').classList.remove('hidden'); });

// ----------------------------------------------------- อัปเดตแผนผังห้อง ----
let layoutMigrated = false;
function maybeMigrateLayout() {
  if (layoutMigrated || !G.furnDocs || !G.settingsLoaded || G.net.canWrite === false || !G.net.hasDb) return;
  if (!G.furnDocs.length || G.layoutV >= LAYOUT_VERSION) { layoutMigrated = true; return; }
  layoutMigrated = true;
  (async () => {
    const from = G.layoutV >= 10 ? LAYOUT_V11_FROM : G.layoutV >= 8 ? LAYOUT_V10_FROM : G.layoutV >= 7 ? LAYOUT_V8_FROM : G.layoutV >= 6 ? LAYOUT_V7_FROM : G.layoutV >= 5 ? LAYOUT_V6_FROM : G.layoutV >= 3 ? LAYOUT_V4_FROM : G.layoutV >= 2 ? LAYOUT_V3_FROM : LAYOUT_V2_FROM;
    for (let i = from; i < DEFAULT_LAYOUT.length; i++) {
      const id = 'def' + i;
      const ex = G.furnDocs.find((d) => d.id === id);
      // v4 → v5: ห้องไหว้พระย้ายจากชั้นล่างสุดขึ้นไปอยู่บนสุด — ย้ายของชุดเดิมตามไปด้วย
      if (ex && i >= LAYOUT_V4_FROM && ex.y > H) { const d = DEFAULT_LAYOUT[i]; try { await G.net.set('furniture', id, { t: d.t, v: d.v || 0, f: d.f || 0, ...ex, x: d.x, y: d.y }); } catch { return; } continue; }
      if (ex) continue;
      const d = DEFAULT_LAYOUT[i];
      if (d.gone) continue;
      // มีคนวางเบาะไว้ตรงนั้นเองแล้ว → แค่เปลี่ยนเป็นสีทอง ไม่วางซ้อน
      if (d.t === 'prayerMat') {
        const near = G.furnDocs.find((o) => o.t === 'prayerMat' && Math.abs(o.x - d.x) < 14 && Math.abs(o.y - d.y) < 10);
        if (near) { if ((near.v || 0) !== (d.v || 0)) { try { await G.net.set('furniture', near.id, { ...near, x: d.x, y: d.y, v: d.v }); } catch {} } continue; }
      }
      try { await G.net.set('furniture', id, { t: d.t, x: d.x, y: d.y, v: d.v || 0, f: d.f || 0 }); } catch { return; }
    }
    // v9: ลบของที่ประกาศเอาออก
    if (G.layoutV < 9) for (const r of LAYOUT_V9_REMOVE) for (const d of G.furnDocs.filter((o) => o.t === r.t && Math.abs(o.x - r.x) <= r.r && Math.abs(o.y - r.y) <= r.r)) { try { await G.net.del('furniture', d.id); } catch {} }
    // ของที่ผู้ใช้วางไว้ในห้องไหว้พระเดิม (ชั้นล่างสุดที่ไม่มีแล้ว) ย้ายขึ้นไปห้องใหม่
    for (const d of G.furnDocs) if (!String(d.id).startsWith('def') && d.y > H) { try { await G.net.set('furniture', d.id, { ...d, y: -60 }); } catch {} }
    try { await G.net.set('settings', 'layout', { v: LAYOUT_VERSION }); } catch {}
  })();
}

// ---------------------------------------------------------------- เพลง ----
const spConnected = () => !!(G.net.spotifyClientId && lsGet('pixel.spotify', null));
const lfmUser = () => (G.net.lastfm ? lsGet('pixel.lastfm', '') || '' : '');
const autoConnected = () => spConnected() || !!lfmUser();
// เชื่อมแบบอัตโนมัติแล้ว (Spotify หรือ Last.fm) = ใช้เพลงที่เปิดอยู่จริงเท่านั้น · ยังไม่เชื่อม = ใช้ที่พิมพ์เอง
function currentMusic() { return autoConnected() ? G.music.sp || null : G.music.manual || null; }
// ---- Last.fm (ไม่ต้องมี Premium): ถามเซิร์ฟเวอร์ทุก 15 วินาที ----
async function lfmPoll() {
  const u = lfmUser();
  if (!u || !G.joined || spConnected()) return;
  try {
    const r = await fetch('/api/np?u=' + encodeURIComponent(u));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return;
    const m = j.np ? { t: j.np.t, a: j.np.a, u: safeSpotifyUrl('https://open.spotify.com/search/' + encodeURIComponent(`${j.np.t} ${j.np.a}`.trim())), s: 'lf' } : null;
    if (JSON.stringify(G.music.sp) !== JSON.stringify(m)) { G.music.sp = m; pushMusic(); }
  } catch {}
}
setInterval(lfmPoll, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) lfmPoll(); });
function pushMusic() {
  const m = currentMusic();
  pres({ mu: m ? { t: m.t.slice(0, 60), a: (m.a || '').slice(0, 60), u: m.u || '', s: m.s } : null });
  if (G.musicOpen) paintMusic();
}
function musicLabel(m) {
  if (!m || typeof m.t !== 'string') return '';
  const s = m.a ? `${m.t} – ${m.a}` : m.t;
  return Array.from(s).length > 28 ? Array.from(s).slice(0, 27).join('') + '…' : s;
}
function safeSpotifyUrl(u) {
  return typeof u === 'string' && /^https:\/\/open\.spotify\.com\/[\w/?=&.%+-]+$/.test(u) ? u : '';
}
function openMusic() {
  G.musicOpen = true;
  openModal(() => {});
  paintMusic();
}
function paintMusic() {
  const card = $('#card');
  card.innerHTML = '';
  card.append(el('h2', null, '🎵 กำลังฟังเพลงอะไรอยู่'));
  card.append(el('p', 'sub', 'เพลงจะขึ้นเหนือหัวตัวละคร เพื่อนกดที่ชื่อเพลงเพื่อเปิดใน Spotify ได้'));
  const now = currentMusic();
  if (now) {
    const box = el('div', 'mon');
    box.append(el('b', null, `${now.s === 'sp' ? '🟢 Spotify' : now.s === 'lf' ? '🔴 Last.fm' : '✍️ พิมพ์เอง'} · ${musicLabel(now)}`));
    card.append(box);
  }
  // ---- Spotify: ดึงเพลงที่กำลังเปิดอยู่ให้อัตโนมัติ ----
  // ---- Last.fm: ใช้ได้กับ Spotify ฟรี (เชื่อม Spotify เข้ากับ Last.fm ครั้งเดียว) ----
  if (G.net.lastfm && !spConnected()) {
    const lf = el('div', 'opt'); lf.style.marginTop = '14px';
    lf.append(el('span', null, '🔴 ดึงอัตโนมัติผ่าน Last.fm (Spotify ฟรีก็ใช้ได้)'));
    const cur = lfmUser();
    if (cur) {
      const row = el('div', 'vbtns');
      row.append(el('span', 'tip', `เชื่อมแล้ว ✅ ${cur} — เปิดเพลงใน Spotify แล้วชื่อเพลงจะขึ้นเองภายใน ~15 วินาที`));
      const off = el('button', 'pbtn sm', 'เลิกเชื่อม');
      off.onclick = () => { lsSet('pixel.lastfm', ''); G.music.sp = null; pushMusic(); };
      row.append(off); lf.append(row);
    } else {
      const row = el('div', 'vbtns');
      const inp = el('input'); inp.placeholder = 'ชื่อผู้ใช้ Last.fm'; inp.maxLength = 30; inp.autocapitalize = 'off'; inp.style.flex = '1'; inp.style.minWidth = '0';
      const go = el('button', 'pbtn sm pink', 'เชื่อม');
      const msg = el('p', 'tip', 'ครั้งแรก: สมัคร last.fm (ฟรี) → Settings → Applications → Connect ที่ "Spotify Scrobbling" แล้วใส่ชื่อผู้ใช้ Last.fm ตรงนี้');
      go.onclick = async () => {
        const u = inp.value.trim();
        if (!/^[A-Za-z][\w-]{1,30}$/.test(u)) { msg.textContent = 'ชื่อผู้ใช้ไม่ถูกต้อง (ภาษาอังกฤษ/ตัวเลข)'; return; }
        go.disabled = true; msg.textContent = 'กำลังตรวจสอบ…';
        try {
          const r = await fetch('/api/np?u=' + encodeURIComponent(u));
          if (r.status === 404) { msg.textContent = `ไม่เจอผู้ใช้ "${u}" ใน Last.fm`; go.disabled = false; return; }
          if (!r.ok) { msg.textContent = 'เชื่อมต่อ Last.fm ไม่ได้ ลองใหม่อีกครั้ง'; go.disabled = false; return; }
          lsSet('pixel.lastfm', u); G.music.manual = null; lsSet('pixel.music', null);
          toast('เชื่อม Last.fm แล้ว 🎵 เพลงที่คุณเปิดอยู่จะขึ้นเอง', 3500);
          await lfmPoll(); pushMusic(); paintMusic();
        } catch { msg.textContent = 'เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง'; go.disabled = false; }
      };
      row.append(inp, go); lf.append(row, msg);
    }
    card.append(lf);
  }
  const sp = el('div', 'opt'); sp.style.marginTop = '14px';
  sp.append(el('span', null, '🟢 ดึงจาก Spotify อัตโนมัติ (ต้องมี Premium)'));
  const cid = G.net.spotifyClientId;
  const connected = autoConnected();
  if (!cid && G.net.lastfm) {
    sp.style.display = 'none';
  } else if (!cid) {
    sp.firstChild.textContent = '🎵 ดึงเพลงอัตโนมัติ';
    sp.append(el('p', 'tip', 'ยังเปิดใช้ไม่ได้: เจ้าของห้องต้องใส่ LASTFM_API_KEY (ฟรี ใช้กับ Spotify ฟรีได้) หรือ SPOTIFY_CLIENT_ID (ต้องมี Premium) ใน Render ก่อน'));
  } else if (spConnected()) {
    const row = el('div', 'vbtns');
    row.append(el('span', 'tip', G.music.sp ? 'เชื่อมแล้ว ✅ เพลงจะเปลี่ยนตามที่คุณเปิดใน Spotify เอง' : 'เชื่อมแล้ว ✅ เปิดเพลงใน Spotify แล้วชื่อเพลงจะขึ้นเองภายในไม่กี่วินาที'));
    const off = el('button', 'pbtn sm', 'เลิกเชื่อม');
    off.onclick = () => { lsSet('pixel.spotify', null); G.music.sp = null; pushMusic(); };
    row.append(off); sp.append(row);
  } else {
    const b = el('button', 'pbtn', '🟢 เชื่อม Spotify (ครั้งเดียว)');
    b.style.background = '#1db954'; b.style.color = '#fff';
    b.onclick = () => spLogin();
    sp.append(b);
    sp.append(el('p', 'tip', 'กดครั้งเดียว หลังจากนั้นเพลงที่คุณเปิดอยู่ใน Spotify จะขึ้นเหนือหัวเอง ไม่ต้องแนบลิงก์ · บัญชีต้องถูกเพิ่มไว้ใน Spotify Dashboard ของเจ้าของห้อง'));
  }
  card.append(sp);
  const foot = el('div', 'foot');
  const close = el('button', 'pbtn', 'ปิด'); close.onclick = closeModal;
  if (connected) { foot.append(close); card.append(foot); return; }
  // ---- สำรอง: พิมพ์เอง (เฉพาะตอนยังไม่เชื่อม Spotify) ----
  const man = el('label', 'field opt'); man.style.marginTop = '14px';
  man.append(el('span', null, cid || G.net.lastfm ? 'หรือพิมพ์ชื่อเพลงเอง' : 'ระหว่างนี้พิมพ์ชื่อเพลงเองได้'));
  const inp = el('input'); inp.maxLength = 90; inp.placeholder = 'เช่น ทางของฝุ่น – Atom ชนกันต์';
  const cur = G.music.manual;
  inp.value = cur ? musicLabel(cur).replace(/…$/, '') : '';
  man.append(inp); card.append(man);
  const clear = el('button', 'pbtn', 'ล้าง');
  clear.onclick = () => { G.music.manual = null; lsSet('pixel.music', null); pushMusic(); };
  const save = el('button', 'pbtn pink', 'บันทึก');
  save.onclick = () => {
    const v = inp.value.trim();
    if (!v) { clear.click(); return; }
    const [t, a] = v.split(/\s+[–-]\s+/);
    const m = { t: (t || v).slice(0, 60), a: (a || '').slice(0, 60), u: '', s: 'm' };
    G.music.manual = m; lsSet('pixel.music', m); pushMusic(); toast('ตั้งเพลงแล้ว 🎵');
  };
  foot.append(clear, close, save); card.append(foot);
}

// ---------- Spotify (PKCE: ไม่ต้องมี client secret) ----------
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const spRedirect = () => location.origin + '/';
async function spLogin() {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  const verifier = b64url(bytes);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = randomId(16);
  lsSet('pixel.spv', { verifier, state });
  const q = new URLSearchParams({
    response_type: 'code', client_id: G.net.spotifyClientId, scope: 'user-read-currently-playing user-read-playback-state',
    redirect_uri: spRedirect(), code_challenge_method: 'S256', code_challenge: challenge, state,
  });
  location.href = 'https://accounts.spotify.com/authorize?' + q;
}
async function spToken(params) {
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: G.net.spotifyClientId, ...params }),
  });
  if (!r.ok) throw new Error('token ' + r.status);
  const j = await r.json();
  const old = lsGet('pixel.spotify', {}) || {};
  const tok = { at: j.access_token, rt: j.refresh_token || old.rt, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  lsSet('pixel.spotify', tok);
  return tok;
}
async function spHandleRedirect() {
  const q = new URLSearchParams(location.search);
  if (!q.has('code') && !q.has('error')) return;
  const saved = lsGet('pixel.spv', null);
  history.replaceState(null, '', location.pathname);
  if (q.get('error') || !saved || saved.state !== q.get('state') || !G.net.spotifyClientId) { toast('เชื่อม Spotify ไม่สำเร็จ'); return; }
  try {
    await spToken({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: spRedirect(), code_verifier: saved.verifier });
    lsSet('pixel.spv', null);
    toast('เชื่อม Spotify แล้ว 🎵 เพลงที่คุณเปิดอยู่จะขึ้นเอง', 3500);
    G.music.manual = null; lsSet('pixel.music', null);
    setTimeout(spPoll, 300);
  } catch { toast('เชื่อม Spotify ไม่สำเร็จ (บัญชีอาจยังไม่ได้ถูกเพิ่มใน Spotify Dashboard)', 5000); }
}
let spBackoff = 0;
async function spPoll() {
  if (!G.net.spotifyClientId || !G.joined) return;
  let tok = lsGet('pixel.spotify', null);
  if (!tok || !tok.at) return;
  if (spBackoff > Date.now()) return;
  try {
    if (tok.exp < Date.now() + 30000 && tok.rt) tok = await spToken({ grant_type: 'refresh_token', refresh_token: tok.rt });
    let r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: 'Bearer ' + tok.at } });
    if (r.status === 401 && tok.rt) { tok = await spToken({ grant_type: 'refresh_token', refresh_token: tok.rt }); r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: 'Bearer ' + tok.at } }); }
    if (r.status === 429) { spBackoff = Date.now() + 120000; return; }
    let m = null;
    if (r.status === 200) {
      const j = await r.json();
      const item = j && j.item;
      clearTimeout(G.spEndTimer);
      if (item && j.is_playing && item.duration_ms) G.spEndTimer = setTimeout(spPoll, Math.max(3000, item.duration_ms - (j.progress_ms || 0) + 1500));
      if (item && j.is_playing) m = { t: String(item.name || '').slice(0, 60), a: (item.artists || []).map((x) => x.name).join(', ').slice(0, 60) || (item.show && item.show.name) || '', u: safeSpotifyUrl(item.external_urls && item.external_urls.spotify), s: 'sp' };
    }
    const prev = JSON.stringify(G.music.sp), next = JSON.stringify(m);
    if (prev !== next) { G.music.sp = m; pushMusic(); }
  } catch { spBackoff = Date.now() + 60000; }
}
setInterval(spPoll, 10000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) spPoll(); });

// ------------------------------------------------- YouTube ดูด้วยกัน ----
// เปิดคลิปบนทีวี/จอนำเสนอ: คนที่อยู่ห้องเดียวกับจอจะเห็นและเล่นพร้อมกัน
const SCREEN_TYPES = new Set(['tv', 'bigScreen', 'speaker', 'projectorScreen']); // ลำโพง = เปิด YouTube แบบฟังอย่างเดียว ได้ยินเฉพาะคนในห้องนั้น
G.screens = new Map();
const YT = { player: null, ready: false, apiPromise: null, cur: null, suppressUntil: 0, hiddenKey: '', lastPlayTry: 0 };
function parseYouTube(text) {
  try {
    const u = new URL(String(text).trim());
    let id = null;
    if (/(^|\.)youtu\.be$/.test(u.hostname)) id = u.pathname.slice(1).split('/')[0];
    else if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else { const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/); if (m) id = m[2]; }
    }
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    let t = 0;
    const ts = u.searchParams.get('t') || u.searchParams.get('start');
    if (ts) { const m = ts.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/); if (m) t = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); }
    return { id, t };
  } catch { return null; }
}
const ytNow = () => (G.net.now ? G.net.now() : Date.now());
function screenExpected(doc) { return (doc.pos || 0) + (doc.playing ? Math.max(0, (ytNow() - doc.ts) / 1000) : 0); }
function nearScreen(it) { return Math.abs(G.me.x - it.x) < 34 && G.me.y > it.y - 4 && G.me.y < it.y + 44; }
function activeScreen() {
  let best = null;
  for (const [id, doc] of G.screens) {
    if (!doc || !doc.v) continue;
    const it = G.furniture.find((f) => f.id === id);
    if (!it || zoneAt(it.x, it.y + 6) !== G.zone) continue;
    if (!best || doc.ts > best.doc.ts) best = { id, doc, it };
  }
  return best;
}
function loadYTApi() {
  if (YT.apiPromise) return YT.apiPromise;
  YT.apiPromise = new Promise((res) => {
    if (window.YT && window.YT.Player) return res();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch {} res(); };
    const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.append(sc);
  });
  return YT.apiPromise;
}
async function ensurePlayer(doc) {
  await loadYTApi();
  if (YT.player) return;
  await new Promise((res) => {
    YT.player = new window.YT.Player('ytPlayer', {
      videoId: doc.v, width: '100%', height: '100%',
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, start: Math.floor(screenExpected(doc)) },
      events: { onReady: () => { YT.ready = true; applyMyVolume(true); res(); }, onStateChange: onYTState },
    });
  });
}
function ytCall(fn) { YT.suppressUntil = Date.now() + 4000; try { fn(); } catch {} }
const YT_DRIFT = 4;          // คลาดเกินกี่วินาทีถึงจะกระโดดให้ตรงกัน
const YT_SEEK_GAP = 10000;  // กระโดดได้ไม่บ่อยกว่านี้ (กันเสียงสะดุดซ้ำๆ ตอนเน็ตช้า)
// คนกด เล่น/หยุด/เลื่อน บนตัว YouTube เอง → แชร์ให้ทุกคน
function onYTState(e) {
  const cur = YT.cur;
  if (!cur || Date.now() < YT.suppressUntil) return;
  const doc = G.screens.get(cur.id);
  if (!doc) return;
  const S = window.YT.PlayerState;
  const pos = YT.player.getCurrentTime();
  if (e.data === S.PAUSED && doc.playing) shareScreen(cur.id, { ...doc, playing: false, pos, ts: ytNow() });
  // แชร์ให้ทุกคนเฉพาะตอนกดเล่นเอง หรือเลื่อนไปไกลจริงๆ (ไม่แชร์การคลาดเล็กน้อยจากการโหลด ไม่งั้นทุกเครื่องจะกระโดดตามกันไปมา)
  else if (e.data === S.PLAYING && (!doc.playing || Math.abs(pos - screenExpected(doc)) > 10)) shareScreen(cur.id, { ...doc, playing: true, pos, ts: ytNow() });
  if (e.data === S.PLAYING) $('#ytTap').classList.add('hidden');
}
async function shareScreen(id, doc) {
  G.screens.set(id, doc);
  try { await G.net.set('screens', id, doc); } catch { toast('ส่งคำสั่งไปที่จอไม่สำเร็จ'); }
}
async function syncScreens() {
  if (!G.joined || !G.net.youtube) return;
  const act = activeScreen();
  const panel = $('#ytPanel');
  if (!act) {
    G.cinemaPlaying = false; YT.act = null;
    if (YT.cur) { YT.cur = null; if (YT.ready) ytCall(() => YT.player.pauseVideo()); }
    panel.classList.add('hidden');
    return;
  }
  const key = act.doc.v + ':' + act.doc.ts0;
  if (YT.hiddenKey === key) { panel.classList.add('hidden'); if (YT.ready) ytCall(() => YT.player.pauseVideo()); YT.cur = null; return; }
  panel.classList.remove('hidden');
  const where = ZONES[zoneAt(act.it.x, act.it.y + 6)];
  const isSpk = act.it.t === 'speaker';
  G.cinemaPlaying = act.it.t === 'projectorScreen' && !!act.doc.playing;
  YT.act = act;
  $('#ytTitle').textContent = `${isSpk ? '🔊' : '📺'} ${act.doc.title || 'YouTube'} · ${zoneName(where.id)}`;
  // ลำโพง: ย่อเป็นแถบฟังอย่างเดียวให้เอง (กด 🔼 ถ้าอยากเห็นภาพ)
  if (isSpk && YT.autoMini !== key) {
    YT.autoMini = key; panel.classList.add('mini'); panel.classList.remove('big');
    $('#ytMin').textContent = '🔼'; $('#ytMin').title = 'แสดงภาพ';
  }
  const expected = screenExpected(act.doc);
  if (!YT.player) { YT.cur = { id: act.id, v: act.doc.v }; await ensurePlayer(act.doc); }
  if (!YT.ready) return;
  if (!YT.cur || YT.cur.v !== act.doc.v || YT.cur.id !== act.id) {
    YT.cur = { id: act.id, v: act.doc.v };
    ytCall(() => (act.doc.playing ? YT.player.loadVideoById({ videoId: act.doc.v, startSeconds: expected }) : YT.player.cueVideoById({ videoId: act.doc.v, startSeconds: expected })));
    return;
  }
  applyMyVolume();
  const S = window.YT.PlayerState;
  const st = YT.player.getPlayerState();
  const pos = YT.player.getCurrentTime();
  if (act.doc.playing && st === S.PLAYING && Math.abs(pos - expected) > YT_DRIFT && Date.now() - (YT.lastSeek || 0) > YT_SEEK_GAP) {
    YT.lastSeek = Date.now(); ytCall(() => YT.player.seekTo(expected, true));
  } else if (!act.doc.playing && Math.abs(pos - expected) > 1.5 && st !== S.BUFFERING) ytCall(() => YT.player.seekTo(expected, true));
  if (act.doc.playing && st !== S.PLAYING && st !== S.BUFFERING && st !== S.ENDED) {
    ytCall(() => YT.player.playVideo());
    if (!YT.lastPlayTry) YT.lastPlayTry = Date.now();
    else if (Date.now() - YT.lastPlayTry > 2500) $('#ytTap').classList.remove('hidden');
  } else { YT.lastPlayTry = 0; if (st === S.PLAYING) $('#ytTap').classList.add('hidden'); }
  if (!act.doc.playing && st === S.PLAYING) ytCall(() => YT.player.pauseVideo());
}
setInterval(syncScreens, 700);
$('#ytTap').onclick = () => { $('#ytTap').classList.add('hidden'); YT.lastPlayTry = 0; if (YT.ready) ytCall(() => YT.player.playVideo()); };
$('#ytToggle').onclick = () => {
  const cur = YT.cur && G.screens.get(YT.cur.id);
  if (!cur || !YT.ready) return;
  const pos = YT.player.getCurrentTime();
  shareScreen(YT.cur.id, { ...cur, playing: !cur.playing, pos, ts: ytNow() });
};
$('#ytBig').onclick = () => { $('#ytPanel').classList.remove('mini'); $('#ytPanel').classList.toggle('big'); };
// ย่อ = ฟังอย่างเดียว (จำไว้ในเครื่องนี้)
function setMini(panelSel, btnSel, on, keyName) {
  const p = $(panelSel); p.classList.toggle('mini', on); if (on) p.classList.remove('big');
  $(btnSel).textContent = on ? '🔼' : '➖'; $(btnSel).title = on ? 'แสดงภาพ' : 'ย่อ (ฟังอย่างเดียว ไม่ต้องเห็นภาพ)';
  lsSet(keyName, on);
}
$('#ytMin').onclick = () => setMini('#ytPanel', '#ytMin', !$('#ytPanel').classList.contains('mini'), 'pixel.ytMini');
$('#scrMin').onclick = () => setMini('#scrPanel', '#scrMin', !$('#scrPanel').classList.contains('mini'), 'pixel.scrMini');
setMini('#ytPanel', '#ytMin', !!lsGet('pixel.ytMini', false), 'pixel.ytMini');
setMini('#scrPanel', '#scrMin', !!lsGet('pixel.scrMini', false), 'pixel.scrMini');
$('#ytHide').onclick = () => {
  const act = activeScreen();
  if (act) YT.hiddenKey = act.doc.v + ':' + act.doc.ts0;
  $('#ytPanel').classList.add('hidden'); $('#ytPanel').classList.remove('big');
  toast('ซ่อนจอแล้ว เดินไปกดที่จอเพื่อดูต่อได้');
};

function openScreenModal(it) {
  if (!G.net.youtube) { toast('ดู YouTube ด้วยกันใช้ได้ในเวอร์ชันเซิร์ฟเวอร์ (onrender.com)'); return; }
  const doc = G.screens.get(it.id);
  openModal((card) => {
    const spk = it.t === 'speaker';
    const zn = zoneName(zoneAt(it.x, it.y + 6));
    card.append(el('h2', null, spk ? '🔊 ลำโพง: เปิดเพลงจาก YouTube' : `📺 ${FURN[it.t].label}: ดู YouTube ด้วยกัน`));
    card.append(el('p', 'sub', spk
      ? `ทุกคนที่อยู่ใน${zn}จะได้ยินเพลงเดียวกันพร้อมกัน (คนห้องอื่นไม่ได้ยิน) · ขึ้นเป็นแถบเล็กฟังอย่างเดียว กด 🔼 ถ้าอยากดูภาพ · ใครกด เล่น/หยุด ทุกคนก็ตาม`
      : `ทุกคนที่อยู่ใน${zn}จะเห็นคลิปเดียวกันและเล่นพร้อมกัน ใครกด เล่น/หยุด/เลื่อน ทุกคนก็จะตามไปด้วย`));
    if (doc && doc.v) {
      const box = el('div', 'mon');
      box.append(el('b', null, `กำลังฉาย: ${doc.title || doc.v}`), el('p', 'tip', `เปิดโดย ${doc.by || 'เพื่อน'}`));
      card.append(box);
    }
    const f = el('label', 'field opt'); f.style.marginTop = '14px';
    f.append(el('span', null, 'วางลิงก์ YouTube'));
    const inp = el('input'); inp.placeholder = 'https://youtu.be/… หรือ https://www.youtube.com/watch?v=…';
    f.append(inp); card.append(f);
    const foot = el('div', 'foot');
    if (doc && doc.v) {
      const stop = el('button', 'pbtn danger', '⏹️ หยุดฉาย');
      stop.onclick = async () => { closeModal(); YT.hiddenKey = ''; try { await G.net.del('screens', it.id); } catch {} G.screens.delete(it.id); };
      foot.append(stop);
      const show = el('button', 'pbtn', '👀 ดูต่อ');
      show.onclick = () => { YT.hiddenKey = ''; closeModal(); syncScreens(); };
      foot.append(show);
    }
    const close = el('button', 'pbtn', 'ปิด'); close.onclick = closeModal;
    const mv = el('div', 'opt'); mv.style.marginTop = '12px';
    mv.append(el('span', null, '🔊 เสียงในเครื่องฉัน (คนอื่นไม่เปลี่ยน)'));
    const mvRow = el('div', 'vbtns'); mvRow.style.alignItems = 'center';
    const mr = el('input'); mr.type = 'range'; mr.min = '0'; mr.max = '100'; mr.value = String(G.myVol.v); mr.style.flex = '1';
    const mn = el('span', 'tip', `${G.myVol.v}`);
    mr.oninput = () => { setMyVolume(Number(mr.value)); mn.textContent = mr.value; };
    const mm = el('button', 'pbtn sm', G.myVol.muted ? '🔈 เปิดเสียง' : '🔇 ปิดเสียง');
    mm.onclick = () => { setMyVolume(null, !G.myVol.muted); mm.textContent = G.myVol.muted ? '🔈 เปิดเสียง' : '🔇 ปิดเสียง'; };
    mvRow.append(mr, mn, mm); mv.append(mvRow);
    if (isIOS) mv.append(el('p', 'tip', 'iPhone/iPad: ใช้ปุ่มข้างเครื่องปรับความดัง (ปุ่มปิดเสียงใช้ได้)'));
    card.append(mv);
    const play = el('button', 'pbtn pink', spk ? '▶ เปิดเพลง' : '▶ เล่นบนจอ');
    play.onclick = async () => {
      const y = parseYouTube(inp.value);
      if (!y) { toast('ลิงก์ YouTube ไม่ถูกต้อง'); return; }
      let title = '';
      try {
        const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + y.id));
        if (r.ok) title = String((await r.json()).title || '').slice(0, 80);
      } catch {}
      const now = ytNow();
      YT.hiddenKey = '';
      closeModal();
      await shareScreen(it.id, { v: y.id, title, playing: true, pos: y.t, ts: now, ts0: now, by: G.me.nick });
      addSys(`${G.me.nick} เปิดคลิปบน${FURN[it.t].label}${title ? ': ' + title : ''}`);
      syncScreens();
    };
    foot.append(close, play); card.append(foot);
    setTimeout(() => inp.focus(), 50);
  });
}

// ภาพปกคลิปบนจอในห้อง
const ytThumbs = new Map();
function screenRect(it, sx, sy) {
  if (it.t === 'tv') return [sx + 4, sy + 1, 28, 15];
  if (it.t === 'projectorScreen') return [sx + 7, sy + 6, 198, 58];
  return [sx + 3, sy + 3, 60, 28];
}
function drawScreenThumb(c, it, sx, sy) {
  // มีคนแชร์จออยู่ในห้องเดียวกัน → โชว์ภาพจอสดบนทีวี/จอนำเสนอ
  const live = zoneAt(it.x, it.y + 6) === G.zone && shareSources()[0];
  if (live) {
    const v = live.el;
    const r = screenRect(it, sx, sy);
    c.fillStyle = '#000'; c.fillRect(...r);
    if (v.readyState >= 2 && v.videoWidth) {
      const k = Math.min(r[2] / v.videoWidth, r[3] / v.videoHeight), w = v.videoWidth * k, h = v.videoHeight * k;
      const prev = c.imageSmoothingEnabled; c.imageSmoothingEnabled = true;
      c.drawImage(v, r[0] + (r[2] - w) / 2, r[1] + (r[3] - h) / 2, w, h);
      c.imageSmoothingEnabled = prev;
    }
    c.fillStyle = '#e8505b'; c.fillRect(r[0] + 1, r[1] + 1, 3, 2);
    return;
  }
  const doc = G.screens.get(it.id);
  if (!doc || !doc.v) return;
  let e = ytThumbs.get(doc.v);
  if (!e) { const img = new Image(); e = { img, ready: false }; img.onload = () => (e.ready = true); img.src = `https://i.ytimg.com/vi/${doc.v}/mqdefault.jpg`; ytThumbs.set(doc.v, e); }
  const r = screenRect(it, sx, sy);
  c.fillStyle = '#000'; c.fillRect(...r);
  if (e.ready) {
    const prev = c.imageSmoothingEnabled; c.imageSmoothingEnabled = true;
    const k = Math.min(r[2] / 320, r[3] / 180), w = 320 * k, h = 180 * k; // ภาพปก 16:9 ไม่ยืด
    c.drawImage(e.img, r[0] + (r[2] - w) / 2, r[1] + (r[3] - h) / 2, w, h);
    c.imageSmoothingEnabled = prev;
  }
  const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
  c.fillStyle = '#ff0033'; c.fillRect(cx - 4, cy - 3, 9, 7);
  c.fillStyle = '#ffffff'; c.fillRect(cx - 1, cy - 2, 1, 5); c.fillRect(cx, cy - 1, 1, 3); c.fillRect(cx + 1, cy, 1, 1);
  if (!doc.playing) { c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(...r); }
}

// ------------------------------------------------------------ แชร์จอ ----
// คนในห้อง (โซน) เดียวกันจะเห็นจอที่แชร์ เลือกดูได้ถ้ามีหลายคนแชร์พร้อมกัน
const SHARE = { sel: null, hidden: new Set(), lastIds: '' };
function shareSources() {
  const V = G.voice;
  if (!V) return [];
  const list = [];
  for (const rt of G.others.values()) {
    if (rt.p.scr !== 1 || !Number.isFinite(rt.p.x) || zoneAt(rt.p.x, rt.p.y) !== G.zone) continue;
    const el = V.screenFor(rt.key);
    if (el) list.push({ key: rt.key, name: rt.p.n || 'เพื่อน', el });
  }
  if (V.screenTrack) list.push({ key: 'me', name: 'คุณ', el: V.selfScreen, me: true });
  return list;
}
function syncShare() {
  const panel = $('#scrPanel');
  const all = shareSources();
  const ids = all.map((s) => s.key).join(',');
  // คนที่เริ่มแชร์ใหม่ → เลิกซ่อนให้อัตโนมัติ
  for (const k of [...SHARE.hidden]) if (!all.some((s) => s.key === k)) SHARE.hidden.delete(k);
  const list = all.filter((s) => !SHARE.hidden.has(s.key));
  if (!list.length) {
    panel.classList.add('hidden'); panel.classList.remove('big');
    $('#scrVideo').srcObject = null; SHARE.sel = null;
    return;
  }
  if (!list.some((s) => s.key === SHARE.sel)) SHARE.sel = (list.find((s) => !s.me) || list[0]).key;
  const cur = list.find((s) => s.key === SHARE.sel);
  panel.classList.remove('hidden');
  $('#scrTitle').textContent = cur.me ? '🔴 คุณกำลังไลฟ์จอ' : `🔴 ${cur.name} กำลังไลฟ์`;
  // ข้อมูลใต้จอ: คนแชร์เห็นว่าใครกำลังดู · คนดูเห็นคุณภาพ/มีเสียงไหม
  const info = $('#scrInfo');
  if (cur.me) {
    const ws = G.voice.watcherList().map((k) => { const rt = G.others.get(k); return rt ? rt.p.n || 'เพื่อน' : null; }).filter(Boolean);
    const so = G.voice.screenOpts || {};
    info.textContent = `👀 ${ws.length ? ws.length + ' คนกำลังดู: ' + ws.join(', ') : 'ยังไม่มีใครดู'} · ${so.name || ''}${G.voice.screenAudio ? ' · 🔊 แชร์เสียงด้วย' : ' · 🔇 ไม่มีเสียง'}`;
  } else {
    const v = $('#scrVideo');
    info.textContent = v.videoWidth ? `${v.videoWidth}×${v.videoHeight}` : 'กำลังโหลดภาพ…';
    // บอกคนแชร์ว่าเรากำลังดูอยู่ (ทุก ~3 วิ)
    if (!SHARE.watchAt || Date.now() - SHARE.watchAt > 3000) { SHARE.watchAt = Date.now(); G.voice.watching(cur.key); }
  }
  info.classList.remove('hidden');
  $('#scrStop').classList.toggle('hidden', !G.voice.screenTrack);
  const vid = $('#scrVideo');
  const src = cur.el.srcObject;
  if (src && vid.srcObject !== src) { vid.srcObject = src; vid.play().catch(() => {}); }
  const tabs = $('#scrTabs');
  if (ids !== SHARE.lastIds || tabs.dataset.sel !== SHARE.sel) {
    SHARE.lastIds = ids; tabs.dataset.sel = SHARE.sel;
    tabs.innerHTML = '';
    tabs.classList.toggle('hidden', list.length < 2);
    for (const s of list) {
      const b = el('button', s.key === SHARE.sel ? 'sel' : '', s.me ? 'จอของคุณ' : s.name);
      b.onclick = () => { SHARE.sel = s.key; syncShare(); };
      tabs.append(b);
    }
  }
}
setInterval(syncShare, 600);
$('#scrStop').onclick = () => G.voice && G.voice.stopScreen();
$('#scrBig').onclick = () => $('#scrPanel').classList.toggle('big');
$('#scrHide').onclick = () => { if (SHARE.sel) SHARE.hidden.add(SHARE.sel); syncShare(); toast('ซ่อนจอที่แชร์แล้ว จะขึ้นใหม่เมื่อเขาเริ่มแชร์ครั้งถัดไป'); };
$('#scrVideo').ondblclick = () => toggleScrFull();
function toggleScrFull() {
  const v = $('#scrVideo'), box = $('#scrPanel');
  if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  if (box.requestFullscreen) box.requestFullscreen().catch(() => box.classList.toggle('big'));
  else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iPhone
  else box.classList.toggle('big');
}
$('#scrFull').onclick = () => toggleScrFull();
$('#scrPip').onclick = async () => {
  const v = $('#scrVideo');
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else if (v.requestPictureInPicture) await v.requestPictureInPicture();
    else if (v.webkitSetPresentationMode) v.webkitSetPresentationMode('picture-in-picture');
    else toast('เบราว์เซอร์นี้ไม่รองรับป๊อปเอาต์');
  } catch { toast('ป๊อปเอาต์ไม่ได้ตอนนี้'); }
};
if (!document.pictureInPictureEnabled && !('webkitSetPresentationMode' in HTMLVideoElement.prototype)) $('#scrPip').classList.add('hidden');
// เปิดดูไลฟ์ของคนนี้ (จากแถบห้อง/รายชื่อ)
function watchStream(key) {
  SHARE.hidden.delete(key); SHARE.sel = key;
  setMini('#scrPanel', '#scrMin', false, 'pixel.scrMini');
  syncShare();
  if ($('#scrPanel').classList.contains('hidden')) toast('ต้องอยู่ห้องเดียวกันถึงจะดูไลฟ์ได้'); else $('#scrPanel').classList.add('big');
}
// ---- หน้าต่าง "เริ่มไลฟ์" แบบ Discord: เลือกคุณภาพ + แชร์เสียง ----
function openGoLive() {
  const V = G.voice;
  openModal((card) => {
    card.classList.add('golive');
    card.append(el('h2', null, '🔴 แชร์หน้าจอ'));
    card.append(el('p', 'sub', 'คนที่อยู่ห้องเดียวกันจะเห็นจอคุณ'));
    let q = lsGet('pixel.shareQ', 'smooth'); if (!SHARE_Q[q]) q = 'smooth';
    let audio = lsGet('pixel.shareAudio', true) !== false;
    const list = el('div', 'gl-list');
    const paint = () => {
      list.innerHTML = '';
      for (const [k, o] of Object.entries(SHARE_Q)) {
        const b = el('button', 'gl-opt' + (k === q ? ' sel' : ''));
        b.type = 'button';
        b.append(el('b', null, o.name.split(' · ')[0]), el('span', null, o.name.split(' · ')[1] || ''));
        b.onclick = () => { q = k; paint(); };
        list.append(b);
      }
    };
    paint();
    card.append(el('div', 'gl-lab', 'คุณภาพ'), list);
    const au = el('label', 'chk gl-audio'); const ac = el('input'); ac.type = 'checkbox'; ac.checked = audio; ac.onchange = () => (audio = ac.checked);
    au.append(ac, el('b', null, '🔊 แชร์เสียงด้วย'));
    card.append(au, el('p', 'tip', 'เสียง: Chrome/Edge แชร์ได้เมื่อเลือก "แท็บ" หรือ "ทั้งหน้าจอ" (Windows) และติ๊ก "แชร์เสียง" ในหน้าต่างของเบราว์เซอร์ · ปิดไมค์อยู่ เพื่อนก็ยังได้ยินเสียงจอ'));
    const go = el('button', 'pbtn pink big', '🔴 เริ่มไลฟ์');
    go.onclick = async () => { lsSet('pixel.shareQ', q); lsSet('pixel.shareAudio', audio); closeModal(); await V.startScreen({ q, audio }); if (V.screenTrack && audio && !V.screenAudio) toast('แชร์จอแล้ว แต่ไม่มีเสียง — ตอนเลือกจอให้ติ๊ก "แชร์เสียง" ด้วย (ได้กับแท็บ/ทั้งหน้าจอ)', 6000); };
    const cancel = el('button', 'pbtn big ghost', 'ยกเลิก'); cancel.onclick = () => closeModal();
    const col = el('div', 'leave-col'); col.append(go, cancel); card.append(col);
  });
}

// ---------- แผงรัศมีไมค์แบบเล็ก (แตะป้ายห้อง) — เห็นวงรอบตัวละครระหว่างปรับ ----------
function micRangeName(r) { return r >= MIC_R_WHOLE ? 'ทั้งห้อง' : r <= 90 ? 'กระซิบ' : r <= 150 ? 'ปกติ' : r <= 210 ? 'ดัง' : 'ตะโกน'; }
function paintMicPop() {
  const body = $('#micPopBody');
  body.innerHTML = '';
  if (!G.voice) { body.append(el('p', 'tip', 'รัศมีไมค์ใช้ได้ในเวอร์ชันที่มีเสียง (onrender.com)')); return; }
  const row = el('div', 'row');
  MIC_COLORS.forEach((c, i) => {
    const b = el('button', 'sw' + (G.micSet.c === i ? ' sel' : '')); b.type = 'button'; b.style.background = c;
    b.onclick = () => { setMic({ c: i }); paintMicPop(); };
    row.append(b);
  });
  const lab = el('p', 'tip', '');
  const paint = () => (lab.textContent = `ระยะ: ${micRangeName(G.micSet.r)}${G.micSet.r < MIC_R_WHOLE ? ` (${G.micSet.r})` : ' — ทุกคนในห้องรวมได้ยิน'} · ${G.zone === 'hall' ? 'ใช้อยู่ตอนนี้' : 'มีผลเฉพาะในห้องรวม'}`);
  const r = el('input'); r.type = 'range'; r.min = String(MIC_R_MIN); r.max = String(MIC_SLIDER_MAX); r.step = '5'; r.value = String(micToSlider(G.micSet.r));
  r.style.accentColor = MIC_COLORS[G.micSet.c];
  r.oninput = () => { setMic({ r: micFromSlider(r.value) }); paint(); };
  paint();
  body.append(row, r, lab, el('p', 'tip', 'เลื่อนสุดขวา = ทั้งห้องรวมได้ยิน · ลดลง = ได้ยินเฉพาะคนในวง · ห้องอื่นได้ยินทั้งห้องเสมอ'));
}
function setMicPop(open) {
  $('#micPop').classList.toggle('hidden', !open);
  document.body.classList.toggle('micpop-open', open);
  if (open) paintMicPop();
}
$('#zoneChip').onclick = () => setMicPop($('#micPop').classList.contains('hidden'));
$('#micPopClose').onclick = () => setMicPop(false);

// ---------- เปิดในแอปแชต (Messenger/LINE/IG) มักใช้ไมค์/กล้องไม่ได้ ----------
G.inAppBrowser = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|MicroMessenger|TikTok/i.test(navigator.userAgent);

// สำหรับทดสอบ: เปิดด้วย #debug
if (location.hash === '#debug') window.__pixel = { G, toggleRide, f1TopSprite, walkTo, sitOn, petSprite, furnSprite, FURN, statusIcon, openBoard, zoneAt, openScreenModal, YT, cleanLook, charSprite };

// ---------- ลากหน้าต่างคลิป/เพลง/แชร์จอ ไปวางตรงไหนก็ได้ (ลากที่แถบชื่อ) ----------
// แตะแถบชื่อสองครั้ง = กลับที่เดิม · ตำแหน่งจำไว้ในเครื่องนี้
function makeDraggable(panel, keyName) {
  const head = panel.querySelector('header');
  const place = (fx, fy) => {
    const w = panel.offsetWidth || parseFloat(panel.style.width) || 300, h = panel.offsetHeight || 60;
    const x = clamp(fx * innerWidth, 4, Math.max(4, innerWidth - w - 4));
    const y = clamp(fy * innerHeight, 4, Math.max(4, innerHeight - h - 4));
    panel.style.left = x + 'px'; panel.style.top = y + 'px';
  };
  const setFree = (pos) => {
    if (!pos) { panel.classList.remove('free'); panel.style.left = panel.style.top = panel.style.width = ''; lsSet(keyName, null); return; }
    if (!panel.classList.contains('free')) { panel.style.width = panel.getBoundingClientRect().width + 'px'; panel.classList.add('free'); }
    place(pos.fx, pos.fy);
  };
  const saved = lsGet(keyName, null);
  if (saved && Number.isFinite(saved.fx)) {
    panel.classList.add('free');
    if (saved.w) panel.style.width = Math.min(saved.w, innerWidth - 8) + 'px';
    requestAnimationFrame(() => place(saved.fx, saved.fy));
  }
  let drag = null;
  head.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || panel.classList.contains('big')) return;
    const r = panel.getBoundingClientRect();
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, moved: false, sx: e.clientX, sy: e.clientY };
    head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
    if (!drag.moved) { drag.moved = true; panel.style.width = drag.w + 'px'; panel.classList.add('free', 'dragging'); }
    const fx = (e.clientX - drag.dx) / innerWidth, fy = (e.clientY - drag.dy) / innerHeight;
    place(fx, fy); drag.last = { fx, fy };
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    panel.classList.remove('dragging');
    if (drag.moved && drag.last) {
      const r = panel.getBoundingClientRect();
      lsSet(keyName, { fx: r.left / innerWidth, fy: r.top / innerHeight, w: Math.round(r.width) });
    }
    drag = null;
  };
  head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
  head.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) setFree(null); });
  window.addEventListener('resize', () => { const s2 = lsGet(keyName, null); if (s2 && panel.classList.contains('free')) place(s2.fx, s2.fy); });
  // ตอนหน้าต่างเพิ่งโผล่ (เริ่มเล่นคลิป) จัดตำแหน่งใหม่ให้พอดีจอ
  new MutationObserver(() => { const s2 = lsGet(keyName, null); if (s2 && !drag && panel.classList.contains('free') && !panel.classList.contains('hidden')) place(s2.fx, s2.fy); }).observe(panel, { attributes: true, attributeFilter: ['class'] });
}
makeDraggable($('#ytPanel'), 'pixel.ytPos');
makeDraggable($('#scrPanel'), 'pixel.scrPos');

// ---------- ได้ยินเสียงตอนพับจอ / สลับแอป (เปิด-ปิดได้) ----------
// เปิด: พยายามให้เสียงคุยและเพลงเล่นต่อ (Media Session + เสียงเงียบค้างไว้ให้ระบบรู้ว่ากำลังเล่นเสียง)
// ปิด: พับจอแล้วปิดเสียงเพื่อน + ปิดไมค์ชั่วคราว + หยุดคลิปในเครื่องเรา กลับมาแล้วเปิดคืนให้เอง
G.bgAudio = lsGet('pixel.bg', true) !== false;
let keepAliveEl = null;
function silentWav() {
  const sr = 8000, n = sr, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
function keepAlive(on) {
  try {
    if (on) {
      if (!keepAliveEl) { keepAliveEl = new Audio(silentWav()); keepAliveEl.loop = true; keepAliveEl.setAttribute('playsinline', ''); keepAliveEl.volume = 0.01; }
      keepAliveEl.play().catch(() => {});
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: $('#roomName').textContent || 'Pixel Hangout', artist: `${ZONES[G.zone || 'hall'].icon} ${zoneName(G.zone || 'hall')}`, album: 'Pixel Hangout' });
        navigator.mediaSession.playbackState = 'playing';
        try { navigator.mediaSession.setActionHandler('pause', () => setBgAudio(false)); navigator.mediaSession.setActionHandler('play', () => setBgAudio(true)); } catch {}
      }
    } else {
      if (keepAliveEl) keepAliveEl.pause();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
    }
  } catch {}
}
function setBgAudio(on, quiet) {
  G.bgAudio = !!on; lsSet('pixel.bg', G.bgAudio);
  keepAlive(G.bgAudio && G.joined);
  if (!quiet) { const t = G.bgAudio ? '🎧 เปิดแล้ว: พับจอ/สลับแอปยังได้ยินเสียงต่อ' : '🔕 ปิดแล้ว: พับจอแล้วจะปิดเสียงและไมค์ชั่วคราว'; addSys(t); toast(t, 3500); }
  if (G.voicePanelOpen) paintVoiceSettings();
}
document.addEventListener('visibilitychange', () => {
  if (!G.joined) return;
  // บอกเพื่อนว่าเราพับจอ/สลับแอปอยู่ (มือถือจะหยุดกล้องตอนนี้ → เพื่อนจะได้รู้ว่าทำไมภาพดำ) — ส่งทันที ไม่รอเฟรมถัดไป
  try { G.net.setPresence({ hid: document.hidden ? 1 : null }); } catch {}
  if (document.hidden) {
    if (G.bgAudio) { keepAlive(true); return; }
    if (G.voice) G.voice.setBgMute(true);
    if (YT.ready && YT.player) { try { YT.suppressUntil = Date.now() + 4000; YT.player.pauseVideo(); } catch {} }
    G.bgPaused = true;
  } else {
    if (G.voice) { G.voice.setBgMute(false); G.voice.resumeAudio(); }
    if (G.bgPaused) { G.bgPaused = false; syncScreens(); }
  }
});

// ---------- สะกิด (poke) เฉพาะคน ----------
function pokeReceived(m) {
  const who = m.from || 'เพื่อน';
  toast(`👉 ${who} สะกิดคุณ!`, 4000);
  addSys(`👉 ${who} สะกิดคุณ`);
  SFX.pop(); setTimeout(() => SFX.pop(), 180); setTimeout(() => SFX.join(), 380);
  try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch {}
  G.emotes.push({ key: 'me', e: '👉', start: performance.now(), dx: 0 });
  G.me.shakeUntil = performance.now() + 700;
  if (document.hidden) {
    const t0 = document.title; let n = 0;
    const iv = setInterval(() => { document.title = n++ % 2 ? t0 : `👉 ${who} สะกิดคุณ`; if (!document.hidden || n > 20) { clearInterval(iv); document.title = t0; } }, 800);
    try { if (window.Notification && Notification.permission === 'granted') new Notification(`👉 ${who} สะกิดคุณ`, { body: $('#roomName').textContent || 'Pixel Hangout', tag: 'poke' }); } catch {}
  }
}
function pokeByName(name) {
  if (!G.net.poke) { toast('สะกิดใช้ได้ในเวอร์ชันเซิร์ฟเวอร์ (onrender.com)'); return; }
  G.net.poke(name);
  try { if (window.Notification && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); } catch {}
}

// ---------- ปรับเสียงคลิป/ลำโพงเฉพาะเครื่องฉัน (คนอื่นไม่เปลี่ยน) ----------
G.myVol = { v: Number(lsGet('pixel.ytVol', 100)), muted: !!lsGet('pixel.ytMute', false) };
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function applyMyVolume(force) {
  if (!YT.ready || !YT.player || !YT.player.setVolume) return;
  const key = G.myVol.v + ':' + G.myVol.muted;
  if (!force && YT.volKey === key) return;
  YT.volKey = key;
  try { YT.player.setVolume(G.myVol.v); if (G.myVol.muted || G.myVol.v === 0) YT.player.mute(); else YT.player.unMute(); } catch {}
}
function paintMyVolume() {
  $('#ytVol').value = String(G.myVol.v);
  $('#ytVolNum').textContent = G.myVol.muted ? '0' : String(G.myVol.v);
  $('#ytMute').classList.toggle('on', G.myVol.muted);
  $('#ytMute').textContent = G.myVol.muted ? '🔈' : '🔇';
  $('#ytMute').title = G.myVol.muted ? 'เปิดเสียง' : 'ปิดเสียงในเครื่องฉัน';
  $('#ytVolBtn').textContent = G.myVol.muted || G.myVol.v === 0 ? '🔇' : G.myVol.v < 50 ? '🔉' : '🔊';
}
function setMyVolume(v, muted) {
  if (v != null) G.myVol.v = Math.max(0, Math.min(100, Math.round(v)));
  if (muted != null) G.myVol.muted = muted;
  if (v != null && v > 0 && muted == null) G.myVol.muted = false;
  lsSet('pixel.ytVol', G.myVol.v); lsSet('pixel.ytMute', G.myVol.muted);
  paintMyVolume(); applyMyVolume(true);
}
$('#ytVolBtn').onclick = () => $('#ytVolRow').classList.toggle('hidden');
$('#ytVol').oninput = () => setMyVolume(Number($('#ytVol').value));
$('#ytMute').onclick = () => setMyVolume(null, !G.myVol.muted);
if (isIOS) $('#ytVolRow').append(el('p', 'tip', 'iPhone/iPad: แถบนี้ปิด/เปิดเสียงได้ แต่ความดังต้องใช้ปุ่มข้างเครื่อง (Safari ไม่ให้เว็บปรับระดับเสียง)'));
paintMyVolume();

// ---------- โรงหนัง: ให้วิดีโอไปอยู่บนจอโปรเจกเตอร์ในห้องจริงๆ ----------
// (ถ้าผู้ใช้ย่อ/ขยาย/ลากหน้าต่างเอง จะใช้แบบที่ผู้ใช้เลือกแทน)
function placeCinemaPanel(camX, camY, scale) {
  const panel = $('#ytPanel');
  const act = YT.act;
  const want = act && act.it.t === 'projectorScreen' && !panel.classList.contains('hidden') && !panel.classList.contains('mini') && !panel.classList.contains('big') && !panel.classList.contains('free') && zoneAt(act.it.x, act.it.y) === G.zone;
  if (!want) {
    if (panel.classList.contains('onscreen')) { panel.classList.remove('onscreen'); panel.style.left = panel.style.top = panel.style.width = ''; panel.style.removeProperty('--sh'); }
    return;
  }
  const it = act.it;
  const x = (it.x - 106 + 1 + 7 - camX) * scale, y = (it.y - 72 + 1 + 6 - camY) * scale;
  panel.classList.add('onscreen');
  panel.style.left = Math.round(x) + 'px'; panel.style.top = Math.round(y) + 'px';
  panel.style.width = Math.round(198 * scale) + 'px';
  panel.style.setProperty('--sh', Math.round(58 * scale) + 'px');
}

// ---------- ปรับเสียงเพื่อนทีละคน (เฉพาะในเครื่องเรา · จำไว้ตามตัวคน) ----------
G.peerVols = lsGet('pixel.peerVol', {}) || {};
const peerId = (rt) => String(rt.by || rt.key);
function peerVol(rt) { const o = G.peerVols[peerId(rt)]; return { v: o && Number.isFinite(o.v) ? o.v : 1, m: !!(o && o.m) }; }
function setPeerVol(rt, patch) {
  const id = peerId(rt);
  const o = { ...peerVol(rt), ...patch };
  if (o.v >= 0.99 && !o.m) delete G.peerVols[id]; else G.peerVols[id] = { v: Math.round(o.v * 100) / 100, m: o.m };
  lsSet('pixel.peerVol', G.peerVols);
  updateZones();
}
function peerVolIcon(rt) { const o = peerVol(rt); return o.m || o.v === 0 ? '🔇' : o.v < 0.5 ? '🔈' : o.v < 0.99 ? '🔉' : '🔊'; }
function peerVolRow(rt, iconBtn) {
  const row = document.createElement('div'); row.className = 'pvol';
  const o = peerVol(rt);
  const r = document.createElement('input'); r.type = 'range'; r.min = '0'; r.max = '100'; r.value = String(Math.round(o.v * 100));
  const num = document.createElement('span'); num.textContent = o.m ? 'ปิด' : `${Math.round(o.v * 100)}%`;
  const mb = document.createElement('button'); mb.className = 'pbtn sm'; mb.textContent = o.m ? '🔈 เปิด' : '🔇 ปิด';
  const paint = () => { const p = peerVol(rt); num.textContent = p.m ? 'ปิด' : `${Math.round(p.v * 100)}%`; mb.textContent = p.m ? '🔈 เปิด' : '🔇 ปิด'; iconBtn.textContent = peerVolIcon(rt); };
  r.oninput = () => { setPeerVol(rt, { v: Number(r.value) / 100, m: false }); paint(); };
  mb.onclick = () => { setPeerVol(rt, { m: !peerVol(rt).m }); paint(); };
  row.append(r, num, mb);
  if (typeof isIOS !== 'undefined' && isIOS) { const t = document.createElement('small'); t.textContent = 'iPhone/iPad: เลื่อนระดับเสียงไม่ได้ ใช้ปุ่มปิดเสียงแทน'; row.append(t); }
  return row;
}

// ---------- ทำไมไม่ได้ยินคนนี้? บอกสถานะเสียงของแต่ละคน ----------
function voiceStatus(rt) {
  const V = G.voice;
  if (!V) return '';
  if (!Number.isFinite(rt.p.x) || zoneAt(rt.p.x, rt.p.y) !== zoneAt(G.me.x, G.me.y)) return '🚪 อยู่คนละห้อง (ไม่ได้ยินกัน)';
  const pv = peerVol(rt);
  if (pv.m || pv.v === 0) return '🔇 คุณปิดเสียงคนนี้ไว้';
  const peer = V.peers.get(rt.key);
  const st = peer ? peer.state : 'new';
  const viaServer = V.relayActive && V.relayActive(peer);
  if (!viaServer && st !== 'connected') return '🟡 กำลังเชื่อมต่อเสียง…';
  if (rt.p.hp === 1) return '🎧 เขาปิดหูฟังอยู่ (ไม่ได้ยินใคร)';
  if (rt.p.mic !== 1) return '🎙️ เขาปิดไมค์อยู่';
  if (rt.p.md) return '⚠️ เขาเปิดไมค์ แต่ไมค์เขาไม่มีเสียงเข้า (เลือกไมค์ผิดตัว/แอปอื่นใช้ไมค์อยู่) — ให้เขาเปลี่ยนไมค์ในตั้งค่าเสียง แล้วรีเฟรช';
  if (V.deaf) return '🔇 คุณปิดหูฟังอยู่';
  if (!G.audible.has(rt.key)) return `📏 เขาตั้งไมค์ระยะ "${micRangeName(peerRange(rt.p))}" — เดินเข้าไปใกล้ๆ หรือให้เขาเลื่อนระยะไมค์เป็น "ทั้งห้อง"`;
  if (V.actx && V.actx.state !== 'running' && viaServer) return '👆 แตะหน้าจอหนึ่งครั้งเพื่อเปิดเสียง';
  if (!V.rxOk(peer)) return '🔴 ยังไม่มีเสียงจากเขามาถึง — ให้เขาแตะหน้าจอ 1 ครั้ง ถ้ายังไม่ได้ให้เขารีเฟรช';
  if (viaServer) return (peer.state === 'connected' ? '🟢 ได้ยินอยู่ (เสียงผ่านเซิร์ฟเวอร์)' : '🟢 ได้ยินอยู่ (เสียงผ่านเซิร์ฟเวอร์ · ไม่มีวิดีโอ)');
  if (peer.audioEl && peer.audioEl.paused) return '👆 แตะหน้าจอหนึ่งครั้งเพื่อเปิดเสียง';
  return '🟢 ได้ยินอยู่';
}
// iPhone/Android บางทีไม่ยอมเล่นเสียงเพื่อนจนกว่าจะแตะจอ — แตะตรงไหนก็ได้แล้วเปิดเสียงทุกคนใหม่
document.addEventListener('pointerdown', () => { if (G.voice && G.voice.resumeAudio) G.voice.resumeAudio(); }, { passive: true, capture: true });
// รีเฟรชสถานะในรายชื่อทุก 2 วิ (ตอนเปิดอยู่) + เตือนถ้าเชื่อมเสียงกับใครไม่ได้นานๆ
G.warnedFail = new Set();
setInterval(() => {
  if (!$('#people').classList.contains('hidden')) renderPeople();
  const V = G.voice; if (!V || !G.joined) return;
  for (const rt of G.others.values()) {
    const peer = V.peers.get(rt.key);
    if (peer && V.relayActive && V.relayActive(peer) && !G.warnedFail.has(rt.key)) {
      G.warnedFail.add(rt.key);
      addSys(`🛰️ ต่อเสียงกับ ${rt.p.n || 'เพื่อน'} โดยตรงไม่ได้ (มักเป็นเน็ตมือถือ) — สลับไปส่งเสียงผ่านเซิร์ฟเวอร์ให้แล้ว (เสียงอย่างเดียว ไม่มีวิดีโอ)`);
    }
  }
}, 2000);

// ---------- 🩺 ตรวจเสียง: บอกว่าเครื่องนี้พูด/ได้ยินใครได้บ้าง + คัดลอกผลไปส่งให้คนช่วยดู ----------
function voiceDiag() {
  const V = G.voice, lines = [];
  const ua = navigator.userAgent;
  const app = G.inAppBrowser ? 'แอปแชต (Messenger/IG/LINE) ⚠️' : /CriOS|Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : /Firefox/.test(ua) ? 'Firefox' : 'อื่นๆ';
  lines.push(`เบราว์เซอร์: ${app}${isIOS ? ' · iPhone/iPad' : /Android/.test(ua) ? ' · Android' : ''}`);
  if (!V) { lines.push('ระบบเสียงยังไม่เริ่ม'); return lines; }
  const t = V.audioTrack;
  const lvl = V.meters.get('me');
  lines.push(`ไมค์ของฉัน: ${!t ? (V.micLost ? '❌ หลุด (แอปอื่นแย่งไมค์)' : '⭕ ยังไม่เปิด') : t.readyState !== 'live' ? '❌ หยุดทำงาน' : t.muted ? '⚠️ ถูกระบบปิด (แอปอื่นใช้ไมค์อยู่?)' : V.mic ? (V.micDead ? '⚠️ เปิดอยู่แต่ไม่มีเสียงเข้าเลย — เปลี่ยนไมค์ในตั้งค่าเสียง' : `🟢 เปิด · ระดับเสียง ${lvl ? Math.round(lvl.lvl * 1000) : 0}`) : '🔴 ปิดอยู่ (กดปุ่มไมค์)'}${V.deaf ? ' · 🔇 ปิดหูฟังอยู่' : ''}`);
  if (V.cam && V.videoTrack) { const vt = V.videoTrack, st = vt.getSettings ? vt.getSettings() : {}; lines.push(`กล้องของฉัน: ${vt.readyState !== 'live' ? '❌ หยุดทำงาน' : vt.muted ? '⚠️ ระบบพักกล้อง (ไม่มีภาพ)' : '🟢 เปิด'} · ${st.width || '?'}x${st.height || '?'}`); }
  lines.push(`เสียงในเครื่อง: ${V.actx ? V.actx.state : 'ยังไม่เริ่ม'}${V.actx && V.actx.state !== 'running' ? ' ⚠️ แตะหน้าจอ 1 ครั้ง' : ''} · TURN: ${G.net.hasTurn ? 'มี' : 'ไม่มี (ใช้เซิร์ฟเวอร์สำรอง)'}`);
  for (const rt of G.others.values()) {
    const p = V.peers.get(rt.key);
    const relay = p && V.relayActive(p);
    const mode = !p ? 'ยังไม่เชื่อม' : relay ? '🛰️ ผ่านเซิร์ฟเวอร์' : p.state === 'connected' ? '🔗 ต่อตรง' : `🟡 ${p.state}`;
    const rx = p && p.stat ? Math.round(p.stat.rxRate / 1000) : '-', tx = p && p.stat ? Math.round(p.stat.txRate / 1000) : '-';
    const lossTxt = p && p.loss != null && !relay ? ` · เสียงขาด ${Math.round(p.loss * 100)}%${p.jbt > 40 ? ' (บัฟเฟอร์ ' + p.jbt + 'ms)' : ''}` : '';
    const th = p && p.theyHear && Date.now() - p.theyHear.at < 15000 ? (p.theyHear.ok ? '✅' : '❌') : '?';
    lines.push(`• ${rt.p.n || 'เพื่อน'}: ${mode} · เขาไมค์${rt.p.mic === 1 ? 'เปิด' : 'ปิด'} · เขาได้ยินฉัน ${V.mic ? th : '(ฉันปิดไมค์)'} · รับ ${relay ? (Date.now() - (p.relayRxAt || 0) < 1500 ? 'มีเสียง' : 'เงียบ') : rx + 'KB/s'} · ส่ง ${relay ? (Date.now() - (V.relaySentAt || 0) < 1500 && relayTargetsInfo(p) ? 'กำลังส่ง' : relayTargetsInfo(p) ? '⚠️ ส่งไม่ออก' + (V.relayErr ? ' (' + V.relayErr.slice(0, 40) + ')' : '') : 'ไม่ได้ส่ง') : tx + 'KB/s'}${lossTxt} · ${voiceStatus(rt)}`);
    if (rt.p.cam === 1 && p) {
      const vi = p.vinfo;
      const bl = G.blackSt && G.blackSt.get(rt.key);
      lines.push(`   📷 กล้องเขา: ${p.state !== 'connected' ? 'ต่อตรงไม่ได้ → ไม่มีภาพ (เซิร์ฟเวอร์สำรองส่งได้แค่เสียง)' : !vi || !vi.w ? 'ยังไม่มีภาพมาถึง' : `${vi.w}x${vi.h} · ${vi.fps}fps · ${vi.codec || '?'}${vi.dec ? ' (' + vi.dec + ')' : ''}${bl && bl.black ? ' · ⚫ ภาพดำ' : ''}`}`);
    }
  }
  return lines;
}
function relayTargetsInfo(p) { const V = G.voice; return !!(V && V.audioTrack && V.mic && !V.deaf && p.allowed); }
function openVoiceDiag() {
  openModal((card) => {
    card.append(el('h2', null, '🩺 ตรวจเสียง'));
    card.append(el('p', 'sub', 'ดูว่าเครื่องนี้พูด/ได้ยินใครได้บ้าง ถ้ายังมีปัญหา กด "คัดลอกผลตรวจ" แล้วส่งให้คนช่วยดู'));
    const pre = el('pre', 'diag'); card.append(pre);
    const tips = el('div', 'opt');
    tips.append(el('span', null, 'วิธีแก้ที่เจอบ่อย'));
    for (const t of ['เปิดผ่าน Safari/Chrome ไม่ใช่ในแอป IG/Messenger/LINE (กด ⋯ → เปิดในเบราว์เซอร์)', 'ปิดแอปอื่นที่ใช้ไมค์อยู่ เช่น Discord, LINE call, โทรศัพท์ แล้วกดเปิดไมค์ใหม่', 'iPhone: ตั้งค่า → Safari → ไมโครโฟน → อนุญาต · และแตะหน้าจอ 1 ครั้งหลังเข้าห้อง', 'อยู่ห้องเดียวกัน และในห้องรวมต้องอยู่ในวงไมค์ของกันและกัน', 'ยังไม่ได้ → ให้คนนั้นรีเฟรชหน้าเว็บ'])
      tips.append(el('p', 'tip', '• ' + t));
    card.append(tips);
    const foot = el('div', 'foot');
    const cp = el('button', 'pbtn', '📋 คัดลอกผลตรวจ');
    cp.onclick = async () => { try { await navigator.clipboard.writeText(voiceDiag().join('\n')); toast('คัดลอกแล้ว'); } catch { toast('คัดลอกไม่ได้ แคปหน้าจอแทนได้'); } };
    const close = el('button', 'pbtn pink', 'ปิด'); close.onclick = () => { clearInterval(G.diagTimer); closeModal(); };
    foot.append(cp, close); card.append(foot);
    const paint = () => { if ($('#modal').classList.contains('hidden')) return clearInterval(G.diagTimer); pre.textContent = voiceDiag().join('\n'); };
    clearInterval(G.diagTimer); setTimeout(() => { G.diagTimer = setInterval(paint, 1000); paint(); }, 0);
  });
}
// เปิดได้จาก: พิมพ์ "ตรวจเสียง"/"diag" ในแชต · ปุ่มในหน้า ⚙️ · ปุ่มในรายชื่อคน
$('#diagBtn').onclick = () => { $('#people').classList.add('hidden'); openVoiceDiag(); };


// ================================================= รายชื่อห้องด้านข้าง (แบบช่องเสียง) ====
// แต่ละห้อง = ช่องเสียงหนึ่งช่อง · แตะชื่อห้องเพื่อเดินไป · แตะชื่อคนเพื่อเดินไปหา · ขอบเขียว = กำลังพูด
const ROOM_ORDER = ['shrine', 'cinema', 'hall', 'meet', 'garden', 'pub', 'karaoke', 'concert', 'mountain', 'beach'];
const ROOM_SPOTS = {
  shrine: [240, -40], cinema: [-40, 130], concert: [-146, 640], hall: [256, 250], meet: [230, 420],
  garden: [408, 420], pub: [440, 660], karaoke: [228, 757], mountain: [636, 300], beach: [580, 472],
};
function roomTarget(z) {
  const [cx, cy] = ROOM_SPOTS[z];
  const offs = [[0, 0], [16, 0], [-16, 0], [0, 16], [0, -16], [24, 24], [-24, 24], [24, -24], [-24, -24], [40, 0], [-40, 0], [0, 40], [0, -40], [48, 32], [-48, 32]];
  for (const [dx, dy] of offs) {
    const x = cx + dx, y = cy + dy;
    if (zoneAt(x, y) !== z) continue;
    if (findPath(G.grid, G.me.x, G.me.y, x, y)) return [x, y];
  }
  return null;
}
function goToRoom(z) {
  if (zoneAt(G.me.x, G.me.y) === z) { toast(`${ZONES[z].icon} คุณอยู่ใน${zoneName(z)}แล้ว`); return; }
  const t = roomTarget(z);
  if (!t) { toast('ไปห้องนั้นไม่ได้ตอนนี้'); return; }
  walkTo(t[0], t[1]);
  toast(`🚶 กำลังเดินไป${zoneName(z)}`, 1800);
  if (isMobile()) setRoomsOpen(false);
}
let roomsOpen = lsGet('pixel.rooms', null);
if (typeof roomsOpen !== 'boolean') roomsOpen = !isMobile() && window.innerWidth >= 900;
function setRoomsOpen(v) {
  roomsOpen = v; lsSet('pixel.rooms', v);
  $('#rooms').classList.toggle('hidden', !v);
  $('#roomsTab').classList.toggle('hidden', v);
  G.roomsSig = '';
  if (v) renderRooms();
}
$('#roomsTab').onclick = () => setRoomsOpen(true);
$('#roomsClose').onclick = () => setRoomsOpen(false);
function roomMembers() {
  const by = Object.fromEntries(ROOM_ORDER.map((z) => [z, []]));
  const V = G.voice;
  by[zoneAt(G.me.x, G.me.y)].push({ key: G.net && G.net.myKey, me: true, n: G.me.nick, l: G.me.look, mic: !!(V && V.mic), deaf: !!(V && V.deaf) });
  for (const rt of G.others.values()) {
    if (!Number.isFinite(rt.p.x)) continue;
    const z = zoneAt(rt.p.x, rt.p.y);
    if (by[z]) by[z].push({ key: rt.key, rt, n: rt.p.n, l: rt.p.l, mic: rt.p.mic === 1, deaf: rt.p.hp === 1 });
  }
  return by;
}
function renderRooms() {
  if (!G.joined || !roomsOpen) return;
  const by = roomMembers();
  const here = zoneAt(G.me.x, G.me.y);
  const inCall = !!G.voice;
  const sig = JSON.stringify([here, inCall, !!G.isAdmin, G.roomNames || {}, ROOM_ORDER.map((z) => by[z].map((m) => [m.key, m.n, m.l, m.mic, m.deaf, m.me ? !!(G.voice && G.voice.screenTrack) : m.rt && m.rt.p.scr]))]);
  const list = $('#roomsList');
  if (sig !== G.roomsSig) {
    G.roomsSig = sig;
    list.innerHTML = '';
    for (const z of ROOM_ORDER) {
      const b = document.createElement('button');
      b.className = 'rm' + (z === here ? ' here' : '');
      const spk = document.createElement('span'); spk.className = 'spk'; spk.textContent = '🔊';
      const n = document.createElement('span'); n.className = 'n'; n.textContent = `${ZONES[z].icon} ${zoneName(z)}`;
      b.append(spk, n);
      if (by[z].length) { const c = document.createElement('span'); c.className = 'c'; c.textContent = by[z].length; b.append(c); }
      if (G.isAdmin) {
        const ed = document.createElement('span'); ed.className = 'ed'; ed.textContent = '✏️'; ed.title = 'ตั้งชื่อห้อง (แอดมิน)';
        ed.onclick = (e) => {
          e.stopPropagation();
          const v = prompt(`ตั้งชื่อ ${ZONES[z].icon} ${zoneName(z)}\n(เว้นว่าง = กลับไปใช้ชื่อเดิม "${ZONES[z].name}")`, (G.roomNames && G.roomNames[z]) || '');
          if (v === null) return;
          G.net.admin('rename', lsGet('pixel.admin', '') || '', { z, n: v.trim().slice(0, 40) });
        };
        b.append(ed);
      }
      b.onclick = () => goToRoom(z);
      list.append(b);
      for (const m of by[z]) {
        const row = document.createElement('div'); row.className = 'mem'; row.dataset.key = m.key || '';
        const cv = mkCanvas(22, 36);
        cv.getContext('2d').drawImage(charSprite(cleanLook(m.l), 'down', 0, 'stand', false), 0, 0);
        const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = (m.n || 'เพื่อน') + (m.me ? ' (คุณ)' : '');
        const mi = document.createElement('span'); mi.className = 'mi';
        const live = m.me ? !!(G.voice && G.voice.screenTrack) : m.rt && m.rt.p.scr === 1;
        if (inCall && (m.deaf || !m.mic)) { const ic = (k, t) => { const im = new Image(); im.src = statusIcon(k).toDataURL(); im.title = t; return im; }; mi.append(ic('mic', 'ปิดไมค์')); if (m.deaf) mi.append(ic('hp', 'ปิดหูฟัง')); }
        if (live) { const lv = document.createElement('span'); lv.className = 'live'; lv.textContent = 'LIVE'; lv.title = 'กำลังแชร์จอ — แตะเพื่อดู'; lv.onclick = (e) => { e.stopPropagation(); if (m.me) watchStream('me'); else watchStream(m.key); }; row.append(cv, nm, lv, mi); }
        else row.append(cv, nm, mi);
        if (m.rt) row.onclick = () => { walkTo(m.rt.x + 14, m.rt.y + 4); if (isMobile()) setRoomsOpen(false); };
        list.append(row);
      }
    }
  }
  // ขอบเขียวรอบตัวคนที่กำลังพูด (อัปเดตถี่โดยไม่ต้องสร้างรายการใหม่)
  const V = G.voice;
  for (const row of list.querySelectorAll('.mem')) {
    const k = row.dataset.key;
    row.classList.toggle('talk', !!(V && k && V.speaking(k)));
  }
}
setInterval(() => {
  if (!G.joined) return;
  const tabHidden = $('#roomsTab').classList.contains('hidden'), panelHidden = $('#rooms').classList.contains('hidden');
  if (tabHidden && panelHidden) setRoomsOpen(roomsOpen); // ครั้งแรกหลังเข้าห้อง
  // วางไว้ใต้ชิปด้านบนซ้ายเสมอ (ชิปสูงไม่เท่ากันในแต่ละจอ)
  const top = Math.round($('.top-left').getBoundingClientRect().bottom + 8) + 'px';
  for (const el of [$('#rooms'), $('#roomsTab')]) if (el.style.top !== top) el.style.top = top;
  const mh = `calc(100dvh - ${top} - 110px - var(--safe-b))`;
  if ($('#rooms').style.maxHeight !== mh) $('#rooms').style.maxHeight = mh;
  renderRooms();
}, 250);
