// ============================================================================
// voice.js — คุยเสียง/เปิดกล้องด้วย WebRTC (ใช้เฉพาะเวอร์ชันเซิร์ฟเวอร์ Node)
// ทุกคนต่อหากันตรงๆ (mesh) — คนที่ key น้อยกว่าเป็นฝ่ายโทร จึงไม่ชนกัน
// ============================================================================
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
    return (V.meters.get(key)?.hold || 0) > 0;
  };
  V.videoFor = (key) => {
    if (key === net.myKey) return V.cam && V.videoTrack ? V.selfVideo : null;
    const p = V.peers.get(key);
    return p && p.hasVideo ? p.videoEl : null;
  };

  function tuneOpus(sdp) {
    const m = sdp.match(/a=rtpmap:(\d+) opus\/48000/i);
    if (!m) return sdp;
    const want = { minptime: '10', useinbandfec: '1', usedtx: '0', stereo: '0', maxplaybackrate: '48000', maxaveragebitrate: V.hq ? '128000' : '48000' };
    const re = new RegExp(`a=fmtp:${m[1]} ([^\\r\\n]*)`);
    return sdp.replace(re, (_, params) => {
      const p = {};
      params.split(';').forEach((kv) => { const [k, v] = kv.trim().split('='); if (k) p[k] = v; });
      Object.assign(p, want);
      return `a=fmtp:${m[1]} ` + Object.entries(p).map(([k, v]) => `${k}=${v}`).join(';');
    });
  }
  async function tune(peer) {
    for (const [tx, max] of [[peer.audioTx, V.hq ? 128000 : 48000], [peer.videoTx, 700000]]) {
      if (!tx) continue;
      try {
        const p = tx.sender.getParameters();
        if (!p.encodings || !p.encodings.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = max;
        if (tx === peer.videoTx) p.encodings[0].maxFramerate = 24;
        await tx.sender.setParameters(p);
      } catch {}
    }
  }
  function apply(peer) {
    peer.audioTx?.sender.replaceTrack(V.audioTrack || null).catch(() => {});
    peer.videoTx?.sender.replaceTrack(V.cam ? V.videoTrack : null).catch(() => {});
  }
  function create(key, initiator) {
    close(key);
    const pc = new RTCPeerConnection({ iceServers: net.iceServers, bundlePolicy: 'max-bundle' });
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true; audioEl.setAttribute('playsinline', ''); audioEl.muted = V.deaf;
    const videoEl = document.createElement('video');
    videoEl.autoplay = true; videoEl.muted = true; videoEl.playsInline = true; videoEl.setAttribute('playsinline', '');
    sink.append(audioEl, videoEl);
    if (V.settings && V.settings.spkId && audioEl.setSinkId) audioEl.setSinkId(V.settings.spkId).catch(() => {});
    const peer = { key, pc, initiator, audioEl, videoEl, audioTx: null, videoTx: null, hasVideo: false, state: 'new' };
    V.peers.set(key, peer);
    pc.onicecandidate = (e) => e.candidate && net.signal(key, { candidate: e.candidate });
    pc.ontrack = (e) => {
      if (e.track.kind === 'audio') { audioEl.srcObject = new MediaStream([e.track]); audioEl.play().catch(() => onChange('unlock')); meter(key, e.track); }
      else { videoEl.srcObject = new MediaStream([e.track]); videoEl.play().catch(() => {}); peer.hasVideo = true; }
    };
    pc.onconnectionstatechange = () => {
      peer.state = pc.connectionState;
      if (peer.state === 'connected') tune(peer);
      if (peer.state === 'failed' && initiator) { try { pc.restartIce(); } catch {} offer(peer, true); }
      onChange('peers');
    };
    if (initiator) {
      peer.audioTx = pc.addTransceiver('audio', { direction: 'sendrecv' });
      peer.videoTx = pc.addTransceiver('video', { direction: 'sendrecv' });
      apply(peer);
      offer(peer);
    }
    return peer;
  }
  async function offer(peer, iceRestart = false) {
    try {
      const o = await peer.pc.createOffer({ iceRestart });
      await peer.pc.setLocalDescription({ type: 'offer', sdp: tuneOpus(o.sdp) });
      net.signal(peer.key, { sdp: { type: 'offer', sdp: peer.pc.localDescription.sdp } });
    } catch (e) { console.warn('offer', e); }
  }
  async function handleSignal(from, data) {
    let peer = V.peers.get(from);
    if (data.sdp) {
      const desc = { type: data.sdp.type, sdp: tuneOpus(data.sdp.sdp) };
      if (desc.type === 'offer') {
        if (!peer || peer.initiator) peer = create(from, false);
        await peer.pc.setRemoteDescription(desc);
        for (const tx of peer.pc.getTransceivers()) {
          const k = tx.receiver.track.kind;
          if (k === 'audio' && !peer.audioTx) peer.audioTx = tx;
          if (k === 'video' && !peer.videoTx) peer.videoTx = tx;
          tx.direction = 'sendrecv';
        }
        apply(peer);
        const a = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription({ type: 'answer', sdp: tuneOpus(a.sdp) });
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
  function close(key) {
    const p = V.peers.get(key);
    if (!p) return;
    V.peers.delete(key);
    try { p.pc.close(); } catch {}
    p.audioEl.remove(); p.videoEl.remove();
    const m = V.meters.get(key); if (m) { try { m.src.disconnect(); } catch {} V.meters.delete(key); }
    chains.delete(key);
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
  V.settings = Object.assign({ micId: '', camId: '', spkId: '', ns: true, ec: true, agc: true, monitor: false, monVol: 0.8, hq: true, facing: 'user' }, lsGet('pixel.voice', {}));
  V.hq = V.settings.hq;
  const saveSettings = () => lsSet('pixel.voice', V.settings);
  V.mon = null;

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
    const t = s.getAudioTracks()[0];
    try { t.contentHint = 'speech'; } catch {}
    return t;
  }
  function micError(e) {
    onChange('error', !window.isSecureContext ? 'ต้องเปิดผ่าน https:// ถึงจะใช้ไมค์/กล้องได้' : e && e.name === 'NotAllowedError' ? 'ไม่ได้รับอนุญาตให้ใช้ไมค์ — เปิดสิทธิ์ในการตั้งค่าเบราว์เซอร์' : 'เปิดไมค์ไม่สำเร็จ');
  }
  // ใส่ track ใหม่: ส่งให้ทุกคน + ตัววัดเสียง + ฟังเสียงตัวเอง
  function setAudioTrack(t) {
    const old = V.audioTrack;
    V.audioTrack = t;
    if (V.meterTrack) V.meterTrack.stop();
    V.meterTrack = t ? t.clone() : null;          // สำเนาที่เปิดไว้เสมอ ใช้วัดระดับเสียง/ฟังตัวเอง
    if (V.meterTrack) V.meterTrack.enabled = true;
    if (t) t.enabled = V.mic && !V.deaf;
    for (const p of V.peers.values()) p.audioTx?.sender.replaceTrack(t || null).catch(() => {});
    if (old && old !== t) old.stop();
    meter('me', V.meterTrack);
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
    if (k === 'ns' || k === 'ec' || k === 'agc' || k === 'micId') V.reacquireMic();
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
    return t;
  }
  function setVideoTrack(t) {
    const old = V.videoTrack;
    V.videoTrack = t;
    V.selfVideo.srcObject = t ? new MediaStream([t]) : null;
    if (t) V.selfVideo.play().catch(() => {});
    for (const p of V.peers.values()) { p.videoTx?.sender.replaceTrack(V.cam ? t : null).catch(() => {}); if (t) tune(p); }
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
  V.toggleDeaf = () => {
    V.deaf = !V.deaf;
    for (const p of V.peers.values()) { p.audioEl.muted = V.deaf; if (!V.deaf) p.audioEl.play().catch(() => {}); }
    if (V.deaf && V.mic) V.mic = false;
    if (V.audioTrack) V.audioTrack.enabled = V.mic && !V.deaf;
    if (V.mon) V.mon.gain.gain.value = V.deaf ? 0 : V.settings.monVol;
    onChange('media');
  };
  V.unlock = () => { ensureCtx(); for (const p of V.peers.values()) { p.audioEl.play().catch(() => {}); p.videoEl.play().catch(() => {}); } };
  V.devices = async () => {
    try { return await navigator.mediaDevices.enumerateDevices(); } catch { return []; }
  };
  return V;
}
