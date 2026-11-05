// ------------------------------------------------- ลำโพง: เปิดเพลงด้วยกัน ----
// แตะลำโพงในห้อง → เปิดวิทยุ / ไฟล์เพลง / ลิงก์สตรีม ให้ทุกคนในห้องเดียวกันฟังพร้อมกัน
// ใช้ <audio> ธรรมดา จึงยังได้ยินตอนพับจอ/ย่อแอป (ต่างจาก YouTube ที่มือถือจะหยุดเอง)
const SPEAKER_TYPES = new Set(['speaker']);
const RADIOS = [
  ['Groove Salad', 'ชิลล์ ambient', 'https://ice.somafm.com/groovesalad'],
  ['Fluid', 'lo-fi / instrumental hip hop', 'https://ice.somafm.com/fluid'],
  ['Lush', 'เสียงร้องนุ่มๆ', 'https://ice.somafm.com/lush'],
  ['Indie Pop Rocks!', 'อินดี้ป๊อป', 'https://ice.somafm.com/indiepop'],
  ['Beat Blender', 'deep house', 'https://ice.somafm.com/beatblender'],
  ['PopTron', 'electropop', 'https://ice.somafm.com/poptron'],
  ['Sonic Universe', 'แจ๊ส', 'https://ice.somafm.com/sonicuniverse'],
  ['Secret Agent', 'เท่ๆ ลึกลับ', 'https://ice.somafm.com/secretagent'],
  ['Folk Forward', 'โฟล์ก', 'https://ice.somafm.com/folkfwd'],
  ['Drone Zone', 'นอนหลับ / ทำสมาธิ', 'https://ice.somafm.com/dronezone'],
];
G.speakers = new Map();
const SPK = {
  el: null, key: '', act: null, lastSeek: 0, needTap: false, unlocked: false,
  vol: Number(lsGet('pixel.spkVol', 0.8)), muted: !!lsGet('pixel.spkMute', false),
};
const spkNow = () => (G.net.now ? G.net.now() : Date.now());
const okAudioUrl = (u) => typeof u === 'string' && (/^\/music\/m[0-9a-f]{16}\.(mp3|m4a|aac|ogg|wav|webm|flac)$/.test(u) || /^https:\/\/[^\s"'<>]{4,500}$/.test(u));

function spkEl() {
  if (SPK.el) return SPK.el;
  const a = document.createElement('audio');
  a.preload = 'auto'; a.setAttribute('playsinline', ''); a.crossOrigin = null;
  a.addEventListener('ended', spkEnded);
  a.addEventListener('error', () => { if (SPK.act && a.src) toast('เล่นเพลงนี้ไม่ได้ ข้ามไปเพลงถัดไป'); spkEnded(); });
  document.body.append(a);
  SPK.el = a;
  return a;
}
// iOS/Android ต้องให้ผู้ใช้แตะก่อนครั้งแรก — ปลดล็อกตอนกดเข้าห้อง
function spkUnlock() {
  const a = spkEl();
  if (SPK.unlocked) return;
  try {
    if (!a.src) a.src = silentWav();
    const p = a.play();
    if (p) p.then(() => { if (!SPK.act) a.pause(); SPK.unlocked = true; }).catch(() => {});
  } catch {}
}
function spkExpected(doc) {
  const t = doc.list && doc.list[doc.i];
  if (!t || t.live) return 0;
  return Math.max(0, (doc.pos || 0) + (doc.playing ? (spkNow() - (doc.ts || 0)) / 1000 : 0));
}
function activeSpeaker() {
  let best = null;
  for (const it of G.furniture) {
    if (!SPEAKER_TYPES.has(it.t)) continue;
    const doc = G.speakers.get(it.id);
    if (!doc || doc.stopped || !doc.list || !doc.list[doc.i]) continue;
    if (zoneAt(it.x, it.y + 6) !== G.zone) continue;
    // ลำโพงที่กำลังเล่นมาก่อน แล้วค่อยดูว่าอันไหนถูกกดล่าสุด (หยุดชั่วคราวยังโชว์แผงให้กดเล่นต่อได้)
    const score = (doc.playing ? 1e15 : 0) + (doc.ts || 0);
    if (!best || score > best.score) best = { id: it.id, it, doc, score };
  }
  return best;
}
async function shareSpeaker(id, doc) {
  doc = { stopped: false, ...doc, list: (doc.list || []).slice(0, 50), by: G.me.nick || '', ts: doc.ts || spkNow() };
  G.speakers.set(id, doc);
  try { await G.net.set('speakers', id, doc); } catch { toast('บันทึกไม่ได้'); }
  syncSpeaker(); if (G.spkOpen === id) paintSpeaker();
}
function spkCmd(id, cmd, arg) {
  const doc = { list: [], i: 0, playing: false, pos: 0, vol: 1, ...(G.speakers.get(id) || {}) };
  const n = doc.list.length;
  const at = spkExpected(doc);
  if (cmd === 'toggle') {
    if (!n) return toast('ยังไม่มีเพลงในลำโพงนี้ — กด 🎚️ เพื่อเพิ่ม');
    return shareSpeaker(id, { ...doc, stopped: false, playing: !doc.playing, pos: at, ts: spkNow() });
  }
  if (cmd === 'next' || cmd === 'prev') {
    if (!n) return;
    const i = (doc.i + (cmd === 'next' ? 1 : n - 1)) % n;
    return shareSpeaker(id, { ...doc, stopped: false, i, pos: 0, playing: true, ts: spkNow() });
  }
  if (cmd === 'play') return shareSpeaker(id, { ...doc, stopped: false, i: arg, pos: 0, playing: true, ts: spkNow() });
  if (cmd === 'vol') return shareSpeaker(id, { ...doc, vol: arg, pos: at, ts: spkNow() });
  if (cmd === 'add') {
    const list = [...doc.list, ...arg].slice(0, 50);
    const start = !doc.playing ? doc.list.length : doc.i;
    return shareSpeaker(id, { ...doc, stopped: false, list, i: Math.min(start, list.length - 1), playing: true, pos: doc.playing ? at : 0, ts: spkNow() });
  }
  if (cmd === 'remove') {
    const list = doc.list.filter((_, k) => k !== arg);
    let i = doc.i; let pos = at;
    if (arg < i) i--; else if (arg === i) pos = 0;
    if (i >= list.length) i = 0;
    return shareSpeaker(id, { ...doc, list, i, pos, playing: doc.playing && list.length > 0, ts: spkNow() });
  }
  if (cmd === 'stop') return shareSpeaker(id, { ...doc, playing: false, stopped: true, pos: 0, ts: spkNow() });
}
function spkEnded() {
  const act = SPK.act;
  if (!act) return;
  const doc = G.speakers.get(act.id);
  if (!doc || !doc.playing) return;
  const t = doc.list[doc.i];
  if (t && t.live) return; // วิทยุไม่มีจบ (ถ้าหลุดจะต่อใหม่เอง)
  // ทุกเครื่องอาจสั่งพร้อมกัน แต่ได้ผลเหมือนกัน (เพลงถัดไปเดียวกัน)
  if (doc.list.length) shareSpeaker(act.id, { ...doc, i: (doc.i + 1) % doc.list.length, pos: 0, ts: spkNow() });
}
function spkVolume() { return Math.max(0, Math.min(1, (SPK.act ? SPK.act.doc.vol ?? 1 : 1) * SPK.vol)); }
function syncSpeaker() {
  if (!G.joined) return;
  const act = activeSpeaker();
  const a = SPK.el;
  const panel = $('#spkPanel');
  SPK.act = act;
  const off = !act || !act.doc.playing || SPK.muted || G.bgPaused;
  panel.classList.toggle('hidden', !act);
  if (!act) { if (a && !a.paused) a.pause(); SPK.key = ''; spkMediaSession(null); return; }
  const tr = act.doc.list[act.doc.i];
  $('#spkTitle').textContent = `🔊 ${SPK.muted ? '🔇 ' : ''}${tr.t || 'เพลง'}`;
  $('#spkToggle').textContent = act.doc.playing ? '⏸️' : '▶️';
  if (off) { if (a && !a.paused) a.pause(); $('#spkTap').classList.add('hidden'); spkMediaSession(act); return; }
  const el = spkEl();
  const key = act.id + '|' + act.doc.i + '|' + tr.u;
  if (SPK.key !== key) {
    SPK.key = key; SPK.lastSeek = Date.now();
    el.src = tr.u;
    if (!tr.live) { const want = spkExpected(act.doc); el.addEventListener('loadedmetadata', () => { try { el.currentTime = spkExpected(act.doc) || want; } catch {} }, { once: true }); }
  }
  try { el.volume = spkVolume(); } catch {}
  if (el.paused) {
    const p = el.play();
    if (p) p.then(() => { SPK.needTap = false; $('#spkTap').classList.add('hidden'); }).catch(() => { SPK.needTap = true; $('#spkTap').classList.remove('hidden'); });
  } else if (!tr.live && el.readyState >= 2) {
    // คลาดกันเกิน 4 วินาทีค่อยกระโดด และไม่บ่อยกว่าทุก 10 วินาที (กันเสียงสะดุด)
    const drift = Math.abs(el.currentTime - spkExpected(act.doc));
    if (drift > 4 && Date.now() - SPK.lastSeek > 10000) { SPK.lastSeek = Date.now(); try { el.currentTime = spkExpected(act.doc); } catch {} }
  }
  spkMediaSession(act);
}
// ปุ่มบนหน้าจอล็อก/หูฟัง: เล่น-หยุด-ถัดไป ควบคุมลำโพงให้ทุกคน
function spkMediaSession(act) {
  if (!('mediaSession' in navigator)) return;
  try {
    if (!act) { if (!G.bgAudio) navigator.mediaSession.playbackState = 'none'; return; }
    const tr = act.doc.list[act.doc.i];
    const md = navigator.mediaSession.metadata;
    const title = tr.t || 'เพลง', artist = `🔊 ลำโพง · ${ZONES[G.zone || 'hall'].name}`;
    if (!md || md.title !== title || md.artist !== artist) navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: 'Pixel Hangout' });
    navigator.mediaSession.playbackState = act.doc.playing && !SPK.muted ? 'playing' : 'paused';
    navigator.mediaSession.setActionHandler('play', () => spkCmd(act.id, 'toggle'));
    navigator.mediaSession.setActionHandler('pause', () => spkCmd(act.id, 'toggle'));
    navigator.mediaSession.setActionHandler('nexttrack', () => spkCmd(act.id, 'next'));
    navigator.mediaSession.setActionHandler('previoustrack', () => spkCmd(act.id, 'prev'));
  } catch {}
}
setInterval(syncSpeaker, 700);
function onSpeakers(docs) {
  G.speakers = new Map(docs.map((d) => [d.id, d]));
  syncSpeaker();
  if (G.spkOpen) paintSpeaker();
}
$('#spkToggle').onclick = () => SPK.act && spkCmd(SPK.act.id, 'toggle');
$('#spkNext').onclick = () => SPK.act && spkCmd(SPK.act.id, 'next');
$('#spkPrev').onclick = () => SPK.act && spkCmd(SPK.act.id, 'prev');
$('#spkOpen').onclick = () => { const it = SPK.act && G.furniture.find((f) => f.id === SPK.act.id); if (it) openSpeaker(it); };
$('#spkTap').onclick = () => { SPK.key = ''; spkUnlock(); syncSpeaker(); };
makeDraggable($('#spkPanel'), 'pixel.spkPos');

// ---------- หน้าต่างควบคุมลำโพง ----------
function openSpeaker(it) {
  if (!G.net.uploadMusic) { toast('ลำโพงใช้ได้ในเวอร์ชันเซิร์ฟเวอร์ (onrender.com)'); return; }
  G.spkOpen = it.id;
  spkUnlock();
  openModal(() => {});
  paintSpeaker();
}
function paintSpeaker() {
  const id = G.spkOpen;
  const it = G.furniture.find((f) => f.id === id);
  if (!it || $('#modal').classList.contains('hidden')) { G.spkOpen = null; return; }
  const doc = { list: [], i: 0, playing: false, pos: 0, vol: 1, ...(G.speakers.get(id) || {}) };
  const card = $('#card');
  const keepScroll = card.scrollTop;
  card.innerHTML = '';
  const zone = ZONES[zoneAt(it.x, it.y + 6)];
  card.append(el('h2', null, '🔊 ลำโพง'));
  card.append(el('p', 'sub', `ทุกคนที่อยู่ใน${zone.name}ได้ยินเพลงเดียวกันพร้อมกัน ใครกดเล่น/หยุด/ข้าม ทุกคนก็ตาม · พับจอหรือย่อแอปก็ยังได้ยิน`));
  const tr = doc.list[doc.i];
  const now = el('div', 'mon');
  now.append(el('b', null, tr ? `${doc.playing ? '▶ กำลังเล่น' : '⏸ หยุดอยู่'}: ${tr.t}` : 'ยังไม่มีเพลง — เลือกวิทยุ หรืออัปโหลดเพลงด้านล่าง'));
  if (tr && doc.by) now.append(el('p', 'tip', `ล่าสุดโดย ${doc.by}${tr.live ? ' · 📻 สถานีวิทยุสด' : ''}`));
  card.append(now);
  // ปุ่มควบคุม
  const ctrl = el('div', 'spk-ctrl');
  const mk = (txt, title, fn) => { const b = el('button', 'pbtn', txt); b.type = 'button'; b.title = title; b.onclick = fn; return b; };
  ctrl.append(mk('⏮', 'ก่อนหน้า', () => spkCmd(id, 'prev')), mk(doc.playing ? '⏸️' : '▶️', 'เล่น/หยุด', () => spkCmd(id, 'toggle')), mk('⏭', 'ถัดไป', () => spkCmd(id, 'next')));
  card.append(ctrl);
  // ระดับเสียง
  const vol = el('div', 'opt');
  vol.append(el('span', null, 'ระดับเสียง'));
  const r1 = el('div', 'spk-row'); r1.append(el('span', 'tip', 'ลำโพง (ทุกคน)'));
  const sv = el('input'); sv.type = 'range'; sv.min = '0'; sv.max = '100'; sv.value = String(Math.round((doc.vol ?? 1) * 100));
  sv.onchange = () => spkCmd(id, 'vol', Number(sv.value) / 100);
  r1.append(sv);
  const r2 = el('div', 'spk-row'); r2.append(el('span', 'tip', 'ในเครื่องฉัน'));
  const mv = el('input'); mv.type = 'range'; mv.min = '0'; mv.max = '100'; mv.value = String(Math.round(SPK.vol * 100));
  mv.oninput = () => { SPK.vol = Number(mv.value) / 100; lsSet('pixel.spkVol', SPK.vol); if (SPK.el) try { SPK.el.volume = spkVolume(); } catch {} };
  const mute = el('button', 'pbtn sm', SPK.muted ? '🔇 เปิดเสียง' : '🔈 ปิดเสียงในเครื่องฉัน');
  mute.onclick = () => { SPK.muted = !SPK.muted; lsSet('pixel.spkMute', SPK.muted); syncSpeaker(); paintSpeaker(); };
  r2.append(mv);
  vol.append(r1, r2, mute);
  // iPhone/iPad ไม่ยอมให้เว็บปรับระดับเสียง
  const probe = spkEl(); const v0 = probe.volume; try { probe.volume = 0.5; } catch {}
  if (probe.volume === v0 && v0 === 1 && /iP(hone|ad|od)|Macintosh.*Mobile/.test(navigator.userAgent + (navigator.maxTouchPoints > 1 ? ' Mobile' : ''))) vol.append(el('p', 'tip', 'iPhone/iPad: ใช้ปุ่มเพิ่ม-ลดเสียงข้างเครื่อง (Safari ไม่ให้เว็บปรับระดับเสียงเอง)'));
  try { probe.volume = spkVolume(); } catch {}
  card.append(vol);
  // เพลย์ลิสต์
  if (doc.list.length) {
    const pl = el('div', 'opt'); pl.append(el('span', null, `เพลย์ลิสต์ (${doc.list.length})`));
    const ul = el('ul', 'spk-list');
    doc.list.forEach((t, k) => {
      const li = el('li', k === doc.i ? 'cur' : '');
      li.append(el('span', null, `${t.live ? '📻' : '🎵'} ${t.t}`));
      const pb = el('button', null, '▶'); pb.title = 'เล่นเพลงนี้'; pb.onclick = () => spkCmd(id, 'play', k);
      const rb = el('button', null, '✕'); rb.title = 'เอาออก'; rb.onclick = () => spkCmd(id, 'remove', k);
      li.append(pb, rb); ul.append(li);
    });
    pl.append(ul); card.append(pl);
  }
  // เพิ่มเพลง: อัปโหลด
  const upl = el('div', 'opt');
  upl.append(el('span', null, '🎵 อัปโหลดเพลงจากเครื่อง (MP3/M4A ไม่เกิน 25MB · เก็บไว้ 7 วัน)'));
  const fi = el('input'); fi.type = 'file'; fi.accept = 'audio/*,.mp3,.m4a'; fi.multiple = true;
  const upMsg = el('p', 'tip', '');
  fi.onchange = async () => {
    const files = [...fi.files].slice(0, 10); if (!files.length) return;
    const added = [];
    for (const [k, f] of files.entries()) {
      upMsg.textContent = `กำลังอัปโหลด ${k + 1}/${files.length}: ${f.name}`;
      try {
        const url = await G.net.uploadMusic(f);
        added.push({ t: f.name.replace(/\.[^.]+$/, '').slice(0, 80), u: url });
      } catch (e) { toast(e.code === 'big' || e.code === 413 ? `${f.name} ใหญ่เกิน 25MB` : e.code === 'type' || e.code === 415 ? `${f.name} ไม่ใช่ไฟล์เพลงที่รองรับ` : `อัปโหลด ${f.name} ไม่สำเร็จ`); }
    }
    upMsg.textContent = '';
    if (added.length) { spkCmd(id, 'add', added); toast(`เพิ่ม ${added.length} เพลงแล้ว 🎵`); }
  };
  upl.append(fi, upMsg); card.append(upl);
  // เพิ่มเพลง: วิทยุ
  const rad = el('div', 'opt'); rad.append(el('span', null, '📻 วิทยุออนไลน์ (เล่นได้ทันที)'));
  const grid = el('div', 'radio-grid');
  for (const [name, desc, url] of RADIOS) {
    const b = el('button', null, `${name} · ${desc}`); b.type = 'button';
    b.onclick = () => spkCmd(id, 'add', [{ t: `📻 ${name}`, u: url, live: true }]);
    grid.append(b);
  }
  rad.append(grid); card.append(rad);
  // เพิ่มเพลง: ลิงก์
  const lk = el('div', 'opt'); lk.append(el('span', null, '🔗 ลิงก์ไฟล์เพลงหรือสตรีม (https://… .mp3 / สถานีวิทยุ)'));
  const row = el('div', 'spk-row');
  const ui = el('input'); ui.type = 'url'; ui.placeholder = 'https://…/song.mp3';
  const ub = el('button', 'pbtn sm pink', 'เพิ่ม');
  ub.onclick = () => {
    const u = ui.value.trim();
    if (!okAudioUrl(u)) return toast('ใส่ลิงก์ที่ขึ้นต้นด้วย https://');
    if (/youtu\.?be|spotify\.com/i.test(u)) return toast('ลิงก์ YouTube/Spotify เล่นในลำโพงไม่ได้ — ใช้ทีวีเปิด YouTube แทน');
    const live = !/\.(mp3|m4a|aac|ogg|wav|flac|webm)(\?|$)/i.test(u);
    spkCmd(id, 'add', [{ t: decodeURIComponent(u.split('/').pop().split('?')[0] || 'สตรีม').replace(/\.[^.]+$/, '').slice(0, 80) || 'สตรีม', u, live }]);
    ui.value = '';
  };
  row.append(ui, ub); lk.append(row);
  lk.append(el('p', 'tip', 'YouTube/Spotify เล่นผ่านลำโพงไม่ได้ (ถูกล็อกไว้) · อยากดู YouTube ด้วยกันใช้ทีวี'));
  card.append(lk);
  const foot = el('div', 'foot');
  if (doc.list.length) { const st = el('button', 'pbtn danger', '⏹️ หยุด'); st.onclick = () => spkCmd(id, 'stop'); foot.append(st); }
  const close = el('button', 'pbtn pink', 'เสร็จ'); close.onclick = () => { G.spkOpen = null; closeModal(); };
  foot.append(close); card.append(foot);
  card.scrollTop = keepScroll;
}
