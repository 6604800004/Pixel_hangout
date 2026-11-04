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
const MIC_R_MIN = 60, MIC_R_MAX = 260, MIC_R_DEFAULT = 130, MIC_HYST = 20;
const MIC_COLORS = ['#3fd07a', '#ff8fab', '#7d9cf0', '#ffe07a', '#b48cf0', '#6cc6d9', '#ffb86b', '#ffffff', '#e8505b'];
G.micSet = Object.assign({ r: MIC_R_DEFAULT, c: 0 }, lsGet('pixel.mic', {}));
G.micSet.r = clamp(Number(G.micSet.r) || MIC_R_DEFAULT, MIC_R_MIN, MIC_R_MAX);
if (!(G.micSet.c >= 0 && G.micSet.c < MIC_COLORS.length)) G.micSet.c = 0;
G.audible = new Set(); G.sendTo = new Set();
const ZONE_TIPS = {
  hall: 'ได้ยินเฉพาะคนที่อยู่ในรัศมีไมค์',
  meet: 'ห้องส่วนตัว — ได้ยินทุกคนในห้อง คนข้างนอกไม่ได้ยิน',
  garden: 'ได้ยินทุกคนในสวน',
};
const peerRange = (p) => clamp(Number(p.mr) || MIC_R_DEFAULT, MIC_R_MIN, MIC_R_MAX);
const peerRingColor = (p) => MIC_COLORS[Number.isInteger(p.mc) && p.mc >= 0 && p.mc < MIC_COLORS.length ? p.mc : 0];
function setMic(patch) {
  Object.assign(G.micSet, patch);
  G.micSet.r = clamp(Math.round(G.micSet.r), MIC_R_MIN, MIC_R_MAX);
  lsSet('pixel.mic', G.micSet);
  pres({ mr: G.micSet.r, mc: G.micSet.c });
}
function updateZones() {
  if (!G.joined) return;
  const dock = $('#dock');
  G.dockBottom = isMobile() && [...dock.children].some((c) => !c.classList.contains('hidden') && !c.classList.contains('big')) ? Math.min(dock.getBoundingClientRect().bottom, G.view.ch * 0.6) : 0;
  const z = zoneAt(G.me.x, G.me.y);
  const hear = new Set(), send = new Set();
  for (const rt of G.others.values()) {
    if (!Number.isFinite(rt.p.x) || zoneAt(rt.p.x, rt.p.y) !== z) continue;
    if (z !== 'hall') { hear.add(rt.key); send.add(rt.key); if (G.voice) G.voice.setVolume(rt.key, 1); continue; }
    const d = Math.hypot(rt.x - G.me.x, rt.y - G.me.y);
    const theirR = peerRange(rt.p), myR = G.micSet.r;
    if (d < myR + (G.sendTo.has(rt.key) ? MIC_HYST : 0)) send.add(rt.key);
    if (d < theirR + (G.audible.has(rt.key) ? MIC_HYST : 0)) {
      hear.add(rt.key);
      if (G.voice) G.voice.setVolume(rt.key, clamp(1 - (d - theirR * 0.55) / (theirR * 0.45 + MIC_HYST), 0.2, 1));
    }
  }
  G.audible = hear; G.sendTo = send;
  if (z !== G.zone) {
    G.zone = z;
    toast(`${ZONES[z].icon} ${ZONES[z].name}` + (G.voice ? ' — ' + ZONE_TIPS[z] : ''), 3200);
  }
  const chip = $('#zoneChip');
  const n = othersInZone(z).size + 1;
  const label = `${ZONES[z].icon} ${ZONES[z].name} · ${G.voice && z === 'hall' ? `ได้ยิน ${hear.size} คน` : `${n} คน`}`;
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
    if (!Number.isFinite(rt.p.x) || zoneAt(rt.p.x, rt.p.y) !== 'hall' || !G.voice.speaking(rt.key)) continue;
    ring(b, rt.x, rt.y, peerRange(rt.p), peerRingColor(rt.p), 0.35, t);
  }
  const editing = G.voicePanelOpen || !$('#micPop').classList.contains('hidden');
  if (G.voice.mic || editing) ring(b, G.me.x, G.me.y, G.micSet.r, MIC_COLORS[G.micSet.c], editing ? 0.95 : 0.7, t);
}

// วาดป้ายชื่อห้องที่ประตู (บนจอ)
function drawDoorLabels(c, camX, camY, scale) {
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '500 11px Mitr, sans-serif';
  for (const d of DOORS) {
    const Z = ZONES[d.zone];
    const sx = (d.x + d.w / 2 - camX) * scale, sy = (LOWER_Y - 16 - camY) * scale;
    const label = `${Z.icon} ${Z.name}`;
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
    for (let i = LAYOUT_V2_FROM; i < DEFAULT_LAYOUT.length; i++) {
      const id = 'def' + i;
      if (G.furnDocs.some((d) => d.id === id)) continue;
      const d = DEFAULT_LAYOUT[i];
      try { await G.net.set('furniture', id, { t: d.t, x: d.x, y: d.y, v: d.v || 0, f: d.f || 0 }); } catch { return; }
    }
    try { await G.net.set('settings', 'layout', { v: LAYOUT_VERSION }); } catch {}
  })();
}

// ---------------------------------------------------------------- เพลง ----
const spConnected = () => !!(G.net.spotifyClientId && lsGet('pixel.spotify', null));
// เชื่อม Spotify แล้ว = ใช้เพลงที่เปิดอยู่จริงเท่านั้น (อัตโนมัติ) · ยังไม่เชื่อม = ใช้ที่พิมพ์เอง
function currentMusic() { return spConnected() ? G.music.sp || null : G.music.manual || null; }
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
  return typeof u === 'string' && /^https:\/\/open\.spotify\.com\/[\w/?=&.-]+$/.test(u) ? u : '';
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
    box.append(el('b', null, `${now.s === 'sp' ? '🟢 Spotify' : '✍️ พิมพ์เอง'} · ${musicLabel(now)}`));
    card.append(box);
  }
  // ---- Spotify: ดึงเพลงที่กำลังเปิดอยู่ให้อัตโนมัติ ----
  const sp = el('div', 'opt'); sp.style.marginTop = '14px';
  sp.append(el('span', null, '🟢 ดึงจาก Spotify อัตโนมัติ'));
  const cid = G.net.spotifyClientId;
  const connected = spConnected();
  if (!cid) {
    sp.append(el('p', 'tip', 'ยังเปิดใช้ไม่ได้: เจ้าของห้องต้องตั้งค่า Spotify ครั้งเดียวก่อน (ใส่ SPOTIFY_CLIENT_ID ใน Render ตามวิธีใน README)'));
  } else if (connected) {
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
  man.append(el('span', null, cid ? 'หรือพิมพ์ชื่อเพลงเอง' : 'ระหว่างนี้พิมพ์ชื่อเพลงเองได้'));
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
const SCREEN_TYPES = new Set(['tv', 'bigScreen']);
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
      events: { onReady: () => { YT.ready = true; res(); }, onStateChange: onYTState },
    });
  });
}
function ytCall(fn) { YT.suppressUntil = Date.now() + 1500; try { fn(); } catch {} }
// คนกด เล่น/หยุด/เลื่อน บนตัว YouTube เอง → แชร์ให้ทุกคน
function onYTState(e) {
  const cur = YT.cur;
  if (!cur || Date.now() < YT.suppressUntil) return;
  const doc = G.screens.get(cur.id);
  if (!doc) return;
  const S = window.YT.PlayerState;
  const pos = YT.player.getCurrentTime();
  if (e.data === S.PAUSED && doc.playing) shareScreen(cur.id, { ...doc, playing: false, pos, ts: ytNow() });
  else if (e.data === S.PLAYING && (!doc.playing || Math.abs(pos - screenExpected(doc)) > 3)) shareScreen(cur.id, { ...doc, playing: true, pos, ts: ytNow() });
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
    if (YT.cur) { YT.cur = null; if (YT.ready) ytCall(() => YT.player.pauseVideo()); }
    panel.classList.add('hidden');
    return;
  }
  const key = act.doc.v + ':' + act.doc.ts0;
  if (YT.hiddenKey === key) { panel.classList.add('hidden'); if (YT.ready) ytCall(() => YT.player.pauseVideo()); YT.cur = null; return; }
  panel.classList.remove('hidden');
  const where = ZONES[zoneAt(act.it.x, act.it.y + 6)];
  $('#ytTitle').textContent = `📺 ${act.doc.title || 'YouTube'} · ${where.name}`;
  const expected = screenExpected(act.doc);
  if (!YT.player) { YT.cur = { id: act.id, v: act.doc.v }; await ensurePlayer(act.doc); }
  if (!YT.ready) return;
  if (!YT.cur || YT.cur.v !== act.doc.v || YT.cur.id !== act.id) {
    YT.cur = { id: act.id, v: act.doc.v };
    ytCall(() => (act.doc.playing ? YT.player.loadVideoById({ videoId: act.doc.v, startSeconds: expected }) : YT.player.cueVideoById({ videoId: act.doc.v, startSeconds: expected })));
    return;
  }
  const S = window.YT.PlayerState;
  const st = YT.player.getPlayerState();
  const pos = YT.player.getCurrentTime();
  if (Math.abs(pos - expected) > 2.5 && st !== S.BUFFERING) ytCall(() => YT.player.seekTo(expected, true));
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
$('#ytBig').onclick = () => $('#ytPanel').classList.toggle('big');
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
    card.append(el('h2', null, `📺 ${FURN[it.t].label}: ดู YouTube ด้วยกัน`));
    card.append(el('p', 'sub', `ทุกคนที่อยู่ใน${ZONES[zoneAt(it.x, it.y + 6)].name}จะเห็นคลิปเดียวกันและเล่นพร้อมกัน ใครกด เล่น/หยุด/เลื่อน ทุกคนก็จะตามไปด้วย`));
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
    const play = el('button', 'pbtn pink', '▶ เล่นบนจอ');
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
function drawScreenThumb(c, it, sx, sy) {
  // มีคนแชร์จออยู่ในห้องเดียวกัน → โชว์ภาพจอสดบนทีวี/จอนำเสนอ
  const live = zoneAt(it.x, it.y + 6) === G.zone && shareSources()[0];
  if (live) {
    const v = live.el;
    const r = it.t === 'tv' ? [sx + 4, sy + 1, 28, 15] : [sx + 3, sy + 3, 60, 28];
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
  const r = it.t === 'tv' ? [sx + 4, sy + 1, 28, 15] : [sx + 3, sy + 3, 60, 28];
  c.fillStyle = '#000'; c.fillRect(...r);
  if (e.ready) { const prev = c.imageSmoothingEnabled; c.imageSmoothingEnabled = true; c.drawImage(e.img, ...r); c.imageSmoothingEnabled = prev; }
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
  $('#scrTitle').textContent = cur.me ? '🖥️ คุณกำลังแชร์จอ (คนในห้องนี้เห็น)' : `🖥️ ${cur.name} กำลังแชร์จอ`;
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
$('#scrVideo').ondblclick = () => $('#scrPanel').classList.toggle('big');

// ---------- แผงรัศมีไมค์แบบเล็ก (แตะป้ายห้อง) — เห็นวงรอบตัวละครระหว่างปรับ ----------
function micRangeName(r) { return r <= 90 ? 'กระซิบ' : r <= 150 ? 'ปกติ' : r <= 210 ? 'ดัง' : 'ตะโกน'; }
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
  const paint = () => (lab.textContent = `ระยะ: ${micRangeName(G.micSet.r)} (${G.micSet.r}) — ${G.zone === 'hall' ? 'ใช้อยู่ตอนนี้' : 'มีผลเฉพาะในห้องรวม'}`);
  const r = el('input'); r.type = 'range'; r.min = String(MIC_R_MIN); r.max = String(MIC_R_MAX); r.step = '5'; r.value = String(G.micSet.r);
  r.style.accentColor = MIC_COLORS[G.micSet.c];
  r.oninput = () => { setMic({ r: Number(r.value) }); paint(); };
  paint();
  body.append(row, r, lab, el('p', 'tip', 'เสียงคุณไปถึงเฉพาะคนในวงนี้ · ห้องประชุมและสวนได้ยินทั้งห้องเสมอ'));
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
if (location.hash === '#debug') window.__pixel = { G, walkTo, openBoard, zoneAt, openScreenModal, YT };
