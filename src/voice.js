// ============================================================================
// voice.js — คุยเสียง/เปิดกล้องด้วย WebRTC (ใช้เฉพาะเวอร์ชันเซิร์ฟเวอร์ Node)
// ทุกคนต่อหากันตรงๆ (mesh) — คนที่ key น้อยกว่าเป็นฝ่ายโทร จึงไม่ชนกัน
// ============================================================================
// คุณภาพแชร์จอ (แบบ Discord)
const SHARE_Q = {
  saver: { w: 854, h: 480, fps: 30, br: 1200000, name: '480p 30fps · ประหยัดเน็ต' },
  smooth: { w: 1280, h: 720, fps: 60, br: 4500000, name: '720p 60fps · ลื่น (แนะนำ)' },
  sharp: { w: 1920, h: 1080, fps: 30, br: 5000000, name: '1080p 30fps · คมชัด (ตัวหนังสือ/งาน)' },
  max: { w: 1920, h: 1080, fps: 60, br: 8000000, name: '1080p 60fps · สูงสุด (เน็ตแรงเท่านั้น)' },
};
function makeVoice(net, onChange) {
  const sink = document.createElement('div');
  sink.hidden = true;
  document.body.append(sink);
  const V = {
    audioTrack: null, videoTrack: null, mic: false, cam: false, deaf: false, hq: true,
    peers: new Map(), meters: new Map(), actx: null,
    selfVideo: Object.assign(document.createElement('video'), { muted: true, playsInline: true, autoplay: true }),
  };
  V.selfVideo.setAttribute('playsinline', '');
  sink.append(V.selfVideo);
  const chains = new Map(), pendingIce = new Map();

  function ensureCtx() {
    if (!V.actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { V.actx = new AC({ latencyHint: 'interactive' }); if (V.settings && V.settings.spkId && V.actx.setSinkId) V.actx.setSinkId(V.settings.spkId).catch(() => {}); } }
    if (V.actx && V.actx.state === 'suspended') V.actx.resume().catch(() => {});
    return V.actx;
  }
  function meter(key, track) {
    const old = V.meters.get(key);
    if (old) { try { old.src.disconnect(); } catch {} V.meters.delete(key); }
    if (!track || !ensureCtx()) return;
    try {
      const src = V.actx.createMediaStreamSource(new MediaStream([track]));
      const an = V.actx.createAnalyser(); an.fftSize = 512; src.connect(an);
      V.meters.set(key, { src, an, buf: new Float32Array(512), lvl: 0, hold: 0 });
    } catch {}
  }
  V.tick = (dt) => {
    for (const m of V.meters.values()) {
      m.an.getFloatTimeDomainData(m.buf);
      let s = 0; for (let i = 0; i < m.buf.length; i++) s += m.buf[i] * m.buf[i];
      m.lvl = m.lvl * 0.6 + Math.sqrt(s / m.buf.length) * 0.4;
      m.hold = m.lvl > 0.02 ? 0.3 : m.hold - dt;
    }
  };
  V.speaking = (key) => {
    if (key === net.myKey) return V.mic && !V.deaf && (V.meters.get('me')?.hold || 0) > 0;
    const p = V.peers.get(key);
    return !!(p && p.playOk) && (V.meters.get(key)?.hold || 0) > 0;
  };
  V.videoFor = (key) => {
    if (key === net.myKey) return V.cam && V.videoTrack ? V.selfVideo : null;
    const p = V.peers.get(key);
    // แสดงเฉพาะตอนที่เขาเปิดกล้องอยู่จริง และมีภาพใหม่เข้ามาเรื่อยๆ (ปิดกล้องแล้ว = ไม่ค้างภาพสุดท้าย)
    if (!p || !p.hasVideo || !p.playOk || !(V.remoteCamOn ? V.remoteCamOn(key) : true)) return null;
    return Date.now() - (p.vLiveAt || 0) < 3000 ? p.videoEl : null;
  };
  // ภาพจากกล้องเพื่อนเป็นสีดำล้วน → ขอให้เครื่องเขาส่งภาพเต็มเฟรมใหม่ (ไม่เกินทุก 5 วิ)
  V.reportBlack = (key) => {
    const p = V.peers.get(key);
    if (!p || Date.now() - (p.kfAskAt || 0) < 5000) return;
    p.kfAskAt = Date.now();
    net.signal(key, { kf: 1 });
  };
  function watchFrames(p) {
    // นับว่ามีเฟรมวิดีโอใหม่เข้ามาไหม (ทันทีที่เฟรมมาถึง ไม่ต้องรอสถิติ)
    const el = p.videoEl;
    if (!el.requestVideoFrameCallback || p.rvfc) return;
    p.rvfc = true;
    const tick = () => { p.vLiveAt = Date.now(); if (V.peers.get(p.key) === p) el.requestVideoFrameCallback(tick); };
    el.requestVideoFrameCallback(tick);
  }

  // วิดีโอเริ่มที่บิตเรตสูงขึ้น (แชร์จอคมชัดเร็วขึ้น ไม่ต้องรอ 10-15 วิ) — ใส่ใน VP8/VP9/H264 ทุกตัว
  function tuneVideo(sdp) {
    const pts = [...sdp.matchAll(/a=rtpmap:(\d+) (VP8|VP9|H264)\/90000/gi)].map((m) => m[1]);
    for (const pt of pts) {
      const re = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`);
      if (re.test(sdp)) sdp = sdp.replace(re, (all, prm) => (/x-google-start-bitrate/.test(prm) ? all : `a=fmtp:${pt} ${prm};x-google-start-bitrate=1500`));
      else sdp = sdp.replace(new RegExp(`(a=rtpmap:${pt} [^\\r\\n]*\\r?\\n)`), `$1a=fmtp:${pt} x-google-start-bitrate=1500\r\n`);
    }
    return sdp;
  }
  function tuneOpus(sdp) {
    const m = sdp.match(/a=rtpmap:(\d+) opus\/48000/i);
    if (!m) return sdp;
    const want = { minptime: '10', useinbandfec: '1', usedtx: '0', stereo: '0', maxplaybackrate: '48000', maxaveragebitrate: V.hq ? '128000' : '64000', 'sprop-maxcapturerate': '48000' };
    const re = new RegExp(`a=fmtp:${m[1]} ([^\\r\\n]*)`);
    return sdp.replace(re, (_, params) => {
      const p = {};
      params.split(';').forEach((kv) => { const [k, v] = kv.trim().split('='); if (k) p[k] = v; });
      Object.assign(p, want);
      return `a=fmtp:${m[1]} ` + Object.entries(p).map(([k, v]) => `${k}=${v}`).join(';');
    });
  }
  async function tune(peer) {
    for (const [tx, max] of [[peer.audioTx, V.hq ? 128000 : 64000], [peer.videoTx, 700000], [peer.screenTx, 4500000]]) {
      if (!tx) continue;
      try {
        const p = tx.sender.getParameters();
        if (!p.encodings || !p.encodings.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = max;
        p.encodings[0].active = true;
        // เสียงสำคัญสุด: เน็ตไม่พอ ให้ลดภาพก่อน เสียงต้องไม่กระตุก
        const pri = tx === peer.audioTx ? 'high' : tx === peer.videoTx ? 'medium' : 'low';
        p.encodings[0].priority = pri; p.encodings[0].networkPriority = pri;
        if (tx === peer.videoTx) p.encodings[0].maxFramerate = 24;
        if (tx === peer.screenTx) {
          // แชร์จอแบบลื่น: 720p 60fps (จอใหญ่กว่า 720p = ย่อลงก่อนส่ง) · เน็ตไม่พอ = ลดความคมก่อน ไม่ลดเฟรม
          const so = V.screenOpts || SHARE_Q.smooth;
          p.encodings[0].maxFramerate = so.fps;
          p.encodings[0].maxBitrate = so.br;
          const st = V.screenTrack && V.screenTrack.getSettings ? V.screenTrack.getSettings() : {};
          const scale = st.height ? Math.max(1, st.height / so.h, (st.width || 0) / so.w) : 1;
          p.encodings[0].scaleResolutionDownBy = scale;
          p.degradationPreference = so.fps >= 60 ? 'maintain-framerate' : 'balanced';
        }
        await tx.sender.setParameters(p);
      } catch {}
    }
  }
  // ส่งเสียง/ภาพให้เฉพาะคนที่อยู่โซนเดียวกัน (คนละโซน = ไม่ส่งและไม่เล่นเสียง)
  function apply(peer) {
    const ok = !!peer.allowed;
    peer.audioTx?.sender.replaceTrack(ok ? V.mixTrack || V.audioTrack || null : null).catch(() => {});
    peer.videoTx?.sender.replaceTrack(ok && V.cam ? V.videoTrack : null).catch(() => {});
    peer.screenTx?.sender.replaceTrack(peer.screenOk && V.screenTrack ? V.screenTrack : null).catch(() => {});
    volOut(peer);
  }
  // ---- ความดังเสียงเพื่อน: เกิน 100% ใช้ WebAudio ขยาย (เบราว์เซอร์ที่ไม่รองรับ/เสียงในเครื่องยังไม่เริ่ม = ใช้แบบปกติ สูงสุด 100%) ----
  V.master = (() => { try { const v = Number(JSON.parse(localStorage.getItem('pixel.vboost') || 'null')); return v >= 0.5 && v <= 2.5 ? v : 1.5; } catch { return 1.5; } })();
  const UA = navigator.userAgent;
  const canBoost = !/iP(hone|ad|od)/.test(UA) && !(/Safari\//.test(UA) && !/Chrome|Chromium|CriOS|Edg|Firefox|OPR/.test(UA));
  V.canBoost = canBoost;
  function volOut(p) {
    const viaRelay = Date.now() - (p.relayRxAt || 0) < 1500;
    const playing = !!p.playOk && !V.deaf && !V.bgMute && !p.userMuted && !viaRelay;
    const ev = (p.vol ?? 1) * V.master;
    const spk = V.settings && V.settings.spkId;
    const want = canBoost && ev > 1.001 && V.actx && V.actx.state === 'running' && p.audioEl.srcObject && (!spk || V.actx.setSinkId);
    if (want) {
      try {
        if (!p.boost || p.boost.stream !== p.audioEl.srcObject) {
          if (p.boost) { try { p.boost.src.disconnect(); p.boost.g.disconnect(); } catch {} }
          const src = V.actx.createMediaStreamSource(p.audioEl.srcObject), g = V.actx.createGain();
          src.connect(g).connect(V.actx.destination);
          p.boost = { src, g, stream: p.audioEl.srcObject };
        }
        p.boost.g.gain.value = playing ? ev : 0;
        p.audioEl.muted = true; // ต้องผูกกับ <audio> ไว้ (Chrome) แต่ให้เสียงออกทาง WebAudio ทางเดียว
        if (playing) p.audioEl.play().catch(() => {});
        return;
      } catch { /* ใช้แบบปกติแทน */ }
    }
    if (p.boost) { try { p.boost.src.disconnect(); p.boost.g.disconnect(); } catch {} p.boost = null; }
    try { p.audioEl.volume = Math.min(1, ev); } catch {}
    p.audioEl.muted = !playing;
    if (playing) p.audioEl.play().catch(() => {});
  }
  V.setMaster = (v) => {
    V.master = Math.max(0.5, Math.min(2.5, v));
    try { localStorage.setItem('pixel.vboost', JSON.stringify(V.master)); } catch {}
    for (const [k, p] of V.peers) { volOut(p); const rx = relay.rx.get(k); if (rx) rx.gain.gain.value = (p.vol ?? 1) * V.master; }
  };
  V.audience = new Set();
  V.screenAudience = new Set();
  V.setScreenAudience = (keys) => {
    V.screenAudience = keys;
    for (const p of V.peers.values()) {
      const ok = keys.has(p.key);
      if (ok !== p.screenOk) { p.screenOk = ok; p.screenTx?.sender.replaceTrack(ok && V.screenTrack ? V.screenTrack : null).catch(() => {}); }
    }
  };
  // ปิดเสียงเฉพาะคน (ใช้ได้ทุกเครื่องรวม iPhone ที่ปรับระดับเสียงจากเว็บไม่ได้)
  V.setUserMuted = (key, m) => {
    const p = V.peers.get(key);
    if (p && !!p.userMuted !== !!m) { p.userMuted = !!m; apply(p); }
  };
  V.setVolume = (key, v) => {
    const rx = relay.rx.get(key); if (rx) rx.gain.gain.value = v * V.master;
    const p = V.peers.get(key);
    if (p && Math.abs((p.vol ?? 1) - v) > 0.04) { p.vol = v; volOut(p); }
  };
  // sendKeys = คนที่เสียงเราไปถึง (ตามรัศมีไมค์ของเรา), playKeys = คนที่เราได้ยิน (ตามรัศมีไมค์ของเขา)
  V.playAud = new Set();
  // เขาบอกว่า "กำลังฟังเราอยู่" (ฝั่งคนฟังเป็นคนตัดสินว่าได้ยินไหม) → ส่งเสียงให้เขาเสมอ แม้ตำแหน่งที่เราเห็นจะคลาดเคลื่อน
  const wantFresh = (p) => Date.now() - (p.wantAt || 0) < 9000;
  V.setAudience = (sendKeys, playKeys = sendKeys) => {
    V.audience = sendKeys; V.playAud = playKeys;
    for (const p of V.peers.values()) {
      const ok = sendKeys.has(p.key) || wantFresh(p), pl = playKeys.has(p.key);
      if (ok !== p.allowed || pl !== p.playOk) { p.allowed = ok; p.playOk = pl; apply(p); }
    }
  };
  function create(key, initiator) {
    close(key);
    const pc = new RTCPeerConnection({ iceServers: net.iceServers, bundlePolicy: 'max-bundle' });
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true; audioEl.setAttribute('playsinline', ''); audioEl.muted = V.deaf;
    const videoEl = document.createElement('video');
    videoEl.autoplay = true; videoEl.muted = true; videoEl.playsInline = true; videoEl.setAttribute('playsinline', '');
    const screenEl = document.createElement('video');
    screenEl.autoplay = true; screenEl.muted = true; screenEl.playsInline = true; screenEl.setAttribute('playsinline', '');
    sink.append(audioEl, videoEl, screenEl);
    if (V.settings && V.settings.spkId && audioEl.setSinkId) audioEl.setSinkId(V.settings.spkId).catch(() => {});
    const peer = { created: Date.now(), key, pc, initiator, audioEl, videoEl, screenEl, audioTx: null, videoTx: null, screenTx: null, hasVideo: false, hasScreen: false, state: 'new', allowed: V.audience.has(key), playOk: V.playAud.has(key), screenOk: V.screenAudience.has(key) };
    V.peers.set(key, peer);
    pc.onicecandidate = (e) => e.candidate && net.signal(key, { candidate: e.candidate });
    pc.ontrack = (e) => {
      if (e.track.kind === 'audio') { audioEl.srcObject = new MediaStream([e.track]); audioEl.play().catch(() => onChange('unlock')); meter(key, e.track); }
      else {
        // วิดีโอช่องแรก = กล้อง, ช่องที่สอง = แชร์จอ
        const vids = pc.getTransceivers().filter((t) => t.receiver.track.kind === 'video');
        if (vids.indexOf(e.transceiver) === 1) { screenEl.srcObject = new MediaStream([e.track]); screenEl.play().catch(() => {}); peer.hasScreen = true; }
        else { videoEl.srcObject = new MediaStream([e.track]); videoEl.play().catch(() => {}); peer.hasVideo = true; watchFrames(peer); }
      }
    };
    pc.onconnectionstatechange = () => {
      peer.state = pc.connectionState;
      if (peer.state === 'connected') tune(peer);
      if (peer.state === 'failed' && initiator) { try { pc.restartIce(); } catch {} offer(peer, true); }
      // หลุดชั่วคราว (เน็ตสลับ Wi-Fi/4G): ถ้าไม่กลับมาใน 6 วิ ให้เริ่มเชื่อมใหม่
      clearTimeout(peer.dcTimer);
      if (peer.state === 'disconnected') peer.dcTimer = setTimeout(() => { if (peer.state === 'disconnected' && initiator) { try { pc.restartIce(); } catch {} offer(peer, true); } }, 6000);
      if (peer.state === 'failed') peer.failedAt = peer.failedAt || Date.now(); else if (peer.state === 'connected') peer.failedAt = 0;
      onChange('peers');
    };
    if (initiator) {
      peer.audioTx = pc.addTransceiver('audio', { direction: 'sendrecv' });
      peer.videoTx = pc.addTransceiver('video', { direction: 'sendrecv' });
      peer.screenTx = pc.addTransceiver('video', { direction: 'sendrecv' });
      preferVP8(peer.videoTx); preferVP8(peer.screenTx); preferRED(peer.audioTx);
      apply(peer);
      offer(peer);
    }
    return peer;
  }
  // วิดีโอ: ใช้ VP8 ก่อน (มือถือ iPhone ชอบส่ง H.264 ซึ่งคอมบางเครื่องถอดรหัสแล้วได้ภาพดำ)
  // เสียง: ใช้ RED (ส่งข้อมูลซ้ำซ้อนในแพ็กเก็ต) ก่อน Opus ถ้ารองรับ → เน็ตหลุดบางแพ็กเก็ตเสียงก็ไม่ขาด
  function preferRED(tx) {
    try {
      if (!tx || !tx.setCodecPreferences || !window.RTCRtpReceiver || !RTCRtpReceiver.getCapabilities) return;
      const caps = RTCRtpReceiver.getCapabilities('audio');
      if (!caps || !caps.codecs || !caps.codecs.some((c) => /red/i.test(c.mimeType))) return;
      const rank = (c) => (/red/i.test(c.mimeType) ? 0 : /opus/i.test(c.mimeType) ? 1 : 2);
      tx.setCodecPreferences([...caps.codecs].sort((a, b) => rank(a) - rank(b)));
    } catch {}
  }
  function preferVP8(tx) {
    try {
      if (!tx || !tx.setCodecPreferences || !window.RTCRtpReceiver || !RTCRtpReceiver.getCapabilities) return;
      const caps = RTCRtpReceiver.getCapabilities('video');
      if (!caps || !caps.codecs || !caps.codecs.some((c) => /vp8/i.test(c.mimeType))) return;
      const rank = (c) => (/vp8/i.test(c.mimeType) ? 0 : /vp9/i.test(c.mimeType) ? 1 : /h264/i.test(c.mimeType) ? 2 : /rtx|red|ulpfec|flexfec/i.test(c.mimeType) ? 4 : 3);
      tx.setCodecPreferences([...caps.codecs].sort((a, b) => rank(a) - rank(b)));
    } catch {}
  }
  async function offer(peer, iceRestart = false) {
    try {
      const o = await peer.pc.createOffer({ iceRestart });
      await peer.pc.setLocalDescription({ type: 'offer', sdp: tuneVideo(tuneOpus(o.sdp)) });
      net.signal(peer.key, { sdp: { type: 'offer', sdp: peer.pc.localDescription.sdp } });
    } catch (e) { console.warn('offer', e); }
  }
  async function handleSignal(from, data) {
    let peer = V.peers.get(from);
    if (data.relayPlease) { if (peer) { peer.forceRelay = Date.now(); if (V.actx && V.actx.state !== 'running') onChange('unlock-mic'); } return; }
    if (data.watch) { if (V.screenTrack) V.watchers.set(from, Date.now()); return; }
    if (data.kf) {
      // เพื่อนเห็นภาพกล้องเราเป็นสีดำ → บังคับส่งภาพเต็มเฟรมใหม่ (ปิด-เปิดการส่งวิดีโอช่องนี้)
      const tx = peer && peer.videoTx;
      if (tx && V.videoTrack) (async () => {
        try { const p1 = tx.sender.getParameters(); if (p1.encodings && p1.encodings[0]) { p1.encodings[0].active = false; await tx.sender.setParameters(p1); } } catch {}
        // ต้องขอพารามิเตอร์ใหม่ทุกครั้ง (ใช้ชุดเดิมซ้ำจะตั้งค่าไม่ติด แล้ววิดีโอจะหยุดส่งถาวร)
        for (let i = 0; i < 3; i++) { try { const p2 = tx.sender.getParameters(); if (!p2.encodings || !p2.encodings[0] || p2.encodings[0].active !== false) break; p2.encodings[0].active = true; await tx.sender.setParameters(p2); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
        try { await tx.sender.replaceTrack(null); await tx.sender.replaceTrack(V.videoTrack); } catch {}
      })();
      return;
    }
    if ('fb' in data) {
      if (peer) {
        peer.wantAt = Date.now();
        if (!peer.allowed) { peer.allowed = true; apply(peer); }
        if (data.fb === 2) return;
        peer.theyHear = { ok: !!data.fb, at: Date.now() };
        // เขาบอกว่ายังไม่ได้ยินเรา ทั้งที่เราเปิดไมค์อยู่ → ส่งทางเซิร์ฟเวอร์ (หรือขอให้แตะจอถ้าเสียงในเครื่องยังไม่เริ่ม)
        if (!data.fb && V.mic && V.audioTrack) { peer.forceRelay = Date.now(); if (V.actx && V.actx.state !== 'running') onChange('unlock-mic'); }
      }
      return;
    }
    if (data.sdp) {
      const desc = { type: data.sdp.type, sdp: tuneOpus(data.sdp.sdp) };
      if (desc.type === 'offer') {
        if (!peer || peer.initiator) peer = create(from, false);
        await peer.pc.setRemoteDescription(desc);
        for (const tx of peer.pc.getTransceivers()) {
          const k = tx.receiver.track.kind;
          if (k === 'audio' && !peer.audioTx) peer.audioTx = tx;
          if (k === 'video' && !peer.videoTx) peer.videoTx = tx;
          else if (k === 'video' && tx !== peer.videoTx && !peer.screenTx) peer.screenTx = tx;
          tx.direction = 'sendrecv';
          if (k === 'video') preferVP8(tx);
          if (k === 'audio') preferRED(tx);
        }
        apply(peer);
        const a = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription({ type: 'answer', sdp: tuneVideo(tuneOpus(a.sdp)) });
        net.signal(from, { sdp: { type: 'answer', sdp: peer.pc.localDescription.sdp } });
      } else if (peer && peer.pc.signalingState === 'have-local-offer') {
        await peer.pc.setRemoteDescription(desc);
      }
      if (peer) { for (const c of pendingIce.get(from) || []) await peer.pc.addIceCandidate(c).catch(() => {}); pendingIce.delete(from); }
    } else if (data.candidate) {
      if (peer && peer.pc.remoteDescription) await peer.pc.addIceCandidate(data.candidate).catch(() => {});
      else { if (!pendingIce.has(from)) pendingIce.set(from, []); pendingIce.get(from).push(data.candidate); }
    }
  }
  net.onSignal((from, data) => {
    const next = (chains.get(from) || Promise.resolve()).then(() => handleSignal(from, data)).catch((e) => console.warn('signal', e));
    chains.set(from, next);
  });
  // ปิดทุกอย่างตอนออก: ไมค์/กล้อง/แชร์จอ/การเชื่อมต่อ (ไฟไมค์-กล้องในเครื่องดับทันที)
  V.shutdown = () => {
    for (const k of [...V.peers.keys()]) { try { close(k); } catch {} }
    for (const t of [V.audioTrack, V.meterTrack, V.videoTrack, V.screenTrack]) { try { t && t.stop(); } catch {} }
    V.audioTrack = V.meterTrack = V.videoTrack = V.screenTrack = null; V.mic = V.cam = false;
    try { V.actx && V.actx.close(); } catch {}
    for (const ch of nsChains.values()) { try { ch.stop(); } catch {} } nsChains.clear();
    try { nsCtx && nsCtx.close(); } catch {}
  };
  function close(key) {
    const p = V.peers.get(key);
    if (!p) return;
    V.peers.delete(key);
    try { p.pc.close(); } catch {}
    p.audioEl.remove(); p.videoEl.remove(); p.screenEl.remove();
    const m = V.meters.get(key); if (m) { try { m.src.disconnect(); } catch {} V.meters.delete(key); }
    chains.delete(key);
    relayDrop(key);
  }
  V.syncPeers = (keys) => {
    for (const k of keys) {
      if (k === net.myKey || V.peers.has(k)) continue;
      if (net.myKey && net.myKey < k) create(k, true);
    }
    for (const k of [...V.peers.keys()]) if (!keys.includes(k)) close(k);
  };
  V.closeAll = () => { for (const k of [...V.peers.keys()]) close(k); };

  // ---------------------------------------------------------- ตั้งค่า ----
  V.settings = Object.assign({ micId: '', camId: '', spkId: '', ns: true, ec: true, agc: true, monitor: false, monVol: 0.8, hq: true, facing: 'user', nsAi: true }, lsGet('pixel.voice', {}));
  V.hq = V.settings.hq;
  const saveSettings = () => lsSet('pixel.voice', V.settings);
  V.mon = null;

  // ---------- ตัดเสียงรบกวนแบบ AI (RNNoise · ทำงานในเครื่องเราเอง ไม่ส่งเสียงไปไหน) ----------
  // ตัวตัดเสียงของเบราว์เซอร์ตัดได้แค่เสียงฮัมเบาๆ — ตัวนี้ตัดพัดลม แอร์ คีย์บอร์ด เสียงรถ ได้จริง เหลือแต่เสียงคน
  // ต่อสายแบบนี้: ไมค์ดิบ → AudioContext 48kHz → AudioWorklet (RNNoise ทีละ 10ms) → track ใหม่ที่ส่งให้เพื่อน
  const nsChains = new Map();   // track ที่ตัดเสียงแล้ว → { raw, rawClone, stop }
  let nsCtx = null, nsMod = null, nsBytes = null;
  const NS_WORKLET = `
class PxNs extends AudioWorkletProcessor {
  constructor(o) { super();
    const env = { log10: Math.log10, sin: Math.sin, cos: Math.cos };
    this.e = new WebAssembly.Instance(new WebAssembly.Module(o.processorOptions.wasm), { env }).exports;
    this.st = this.e.rnnoise_create(0); this.ib = this.e.px_buf(); this.ob = this.e.px_buf();
    this.inb = new Float32Array(480); this.ni = 0;
    this.q = new Float32Array(4096); this.qr = 0; this.qn = 480;           // หน่วง 10ms ไว้ก่อน (ให้มีของส่งออกทันเสมอ)
    this.on = true; this.vad = 0; this.g = 1; this.t = 0;
    this.port.onmessage = (e) => { if ('on' in e.data) this.on = e.data.on; };
  }
  frame() {
    const m = new Float32Array(this.e.memory.buffer), ib = this.ib >> 2, ob = this.ob >> 2;
    for (let k = 0; k < 480; k++) m[ib + k] = this.inb[k] * 32768;
    const vad = this.e.rnnoise_process_frame(this.st, this.ob, this.ib);
    const o = new Float32Array(this.e.memory.buffer);
    // ประตูเสียงเบาๆ ตามความน่าจะเป็นว่า "มีคนพูด": ไม่มีใครพูด = ลดอีก ~20dB (ตัดเสียงคลิกคีย์บอร์ดที่หลุดมา) · มีเสียงพูด = เปิดทันที
    this.vad = vad > this.vad ? vad : this.vad * 0.93;
    const want = this.vad > 0.35 ? 1 : 0.1;
    let w = (this.q.length + this.qr + this.qn) % this.q.length;
    for (let k = 0; k < 480; k++) {
      this.g += (want - this.g) * (want > this.g ? 0.05 : 0.0015);
      this.q[w] = (o[ob + k] / 32768) * this.g; w = (w + 1) % this.q.length;
    }
    this.qn += 480;
  }
  process(i, out) {
    const a = i[0] && i[0][0], b = out[0][0]; if (!b) return true;
    if (!this.on) { if (a) b.set(a); return true; }
    if (a) for (let k = 0; k < a.length; k++) { this.inb[this.ni++] = a[k]; if (this.ni === 480) { this.ni = 0; this.frame(); } }
    for (let k = 0; k < b.length; k++) { if (this.qn > 0) { b[k] = this.q[this.qr]; this.qr = (this.qr + 1) % this.q.length; this.qn--; } else b[k] = 0; }
    if (++this.t % 25 === 0) this.port.postMessage({ vad: this.vad });
    return true;
  }
}
registerProcessor('px-ns', PxNs);`;
  V.nsOk = typeof AudioWorkletNode !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof RNNOISE_WASM_B64 === 'string';
  V.nsActive = () => !!(V.audioTrack && nsChains.has(V.audioTrack));
  async function aiDenoise(raw) {
    if (!V.nsOk) return null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!nsCtx || nsCtx.state === 'closed') { nsCtx = new AC({ sampleRate: 48000, latencyHint: 'interactive' }); nsMod = null; }
      if (nsCtx.sampleRate !== 48000) throw new Error('rate ' + nsCtx.sampleRate);
      if (!nsMod) nsMod = nsCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([NS_WORKLET], { type: 'text/javascript' })));
      await nsMod;
      if (!nsBytes) { const bin = atob(RNNOISE_WASM_B64); nsBytes = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) nsBytes[k] = bin.charCodeAt(k); }
      if (nsCtx.state !== 'running') await Promise.race([nsCtx.resume(), new Promise((r) => setTimeout(r, 800))]);
      const src = nsCtx.createMediaStreamSource(new MediaStream([raw]));
      const node = new AudioWorkletNode(nsCtx, 'px-ns', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 1, channelCountMode: 'explicit', processorOptions: { wasm: nsBytes } });
      const dest = nsCtx.createMediaStreamDestination(); dest.channelCount = 1;
      src.connect(node).connect(dest);
      const out = dest.stream.getAudioTracks()[0];
      try { out.contentHint = 'speech'; } catch {}
      const rawClone = raw.clone();
      node.port.onmessage = (e) => { V.nsVad = e.data.vad; };
      nsChains.set(out, { raw, rawClone, node, stop: () => { try { src.disconnect(); node.disconnect(); } catch {} raw.stop(); rawClone.stop(); } });
      return out;
    } catch (e) { console.warn('ai-ns off', e); return null; }
  }
  // เบราว์เซอร์พักเสียงไว้ (ยังไม่แตะจอ / สลับแอปบนมือถือ) — แตะครั้งถัดไปให้ทำงานต่อ
  addEventListener('pointerdown', () => { if (nsCtx && nsCtx.state !== 'running' && nsCtx.state !== 'closed') nsCtx.resume().catch(() => {}); }, true);
  V.nsStalled = () => !!(nsCtx && V.nsActive() && nsCtx.state !== 'running');

  async function getMicTrack() {
    const st = V.settings;
    const a = { echoCancellation: st.ec, noiseSuppression: st.ns, autoGainControl: st.agc, channelCount: { ideal: 1 }, sampleRate: { ideal: 48000 } };
    if (st.micId) a.deviceId = { exact: st.micId };
    let s;
    try { s = await navigator.mediaDevices.getUserMedia({ audio: a }); }
    catch (e) {
      if (st.micId && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) { st.micId = ''; delete a.deviceId; s = await navigator.mediaDevices.getUserMedia({ audio: a }); }
      else throw e;
    }
    const raw = s.getAudioTracks()[0];
    try { raw.contentHint = 'speech'; } catch {}
    // ตัดเสียงรบกวนแบบ AI (RNNoise) — ถ้าใช้ไม่ได้ก็ส่งเสียงไมค์ตรงๆ เหมือนเดิม
    const t = (st.ns && st.nsAi && (await aiDenoise(raw))) || raw;
    raw.addEventListener('ended', () => {
      if (V.audioTrack !== t) return;
      V.micLost = true;
      onChange('error', 'ไมค์หลุด — มักเกิดเพราะแอปอื่นแย่งไมค์ไป (เช่น Discord, โทรศัพท์, LINE call) ปิดแอปนั้นแล้วกดเปิดไมค์ใหม่');
      const ch = nsChains.get(t); if (ch) { nsChains.delete(t); ch.stop(); t.stop(); }
      V.audioTrack = null; V.mic = false; onChange('media');
    });
    return t;
  }
  function micError(e) {
    onChange('error', !window.isSecureContext ? 'ต้องเปิดผ่าน https:// ถึงจะใช้ไมค์/กล้องได้' : e && e.name === 'NotAllowedError' ? 'ไม่ได้รับอนุญาตให้ใช้ไมค์ — เปิดสิทธิ์ในการตั้งค่าเบราว์เซอร์' : 'เปิดไมค์ไม่สำเร็จ');
  }
  // ใส่ track ใหม่: ส่งให้ทุกคน + ตัววัดเสียง + ฟังเสียงตัวเอง
  function setAudioTrack(t) {
    setTimeout(() => rebuildMix(), 0);
    const old = V.audioTrack;
    V.audioTrack = t;
    if (V.meterTrack) V.meterTrack.stop();
    V.meterTrack = t ? t.clone() : null;          // สำเนาที่เปิดไว้เสมอ ใช้วัดระดับเสียง/ฟังตัวเอง
    if (V.meterTrack) V.meterTrack.enabled = true;
    if (t) t.enabled = V.mic && !V.deaf;
    for (const p of V.peers.values()) apply(p);
    if (old && old !== t) { old.stop(); const ch = nsChains.get(old); if (ch) { nsChains.delete(old); ch.stop(); } }
    meter('me', V.meterTrack);
    const ch = t && nsChains.get(t);
    meter('raw', ch ? ch.rawClone : null);   // ไว้เช็ก "ไมค์ไม่มีเสียงเข้า" จากเสียงดิบ (เสียงที่ตัดแล้วเงียบได้จริง)
    updateMonitor();
  }
  V.ensureMic = async () => {
    ensureCtx();
    if (V.audioTrack) return true;
    try { setAudioTrack(await getMicTrack()); return true; } catch (e) { micError(e); return false; }
  };
  V.reacquireMic = async () => {
    if (!V.audioTrack && !V.settings.monitor) return;
    try { setAudioTrack(await getMicTrack()); onChange('media'); } catch (e) { micError(e); }
  };

  // ---------- ฟังเสียงตัวเอง (ทดสอบไมค์ได้แม้ปิดไมค์กับเพื่อนอยู่) ----------
  function updateMonitor() {
    if (V.mon) { try { V.mon.src.disconnect(); V.mon.gain.disconnect(); } catch {} V.mon = null; }
    if (!V.settings.monitor || !V.meterTrack || !ensureCtx()) return;
    try {
      const src = V.actx.createMediaStreamSource(new MediaStream([V.meterTrack]));
      const gain = V.actx.createGain();
      gain.gain.value = V.deaf ? 0 : V.settings.monVol;
      src.connect(gain).connect(V.actx.destination);
      V.mon = { src, gain };
    } catch (e) { console.warn('monitor', e); }
  }
  V.setMonitor = async (on) => {
    V.settings.monitor = on; saveSettings();
    if (on && !(await V.ensureMic())) { V.settings.monitor = false; saveSettings(); onChange('media'); return; }
    updateMonitor();
    onChange('media');
  };
  V.setMonitorVolume = (v) => {
    V.settings.monVol = v; saveSettings();
    if (V.mon) V.mon.gain.gain.setTargetAtTime(V.deaf ? 0 : v, V.actx.currentTime, 0.02);
  };
  V.level = () => (V.meters.get('me')?.lvl || 0);

  // ---------- ลำโพง (เบราว์เซอร์ที่รองรับ) ----------
  V.canPickSpeaker = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
  V.setSpeaker = async (id) => {
    V.settings.spkId = id; saveSettings();
    for (const p of V.peers.values()) p.audioEl.setSinkId?.(id).catch(() => {});
    if (V.actx && V.actx.setSinkId) V.actx.setSinkId(id).catch(() => {});
  };
  V.setOption = (k, v) => {
    V.settings[k] = v; saveSettings();
    if (k === 'hq') { V.hq = v; for (const p of V.peers.values()) tune(p); }
    if (k === 'ns' || k === 'nsAi' || k === 'ec' || k === 'agc' || k === 'micId') V.reacquireMic();
  };

  // ---------------------------------------------------------- ปุ่มหลัก ----
  V.toggleMic = async () => {
    if (!V.audioTrack) { V.mic = true; if (!(await V.ensureMic())) { V.mic = false; return; } }
    else V.mic = !V.mic;
    if (V.mic && V.deaf) V.toggleDeaf();
    V.audioTrack.enabled = V.mic && !V.deaf;
    onChange('media');
  };
  async function getCamTrack() {
    const st = V.settings;
    const v = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } };
    if (st.camId && st.facing === 'user') v.deviceId = { exact: st.camId }; else v.facingMode = st.facing;
    let s;
    try { s = await navigator.mediaDevices.getUserMedia({ video: v }); }
    catch (e) {
      if (v.deviceId) { st.camId = ''; delete v.deviceId; v.facingMode = 'user'; s = await navigator.mediaDevices.getUserMedia({ video: v }); }
      else throw e;
    }
    const t = s.getVideoTracks()[0];
    try { t.contentHint = 'motion'; } catch {}
    // กล้องถูกระบบปิด (เช่น มือถือสลับแอป/ล็อกจอ/แอปอื่นแย่งกล้อง) → ปิดกล้องให้ตรงกับความจริง ไม่ให้เพื่อนเห็นภาพค้าง/ภาพดำ
    let muteT = 0;
    t.addEventListener('mute', () => { clearTimeout(muteT); muteT = setTimeout(() => { if (V.videoTrack === t && t.muted) onChange('error', '📷 กล้องไม่ส่งภาพ (ระบบพักกล้องไว้) — ถ้าเปิดผ่าน LINE/IG/Facebook ให้เปิดเว็บใน Safari หรือ Chrome แทน แล้วเปิดกล้องใหม่'); }, 3000); });
    t.addEventListener('unmute', () => clearTimeout(muteT));
    t.addEventListener('ended', () => { if (V.videoTrack === t) { V.cam = false; setVideoTrack(null); onChange('media'); onChange('error', 'กล้องหยุดทำงาน (ระบบหรือแอปอื่นปิดกล้อง) — กดเปิดกล้องใหม่อีกครั้ง'); } });
    return t;
  }
  function setVideoTrack(t) {
    const old = V.videoTrack;
    V.videoTrack = t;
    V.selfVideo.srcObject = t ? new MediaStream([t]) : null;
    if (t) V.selfVideo.play().catch(() => {});
    for (const p of V.peers.values()) { apply(p); if (t) tune(p); }
    if (old && old !== t) old.stop();
  }
  V.toggleCam = async () => {
    if (V.cam) { V.cam = false; setVideoTrack(null); }
    else {
      try { V.cam = true; setVideoTrack(await getCamTrack()); }
      catch (e) {
        V.cam = false;
        onChange('error', !window.isSecureContext ? 'ต้องเปิดผ่าน https:// ถึงจะใช้กล้องได้' : e.name === 'NotAllowedError' ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง' : 'เปิดกล้องไม่สำเร็จ');
        return;
      }
    }
    onChange('media');
  };
  V.switchCamera = async (camId, facing) => {
    if (camId !== undefined) V.settings.camId = camId;
    if (facing) V.settings.facing = facing;
    saveSettings();
    if (!V.cam) return;
    try { setVideoTrack(await getCamTrack()); onChange('media'); } catch { onChange('error', 'สลับกล้องไม่สำเร็จ'); }
  };
  // พับจอ/สลับแอป: ปิดเสียงทั้งเข้าและออกชั่วคราว (เมื่อผู้ใช้ไม่ได้เปิด "ได้ยินตอนพับจอ")
  V.bgMute = false;
  V.setBgMute = (on) => {
    V.bgMute = !!on;
    for (const p of V.peers.values()) apply(p);
    if (V.audioTrack) V.audioTrack.enabled = V.mic && !V.deaf && !V.bgMute;
  };
  // กลับมาที่หน้าเว็บ: iOS อาจหยุดเสียงไว้ สั่งเล่นใหม่
  V.resumeAudio = () => {
    if (V.actx && V.actx.state === 'suspended') V.actx.resume().catch(() => {});
    for (const p of V.peers.values()) if (p.playOk && !V.deaf && !V.bgMute) p.audioEl.play().catch(() => {});
  };
  V.toggleDeaf = () => {
    V.deaf = !V.deaf;
    if (V.deaf && V.mic) V.mic = false;
    for (const p of V.peers.values()) apply(p);
    if (V.audioTrack) V.audioTrack.enabled = V.mic && !V.deaf;
    if (V.mon) V.mon.gain.gain.value = V.deaf ? 0 : V.settings.monVol;
    onChange('media');
  };
  // ---------- แชร์จอ ----------
  V.canShare = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  V.screenTrack = null;
  V.selfScreen = Object.assign(document.createElement('video'), { muted: true, playsInline: true, autoplay: true });
  V.selfScreen.setAttribute('playsinline', ''); sink.append(V.selfScreen);
  // ---- เสียงจากจอที่แชร์: ผสมกับไมค์แล้วส่งในช่องเสียงเดิม (ปิดไมค์ = ยังได้ยินเสียงจอ) ----
  const mix = { dest: null, mic: null, scr: null };
  function rebuildMix() {
    const st = V.screenAudio;
    if (!st || st.readyState !== 'live') {
      if (V.mixTrack) { try { mix.mic && mix.mic.disconnect(); mix.scr && mix.scr.disconnect(); } catch {} V.mixTrack = null; mix.dest = null; for (const p of V.peers.values()) apply(p); }
      return;
    }
    const ctx = ensureCtx();
    if (!ctx) return;
    try {
      if (!mix.dest) { mix.dest = ctx.createMediaStreamDestination(); }
      try { mix.mic && mix.mic.disconnect(); mix.scr && mix.scr.disconnect(); } catch {}
      mix.scr = ctx.createMediaStreamSource(new MediaStream([st])); mix.scr.connect(mix.dest);
      // ไมค์: ใช้ track ที่ส่งจริง (ปิดไมค์ = track ถูก disable = เงียบเอง)
      mix.mic = V.audioTrack ? ctx.createMediaStreamSource(new MediaStream([V.audioTrack])) : null;
      if (mix.mic) mix.mic.connect(mix.dest);
      V.mixTrack = mix.dest.stream.getAudioTracks()[0];
      for (const p of V.peers.values()) apply(p);
    } catch { V.mixTrack = null; }
  }
  V.startScreen = async (opts) => {
    if (!V.canShare) { onChange('error', 'อุปกรณ์นี้แชร์จอไม่ได้ (ใช้คอมด้วย Chrome / Edge / Firefox / Safari)'); return; }
    const so = (opts && SHARE_Q[opts.q]) || SHARE_Q.smooth;
    const wantAudio = !opts || opts.audio !== false;
    try {
      ensureCtx(); if (V.actx && V.actx.state !== 'running') V.actx.resume().catch(() => {});
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: so.fps, max: so.fps }, width: { ideal: so.w, max: 1920 }, height: { ideal: so.h, max: 1080 } },
        audio: wantAudio ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false } : false,
        systemAudio: wantAudio ? 'include' : 'exclude', selfBrowserSurface: 'exclude', surfaceSwitching: 'include',
      });
      const t = s.getVideoTracks()[0];
      try { t.contentHint = so.fps >= 60 ? 'motion' : 'detail'; } catch {}
      try { await t.applyConstraints({ frameRate: { ideal: so.fps, max: so.fps }, width: { max: so.w }, height: { max: so.h } }); } catch {}
      t.onended = () => V.stopScreen();
      V.screenOpts = so;
      V.screenAudio = s.getAudioTracks()[0] || null;
      if (V.screenAudio) V.screenAudio.onended = () => { V.screenAudio = null; rebuildMix(); onChange('media'); };
      rebuildMix();
      V.screenTrack = t;
      V.selfScreen.srcObject = new MediaStream([t]); V.selfScreen.play().catch(() => {});
      for (const p of V.peers.values()) { p.screenTx?.sender.replaceTrack(p.screenOk ? t : null).catch(() => {}); tune(p); }
      onChange('media');
    } catch (e) {
      if (e && e.name !== 'NotAllowedError' && e.name !== 'AbortError') onChange('error', 'แชร์จอไม่สำเร็จ');
    }
  };
  V.stopScreen = () => {
    if (!V.screenTrack) return;
    const t = V.screenTrack; V.screenTrack = null;
    t.onended = null; t.stop();
    if (V.screenAudio) { V.screenAudio.onended = null; V.screenAudio.stop(); V.screenAudio = null; }
    rebuildMix();
    V.watchers.clear();
    V.selfScreen.srcObject = null;
    for (const p of V.peers.values()) p.screenTx?.sender.replaceTrack(null).catch(() => {});
    onChange('media');
  };
  // ---- คนดูสตรีม (แบบ Discord: รู้ว่าใครกำลังดูจอเราอยู่) ----
  V.watchers = new Map();
  V.watching = (key) => net.signal(key, { watch: 1 });
  V.watcherList = () => { const now = Date.now(); return [...V.watchers].filter(([, t]) => now - t < 9000).map(([k]) => k); };
  V.screenFor = (key) => {
    if (key === net.myKey) return V.screenTrack ? V.selfScreen : null;
    const p = V.peers.get(key);
    return p && p.hasScreen && p.screenOk ? p.screenEl : null;
  };
  V.unlock = () => { ensureCtx(); for (const p of V.peers.values()) { p.audioEl.play().catch(() => {}); p.videoEl.play().catch(() => {}); p.screenEl.play().catch(() => {}); } };
  V.devices = async () => {
    try { return await navigator.mediaDevices.enumerateDevices(); } catch { return []; }
  };
  // ================= สำรอง: ส่งเสียงผ่านเซิร์ฟเวอร์ของเราเอง =================
  // ใช้เมื่อต่อตรงไม่ได้ (เน็ตมือถือ/บริษัทบล็อก) และไม่มี TURN — เสียง 16kHz μ-law ~16KB/วินาที ต่อคน
  const relay = { cap: null, capBuf: [], rx: new Map(), mod: null, rate: 24000, frame: 480 }; // 24kHz ชัดกว่าเดิม (16kHz) · 20ms ต่อแพ็กเก็ต
  V.relayActive = (p) => !!p && ((p.forceRelay && Date.now() - p.forceRelay < 600000) || (p.state !== 'connected' && (p.state === 'failed' || Date.now() - (p.created || 0) > 10000)));
  const WORKLET = `
class PxCap extends AudioWorkletProcessor { process(i) { const c = i[0] && i[0][0]; if (c) this.port.postMessage(c.slice(0)); return true; } }
registerProcessor('px-cap', PxCap);
class PxPlay extends AudioWorkletProcessor {
  // บัฟเฟอร์ปรับตัวเอง: เน็ตแกว่ง = รอมากขึ้น (ไม่กระตุก) · เน็ตนิ่ง = ค่อยๆ ลดดีเลย์ · ขาดช่วง = ค่อยๆ เฟดเสียง ไม่ดังแป๊ก
  constructor() { super(); this.q = []; this.off = 0; this.n = 0; this.go = false; this.target = sampleRate * 0.07; this.last = 0; this.ok = 0;
    this.port.onmessage = (e) => { this.q.push(e.data); this.n += e.data.length;
      const max = Math.max(sampleRate * 0.3, this.target * 3);
      while (this.n > max && this.q.length > 1) { this.n -= this.q[0].length - this.off; this.q.shift(); this.off = 0; } }; }
  fade(out, i) { for (; i < out.length; i++) { this.last *= 0.96; out[i] = this.last; } }
  process(_, o) { const out = o[0][0]; if (!out) return true;
    if (!this.go) { if (this.n < this.target) { this.fade(out, 0); return true; } this.go = true; }
    let i = 0; while (i < out.length && this.q.length) { const b = this.q[0], k = Math.min(out.length - i, b.length - this.off);
      out.set(b.subarray(this.off, this.off + k), i); i += k; this.off += k; this.n -= k; if (this.off >= b.length) { this.q.shift(); this.off = 0; } }
    if (i > 0) this.last = out[i - 1];
    if (i < out.length) { this.fade(out, i); this.go = false; this.target = Math.min(sampleRate * 0.25, this.target * 1.4); this.ok = 0; }
    else if (++this.ok > sampleRate / 128 * 5) { this.ok = 0; this.target = Math.max(sampleRate * 0.05, this.target * 0.9); }
    return true; }
}
registerProcessor('px-play', PxPlay);`;
  function relayModule() {
    const ctx = ensureCtx();
    if (!ctx || !ctx.audioWorklet) return Promise.reject(new Error('no-worklet'));
    if (!relay.mod) relay.mod = ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' })));
    return relay.mod;
  }
  const mulawEnc = (x) => { let s = Math.max(-1, Math.min(1, x)) * 32635; const sign = s < 0 ? 0x80 : 0; if (s < 0) s = -s; s += 132; let e = 7; for (let m = 0x4000; (s & m) === 0 && e > 0; m >>= 1) e--; const mant = (s >> (e + 3)) & 0x0f; return ~(sign | (e << 4) | mant) & 0xff; };
  const MULAW = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const u = ~i & 0xff, sign = u & 0x80, e = (u >> 4) & 7, m = u & 0x0f; const s = (((m << 3) + 132) << e) - 132; MULAW[i] = (sign ? -s : s) / 32768; }
  function relayTargets() {
    if (!V.audioTrack || !V.mic || V.deaf || V.bgMute) return [];
    return [...V.peers.values()].filter((p) => p.allowed && V.relayActive(p)).map((p) => p.key);
  }
  async function relayCapStart() {
    if (relay.cap || relay.starting) return;
    relay.starting = true;
    try {
      await relayModule();
      const ctx = V.actx;
      const src = ctx.createMediaStreamSource(new MediaStream([V.audioTrack]));
      const node = new AudioWorkletNode(ctx, 'px-cap');
      const sinkGain = ctx.createGain(); sinkGain.gain.value = 0;
      src.connect(node); node.connect(sinkGain).connect(ctx.destination);
      const ratio = ctx.sampleRate / relay.rate;
      let acc = [], pos = 0;
      node.port.onmessage = (e) => {
        const inp = e.data;
        // ลดอัตราสุ่มเป็น 16kHz (เฉลี่ยช่วง)
        for (; pos < inp.length; pos += ratio) { const a = Math.floor(pos), b = Math.min(inp.length - 1, Math.floor(pos + ratio - 1)); let sum = 0; for (let k = a; k <= b; k++) sum += inp[k]; acc.push(sum / (b - a + 1)); }
        pos -= inp.length;
        while (acc.length >= relay.frame) {
          const fr = acc.splice(0, relay.frame);
          const to = relayTargets();
          if (!to.length) continue;
          const bytes = new Uint8Array(fr.length); for (let k = 0; k < fr.length; k++) bytes[k] = mulawEnc(fr[k]);
          net.relaySend && net.relaySend(to, bytes);
          V.relaySentAt = Date.now();
        }
      };
      relay.cap = { src, node, sinkGain, track: V.audioTrack };
      V.relayErr = '';
    } catch (e) { V.relayErr = String((e && e.message) || e); } finally { relay.starting = false; }
  }
  function relayCapStop() {
    const c = relay.cap; if (!c) return;
    try { c.src.disconnect(); c.node.disconnect(); c.sinkGain.disconnect(); c.node.port.onmessage = null; } catch {}
    relay.cap = null;
  }
  function relayDrop(key) {
    const rx = relay.rx.get(key); if (!rx) return;
    try { rx.node.disconnect(); rx.gain.disconnect(); } catch {}
    relay.rx.delete(key);
    const m = V.meters.get(key); if (m && m.relay) V.meters.delete(key);
  }
  async function relayRx(key) {
    let rx = relay.rx.get(key);
    if (rx) return rx;
    await relayModule();
    if (relay.rx.has(key)) return relay.rx.get(key);
    const ctx = V.actx;
    const node = new AudioWorkletNode(ctx, 'px-play', { outputChannelCount: [1] });
    const gain = ctx.createGain(); const p = V.peers.get(key); gain.gain.value = (p && p.vol != null ? p.vol : 1) * V.master;
    const an = ctx.createAnalyser(); an.fftSize = 512;
    node.connect(gain).connect(ctx.destination); gain.connect(an);
    rx = { node, gain, ratio: ctx.sampleRate / relay.rate };
    relay.rx.set(key, rx);
    const old = V.meters.get(key); if (old) { try { old.src.disconnect(); } catch {} }
    V.meters.set(key, { src: gain, an, buf: new Float32Array(512), lvl: 0, hold: 0, relay: true });
    return rx;
  }
  V.relayIn = async (from, bytes) => {
    const p = V.peers.get(from);
    if (!p || !p.playOk || V.deaf || V.bgMute || p.userMuted) return;
    p.relayRxAt = Date.now();
    let rx; try { rx = await relayRx(from); } catch { return; }
    // ขยายกลับเป็นอัตราของเครื่อง (linear)
    const ratio = V.actx.sampleRate / (bytes.length === 320 ? 16000 : relay.rate); // 320 = เครื่องเวอร์ชันเก่า (16kHz)
    const n = bytes.length, outN = Math.round(n * ratio), out = new Float32Array(outN);
    for (let i = 0; i < outN; i++) { const x = i / ratio, a = Math.floor(x), b = Math.min(n - 1, a + 1), f = x - a; out[i] = MULAW[bytes[a]] * (1 - f) + MULAW[bytes[b]] * f; }
    rx.node.port.postMessage(out, [out.buffer]);
  };
  // ตรวจทุกครึ่งวินาที: ต้องส่งผ่านเซิร์ฟเวอร์ไหม
  setInterval(() => {
    const need = relayTargets().length > 0;
    if (need && (!relay.cap || relay.cap.track !== V.audioTrack)) { relayCapStop(); relayCapStart(); }
    // ต้องส่งทางเซิร์ฟเวอร์ แต่เสียงในเครื่องยังไม่เริ่ม (เช่น เพิ่งรีโหลดอัตโนมัติ) → ลองปลุก แล้วขอให้แตะจอ
    if (need && V.actx && V.actx.state !== 'running') { V.actx.resume().catch(() => {}); if (!relay.unlockAskAt || Date.now() - relay.unlockAskAt > 20000) { relay.unlockAskAt = Date.now(); onChange('unlock-mic'); } }
    else if (!need && relay.cap) relayCapStop();
    for (const [k] of relay.rx) { const p = V.peers.get(k); if (!p || Date.now() - (p.relayRxAt || 0) > 5000) relayDrop(k); }
    // ระหว่างได้เสียงทางเซิร์ฟเวอร์ ปิดเสียงทางตรงไว้ (กันเสียงซ้อน)
    // สลับทางตรง/ผ่านเซิร์ฟเวอร์ และเปิด-ปิดตัวขยายเสียงให้ตรงกับสถานะเสียงในเครื่อง
    for (const p of V.peers.values()) { const viaRelay = Date.now() - (p.relayRxAt || 0) < 1500; const boostOk = !!(V.actx && V.actx.state === 'running'); if (viaRelay !== !!p.wasRelay || boostOk !== !!p.wasBoostOk) { p.wasRelay = viaRelay; p.wasBoostOk = boostOk; volOut(p); } }
  }, 500);
  // ---------- ตรวจว่าเสียงไหลจริงไหม (ต่อติดแต่ไม่มีเสียง = สลับไปทางเซิร์ฟเวอร์) ----------
  V.remoteMicOn = () => true;
  // เรากำลังได้รับเสียงจากคนนี้จริงไหม (ทางตรงหรือทางเซิร์ฟเวอร์)
  V.rxOk = (p) => !!p && (Date.now() - (p.relayRxAt || 0) < 2500 || (p.state === 'connected' && p.stat && Date.now() - p.stat.at < 5000 && p.stat.rxRate > 800));
  let fbTick = 0;
  setInterval(async () => {
    const now = Date.now();
    fbTick++;
    for (const p of V.peers.values()) {
      if (p.state === 'connected') {
        try {
          const stats = await p.pc.getStats();
          let rx = 0, tx = 0;
          let vf = -1;
          let conc = 0, tot = 0;
          stats.forEach((r) => { if (r.kind === 'audio' && r.type === 'inbound-rtp') { rx += r.bytesReceived || 0; conc = r.concealedSamples || 0; tot = r.totalSamplesReceived || 0; } if (r.kind === 'audio' && r.type === 'outbound-rtp') tx += r.bytesSent || 0; });
          // เสียงขาดๆ หายๆ (ต้องเดาเติมเยอะ) → เพิ่มบัฟเฟอร์กันกระตุก · เน็ตนิ่ง → ลดบัฟเฟอร์ให้ดีเลย์น้อย
          if (p.cs && tot > p.cs.tot) {
            const ratio = (conc - p.cs.conc) / (tot - p.cs.tot);
            const cur = p.jbt || 40;
            const want = ratio > 0.04 ? Math.min(200, cur + 40) : ratio < 0.005 ? Math.max(40, cur - 10) : cur;
            if (want !== cur) { p.jbt = want; const r = p.audioTx && p.audioTx.receiver; try { if (r && 'jitterBufferTarget' in r) r.jitterBufferTarget = want; else if (r && 'playoutDelayHint' in r) r.playoutDelayHint = want / 1000; } catch {} }
            p.loss = ratio;
          }
          p.cs = { conc, tot };
          try {
            const vs = await p.videoTx.receiver.getStats();
            let codecId = '';
            vs.forEach((r) => { if (r.type === 'inbound-rtp') { vf = r.framesDecoded || 0; codecId = r.codecId; p.vinfo = { w: r.frameWidth || 0, h: r.frameHeight || 0, fps: Math.round(r.framesPerSecond || 0), dec: r.decoderImplementation || '' }; } });
            if (codecId && vs.get(codecId) && p.vinfo) p.vinfo.codec = String(vs.get(codecId).mimeType || '').replace('video/', '');
          } catch {}
          if (vf >= 0) { if (p.vFrames != null && vf > p.vFrames) p.vLiveAt = Math.max(p.vLiveAt || 0, Date.now() - 500); p.vFrames = vf; }
          const t = Date.now();
          p.stat = { rx, tx, rxRate: p.stat ? (rx - p.stat.rx) / ((t - p.stat.at) / 1000) : 0, txRate: p.stat ? (tx - p.stat.tx) / ((t - p.stat.at) / 1000) : 0, at: t };
          // เราเปิดไมค์ แต่ส่งออกทางตรงไม่ได้เลย → ส่งทางเซิร์ฟเวอร์เอง
          if (p.allowed && V.mic && V.audioTrack && !V.deaf && p.stat.txRate < 50) { p.txDeadSince = p.txDeadSince || now; if (now - p.txDeadSince > 8000) p.forceRelay = now; }
          else p.txDeadSince = 0;
        } catch {}
      }
      // เขาเปิดไมค์ เราควรได้ยิน แต่ไม่มีเสียงมาถึงเลย 6 วิ → ขอให้เขาส่งทางเซิร์ฟเวอร์ (ส่งผ่านเซิร์ฟเวอร์ได้แม้ต่อตรงไม่ติด)
      if (p.playOk && V.remoteMicOn(p.key) && !V.rxOk(p) && now - (p.created || 0) > 4000) {
        p.silentSince = p.silentSince || now;
        if (now - p.silentSince > 6000 && (!p.askedAt || now - p.askedAt > 20000)) { p.askedAt = now; net.signal(p.key, { relayPlease: 1 }); }
      } else p.silentSince = 0;
      // บอกเขาทุก ~4 วิ ว่าเรากำลังฟังเขาอยู่ และได้ยินจริงไหม (1 ได้ยิน / 0 ไม่ได้ยิน / 2 ฟังอยู่แต่เขาปิดไมค์)
      // (ช่วงแรกหลังเชื่อมยังไม่มีสถิติ อย่าเพิ่งตอบว่า "ไม่ได้ยิน" ไม่งั้นเขาจะสลับไปส่งผ่านเซิร์ฟเวอร์โดยไม่จำเป็น)
      const settled = now - (p.created || 0) > 9000 && (V.rxOk(p) || (p.stat && now - p.stat.at < 5000) || p.state !== 'connected');
      if (fbTick % 2 === 0 && p.playOk) net.signal(p.key, { fb: !V.remoteMicOn(p.key) ? 2 : V.rxOk(p) ? 1 : settled ? 0 : 2 });
      // เลิกส่งให้คนที่ไม่ได้ฟังเราแล้ว
      if (p.allowed && !V.audience.has(p.key) && !wantFresh(p)) { p.allowed = false; apply(p); }
    }
    // ไมค์เปิดอยู่แต่ไม่มีสัญญาณเสียงเข้าเลย (เลือกไมค์ผิดตัว / แอปอื่นแย่ง / ระบบปิดไมค์)
    const me = V.meters.get('raw') || V.meters.get('me');
    if (!V.mic || !V.audioTrack || !me || !V.actx || V.actx.state !== 'running' || me.lvl > 0.00002) { V.micAliveAt = now; if (V.micDead) { V.micDead = false; onChange('mic-alive'); } }
    else if (!V.micDead && now - (V.micAliveAt || now) > 12000) { V.micDead = true; onChange('mic-dead'); }
  }, 2000);
  if (net.onRelay) net.onRelay((from, bytes) => V.relayIn(from, bytes));
  return V;
}
