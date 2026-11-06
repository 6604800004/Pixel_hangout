// ============================================================================
// net.js — ตัวเชื่อมต่อ 3 แบบที่หน้าตาเหมือนกัน
//   claude : เปิดเป็นลิงก์ Claude (room = ใครออนไลน์ตอนนี้, db = ของที่ต้องจำไว้)
//   ws     : เปิดจากเซิร์ฟเวอร์ Node ของเราเอง (มีเสียง/กล้อง)
//   solo   : เล่นคนเดียว (เช่นตอนยังไม่ได้ล็อกอิน)
// ============================================================================
const COLS = ['furniture', 'desks', 'chat', 'settings', 'board', 'screens'];

function randomId(n = 10) {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
function lsGet(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ---------------------------------------------------------------- Claude ----
async function makeClaudeNet() {
  const use = (n) => Promise.resolve(window.claude.use(n)).catch(() => null);
  const [room, db, user] = await Promise.all([use('room'), use('db'), use('user')]);
  if (!room && !db) return null;
  const uid = user ? await user.id() : null;
  let profileName = '';
  if (user) { try { profileName = (await user.me()).name || ''; } catch {} }
  let canWrite = db ? (user ? await user.can('data.write') : null) : false;
  const listeners = { status: [], write: [] };
  const net = {
    mode: 'claude', uid, myKey: null, canWrite, voice: false, profileName,
    hasRoom: !!room, hasDb: !!db,
    setPresence(patch) { if (room) room.presence(patch).catch((e) => console.warn('presence', e && e.code)); },
    onPeers(cb) {
      if (!room) return;
      room.onPeers((ch) => {
        const list = ch.peers.map((p) => ({ key: p.peer, isMe: p.sameTab, by: p.by, guest: p.guest, kind: p.kind, p: p.presence || {} }));
        const mine = list.find((p) => p.isMe);
        if (mine) net.myKey = mine.key;
        cb(list);
      }, (e) => console.warn('room', e && e.code));
    },
    onStatus(cb) {
      listeners.status.push(cb);
      if (room) room.onConnection((c) => cb(c ? 'online' : 'offline'), () => cb('solo'));
      else cb('solo');
    },
    onWriteDenied(cb) { listeners.write.push(cb); },
    watch(col, cb, onTimeout) {
      if (!db) { cb([]); return; }
      let q = db.collection(col);
      if (col === 'chat') q = q.orderBy('ts', 'desc').limit(80);
      let done = false;
      const timer = setTimeout(() => { if (!done && onTimeout) onTimeout(); }, 10000);
      q.onSnapshot((snap) => {
        if (!snap.metadata.fromCache) { done = true; clearTimeout(timer); }
        cb(snap.docs.filter((d) => d.exists).map((d) => ({ id: d.id, ...d.data() })), snap.metadata);
      }, (e) => { done = true; clearTimeout(timer); console.warn('watch', col, e && e.code); });
    },
    async set(col, id, data) {
      if (!db || net.canWrite === false) throw new Error('readonly');
      try { await db.collection(col).doc(id).set(data); }
      catch (e) {
        if (e && e.code === 'invalid_argument') { net.canWrite = false; listeners.write.forEach((f) => f()); }
        throw e;
      }
    },
    async del(col, id) {
      if (!db || net.canWrite === false) throw new Error('readonly');
      try { await db.collection(col).doc(id).delete(); }
      catch (e) { if (e && e.code === 'invalid_argument') { net.canWrite = false; listeners.write.forEach((f) => f()); } throw e; }
    },
    async loadPrivate() {
      if (!db || !uid) return null;
      try { const s = await db.doc(`data/users/${uid}/profile`).get(); return s.exists ? s.data() : null; } catch { return null; }
    },
    async savePrivate(obj) {
      if (!db || !uid) return;
      try { await db.doc(`data/users/${uid}/profile`).set(obj); } catch {}
    },
    resolveNames: user ? async (ids) => { try { return await user.profiles(ids); } catch { return {}; } } : null,
  };
  return net;
}

// ---------------------------------------------------------- WebSocket ----
function makeWsNet(cfg) {
  let uid = lsGet('pixel.uid', null);
  if (!uid) { uid = 'u' + randomId(12); lsSet('pixel.uid', uid); }
  const peers = new Map();
  const cols = Object.fromEntries(COLS.map((c) => [c, new Map()]));
  const watchers = Object.fromEntries(COLS.map((c) => [c, []]));
  const L = { move: [], peers: [], status: [], signal: [], welcome: [], error: [], sys: [], chatdel: [], update: [], poke: [], relay: [] };
  let ws = null, myPresence = {}, retry = 0, closedByUser = false, peerFlush = false;

  const emitPeers = () => {
    if (peerFlush) return;
    peerFlush = true;
    requestAnimationFrame(() => {
      peerFlush = false;
      const list = [...peers.values()].map((p) => ({ key: p.key, isMe: p.key === net.myKey, by: p.uid, guest: false, kind: 'viewer', p: p.p }));
      L.peers.forEach((f) => f(list));
    });
  };
  const emitCol = (col) => {
    const arr = [...cols[col].values()];
    if (col === 'chat') arr.sort((a, b) => b.ts - a.ts);
    watchers[col].forEach((f) => f(arr, { fromCache: false }));
  };
  const send = (m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.binaryType = 'arraybuffer';
    const me = ws;
    ws.onopen = () => { let ak = ''; try { ak = JSON.parse(localStorage.getItem('pixel.admin') || '""') || ''; } catch {} send({ t: 'hello', uid, p: myPresence, password: net.password || '', ak }); };
    ws.onmessage = (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        // เสียงสำรองผ่านเซิร์ฟเวอร์: [1][ยาวคีย์][คีย์ผู้ส่ง][เสียง μ-law]
        const u = new Uint8Array(ev.data);
        if (u[0] !== 1 || u.length < 3) return;
        const kl = u[1], from = String.fromCharCode(...u.subarray(2, 2 + kl));
        const audio = u.slice(2 + kl);
        L.relay.forEach((f) => f(from, audio));
        return;
      }
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === 'welcome') {
        retry = 0;
        net.hasTurn = !!m.turn; net.myKey = m.key;
        if (m.v) { if (net.build && net.build !== m.v) L.update.forEach((f) => f()); net.build = net.build || m.v; }
        if (Number.isFinite(m.now)) net.timeOffset = m.now - Date.now();
        net.iceServers = m.ice || net.iceServers;
        peers.clear();
        for (const p of m.peers) peers.set(p.key, p);
        peers.set(m.key, { key: m.key, uid, p: myPresence });
        for (const c of COLS) { cols[c].clear(); for (const d of m.cols[c] || []) cols[c].set(d.id, d); emitCol(c); }
        emitPeers();
        L.status.forEach((f) => f('online'));
        L.welcome.forEach((f) => f());
      } else if (m.t === 'peer') {
        peers.set(m.key, { key: m.key, uid: m.uid, p: m.p || {} });
        emitPeers();
      } else if (m.t === 'mv') {
        // ตำแหน่งแบบย่อ: แก้ในวัตถุเดิม (ตัวเกมอ่านค่าเองทุกเฟรม ไม่ต้องสร้างรายชื่อใหม่)
        const pr = peers.get(m.k);
        if (pr && Number.isFinite(m.x) && Number.isFinite(m.y)) { pr.p.x = m.x; pr.p.y = m.y; if (m.d) pr.p.d = m.d; pr.p.m = m.m ? 1 : 0; if (Number.isFinite(m.ts)) pr.p.t = m.ts; L.move.forEach((f) => f(m.k, pr.p)); }
      } else if (m.t === 'peer-left') {
        peers.delete(m.key); emitPeers();
      } else if (m.t === 'col') {
        if (!cols[m.col]) return;
        if (m.doc) cols[m.col].set(m.id, { ...m.doc, id: m.id }); else cols[m.col].delete(m.id);
        emitCol(m.col);
      } else if (m.t === 'signal') {
        L.signal.forEach((f) => f(m.from, m.data));
      } else if (m.t === 'poke') {
        L.poke.forEach((f) => f(m));
      } else if (m.t === 'chat-del') {
        if (m.ids === 'all') cols.chat.clear(); else if (Array.isArray(m.ids)) for (const id of m.ids) cols.chat.delete(id);
        emitCol('chat');
        L.chatdel.forEach((f) => f(m.ids));
      } else if (m.t === 'sys') {
        L.sys.forEach((f) => f(m));
      } else if (m.t === 'error') {
        closedByUser = true;
        L.error.forEach((f) => f(m));
      }
    };
    ws.onclose = () => {
      if (ws !== me) return;
      peers.clear(); emitPeers();
      if (closedByUser) return;
      L.status.forEach((f) => f('offline'));
      setTimeout(connect, Math.min(8000, 700 * 2 ** retry++));
    };
  }

  const net = {
    mode: 'ws', uid, myUid: uid, myKey: null, canWrite: true, voice: true, profileName: '', hasRoom: true, hasDb: true,
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], roomName: cfg.roomName, password: '',
    start() { closedByUser = false; connect(); },
    stop() { closedByUser = true; try { ws && ws.close(); } catch {} },
    setPresence(patch) {
      for (const [k, v] of Object.entries(patch)) { if (v === null) delete myPresence[k]; else myPresence[k] = v; }
      const mine = peers.get(net.myKey);
      const moveOnly = Object.keys(patch).every((k) => k === 'x' || k === 'y' || k === 'd' || k === 'm' || k === 't');
      if (mine) { mine.p = { ...myPresence }; if (!moveOnly) emitPeers(); }
      send({ t: 'p', patch });
    },
    onPeers(cb) { L.peers.push(cb); },
    onMove(cb) { L.move.push(cb); },
    onStatus(cb) { L.status.push(cb); },
    onWelcome(cb) { L.welcome.push(cb); },
    onError(cb) { L.error.push(cb); },
    onSys(cb) { L.sys.push(cb); },
    onChatDel(cb) { L.chatdel.push(cb); },
    onUpdate(cb) { L.update.push(cb); },
    onPoke(cb) { L.poke.push(cb); },
    onRelay(cb) { L.relay.push(cb); },
    relaySend(keys, audio) {
      if (!ws || ws.readyState !== 1 || ws.bufferedAmount > 64000) return; // เน็ตช้า: ทิ้งเฟรมดีกว่าดีเลย์สะสม
      const ks = keys.slice(0, 16).map((k) => String(k).slice(0, 40));
      let len = 2 + audio.length; for (const k of ks) len += 1 + k.length;
      const b = new Uint8Array(len); b[0] = 1; b[1] = ks.length; let o = 2;
      for (const k of ks) { b[o++] = k.length; for (let i = 0; i < k.length; i++) b[o++] = k.charCodeAt(i) & 0x7f; }
      b.set(audio, o); ws.send(b);
    },
    poke(name, key) { send({ t: 'poke', name, key }); },
    admin(cmd, key, arg, ban) { send({ t: 'admin', cmd, key, arg, ban: ban || 0 }); },
    onWriteDenied() {},
    watch(col, cb) { watchers[col].push(cb); },
    async set(col, id, data) {
      cols[col].set(id, { ...data, id }); emitCol(col);
      send({ t: 'set', col, id, doc: data });
    },
    async del(col, id) { cols[col].delete(id); emitCol(col); send({ t: 'del', col, id }); },
    async loadPrivate() { return lsGet('pixel.private', null); },
    async savePrivate(o) { lsSet('pixel.private', o); },
    signal(to, data) { send({ t: 'signal', to, data }); },
    // กระดานแนบรูป (มีเฉพาะเวอร์ชันเซิร์ฟเวอร์)
    timeOffset: 0, now() { return Date.now() + (net.timeOffset || 0); }, youtube: true,
    board: true, boardMax: cfg.boardMax || 20, boardTtl: cfg.boardTtl || 86400000, spotifyClientId: cfg.spotifyClientId || '', lastfm: !!cfg.lastfm,
    async uploadBoard(boardId, blob, meta) {
      const r = await fetch(`/api/board/${encodeURIComponent(boardId)}`, {
        method: 'POST', body: blob,
        headers: { 'Content-Type': blob.type, 'X-Name': encodeURIComponent(meta.n || ''), 'X-W': String(meta.w || 0), 'X-H': String(meta.h || 0), 'X-Room-Password': net.password || '' },
      });
      if (!r.ok) { let e = {}; try { e = await r.json(); } catch {} const err = new Error(e.error || 'upload'); err.code = e.error; throw err; }
      const j = await r.json();
      cols.board.set(j.id, { ...j.doc, id: j.id }); emitCol('board');
      return j;
    },
    clearBoard(b) { for (const [id, d] of cols.board) if (d.b === b) cols.board.delete(id); emitCol('board'); send({ t: 'board-clear', b }); },
    boardUrl(id, doc) { return `/board/${id}.${(doc && doc.ext) || 'jpg'}`; },
    onSignal(cb) { L.signal.push(cb); },
    resolveNames: null,
  };
  return net;
}

// --------------------------------------------------------------- Solo ----
function makeSoloNet(reason) {
  const store = lsGet('pixel.solo', {});
  for (const c of COLS) if (!Array.isArray(store[c])) store[c] = [];
  const watchers = Object.fromEntries(COLS.map((c) => [c, []]));
  let peerCb = null, me = {};
  const emit = (col) => {
    const arr = [...store[col]];
    if (col === 'chat') arr.sort((a, b) => b.ts - a.ts);
    watchers[col].forEach((f) => f(arr, { fromCache: false }));
  };
  const save = () => lsSet('pixel.solo', store);
  const net = {
    mode: 'solo', reason, uid: 'solo', myKey: 'me', canWrite: true, voice: false, profileName: '', hasRoom: false, hasDb: false,
    setPresence(patch) {
      for (const [k, v] of Object.entries(patch)) { if (v === null) delete me[k]; else me[k] = v; }
      if (peerCb) peerCb([{ key: 'me', isMe: true, by: 'solo', p: { ...me } }]);
    },
    onPeers(cb) { peerCb = cb; },
    onStatus(cb) { cb('solo'); },
    onWriteDenied() {},
    watch(col, cb) { watchers[col].push(cb); setTimeout(() => emit(col)); },
    async set(col, id, data) {
      store[col] = store[col].filter((d) => d.id !== id).concat({ ...data, id });
      if (col === 'chat') store.chat = store.chat.slice(-80);
      save(); emit(col);
    },
    async del(col, id) { store[col] = store[col].filter((d) => d.id !== id); save(); emit(col); },
    async loadPrivate() { return lsGet('pixel.private', null); },
    async savePrivate(o) { lsSet('pixel.private', o); },
    resolveNames: null,
  };
  return net;
}

// ---------------------------------------------------- เลือกตัวเชื่อมต่อ ----
async function pickNet() {
  // 1) ถ้าเปิดเป็นลิงก์ Claude จะมี window.claude ให้ใช้
  for (let i = 0; i < 15 && !(window.claude && typeof window.claude.use === 'function'); i++) {
    if (i === 3 && location.protocol.startsWith('http')) {
      // 2) ลองถามเซิร์ฟเวอร์ Node ของเรา
      try {
        const r = await fetch('/config', { cache: 'no-store' });
        const cfg = r.ok ? await r.json() : null;
        if (cfg && cfg.app === 'pixel-hangout') return makeWsNet(cfg);
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (window.claude && typeof window.claude.use === 'function') {
    try {
      const n = await makeClaudeNet();
      if (n) return n;
    } catch (e) { console.warn(e); }
    return makeSoloNet('ยังเชื่อมต่อห้องไม่ได้ (ต้องล็อกอิน claude.ai และได้รับเชิญเข้าหน้านี้)');
  }
  return makeSoloNet('โหมดเล่นคนเดียว');
}
