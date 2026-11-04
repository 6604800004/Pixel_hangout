// ============================================================================
// extras.js — โซนห้อง/ไมค์แยกโซน, กระดานแนบรูป, เพลงที่กำลังฟัง (Spotify), อัปเดตแผนผังห้อง
// ============================================================================

// ---------------------------------------------------------------- โซน ----
function othersInZone(z) {
  const keys = new Set();
  for (const rt of G.others.values()) if (Number.isFinite(rt.p.x) && zoneAt(rt.p.x, rt.p.y) === z) keys.add(rt.key);
  return keys;
}
function updateZones() {
  if (!G.joined) return;
  const z = zoneAt(G.me.x, G.me.y);
  const same = othersInZone(z);
  if (z !== G.zone) {
    G.zone = z;
    const Z = ZONES[z];
    toast(`${Z.icon} ${Z.name}` + (G.voice ? ' — ได้ยินเสียงเฉพาะคนในห้องนี้' : ''));
  }
  const chip = $('#zoneChip');
  const label = `${ZONES[z].icon} ${ZONES[z].name} · ${same.size + 1}`;
  if (chip.textContent !== label) chip.textContent = label;
  if (G.voice) G.voice.setAudience(same);
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
    c.fillStyle = '#fff7ec'; c.fillText(label, sx, sy + 0.5);
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
function currentMusic() { return G.music.sp || G.music.manual || null; }
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
  // ---- Spotify ----
  const sp = el('div', 'opt'); sp.style.marginTop = '14px';
  sp.append(el('span', null, 'เชื่อม Spotify (อัปเดตเองอัตโนมัติ)'));
  const cid = G.net.spotifyClientId;
  if (!cid) {
    sp.append(el('p', 'tip', 'เจ้าของห้องยังไม่ได้ตั้งค่า Spotify — ใส่ SPOTIFY_CLIENT_ID ใน Render (ดูวิธีใน README) ระหว่างนี้พิมพ์ชื่อเพลงเองด้านล่างได้'));
  } else if (lsGet('pixel.spotify', null)) {
    const row = el('div', 'vbtns');
    row.append(el('span', 'tip', G.music.sp ? 'เชื่อมแล้ว ✅' : 'เชื่อมแล้ว ✅ (ตอนนี้ยังไม่ได้เปิดเพลง)'));
    const off = el('button', 'pbtn sm', 'เลิกเชื่อม');
    off.onclick = () => { lsSet('pixel.spotify', null); G.music.sp = null; pushMusic(); };
    row.append(off); sp.append(row);
  } else {
    const b = el('button', 'pbtn', '🟢 เชื่อม Spotify');
    b.style.background = '#1db954'; b.style.color = '#fff';
    b.onclick = () => spLogin();
    sp.append(b);
    sp.append(el('p', 'tip', 'ต้องเป็นบัญชี Spotify ที่เจ้าของห้องเพิ่มไว้ใน Spotify Developer Dashboard แล้ว'));
  }
  card.append(sp);
  // ---- พิมพ์เอง ----
  const man = el('label', 'field opt'); man.style.marginTop = '14px';
  man.append(el('span', null, 'หรือพิมพ์เอง / วางลิงก์เพลง Spotify'));
  const inp = el('input'); inp.maxLength = 90; inp.placeholder = 'เช่น ทางของฝุ่น – Atom ชนกันต์';
  const cur = G.music.manual;
  inp.value = cur ? (cur.u && !cur.a && cur.t === 'เพลงจาก Spotify' ? cur.u : musicLabel(cur).replace(/…$/, '')) : '';
  man.append(inp); card.append(man);
  const foot = el('div', 'foot');
  const clear = el('button', 'pbtn', 'ล้าง');
  clear.onclick = () => { G.music.manual = null; lsSet('pixel.music', null); pushMusic(); };
  const close = el('button', 'pbtn', 'ปิด'); close.onclick = closeModal;
  const save = el('button', 'pbtn pink', 'บันทึก');
  save.onclick = async () => {
    const v = inp.value.trim();
    if (!v) { clear.click(); return; }
    const url = safeSpotifyUrl(v.split('?')[0]);
    let m;
    if (url) {
      m = { t: 'เพลงจาก Spotify', a: '', u: url, s: 'm' };
      try {
        const r = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(url));
        if (r.ok) { const j = await r.json(); if (j.title) m.t = String(j.title).slice(0, 60); }
      } catch {}
    } else {
      const [t, a] = v.split(/\s+[–-]\s+/);
      m = { t: (t || v).slice(0, 60), a: (a || '').slice(0, 60), u: '', s: 'm' };
    }
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
    toast('เชื่อม Spotify แล้ว 🎵', 3500);
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
      if (item && j.is_playing) m = { t: String(item.name || '').slice(0, 60), a: (item.artists || []).map((x) => x.name).join(', ').slice(0, 60) || (item.show && item.show.name) || '', u: safeSpotifyUrl(item.external_urls && item.external_urls.spotify), s: 'sp' };
    }
    const prev = JSON.stringify(G.music.sp), next = JSON.stringify(m);
    if (prev !== next) { G.music.sp = m; pushMusic(); }
  } catch { spBackoff = Date.now() + 60000; }
}
setInterval(spPoll, 20000);

// สำหรับทดสอบ: เปิดด้วย #debug
if (location.hash === '#debug') window.__pixel = { G, walkTo, openBoard, zoneAt };
