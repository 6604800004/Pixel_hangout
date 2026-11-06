// Pixel Hangout — เซิร์ฟเวอร์ตัวเดียวจบ (เวอร์ชันมีเสียง/กล้อง)
//  - เสิร์ฟหน้าเว็บจาก public/
//  - WebSocket /ws: ส่งต่อ "สถานะ" ของแต่ละคน (ตำแหน่ง ชุด แชตล่าสุด),
//    เก็บของที่ต้องจำ (เฟอร์นิเจอร์ โต๊ะ แชต ลิงก์) และส่งต่อสัญญาณ WebRTC
//  - เสียง/วิดีโอวิ่งตรงระหว่างเบราว์เซอร์ ไม่ผ่านเซิร์ฟเวอร์
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 3000;
const MAX_USERS = Number(process.env.MAX_USERS) || 8;
const ROOM_NAME = process.env.ROOM_NAME || 'Pixel Hangout';
const ROOM_PASSWORD = process.env.ROOM_PASSWORD || '';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'room.json');
const PUBLIC = path.join(__dirname, 'public');
// เวอร์ชันของหน้าเว็บ: ถ้า deploy ใหม่ เครื่องที่เปิดค้างไว้จะรู้และขึ้นปุ่มให้โหลดใหม่
let BUILD = 'dev';
try { BUILD = crypto.createHash('sha1').update(fs.readFileSync(path.join(PUBLIC, 'index.html'))).digest('hex').slice(0, 10); } catch {}
const COLS = ['furniture', 'desks', 'chat', 'settings', 'board', 'screens'];
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
// แอดมิน: คนที่รู้รหัสนี้ใช้คำสั่งในแชตได้ (admin <รหัส> แล้ว kick all / kick ชื่อ)
const ADMIN_KEY = process.env.ADMIN_KEY || '';
// Last.fm: ดึงเพลงที่กำลังฟังแบบไม่ต้องมี Spotify Premium (ผู้ใช้เชื่อม Spotify เข้ากับ Last.fm ฟรี)
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || '';
const npCache = new Map(); // user -> { at, body }
const LASTFM_BASE = process.env.LASTFM_API_BASE || 'https://ws.audioscrobbler.com/2.0/';
const fmtWait = (ms) => ms >= 3600000 ? `${Math.ceil(ms / 3600000)} ชม.` : ms >= 60000 ? `${Math.ceil(ms / 60000)} นาที` : `${Math.ceil(ms / 1000)} วินาที`;
const kickedUntil = new Map(); // uid -> เวลาที่กลับเข้าได้
// กระดานแนบรูป: เก็บไว้ 24 ชม. แล้วลบเอง
const BOARD_DIR = path.join(DATA_DIR, 'board');
const BOARD_MAX = Number(process.env.BOARD_MAX) || 20;      // รูปสูงสุดต่อกระดาน
const BOARD_TTL = 24 * 60 * 60 * 1000;
const BOARD_MAX_BYTES = 3 * 1024 * 1024;

const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
if (process.env.TURN_URL) {
  ICE.push({ urls: process.env.TURN_URL.split(',').map((s) => s.trim()), username: process.env.TURN_USER || '', credential: process.env.TURN_PASS || '' });
}
// TURN ฟรีจาก Metered (สมัครฟรี 20GB/เดือน): ช่วยให้คนที่ใช้เน็ตมือถือ/เน็ตบริษัทได้ยินเสียงกัน
// ตั้ง METERED_APP (ชื่อแอป เช่น pixelhangout) และ METERED_API_KEY ใน Render
let meteredIce = [];
async function refreshMetered() {
  const app = process.env.METERED_APP, key = process.env.METERED_API_KEY;
  if (!app || !key) return;
  try {
    const host = app.includes('.') ? app : `${app}.metered.live`;
    const r = await fetch(`https://${host}/api/v1/turn/credentials?apiKey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    if (Array.isArray(j) && j.length) { meteredIce = j.filter((x) => x && x.urls); console.log(`TURN: ได้ ${meteredIce.length} เซิร์ฟเวอร์จาก Metered`); }
    else console.warn('TURN: Metered ตอบกลับไม่ถูกต้อง', JSON.stringify(j).slice(0, 200));
  } catch (e) { console.warn('TURN: ดึงจาก Metered ไม่ได้', e.message); }
}
refreshMetered();
setInterval(refreshMetered, 6 * 60 * 60 * 1000);
const iceServers = () => [...ICE, ...meteredIce];
const hasTurn = () => meteredIce.length > 0 || !!process.env.TURN_URL;

// ---------- ข้อมูลที่ต้องจำ ----------
const store = Object.fromEntries(COLS.map((c) => [c, {}]));
try {
  const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  for (const c of COLS) if (saved[c] && typeof saved[c] === 'object') store[c] = saved[c];
} catch { /* ห้องใหม่ */ }
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdir(DATA_DIR, { recursive: true }, () => fs.writeFile(DATA_FILE, JSON.stringify(store), (e) => e && console.warn('save failed', e.message)));
  }, 500);
}
const list = (c) => Object.entries(store[c]).map(([id, d]) => ({ ...d, id }));

// ---------- หน้าเว็บ ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/config') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ app: 'pixel-hangout', roomName: ROOM_NAME, needPassword: !!ROOM_PASSWORD, maxUsers: MAX_USERS, online: peers.size, spotifyClientId: SPOTIFY_CLIENT_ID, lastfm: !!LASTFM_API_KEY, boardMax: BOARD_MAX, boardTtl: BOARD_TTL }));
  }
  // ---- Last.fm: เพลงที่ผู้ใช้กำลังฟังอยู่ตอนนี้ ----
  if (url.pathname === '/api/np') {
    const user = String(url.searchParams.get('u') || '');
    const out = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
    if (!LASTFM_API_KEY) return out(503, { error: 'no-key' });
    if (!/^[A-Za-z][\w-]{1,30}$/.test(user)) return out(400, { error: 'bad-user' });
    const hit = npCache.get(user.toLowerCase());
    if (hit && Date.now() - hit.at < 8000) return out(hit.code, hit.body);
    const api = `${LASTFM_BASE}?method=user.getrecenttracks&user=${encodeURIComponent(user)}&limit=1&format=json&api_key=${LASTFM_API_KEY}`;
    fetch(api, { headers: { 'User-Agent': 'PixelHangout/1.0' }, signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((j) => {
        let code = 200, body;
        if (j && j.error) { code = j.error === 6 ? 404 : 502; body = { error: j.error === 6 ? 'not-found' : 'lastfm', message: j.message || '' }; }
        else {
          const tr = j && j.recenttracks && j.recenttracks.track;
          const t = Array.isArray(tr) ? tr[0] : tr;
          const playing = !!(t && t['@attr'] && t['@attr'].nowplaying === 'true');
          body = { ok: true, np: playing ? { t: String(t.name || '').slice(0, 60), a: String((t.artist && (t.artist['#text'] || t.artist.name)) || '').slice(0, 60) } : null };
        }
        npCache.set(user.toLowerCase(), { at: Date.now(), code, body });
        if (npCache.size > 200) npCache.delete(npCache.keys().next().value);
        out(code, body);
      })
      .catch(() => out(502, { error: 'lastfm' }));
    return;
  }
  // ---- อัปโหลดรูปขึ้นกระดาน ----
  const up = url.pathname.match(/^\/api\/board\/([\w.:-]{1,48})$/);
  if (up && req.method === 'POST') {
    const boardId = up[1];
    if (ROOM_PASSWORD && req.headers['x-room-password'] !== ROOM_PASSWORD) { res.writeHead(403); return res.end('{"error":"password"}'); }
    const type = String(req.headers['content-type'] || '');
    if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) { res.writeHead(415); return res.end('{"error":"type"}'); }
    const count = Object.values(store.board).filter((b) => b.b === boardId).length;
    if (count >= BOARD_MAX) { res.writeHead(409); return res.end(JSON.stringify({ error: 'full', max: BOARD_MAX })); }
    const chunks = []; let size = 0, tooBig = false;
    req.on('data', (c) => { size += c.length; if (size > BOARD_MAX_BYTES) { tooBig = true; req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (tooBig) return;
      const id = 'i' + crypto.randomBytes(8).toString('hex');
      const ext = type.split('/')[1].replace('jpeg', 'jpg');
      fs.mkdir(BOARD_DIR, { recursive: true }, () => {
        fs.writeFile(path.join(BOARD_DIR, `${id}.${ext}`), Buffer.concat(chunks), (err) => {
          if (err) { res.writeHead(500); return res.end('{"error":"save"}'); }
          const doc = {
            b: boardId, ext, ts: Date.now(),
            n: String(req.headers['x-name'] ? decodeURIComponent(req.headers['x-name']) : '').slice(0, 24),
            w: Number(req.headers['x-w']) || 0, h: Number(req.headers['x-h']) || 0,
          };
          store.board[id] = doc;
          save();
          broadcast({ t: 'col', col: 'board', id, doc });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id, doc }));
        });
      });
    });
    return;
  }
  const img = url.pathname.match(/^\/board\/(i[0-9a-f]{16})\.(jpg|png|webp|gif)$/);
  if (img) {
    if (!store.board[img[1]]) { res.writeHead(404); return res.end(); }
    return fs.readFile(path.join(BOARD_DIR, `${img[1]}.${img[2]}`), (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': img[2] === 'jpg' ? 'image/jpeg' : 'image/' + img[2], 'Cache-Control': 'public, max-age=86400' });
      res.end(data);
    });
  }
  if (url.pathname === '/health') { res.writeHead(200); return res.end('ok'); }
  const rel = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---------- WebSocket ----------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
const peers = new Map(); // key -> { ws, uid, p }
const send = (ws, m) => ws.readyState === 1 && ws.send(JSON.stringify(m));
function broadcast(m, except) {
  const s = JSON.stringify(m);
  for (const [k, c] of peers) if (k !== except && c.ws.readyState === 1) c.ws.send(s);
}
const MOVE_KEYS = new Set(['x', 'y', 'd', 'm', 't']);
// ไอเท็มพิเศษเฉพาะแอดมิน (ตรงกับ ADMIN_ONLY ใน sprites.js)
const ADMIN_ONLY = { hair: ['rainbow'], top: ['royal'], acc: ['wings'], pet: ['dragon', 'unicorn', 'cloud'] };
const ADMIN_DEF = { hair: 'short', top: 'hoodie', acc: 'none', pet: 'none' };
function adminKeyOk(k) {
  return !!ADMIN_KEY && typeof k === 'string' && k.length === ADMIN_KEY.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(ADMIN_KEY));
}
// ของพิเศษที่แอดมินให้ยืมใช้ (เก็บตาม uid ของเครื่อง) — settings/grants: { uid: { n: ชื่อตอนให้, items: ['dragon', ...] } }
const ADMIN_ITEMS = Object.values(ADMIN_ONLY).flat();
const ITEM_FIELD = Object.fromEntries(Object.entries(ADMIN_ONLY).flatMap(([f, list]) => list.map((it) => [it, f])));
const ITEM_ALIAS = { มังกร: 'dragon', dragon: 'dragon', ยูนิคอร์น: 'unicorn', unicorn: 'unicorn', เมฆ: 'cloud', ก้อนเมฆ: 'cloud', cloud: 'cloud', ผมรุ้ง: 'rainbow', รุ้ง: 'rainbow', rainbow: 'rainbow', ชุดราชา: 'royal', ราชา: 'royal', royal: 'royal', ปีก: 'wings', ปีกนางฟ้า: 'wings', wings: 'wings' };
const ITEM_TH = { dragon: '⭐ มังกร', unicorn: '⭐ ยูนิคอร์น', cloud: '⭐ ก้อนเมฆ', rainbow: '⭐ ผมรุ้ง', royal: '⭐ ชุดราชา', wings: '⭐ ปีกนางฟ้า' };
const grantsOf = (uid) => { const g = store.settings.grants && store.settings.grants[uid]; return g && Array.isArray(g.items) ? g.items : []; };
function stripAdminLook(l, uid) {
  if (!l || typeof l !== 'object') return l;
  const ok = uid ? grantsOf(uid) : [];
  let out = l;
  for (const [f, list] of Object.entries(ADMIN_ONLY)) if (list.includes(l[f]) && !ok.includes(l[f])) { if (out === l) out = { ...l }; out[f] = ADMIN_DEF[f]; }
  return out;
}
const ZONE_IDS = ['hall', 'meet', 'garden', 'karaoke', 'pub', 'shrine', 'cinema'];
const okId = (id) => typeof id === 'string' && /^[\w.:-]{1,48}$/.test(id);

wss.on('connection', (ws) => {
  ws.alive = true;
  ws.on('pong', () => (ws.alive = true));
  let key = null;
  let relayWin = 0, relayCount = 0;
  ws.on('message', (raw, isBinary) => {
    if (isBinary) {
      // เสียงสำรอง: [1][จำนวนผู้รับ]([ยาว][คีย์])...[เสียง] → ส่งต่อให้ผู้รับแต่ละคน [1][ยาว][คีย์ผู้ส่ง][เสียง]
      if (!key || raw.length > 4096 || raw[0] !== 1) return;
      const now = Date.now();
      if (now - relayWin > 1000) { relayWin = now; relayCount = 0; }
      if (++relayCount > 120) return;
      let o = 2; const to = [];
      for (let i = 0; i < raw[1] && o < raw.length; i++) { const l = raw[o++]; to.push(raw.toString('latin1', o, o + l)); o += l; }
      if (o >= raw.length) return;
      const audio = raw.subarray(o);
      const head = Buffer.from([1, key.length]);
      const out = Buffer.concat([head, Buffer.from(key, 'latin1'), audio]);
      for (const k of to) { const c = peers.get(k); if (c && c.ws.readyState === 1 && c.ws.bufferedAmount < 48000) c.ws.send(out, { binary: true }); }
      return;
    }
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    if (!key) {
      if (m.t !== 'hello') return;
      if (ROOM_PASSWORD && m.password !== ROOM_PASSWORD) { send(ws, { t: 'error', message: 'รหัสผ่านห้องไม่ถูกต้อง' }); return ws.close(); }
      const ban = kickedUntil.get(typeof m.uid === 'string' ? m.uid.slice(0, 40) : '');
      if (ban && ban > Date.now()) { send(ws, { t: 'error', kicked: true, message: `คุณถูกเตะออกจากห้อง — กลับเข้าได้อีกใน ${fmtWait(ban - Date.now())}` }); return ws.close(); }
      if (peers.size >= MAX_USERS) { send(ws, { t: 'error', message: `ห้องเต็มแล้ว (สูงสุด ${MAX_USERS} คน)` }); return ws.close(); }
      key = 'k' + crypto.randomBytes(6).toString('hex');
      const uid = typeof m.uid === 'string' ? m.uid.slice(0, 40) : key;
      // คนเดิมเข้ามาซ้ำ (เปิดอีกแท็บ/เน็ตหลุดแล้วต่อใหม่ก่อนตัวเก่าหลุด) → ปิดตัวเก่า ไม่ให้มีชื่อซ้ำในห้อง
      for (const [k, c] of [...peers]) {
        if (c.uid !== uid) continue;
        peers.delete(k);
        broadcast({ t: 'peer-left', key: k });
        try { send(c.ws, { t: 'error', replaced: true, message: 'คุณเปิดห้องนี้อยู่ในแท็บหรือหน้าต่างอื่นแล้ว' }); c.ws.close(); } catch {}
      }
      const p = m.p && typeof m.p === 'object' && JSON.stringify(m.p).length < 4096 ? m.p : {};
      const isAdmin = adminKeyOk(m.ak);
      if (!isAdmin && p.l) p.l = stripAdminLook(p.l, uid);
      peers.set(key, { ws, uid, p, isAdmin });
      send(ws, {
        t: 'welcome', key, ice: iceServers(), turn: hasTurn(), roomName: ROOM_NAME, now: Date.now(), v: BUILD,
        peers: [...peers].filter(([k]) => k !== key).map(([k, c]) => ({ key: k, uid: c.uid, p: c.p })),
        cols: Object.fromEntries(COLS.map((c) => [c, list(c)])),
      });
      broadcast({ t: 'peer', key, uid, p }, key);
      console.log(`+ ${p.n || key} (${peers.size} ออนไลน์)`);
      return;
    }
    const me = peers.get(key);
    switch (m.t) {
      case 'p': {
        if (!m.patch || typeof m.patch !== 'object') break;
        if (m.patch.l && !me.isAdmin) m.patch.l = stripAdminLook(m.patch.l, me.uid);
        const next = { ...me.p };
        for (const [k, v] of Object.entries(m.patch)) { if (v === null) delete next[k]; else next[k] = v; }
        if (JSON.stringify(next).length > 4096) break;
        me.p = next;
        // แค่เดิน → ส่งแบบย่อ (ไม่ส่งข้อมูลทั้งก้อนซ้ำทุก 0.1 วิ) และข้ามเครื่องที่เน็ตช้าจนคิวค้าง เพื่อไม่ให้ดีเลย์สะสม
        const ks = Object.keys(m.patch);
        if (ks.length && ks.every((k) => MOVE_KEYS.has(k))) {
          const s = JSON.stringify({ t: 'mv', k: key, x: next.x, y: next.y, d: next.d, m: next.m, ts: Number.isFinite(next.t) ? next.t : undefined });
          for (const [k, c] of peers) {
            if (k === key || c.ws.readyState !== 1) continue;
            if (next.m && c.ws.bufferedAmount > 24000) continue; // กำลังเดิน: ทิ้งได้ ตำแหน่งถัดไปจะตามมาเอง (ตอนหยุดส่งเสมอ)
            c.ws.send(s);
          }
          break;
        }
        broadcast({ t: 'peer', key, uid: me.uid, p: me.p }, key);
        break;
      }
      case 'set': {
        if (!COLS.includes(m.col) || m.col === 'board' || !okId(m.id) || !m.doc || typeof m.doc !== 'object') break;
        if (m.col === 'settings' && (m.id === 'names' || m.id === 'grants')) break; // ชื่อห้อง/ของพิเศษ: แอดมินเท่านั้น
        if (JSON.stringify(m.doc).length > 8192) break;
        if (!store[m.col][m.id] && Object.keys(store[m.col]).length >= (m.col === 'chat' ? 100000 : 200)) break;
        store[m.col][m.id] = m.doc;
        broadcast({ t: 'col', col: m.col, id: m.id, doc: m.doc }, key);
        if (m.col === 'chat') {
          const ids = Object.entries(store.chat).sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0)).map(([id]) => id);
          for (const id of ids.slice(0, Math.max(0, ids.length - 100))) { delete store.chat[id]; broadcast({ t: 'col', col: 'chat', id, doc: null }); }
        }
        save();
        break;
      }
      case 'del': {
        if (!COLS.includes(m.col) || !okId(m.id) || !store[m.col][m.id]) break;
        if (m.col === 'settings' && (m.id === 'names' || m.id === 'grants')) break;
        if (m.col === 'board') removeImage(m.id);
        else delete store[m.col][m.id];
        broadcast({ t: 'col', col: m.col, id: m.id, doc: null }, key);
        save();
        break;
      }
      case 'board-clear': {
        if (!okId(m.b)) break;
        for (const [id, d] of Object.entries(store.board)) if (d.b === m.b) { removeImage(id); broadcast({ t: 'col', col: 'board', id, doc: null }); }
        save();
        break;
      }
      case 'admin': {
        // คำสั่งแอดมินจากแชต: ตรวจรหัสทุกครั้ง
        const ok = ADMIN_KEY && typeof m.key === 'string' && m.key.length === ADMIN_KEY.length && crypto.timingSafeEqual(Buffer.from(m.key), Buffer.from(ADMIN_KEY));
        if (!ADMIN_KEY) { send(ws, { t: 'sys', message: 'ยังไม่ได้ตั้งรหัสแอดมิน — ใส่ ADMIN_KEY ใน Render → Environment ก่อน' }); break; }
        if (!ok) { send(ws, { t: 'sys', admin: false, message: 'ไม่มีสิทธิ์ใช้คำสั่งนี้ (รหัสแอดมินไม่ถูก)' }); break; }
        me.isAdmin = true;
        if (m.cmd === 'login') { send(ws, { t: 'sys', admin: true, message: 'เป็นแอดมินแล้ว ✅ พิมพ์ help เพื่อดูคำสั่งแอดมิน' }); break; }
        if (m.cmd === 'delchat') {
          // ลบข้อความแชต: ทีละข้อความ (id) หรือทั้งหมด ('all')
          const all = m.arg === 'all';
          const ids = all ? Object.keys(store.chat) : [String(m.arg || '')].filter(okId);
          for (const id of ids) delete store.chat[id];
          // ลบออกจาก "ข้อความล่าสุด" ที่ติดอยู่กับสถานะของแต่ละคนด้วย ไม่งั้นคนที่เข้ามาใหม่จะยังเห็น
          for (const [k, c] of peers) {
            if (!Array.isArray(c.p.say)) continue;
            const kept = all ? [] : c.p.say.filter((x) => !(x && ids.includes(x.i)));
            if (kept.length !== c.p.say.length) { c.p = { ...c.p, say: kept }; broadcast({ t: 'peer', key: k, uid: c.uid, p: c.p }); }
          }
          broadcast({ t: 'chat-del', ids: all ? 'all' : ids });
          if (all) send(ws, { t: 'sys', message: 'ล้างแชตทั้งหมดแล้ว 🧹' });
          save();
          break;
        }
        if (m.cmd === 'rename') {
          const a = m.arg && typeof m.arg === 'object' ? m.arg : {};
          if (!ZONE_IDS.includes(a.z)) break;
          const n = String(a.n || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40);
          const names = { ...(store.settings.names || {}) };
          delete names.id;
          if (n) names[a.z] = n; else delete names[a.z];
          store.settings.names = names;
          broadcast({ t: 'col', col: 'settings', id: 'names', doc: names });
          save();
          break;
        }
        if (m.cmd === 'grant' || m.cmd === 'revoke' || m.cmd === 'grants') {
          const grants = { ...(store.settings.grants || {}) }; delete grants.id;
          if (m.cmd === 'grants') {
            const rows = Object.values(grants).filter((g) => g.items && g.items.length).map((g) => `${g.n || '?'}: ${g.items.map((i) => ITEM_TH[i] || i).join(', ')}`);
            send(ws, { t: 'sys', message: rows.length ? '🎁 ของพิเศษที่ให้ไว้ — ' + rows.join(' · ') : '🎁 ยังไม่ได้ให้ของพิเศษใคร' }); break;
          }
          const a = m.arg && typeof m.arg === 'object' ? m.arg : {};
          const who = String(a.name || '').trim().toLowerCase();
          const itemRaw = String(a.item || '').trim().toLowerCase();
          const all = itemRaw === 'all' || itemRaw === 'ทั้งหมด' || itemRaw === 'ทุกอย่าง';
          const item = ITEM_ALIAS[itemRaw];
          if (!who || (!item && !all)) { send(ws, { t: 'sys', message: 'ใช้: ให้ ชื่อ มังกร · ยึด ชื่อ มังกร (ของ: มังกร ยูนิคอร์น เมฆ ผมรุ้ง ชุดราชา ปีก หรือ ทั้งหมด)' }); break; }
          const others = [...peers].filter(([k]) => k !== key);
          const name = ([, c]) => String(c.p.n || '').trim().toLowerCase();
          let targets = others.filter((e) => name(e) === who);
          if (!targets.length) targets = others.filter((e) => name(e).includes(who));
          // ยึดคืนจากคนที่ออฟไลน์อยู่ก็ได้ (หาจากชื่อที่บันทึกไว้)
          const offline = m.cmd === 'revoke' && !targets.length ? Object.entries(grants).filter(([, g]) => String(g.n || '').toLowerCase().includes(who)).map(([u]) => u) : [];
          if (!targets.length && !offline.length) { send(ws, { t: 'sys', message: `ไม่เจอ "${a.name}" ในห้อง` }); break; }
          if (targets.length > 1 && !others.some((e) => name(e) === who)) { send(ws, { t: 'sys', message: `ชื่อซ้ำกันหลายคน: ${targets.map(([, c]) => c.p.n).join(', ')} — พิมพ์ชื่อให้เต็ม` }); break; }
          const items = all ? ADMIN_ITEMS : [item];
          const uids = [...new Set([...targets.map(([, c]) => c.uid), ...offline])];
          for (const u of uids) {
            const cur = new Set(grantsOf(u));
            for (const it of items) m.cmd === 'grant' ? cur.add(it) : cur.delete(it);
            const tp = targets.find(([, c]) => c.uid === u);
            const n = tp ? tp[1].p.n : (grants[u] && grants[u].n) || '';
            if (cur.size) grants[u] = { n, items: [...cur] }; else delete grants[u];
          }
          store.settings.grants = grants;
          broadcast({ t: 'col', col: 'settings', id: 'grants', doc: grants });
          save();
          const label = all ? 'ของพิเศษทั้งหมด' : ITEM_TH[item];
          for (const [k, c] of targets) {
            if (m.cmd === 'grant') send(c.ws, { t: 'sys', message: `🎁 แอดมินให้คุณใช้ ${label} แล้ว — กด 👕 แต่งตัว เพื่อเลือกใช้` });
            else {
              // ยึดคืน: ถ้ากำลังใช้อยู่ ถอดออกทันที (ทั้งในเครื่องเขาและที่คนอื่นเห็น)
              const fixed = stripAdminLook(c.p.l, c.uid);
              if (fixed !== c.p.l) { c.p = { ...c.p, l: fixed }; broadcast({ t: 'peer', key: k, uid: c.uid, p: c.p }, k); }
              send(c.ws, { t: 'sys', message: `แอดมินยึด ${label} คืนแล้ว`, look: fixed });
            }
          }
          const names = uids.map((u) => (grants[u] && grants[u].n) || (targets.find(([, c]) => c.uid === u) || [, { p: {} }])[1].p.n || '?');
          send(ws, { t: 'sys', message: m.cmd === 'grant' ? `🎁 ให้ ${label} กับ ${names.join(', ')} แล้ว` : `↩️ ยึด ${label} คืนจาก ${names.join(', ')} แล้ว` });
          break;
        }
        if (m.cmd !== 'kick') break;
        const arg = String(m.arg || '').trim().toLowerCase();
        const others = [...peers].filter(([k]) => k !== key);
        let targets;
        if (arg === 'all' || arg === 'ทั้งหมด') targets = others;
        else {
          const name = ([, c]) => String(c.p.n || '').trim().toLowerCase();
          targets = others.filter((e) => name(e) === arg);
          if (!targets.length) targets = others.filter((e) => name(e).includes(arg));
          if (targets.length > 1 && !others.some((e) => name(e) === arg)) {
            send(ws, { t: 'sys', message: `ชื่อซ้ำกันหลายคน: ${targets.map(([, c]) => c.p.n).join(', ')} — พิมพ์ชื่อให้เต็ม` }); break;
          }
        }
        if (!arg || !targets.length) { send(ws, { t: 'sys', message: arg ? `ไม่เจอ "${m.arg}" ในห้อง` : 'พิมพ์ kick all หรือ kick ชื่อ' }); break; }
        // ห้ามกลับเข้า (delay) เฉพาะเมื่อสั่งมา เช่น "หมี kick delay 1m" — ปกติเตะแล้วเข้าใหม่ได้ทันที
        const banMs = Math.min(24 * 3600000, Math.max(0, Number(m.ban) || 0));
        for (const [, c] of targets) {
          if (banMs) kickedUntil.set(c.uid, Date.now() + banMs); else kickedUntil.delete(c.uid);
          send(c.ws, { t: 'error', kicked: true, message: banMs ? `คุณถูกเตะออกจากห้อง — กลับเข้าได้อีกใน ${fmtWait(banMs)}` : 'คุณถูกเตะออกจากห้อง' });
          setTimeout(() => { try { c.ws.close(); } catch {} }, 100);
        }
        const names = targets.map(([, c]) => c.p.n || 'ไม่มีชื่อ');
        send(ws, { t: 'sys', message: `เตะออกแล้ว ${names.length} คน: ${names.join(', ')}` + (banMs ? ` (ห้ามเข้า ${fmtWait(banMs)})` : '') });
        console.log(`! kick by ${me.p.n || key}: ${names.join(', ')}`);
        break;
      }
      case 'poke': {
        // สะกิดเฉพาะคน (ใครก็ใช้ได้) — จำกัด 1 ครั้งต่อ 2 วินาที
        if (Date.now() - (me.lastPoke || 0) < 2000) { send(ws, { t: 'sys', kind: 'info', message: 'ใจเย็นๆ สะกิดถี่เกินไป 😅' }); break; }
        me.lastPoke = Date.now();
        const arg = String(m.name || '').trim().toLowerCase();
        const others = [...peers].filter(([k]) => k !== key);
        if (!arg) { send(ws, { t: 'sys', kind: 'info', message: 'พิมพ์ poke ตามด้วยชื่อ เช่น poke หมี' }); break; }
        const name = ([, c]) => String(c.p.n || '').trim().toLowerCase();
        let targets = arg === 'all' || arg === 'ทั้งหมด' ? others : others.filter((e) => name(e) === arg);
        if (!targets.length) targets = others.filter((e) => name(e).includes(arg));
        if (!targets.length) { send(ws, { t: 'sys', kind: 'info', message: `ไม่เจอ "${m.name}" ในห้อง` }); break; }
        if (targets.length > 1 && arg !== 'all' && arg !== 'ทั้งหมด') { send(ws, { t: 'sys', kind: 'info', message: `ชื่อคล้ายกันหลายคน: ${targets.map(([, c]) => c.p.n).join(', ')} — พิมพ์ชื่อให้เต็ม` }); break; }
        for (const [, c] of targets) send(c.ws, { t: 'poke', from: String(me.p.n || 'เพื่อน').slice(0, 16), fromKey: key });
        send(ws, { t: 'sys', kind: 'info', message: `👉 สะกิด ${targets.map(([, c]) => c.p.n || 'เพื่อน').join(', ')} แล้ว` });
        break;
      }
      case 'signal': {
        const target = peers.get(m.to);
        if (target && m.data) send(target.ws, { t: 'signal', from: key, data: m.data });
        break;
      }
    }
  });
  ws.on('close', () => {
    if (!key) return;
    const me = peers.get(key);
    if (!me || me.ws !== ws) return; // ถูกแทนที่ไปแล้ว
    peers.delete(key);
    broadcast({ t: 'peer-left', key });
    console.log(`- ${(me && me.p.n) || key} (${peers.size} ออนไลน์)`);
  });
});
// ---------- ลบรูปบนกระดานที่เกิน 24 ชม. ----------
function removeImage(id) {
  const d = store.board[id];
  if (!d) return;
  delete store.board[id];
  fs.unlink(path.join(BOARD_DIR, `${id}.${d.ext || 'jpg'}`), () => {});
}
function sweepBoard() {
  const now = Date.now();
  let changed = false;
  for (const [id, d] of Object.entries(store.board)) {
    if (now - (d.ts || 0) > BOARD_TTL || !fs.existsSync(path.join(BOARD_DIR, `${id}.${d.ext || 'jpg'}`))) {
      removeImage(id); broadcast({ t: 'col', col: 'board', id, doc: null }); changed = true;
    }
  }
  if (changed) save();
}
sweepBoard();
setInterval(sweepBoard, 5 * 60 * 1000);

setInterval(() => {
  for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); }
}, 12000); // ตรวจการเชื่อมต่อที่ตายแล้วถี่ขึ้น ไม่ให้มีตัวละครค้างในห้องนาน

server.listen(PORT, () => console.log(`Pixel Hangout พร้อมที่ http://localhost:${PORT}`));
