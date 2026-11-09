// ================= 📊 แผงแอดมิน: สถิติการใช้งาน · ผู้ใช้ · ให้/ยึดของพิเศษ · ประวัติเข้าออก =================
// ข้อมูลอยู่ที่เซิร์ฟเวอร์ (ไม่ส่งให้ผู้ใช้ทั่วไป) — ขอใหม่ทุกครั้งที่เปิด/กดรีเฟรช
G.adm = { tab: lsGet('pixel.admTab', 'over'), q: '', open: null, data: null, busy: false };
const admKey = () => lsGet('pixel.admin', '') || '';
function fmtDur(ms) {
  ms = Math.max(0, ms || 0);
  const m = Math.round(ms / 60000);
  if (m < 1) return '< 1 นาที';
  if (m < 60) return `${m} นาที`;
  const h = Math.floor(m / 60), r = m % 60;
  return h < 48 ? `${h} ชม.${r ? ` ${r} นาที` : ''}` : `${Math.round(h / 24)} วัน`;
}
function fmtAgo(ts, now) {
  if (!ts) return '—';
  const d = Math.max(0, (now || Date.now()) - ts) / 60000;
  if (d < 1) return 'เมื่อกี้';
  if (d < 60) return `${Math.round(d)} นาทีก่อน`;
  if (d < 1440) return `${Math.round(d / 60)} ชม.ก่อน`;
  if (d < 1440 * 30) return `${Math.round(d / 1440)} วันก่อน`;
  return new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}
const fmtTime = (ts) => new Date(ts).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const thDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' }); };

function openAdminPanel() {
  if (!G.isAdmin) { toast('เฉพาะแอดมิน — พิมพ์ admin รหัส ก่อน'); return; }
  setMore(false);
  G.adm.open = null;
  openModal((card) => { card.classList.add('adm-card'); });
  G.adminOpen = true;
  paintAdmin();
  admRefresh();
}
function admRefresh() { G.adm.busy = true; paintAdmin(); G.net.admin('stats', admKey()); }
function admCmd(cmd, uid, items) { G.adm.busy = true; paintAdmin(); G.net.admin(cmd, admKey(), { uid, items }); }

function paintAdmin() {
  if (!G.adminOpen || $('#modal').classList.contains('hidden') || !$('#card').classList.contains('adm-card')) { G.adminOpen = false; return; }
  const card = $('#card'), D = G.adm.data, sc = card.querySelector('.adm-body')?.scrollTop || 0;
  card.innerHTML = '';
  const head = el('div', 'adm-head');
  head.append(el('h2', null, '📊 แผงแอดมิน'));
  const rf = el('button', 'pbtn sm', G.adm.busy ? '⏳' : '🔄 รีเฟรช'); rf.onclick = admRefresh;
  const x = el('button', 'x', '✕'); x.onclick = () => { G.adminOpen = false; closeModal(); };
  head.append(rf, x);
  card.append(head);
  const tabs = el('div', 'ctabs adm-tabs');
  [['over', '📈 ภาพรวม'], ['users', '👥 ผู้ใช้ & ของ'], ['log', '🕘 ประวัติ']].forEach(([k, t]) => {
    const b = el('button', G.adm.tab === k ? 'on' : '', t);
    b.onclick = () => { G.adm.tab = k; lsSet('pixel.admTab', k); paintAdmin(); };
    tabs.append(b);
  });
  card.append(tabs);
  const body = el('div', 'adm-body');
  card.append(body);
  if (!D) { body.append(el('div', 'adm-empty', 'กำลังโหลดข้อมูล…')); return; }
  if (G.adm.tab === 'over') admOverview(body, D);
  else if (G.adm.tab === 'users') admUsers(body, D);
  else admLog(body, D);
  body.scrollTop = sc;
}

function admStat(label, value, sub) {
  const b = el('div', 'adm-stat');
  b.append(el('div', 'l', label), el('div', 'v', value));
  if (sub) b.append(el('div', 's', sub));
  return b;
}
function admOverview(body, D) {
  const today = D.days.find((d) => d.d === D.today) || { u: 0, s: 0, ms: 0, peak: 0, chats: 0 };
  const grid = el('div', 'adm-stats');
  grid.append(
    admStat('ออนไลน์ตอนนี้', `${D.online} / ${D.max}`, 'คน'),
    admStat('วันนี้เข้ามา', `${today.u} คน`, `${today.s} ครั้ง · สูงสุดพร้อมกัน ${today.peak}`),
    admStat('เวลาใช้งานวันนี้', fmtDur(today.ms), `แชต ${today.chats} ข้อความ`),
    admStat('7 วันล่าสุด', `${D.u7} คน`, 'ไม่นับซ้ำ'),
    admStat('30 วันล่าสุด', `${D.u30} คน`, 'ไม่นับซ้ำ'),
    admStat('ผู้ใช้ทั้งหมด', `${D.uAll} คน`, `เริ่มเก็บ ${fmtAgo(D.since, D.now)}`),
    admStat('พร้อมกันมากสุด', `${D.peak.n || 0} คน`, D.peak.ts ? fmtTime(D.peak.ts) : '—'),
  );
  body.append(grid);
  // กราฟรายวัน 30 วัน (ช่องที่ไม่มีคนเข้า = 0)
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const k = new Date(D.now + 7 * 3600000 - i * 86400000).toISOString().slice(0, 10);
    days.push(D.days.find((d) => d.d === k) || { d: k, u: 0, s: 0, ms: 0, peak: 0, chats: 0 });
  }
  const metric = G.adm.metric || 'u';
  const box = el('div', 'adm-box');
  const bh = el('div', 'adm-boxh'); bh.append(el('b', null, 'รายวัน (30 วัน)'));
  const seg = el('div', 'seg');
  [['u', 'คน'], ['s', 'ครั้งที่เข้า'], ['ms', 'เวลาใช้'], ['chats', 'แชต']].forEach(([k, t]) => { const b = el('button', metric === k ? 'on' : '', t); b.onclick = () => { G.adm.metric = k; paintAdmin(); }; seg.append(b); });
  bh.append(seg); box.append(bh);
  const max = Math.max(1, ...days.map((d) => d[metric] || 0));
  const bars = el('div', 'adm-bars');
  days.forEach((d, i) => {
    const v = d[metric] || 0;
    const col = el('div', 'bar' + (d.d === D.today ? ' today' : ''));
    col.title = `${thDay(d.d)} — ${metric === 'ms' ? fmtDur(v) : v + (metric === 'u' ? ' คน' : metric === 's' ? ' ครั้ง' : ' ข้อความ')}`;
    const f = el('i'); f.style.height = (v ? Math.max(4, (v / max) * 100) : 0) + '%'; col.append(f);
    if (v && (metric !== 'ms') && days.length <= 31) { const n = el('span', 'n', String(v)); col.append(n); }
    if (i % 5 === 0 || i === days.length - 1) col.append(el('span', 'd', thDay(d.d)));
    bars.append(col);
  });
  box.append(bars);
  body.append(box);
  // ห้องยอดนิยม (เวลาที่คนอยู่ในห้องนั้นรวมกัน)
  const zs = Object.entries(D.zones || {}).filter(([z]) => ZONES[z]).sort((a, b) => b[1] - a[1]);
  const zb = el('div', 'adm-box');
  zb.append(el('div', 'adm-boxh', null)); zb.firstChild.append(el('b', null, 'ห้องยอดนิยม (เวลาที่คนอยู่รวมกัน)'));
  if (!zs.length) zb.append(el('div', 'adm-empty', 'ยังไม่มีข้อมูล — จะเริ่มนับเมื่อมีคนเข้าห้อง'));
  const zmax = Math.max(1, ...zs.map(([, v]) => v));
  zs.forEach(([z, v]) => {
    const r = el('div', 'adm-hbar');
    r.append(el('span', 'nm', `${ZONES[z].icon} ${zoneName(z)}`));
    const t = el('span', 'tr'); const f = el('i'); f.style.width = (v / zmax) * 100 + '%'; t.append(f);
    r.append(t, el('span', 'vv', fmtDur(v)));
    zb.append(r);
  });
  body.append(zb);
}

function admUsers(body, D) {
  const top = el('div', 'adm-tools');
  const q = el('input'); q.type = 'search'; q.placeholder = '🔎 ค้นหาชื่อ'; q.value = G.adm.q;
  q.oninput = () => { G.adm.q = q.value; const pos = q.selectionStart; paintAdmin(); const nq = $('#card .adm-tools input'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch {} } };
  top.append(q, el('span', 'cnt', `${D.users.length} คน · ออนไลน์ ${D.users.filter((u) => u.on).length}`));
  body.append(top);
  const term = G.adm.q.trim().toLowerCase();
  const list = D.users.filter((u) => !term || String(u.n || '').toLowerCase().includes(term));
  if (!list.length) body.append(el('div', 'adm-empty', term ? `ไม่เจอ "${G.adm.q}"` : 'ยังไม่มีผู้ใช้'));
  for (const u of list) {
    const row = el('div', 'adm-user' + (u.on ? ' on' : '') + (G.adm.open === u.uid ? ' open' : ''));
    const main = el('button', 'um');
    const dot = el('i', 'dot');
    const who = el('span', 'who');
    who.append(el('b', null, (u.n || 'ไม่มีชื่อ') + (u.admin ? ' 🛡️' : '')), el('small', null, u.on ? `🟢 ออนไลน์ ${fmtDur(D.now - u.since)}` : `เห็นล่าสุด ${fmtAgo(u.last, D.now)}`));
    const nums = el('span', 'nums');
    nums.append(el('span', null, `${u.visits} ครั้ง`), el('span', null, fmtDur(u.ms)));
    const gift = el('span', 'gift', u.items.length ? `🎁 ${u.items.length}` : '');
    main.append(dot, who, gift, nums, el('span', 'chev', G.adm.open === u.uid ? '▴' : '▾'));
    main.onclick = () => { G.adm.open = G.adm.open === u.uid ? null : u.uid; paintAdmin(); };
    row.append(main);
    if (G.adm.open === u.uid) {
      const det = el('div', 'ud');
      const info = el('div', 'uinfo');
      info.append(
        el('span', null, `เข้าครั้งแรก ${u.first ? fmtTime(u.first) : '—'}`),
        el('span', null, `เข้ามา ${u.visits} ครั้ง · ใช้รวม ${fmtDur(u.ms)}`),
        el('span', null, `แชต ${u.chats} ข้อความ`),
      );
      det.append(info);
      det.append(el('div', 'uh', '🎁 ของพิเศษ — แตะเพื่อให้ / แตะอีกครั้งเพื่อยึดคืน (ถ้าใส่อยู่จะถอดออกทันที)'));
      const chips = el('div', 'uitems');
      for (const it of D.items) {
        const has = u.items.includes(it.id);
        const b = el('button', 'uit' + (has ? ' has' : ''));
        b.append(el('span', 'ck', has ? '✓' : '+'), el('span', null, it.label.replace(/^⭐\s*/, '')));
        b.title = has ? 'แตะเพื่อยึดคืน' : 'แตะเพื่อให้';
        b.onclick = () => admCmd(has ? 'revoke' : 'grant', u.uid, [it.id]);
        chips.append(b);
      }
      det.append(chips);
      const acts = el('div', 'acts');
      const all = el('button', 'pbtn sm', '🎁 ให้ทั้งหมด'); all.onclick = () => admCmd('grant', u.uid, ['all']);
      const none = el('button', 'pbtn sm', '↩️ ยึดคืนทั้งหมด'); none.disabled = !u.items.length;
      none.onclick = () => { if (confirm(`ยึดของพิเศษทั้งหมดคืนจาก ${u.n}?`)) admCmd('revoke', u.uid, ['all']); };
      acts.append(all, none);
      if (u.on) {
        const rt = [...G.others.values()].find((r) => r.by === u.uid || (r.p && r.p.uid === u.uid));
        if (rt) { const go = el('button', 'pbtn sm', '🚶 ไปหา'); go.onclick = () => { G.adminOpen = false; closeModal(); walkTo(rt.x + 14, rt.y + 4); }; acts.append(go); }
      }
      det.append(acts);
      row.append(det);
    }
    body.append(row);
  }
}

function admLog(body, D) {
  if (!D.log.length) { body.append(el('div', 'adm-empty', 'ยังไม่มีประวัติ')); return; }
  let lastDay = '';
  for (const e of D.log) {
    const k = new Date(e.ts + 7 * 3600000).toISOString().slice(0, 10);
    if (k !== lastDay) { lastDay = k; body.append(el('div', 'adm-day', k === D.today ? 'วันนี้' : thDay(k))); }
    const r = el('div', 'adm-ev ' + e.ev);
    r.append(el('span', 't', new Date(e.ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })), el('span', 'ic2', e.ev === 'in' ? '➡️' : '⬅️'),
      el('span', 'nm', e.n || 'ไม่มีชื่อ'), el('span', 'what', e.ev === 'in' ? 'เข้ามา' : `ออกไป · อยู่ ${fmtDur(e.ms)}`));
    body.append(r);
  }
}
// ปุ่มในเมนู ⋯ (เห็นเฉพาะแอดมิน) + พิมพ์ "สถิติ" / "stats"
$('#moreAdmin').onclick = openAdminPanel;
setInterval(() => { $('#moreAdmin').classList.toggle('hidden', !G.isAdmin); }, 1000);
setInterval(() => { if (G.adminOpen && G.adm.tab !== 'users' && !G.adm.busy && !document.hidden) admRefresh(); }, 30000);
