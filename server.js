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
const COLS = ['furniture', 'desks', 'chat', 'settings', 'board', 'screens'];
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
// กระดานแนบรูป: เก็บไว้ 24 ชม. แล้วลบเอง
const BOARD_DIR = path.join(DATA_DIR, 'board');
const BOARD_MAX = Number(process.env.BOARD_MAX) || 20;      // รูปสูงสุดต่อกระดาน
const BOARD_TTL = 24 * 60 * 60 * 1000;
const BOARD_MAX_BYTES = 3 * 1024 * 1024;

const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
if (process.env.TURN_URL) {
  ICE.push({ urls: process.env.TURN_URL.split(',').map((s) => s.trim()), username: process.env.TURN_USER || '', credential: process.env.TURN_PASS || '' });
}

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
    return res.end(JSON.stringify({ app: 'pixel-hangout', roomName: ROOM_NAME, needPassword: !!ROOM_PASSWORD, maxUsers: MAX_USERS, online: peers.size, spotifyClientId: SPOTIFY_CLIENT_ID, boardMax: BOARD_MAX, boardTtl: BOARD_TTL }));
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
const okId = (id) => typeof id === 'string' && /^[\w.:-]{1,48}$/.test(id);

wss.on('connection', (ws) => {
  ws.alive = true;
  ws.on('pong', () => (ws.alive = true));
  let key = null;
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    if (!key) {
      if (m.t !== 'hello') return;
      if (ROOM_PASSWORD && m.password !== ROOM_PASSWORD) { send(ws, { t: 'error', message: 'รหัสผ่านห้องไม่ถูกต้อง' }); return ws.close(); }
      if (peers.size >= MAX_USERS) { send(ws, { t: 'error', message: `ห้องเต็มแล้ว (สูงสุด ${MAX_USERS} คน)` }); return ws.close(); }
      key = 'k' + crypto.randomBytes(6).toString('hex');
      const uid = typeof m.uid === 'string' ? m.uid.slice(0, 40) : key;
      const p = m.p && typeof m.p === 'object' && JSON.stringify(m.p).length < 4096 ? m.p : {};
      peers.set(key, { ws, uid, p });
      send(ws, {
        t: 'welcome', key, ice: ICE, roomName: ROOM_NAME, now: Date.now(),
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
        const next = { ...me.p };
        for (const [k, v] of Object.entries(m.patch)) { if (v === null) delete next[k]; else next[k] = v; }
        if (JSON.stringify(next).length > 4096) break;
        me.p = next;
        broadcast({ t: 'peer', key, uid: me.uid, p: me.p }, key);
        break;
      }
      case 'set': {
        if (!COLS.includes(m.col) || m.col === 'board' || !okId(m.id) || !m.doc || typeof m.doc !== 'object') break;
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
}, 25000);

server.listen(PORT, () => console.log(`Pixel Hangout พร้อมที่ http://localhost:${PORT}`));
