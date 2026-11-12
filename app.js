/* GT-Meet 클라이언트
 * - WebRTC 메시(참가자 간 직접 연결) : 영상/음성, 파일(DataChannel)
 * - 서버 WebSocket : 시그널링, 채팅, 녹취 문장, 북마크 공유
 * - 녹화(MediaRecorder), 녹취(Web Speech API), 중요 시점 자동 캡처, 회의록 내보내기
 */
'use strict';
const $ = s => document.querySelector(s);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

const S = {
  ws: null, id: null, room: null, name: '', created: Date.now(), iceServers: [],
  local: new MediaStream(), mic: null, cam: null, screen: null,
  micOn: true, camOn: true,
  peers: new Map(),          // id -> peer
  names: new Map(),          // id -> 이름 (나간 사람 포함, 회의록용)
  media: new Map(),          // id -> 상대 미디어 상태
  chat: [], transcript: [], shots: [],
  hostId: null, password: '', locked: false, waitingRoom: true, waitList: new Map(), ended: false,
  rec: null, stt: null, sttOn: false,
  audioCtx: null,
  lastAutoShot: 0, lastShotSig: null,
};
const CHUNK = 16 * 1024;
const MAX_FILE = 1024 * 1024 * 1024; // 1GB
const KEYWORDS = /(중요|결정|확정|합의|결론|액션\s?아이템|할\s?일|담당|마감|기한|데드라인|정리하면|요약하면|기억해|체크|important|decision|decided|agreed|action item|deadline|due date|todo|to-do|重要|決定|確定|合意|結論|締切|締め切り|期限|アクションアイテム|宿題|决定|确定|结论|截止|行动项|待办|负责)/i;

// ================= 공통 유틸 =================
const fmtClock = ts => new Date(ts).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const fmtRel = ts => { const s = Math.max(0, Math.floor((ts - S.created) / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
  return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); };
const fmtSize = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(2) + ' GB';
const safeRoom = () => (S.room || 'room').replace(/[^a-zA-Z0-9_-]/g, '') || 'room';
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function toast(msg, kind = '') { const t = el('div', 'toast ' + kind, msg); $('#toasts').append(t); setTimeout(() => t.remove(), 4200); }
function download(blobOrUrl, filename) {
  if (window.GTMeetAndroid) return androidSave(blobOrUrl, filename);
  const a = el('a'); a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  a.download = filename; a.rel = 'noopener'; a.style.display = 'none'; document.body.append(a); a.click();
  setTimeout(() => { a.remove(); if (typeof blobOrUrl !== 'string') URL.revokeObjectURL(a.href); }, 60000);
}
// ---- 안드로이드 앱(WebView) 연결: PC 앱과 같은 window.gtmeet 형태로 맞춤 ----
const ANDROID = !!window.GTMeetAndroid;
window.__gtmeetInvite = t => { window.__pendingInvite = t; }; // 화면 준비 전에 온 초대문은 보관
if (ANDROID && !window.gtmeet) {
  const A = window.GTMeetAndroid, subs = [];
  window.__androidUpdate = j => { const u = typeof j === 'string' ? JSON.parse(j) : j; subs.forEach(f => f(u)); };
  window.gtmeet = { desktop: false, android: true, show() {}, attention: () => A.attention(), inMeeting: on => A.inMeeting(!!on), setLang: l => A.setLang(l),
    update: { get: async () => JSON.parse(A.updateGet()), check: () => A.updateCheck(), download: () => A.updateAction(), install: () => A.updateAction(), on: f => subs.push(f) } };
}
// 안드로이드: 파일 저장(조각으로 나눠 앱에 전달 → 다운로드\GT-Meet)
async function androidSave(blobOrUrl, filename) {
  try {
    const blob = typeof blobOrUrl === 'string' ? await (await fetch(blobOrUrl)).blob() : blobOrUrl;
    const A = window.GTMeetAndroid, id = A.saveStart(filename, blob.type || 'application/octet-stream');
    const CH = 384 * 1024;
    for (let off = 0; off < blob.size; off += CH) {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob.slice(off, off + CH)); });
      A.saveChunk(id, b64);
    }
    const where = A.saveEnd(id);
    toast(T('저장했습니다: {f}', { f: where || filename }));
  } catch (e) { toast(T('저장하지 못했습니다:') + ' ' + e.message, 'bad'); }
}
const DESKTOP = !!window.gtmeet?.desktop; // PC 앱으로 실행 중인지
const NATIVE = !!window.gtmeet;            // PC 앱 또는 안드로이드 앱
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const MOBILE = ANDROID || IOS || /Android|Mobi/i.test(navigator.userAgent);
if (MOBILE) document.documentElement.classList.add('mobile');
function notifyUser(title, body) {
  if (document.hasFocus() && !document.hidden) return;
  if (ANDROID) { window.GTMeetAndroid.notify(title, body); return; }
  window.gtmeet?.attention();
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') { const n = new Notification(title, { body, icon: 'icon-192.png' }); n.onclick = () => { window.focus(); window.gtmeet?.show(); n.close(); }; }
  } catch {}
}
const askNotify = () => { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch {} };
const nameOf = id => id === S.id ? S.name : (S.names.get(id) || T('참가자'));

// 백그라운드 탭에서도 멈추지 않는 타이머(Worker)
const ticker = (() => {
  const w = new Worker(URL.createObjectURL(new Blob([`const t={};onmessage=e=>{const{id,ms,stop}=e.data;if(stop){clearInterval(t[id]);delete t[id];return}t[id]=setInterval(()=>postMessage(id),ms)}`], { type: 'text/javascript' })));
  const cbs = {}; let n = 0; w.onmessage = e => cbs[e.data]?.();
  return { every(ms, fn) { const id = ++n; cbs[id] = fn; w.postMessage({ id, ms }); return id; }, stop(id) { delete cbs[id]; w.postMessage({ id, stop: true }); } };
})();

// ================= 설정 (자동 저장) =================
const SET_KEY = 'gtmeet.settings';
try { localStorage.removeItem('gtmeet.plate'); } catch {}   // 삭제한 시험 기능이 저장했던 방 사진을 지움
const SET = Object.assign({
  name: localStorage.getItem('gtmeet.name') || '', camId: '', micId: '', micOn: true, camOn: true,
  bg: 'none', bgSel: 'p0', bgCustom: '', offImage: '', sttLang: LANG_INFO.stt, autoCap: true, tunnelAuto: false, hq: true, lang: LANG,
}, (() => { try { return JSON.parse(localStorage.getItem(SET_KEY) || '{}'); } catch { return {}; } })());
function saveSet() {
  try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); }
  catch { toast(T('설정을 저장하지 못했습니다. 더 작은 이미지를 사용해 주세요.'), 'warn'); }
}

// ================= 아이콘 (꺼짐 = X 표시) =================
const ICON_PATHS = {
  mic: '<rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  cam: '<rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.2l5.5-3.2v10l-5.5-3.2z"/>',
};
const icon = (name, off = false) => `<svg class="ic${off ? ' off' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="${T(name === 'mic' ? T('마이크') : T('카메라'))} ${T(off ? T('꺼짐') : T('켜짐'))}"><g>${ICON_PATHS[name]}</g>${off ? '<path class="x" d="M4 4l16 16M20 4L4 20"/>' : ''}</svg>`;

// ================= 배경 이미지 =================
const BG_PRESETS = [
  { id: 'p0', name: '블루 오피스',  draw: (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1e3c72'); g.addColorStop(1, '#2a5298'); return g; }, dots: '#ffffff' },
  { id: 'p1', name: '따뜻한 라운지', draw: (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#f6d365'); g.addColorStop(1, '#fda085'); return g; }, dots: '#fff7e6' },
  { id: 'p2', name: '그레이 스튜디오', draw: (x, w, h) => { const g = x.createRadialGradient(w / 2, h * 0.4, 40, w / 2, h / 2, w * 0.7); g.addColorStop(0, '#8a93a3'); g.addColorStop(1, '#1f2937'); return g; } },
  { id: 'p3', name: '그린 가든', draw: (x, w, h) => { const g = x.createLinearGradient(0, h, w, 0); g.addColorStop(0, '#134e5e'); g.addColorStop(1, '#71b280'); return g; }, dots: '#e8ffe8' },
];
const presetCache = {};
function presetUrl(id) {
  if (presetCache[id]) return presetCache[id];
  const p = BG_PRESETS.find(b => b.id === id) || BG_PRESETS[0];
  const c = Object.assign(el('canvas'), { width: 1280, height: 720 }), x = c.getContext('2d');
  x.fillStyle = p.draw(x, 1280, 720); x.fillRect(0, 0, 1280, 720);
  if (p.dots) { let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280; x.filter = 'blur(18px)';
    for (let i = 0; i < 14; i++) { x.globalAlpha = 0.08 + rnd() * 0.12; x.fillStyle = p.dots; x.beginPath(); x.arc(rnd() * 1280, rnd() * 720, 30 + rnd() * 90, 0, 7); x.fill(); } }
  return presetCache[id] = c.toDataURL('image/jpeg', 0.9);
}
const bgSrc = () => SET.bgSel === 'custom' && SET.bgCustom ? SET.bgCustom : presetUrl(SET.bgSel);
const imgCache = new Map();
function loadImg(src) {
  if (!src) return Promise.resolve(null);
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  imgCache.set(src, p); return p;
}
// 사용자가 고른 사진을 1280x720 이하 JPEG로 줄여 저장
function readImageFile(file, maxW = 1280, maxH = 720) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('이미지 파일만 선택할 수 있습니다.'));
    const url = URL.createObjectURL(file); const i = new Image();
    i.onload = () => { const sc = Math.min(1, maxW / i.width, maxH / i.height);
      const c = Object.assign(el('canvas'), { width: Math.round(i.width * sc), height: Math.round(i.height * sc) });
      c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.85)); };
    i.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽지 못했습니다.')); };
    i.src = url;
  });
}
function drawCover(ctx, img, x, y, w, h) {
  const r = Math.max(w / img.width, h / img.height), dw = img.width * r, dh = img.height * r;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// ================= 영상 효과 (배경 흐림·교체, 카메라 꺼짐 그림) =================
// 인물 분리는 MediaPipe(브라우저 안에서 처리, 영상이 외부로 나가지 않음)
const MP_VER = '0.10.14';
const MP_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
// 1순위 selfie_segmenter: CPU에서 multiclass보다 약 26배 빠르고(5ms 대 138ms), 실제 방 장면에서 침대를 덜 잡고 경계가 더 또렷함.
// multiclass는 예비
const MP_MODELS = [
  { file: 'selfie_segmenter.tflite', multi: false,
    url: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite' },
  { file: 'selfie_multiclass_256x256.tflite', multi: true,
    url: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite' },
]
const FX = { canvas: null, ctx: null, track: null, video: null, seg: null, segP: null, multi: false,
  mask: null, mctx: null, mimg: null, big: null, bctx: null, prev: null, alpha: null, pbuf: null, half: null, hctx: null, half2: null, h2ctx: null,
  timer: 0, fps: 0, mode: '', bg: null, off: null, gen: 0, invert: null, votes: 0, invSum: 0,
  wbusy: false, wid: 0, pend: new Map(), cur: null, wTimes: [], errs: 0, wOk: 0, wRestarts: 0 };

function fxSetup() {
  if (FX.canvas) return;
  FX.canvas = Object.assign(el('canvas'), { width: 1280, height: 720 }); FX.ctx = FX.canvas.getContext('2d');
  FX.track = FX.canvas.captureStream(30).getVideoTracks()[0];
  FX.mask = el('canvas'); FX.mctx = FX.mask.getContext('2d', { willReadFrequently: true });
  FX.big = el('canvas'); FX.bctx = FX.big.getContext('2d');
  FX.video = Object.assign(el('video'), { muted: true, playsInline: true, autoplay: true });
  FX.video.setAttribute('playsinline', ''); FX.video.setAttribute('aria-hidden', 'true');
  // 아이폰 Safari는 화면에 붙어 있지 않은 video의 프레임을 갱신하지 않음 → 보이지 않게 붙여 둠
  Object.assign(FX.video.style, { position: 'fixed', left: '0', top: '0', width: '2px', height: '2px', opacity: '0', pointerEvents: 'none', zIndex: '-1' });
  document.body.appendChild(FX.video);
  FX.small = el('canvas'); FX.sctx = FX.small.getContext('2d');
}
// 캔버스 흐림(filter)을 지원하지 않는 브라우저(옛 Safari)는 줄였다 키우는 방식으로 흐림
const CANVAS_FILTER = (() => { try { const x = document.createElement('canvas').getContext('2d'); x.filter = 'blur(2px)'; return x.filter === 'blur(2px)'; } catch { return false; } })();
function drawBlurred(ctx, src, x, y, w, h, px) {
  if (CANVAS_FILTER) { ctx.filter = `blur(${px}px)`; ctx.drawImage(src, x, y, w, h); ctx.filter = 'none'; return; }
  const k = Math.max(2, px / 2), sw = Math.max(8, Math.round(w / k)), sh = Math.max(8, Math.round(h / k));
  if (FX.small.width !== sw || FX.small.height !== sh) { FX.small.width = sw; FX.small.height = sh; }
  FX.sctx.imageSmoothingEnabled = true; FX.sctx.drawImage(src, 0, 0, sw, sh);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(FX.small, x, y, w, h);
}
function loadSegmenter() {
  if (window.__fakeSegmenter) { FX.multi = !!window.__fakeSegmenter.multi; return Promise.resolve(window.__fakeSegmenter); } // 테스트용
  if (FX.segP) return FX.segP;
  const loc = p => new URL(p, location.href).href;
  let mp = null, files = null;
  const lib = async () => {
    if (mp) return;
    try { mp = await import(loc('vendor/mediapipe/vision_bundle.mjs')); files = await mp.FilesetResolver.forVisionTasks(loc('vendor/mediapipe/wasm')); }
    catch (e) { console.warn('로컬 MediaPipe 실패, CDN 사용', e); mp = await import(`${MP_CDN}/vision_bundle.mjs`); files = await mp.FilesetResolver.forVisionTasks(`${MP_CDN}/wasm`); }
  };
  const create = async model => {
    const opts = d => ({ baseOptions: { modelAssetPath: model, delegate: d }, runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true });
    // 그래픽카드(WebGL) 처리는 일부 PC에서 결과에 네모 덩어리가 섞여 나와 기본은 CPU. 시험용으로만 gtmeet.mpgpu=1이면 GPU
    if (localStorage.getItem('gtmeet.mpgpu') === '1') { try { return await mp.ImageSegmenter.createFromOptions(files, opts('GPU')); } catch {} }
    return await mp.ImageSegmenter.createFromOptions(files, opts('CPU'));
  };
  FX.segP = (async () => {
    // 1순위: 작업자(Web Worker)에서 CPU로 → 화면이 멈추지 않고 결과도 정확
    if (typeof Worker !== 'undefined' && localStorage.getItem('gtmeet.noworker') !== '1') {
      try { return await segWorkerStart(); } catch (e) { console.warn('인물 분리 작업자를 쓰지 못해 화면 쪽에서 처리합니다:', e); }
    }
    await lib();
    let err;
    for (const m of MP_MODELS) for (const src of [loc('vendor/mediapipe/' + m.file), m.url]) {
      try { const seg = await create(src); FX.multi = m.multi; console.info('배경 효과 모델:', m.file); return seg; }
      catch (e) { err = e; }
    }
    throw err;
  })();
  FX.segP.catch(() => { FX.segP = null; });
  return FX.segP;
}
// ---- 인물 분리 작업자 연결 ----
// 장면 하나를 작은 그림(폭 320)으로 보내고, 같은 장면의 원본을 보관해 두었다가 마스크가 오면 그 원본과 합성
// → 마스크와 영상이 항상 같은 순간이라 움직여도 어긋나지 않음(대신 처리 시간만큼, 보통 한 장면 늦게 보임)
function segWorkerStart() {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('segworker.js', location.href), { type: 'module' });
    const to = setTimeout(() => { w.terminate(); reject(new Error('worker timeout')); }, 45000);
    w.onerror = e => { clearTimeout(to); w.terminate(); reject(new Error(e.message || 'worker error')); };
    w.onmessage = e => {
      const m = e.data;
      if (m.type === 'ready') {
        clearTimeout(to); FX.multi = m.multi; console.info('배경 효과 모델(작업자, CPU):', m.model);
        w.onerror = ev => { console.warn('인물 분리 작업자 오류', ev.message); segWorkerRestart('오류'); };
        w.onmessage = segWorkerMsg;
        resolve({ worker: w });
      } else if (m.type === 'error') { clearTimeout(to); w.terminate(); reject(new Error(m.msg)); }
    };
    w.postMessage({ type: 'init', base: location.href, cdn: MP_CDN, models: MP_MODELS });
  });
}
function segWorkerMsg(e) {
  const m = e.data, full = FX.pend.get(m.id); FX.pend.delete(m.id); FX.wbusy = false;
  if (m.type === 'fail') { full?.close?.(); console.warn('segment error', m.msg); if (++FX.errs >= 30) fxFail(); return; }
  if (m.type !== 'mask' || !FX.mode || FX.mode === 'pic') { full?.close?.(); return; }
  FX.errs = 0; if (++FX.wOk > 900) FX.wRestarts = 0;   // 약 30초 동안 잘 돌았으면 다시 시작 횟수를 처음으로
  FX.wTimes.push(m.ms); if (FX.wTimes.length > 30) FX.wTimes.shift();
  if (FX.cur && FX.cur !== full) FX.cur.close?.();
  FX.cur = full;   // 이 마스크를 만든 바로 그 장면
  if (FX.mimg && full) fxMotion(full, FX.mask.width, FX.mask.height);   // 움직임 지도도 같은 장면으로
  fxMask({ confidenceMasks: m.masks.map(a => ({ width: m.w, height: m.h, getAsFloat32Array: () => a })) });
}
// 보관 중인 장면 복사본을 모두 해제(효과를 끄거나 작업자를 다시 시작할 때)
function fxFreeFrames() {
  for (const b of FX.pend.values()) b?.close?.();
  FX.pend.clear();
  FX.cur?.close?.(); FX.cur = null; FX.curDrawn = null; FX.wbusy = false;
}
// 작업자가 멈추거나(5초 넘게 답 없음) 오류를 냈을 때: 끝내고 새로 시작. 2번까지 해 보고 안 되면 꺼짐 그림으로(fxFail)
function segWorkerRestart(why) {
  const w = FX.seg?.worker; if (!w) return;
  try { w.terminate(); } catch {}
  FX.seg = null; FX.segP = null; fxFreeFrames(); FX.wOk = 0;
  FX.wRestarts = (FX.wRestarts || 0) + 1;
  console.warn(`인물 분리 작업자 ${why} → 다시 시작(${FX.wRestarts}번째)`);
  if (FX.wRestarts > 2) { fxFail(); return; }
  toast(T('배경 처리가 멈춰 다시 시작합니다. 잠시 배경만 보입니다.'), 'warn');
  const gen = FX.gen;
  loadSegmenter().then(seg => { if (gen === FX.gen && FX.mode && FX.mode !== 'pic') FX.seg = seg; else seg.worker?.terminate(); })
    .catch(e => { console.warn('배경 처리 다시 시작 실패', e); fxFail(); });
}
// 작업자에 다음 장면 보내기(앞 장면 처리 중이면 건너뜀: 늦은 장면이 쌓이지 않게 최신 장면 우선)
function segWorkerSend(v) {
  if (FX.wbusy) return;
  FX.wbusy = true; FX.wSent = performance.now();
  const id = ++FX.wid, vw = v.videoWidth, vh = v.videoHeight, sw = Math.min(320, vw), sh = Math.round(vh * sw / vw);
  if (!FX.sc) { FX.sc = el('canvas'); FX.scx = FX.sc.getContext('2d'); }
  if (FX.sc.width !== sw || FX.sc.height !== sh) { FX.sc.width = sw; FX.sc.height = sh; }
  FX.scx.drawImage(v, 0, 0, sw, sh);
  Promise.all([createImageBitmap(v), createImageBitmap(FX.sc)]).then(([full, small]) => {
    if (!FX.seg?.worker) { full.close?.(); small.close?.(); FX.wbusy = false; return; }
    FX.pend.set(id, full);
    FX.seg.worker.postMessage({ type: 'frame', id, ts: performance.now(), bitmap: small }, [small]);
  }).catch(e => { FX.wbusy = false; console.warn('장면 복사 실패', e); });
}

// ---- 고품질 배경 (PC 전용): MODNet 인물 매팅 × MediaPipe -------------------------------------
// MODNet(Apache-2.0)이 머리카락까지 섬세하게 오려 내고, MediaPipe가 '사람이 있는 곳'인지 확인해
// 뒤의 의자·침대 같은 물건을 지움. ONNX Runtime Web(MIT)으로 그래픽카드(WebGPU)에서 실행.
// 휴대폰·태블릿, WebGPU가 없는 PC, 모델 파일을 받지 못한 경우, 너무 느린 PC는 MediaPipe만 씀.
const HQ = { p: null, ort: null, sess: null, failed: false, busy: false, matte: null, prev: null, at: 0, times: [],
  W: 512, H: 288, poll: 0, fused: null, snap: null, near: null, sw: 0, sh: 0, can: null, cctx: null, input: null, out: null, octx: null, oimg: null, gate: null, tmp: null };
// PC이고 그래픽카드(WebGPU)와 모델 파일이 있으면 고품질을 쓸 수 있음(설정 창에 항목이 보임)
function hqAvailable() {
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return !mobile && !!(window.__fakeOrt || (navigator.gpu && CFG.fxPlus === 'local'));
}
const hqWanted = () => hqAvailable() && !HQ.failed && SET.hq !== false;
const hqMedian = () => { const a = [...HQ.times].sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; };
// 설정 창에 보여 줄 고품질 처리 상태(쓰는 중인지, 아니면 왜 못 쓰는지)
function hqStatusText() {
  if (!hqAvailable()) return CFG.fxPlus === 'downloading' ? T('고품질 모델을 내려받는 중입니다…') : T('이 PC에서는 쓸 수 없습니다(그래픽카드 WebGPU 없음 또는 모델 파일 없음)');
  if (SET.hq === false) return T('꺼져 있음');
  if (HQ.failed) return '⚠ ' + (HQ.failMsg || T('쓸 수 없음')) + (HQ.retryAt ? T(' — 기본 방식 사용 중. 잠시 뒤 자동으로 다시 시도합니다.') : T(' — 기본 방식 사용 중. 체크를 껐다 켜면 다시 시도합니다.'));
  if (!FX.mode || FX.mode === 'pic') return T('배경 효과를 켜면 시작합니다');
  if (!HQ.sess || !FX.hq) return 'MODNet' + T(' 준비 중…');
  const med = hqMedian();
  return '✓ MODNet' + T(' 사용 중') + (med ? ` · ${T('한 장')} ${Math.round(med)}ms` : '');
}
setInterval(() => { const e = document.getElementById('hqStatus'); if (e && !e.closest('[hidden]')) e.textContent = hqStatusText(); }, 1000);
// 준비·계산 오류로 꺼졌을 때 자동 재시도 예약(30초 뒤, 2번까지). 사용자가 설정을 바꾸면 횟수를 처음으로
function hqPlanRetry() { HQ.retries = (HQ.retries || 0) + 1; HQ.retryAt = HQ.retries <= 2 ? performance.now() + 30000 : 0; }
function hqReset() {   // 껐다 켜면 처음부터 다시 준비
  Object.assign(HQ, { p: null, sess: null, failed: false, busy: false, matte: null, prev: null, at: 0, times: [], fused: null, snap: null, near: null,
    out: null, octx: null, oimg: null, gate: null, tmp: null, ca: null, cb: null, runs: 0, failMsg: '', retryAt: 0 });
  FX.hq = false;
}
function hqLoad() {
  if (HQ.p) return HQ.p;
  const loc = p => new URL(p, location.href).href;
  HQ.p = (async () => {
    const ort = window.__fakeOrt || await import(loc('vendor/onnxruntime/ort.webgpu.bundle.min.mjs'));
    if (ort.env?.wasm) { ort.env.wasm.wasmPaths = loc('vendor/onnxruntime/'); ort.env.wasm.numThreads = 1; }
    HQ.sess = await ort.InferenceSession.create(loc('vendor/modnet/modnet_webcam.onnx'), { executionProviders: ['webgpu'], graphOptimizationLevel: 'all' });
    HQ.ort = ort; console.info('배경 효과: 고품질 (MODNet × MediaPipe, WebGPU)');
  })();
  HQ.p.catch(e => { console.warn('고품질 배경을 쓰지 않습니다(기본 방식으로 처리):', e); HQ.failed = true; HQ.sess = null; hqPlanRetry();
    HQ.failMsg = T('준비 실패: ') + String(e && e.message || e).slice(0, 120); });
  return HQ.p;
}
// 카메라 한 장을 MODNet에 넣음. 앞 계산이 끝나야 다음을 넣으므로 느린 그래픽카드에서도 화면은 30fps 유지
function hqRun(v) {
  if (!HQ.sess || HQ.busy || HQ.failed) return;
  const w = HQ.W, h = HQ.H, n = w * h;
  if (!HQ.can) { HQ.can = Object.assign(el('canvas'), { width: w, height: h }); HQ.cctx = HQ.can.getContext('2d', { willReadFrequently: true }); HQ.input = new Float32Array(3 * n); }
  if (!FX.alpha) return;
  HQ.busy = true; const t0 = performance.now();
  // 이 장면의 MediaPipe 사람 영역을 같이 보관 → 결과가 늦게 와도 두 모델이 같은 장면끼리 합쳐짐(어긋남 방지)
  const snap = FX.alpha.slice(), sw = FX.mask.width, sh = FX.mask.height;
  let feeds;
  try {
    HQ.cctx.drawImage(v, 0, 0, w, h);
    const px = HQ.cctx.getImageData(0, 0, w, h).data, x = HQ.input;
    for (let i = 0, j = 0; i < n; i++, j += 4) { x[i] = px[j] / 127.5 - 1; x[i + n] = px[j + 1] / 127.5 - 1; x[i + 2 * n] = px[j + 2] / 127.5 - 1; }
    feeds = { [HQ.sess.inputNames[0]]: new HQ.ort.Tensor('float32', x, [1, 3, h, w]) };
  } catch (e) { HQ.busy = false; return; }
  HQ.sess.run(feeds).then(r => {
    const t = r[HQ.sess.outputNames[0]], d = t.data;
    if (!HQ.matte || HQ.matte.length !== d.length) HQ.matte = new Float32Array(d.length);
    HQ.matte.set(d); t.dispose?.();
    hqFuse(snap, sw, sh);
    HQ.at = performance.now();
    // 그래픽카드는 처음 몇 장을 계산할 때 준비 작업(셰이더 컴파일)으로 매우 느림 → 처음 8장은 속도 판정에서 뺌
    HQ.runs = (HQ.runs || 0) + 1;
    if (HQ.runs > 8) { HQ.times.push(HQ.at - t0); if (HQ.times.length > 30) HQ.times.shift(); }
    if (HQ.runs === 300) HQ.retries = 0;   // 한동안 잘 돌았으면 재시도 횟수를 처음으로
    const med = hqMedian();
    if (!window.__fakeOrt && HQ.times.length >= 15 && med > 100) {   // 한 장 0.1초 이상: 움직일 때 어긋남이 보임 → 기본 방식
      console.warn(`고품질 배경이 느려(중앙값 ${med.toFixed(0)}ms) 기본 방식으로 바꿉니다`); HQ.failed = true;
      HQ.failMsg = T('이 PC 그래픽카드에서 너무 느림: 한 장 ') + Math.round(med) + 'ms';
    }
  }).catch(e => { console.warn('고품질 배경 오류, 기본 방식으로 바꿉니다:', e); HQ.failed = true; hqPlanRetry(); HQ.failMsg = T('계산 오류: ') + String(e && e.message || e).slice(0, 120); })
    .finally(() => { HQ.busy = false; });
}
// MediaPipe 사람 영역(al, mw×mh: 같은 장면)을 조금 넓혀 '사람이 있는 곳'을 정하고, 그 안의 MODNet 매트만 남김 → HQ.out
// MODNet 결과가 올 때마다 한 번 계산
function hqFuse(al, mw, mh) {
  const w = HQ.W, h = HQ.H, n = w * h, m = mw * mh;
  if (!HQ.out) { HQ.out = Object.assign(el('canvas'), { width: w, height: h }); HQ.octx = HQ.out.getContext('2d'); HQ.oimg = HQ.octx.createImageData(w, h); }
  if (!HQ.gate || HQ.gate.length !== m) { HQ.gate = new Float32Array(m); HQ.tmp = new Float32Array(m); }
  const g = HQ.gate, t = HQ.tmp, R = Math.max(2, Math.round(mw / 64));   // 256 기준 4화소(화면 폭의 약 1.5%)
  // 넓히기(가로 → 세로 최댓값), 부드럽게(가로 → 세로 평균)
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { let v = 0; for (let k = -R; k <= R; k++) { const xx = x + k; if (xx >= 0 && xx < mw && al[y * mw + xx] > 0.5) { v = 1; break; } } t[y * mw + x] = v; }
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { let v = 0; for (let k = -R; k <= R; k++) { const yy = y + k; if (yy >= 0 && yy < mh && t[yy * mw + x]) { v = 1; break; } } g[y * mw + x] = v; }
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { let s = 0, c = 0; for (let k = -2; k <= 2; k++) { const xx = x + k; if (xx >= 0 && xx < mw) { s += g[y * mw + xx]; c++; } } t[y * mw + x] = s / c; }
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { let s = 0, c = 0; for (let k = -2; k <= 2; k++) { const yy = y + k; if (yy >= 0 && yy < mh) { s += t[yy * mw + x]; c++; } } g[y * mw + x] = s / c; }
  if (!HQ.prev || HQ.prev.length !== n) HQ.prev = new Float32Array(n).fill(-1);
  if (!HQ.fused || HQ.fused.length !== n) HQ.fused = new Float32Array(n);
  const d = HQ.matte, prev = HQ.prev, f = HQ.fused, sx = mw / w, sy = mh / h, LO = 0.15, HI = 0.85;
  for (let y = 0, i = 0; y < h; y++) {
    const gy = Math.min(mh - 1, (y * sy) | 0) * mw;
    for (let x = 0; x < w; x++, i++) {
      let p = d[i]; const q = prev[i];
      if (q >= 0) { const k = Math.min(1, 0.5 + Math.abs(p - q) * 1.5); p = q + (p - q) * k; }
      prev[i] = p;
      let a = (p - LO) / (HI - LO); a = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
      f[i] = a * g[gy + Math.min(mw - 1, (x * sx) | 0)];
    }
  }
  // 사람과 떨어진 가는 줄·조각(침대 이불 주름 등을 MODNet이 조금 잡은 것) 지우기: 가장 큰 덩어리의 5% 미만
  keepMain(f, w, h, 0.3, 0.05, 3, HQ);
  // MODNet이 어두운 옷 주름·팔과 몸 사이를 배경으로 잘라 낸 구멍은 MediaPipe(같은 장면)로 메움
  { const ax = mw / w, ay = mh / h;
    fxFillHoles(f, w, h, 0.9, i => { const x = i % w, y = (i - x) / w; return g[Math.min(mh - 1, (y * ay) | 0) * mw + Math.min(mw - 1, (x * ax) | 0)]; }, HQ); }   // gate: MediaPipe 사람 영역(몸 안은 1)
  // '사람 근처' 가중치(MediaPipe 격자): 사람 영역(gate)에서 화면 폭의 약 4% 안은 1, 10% 밖은 0, 그 사이는 서서히.
  // 늦게 온 결과 사이에 사람이 움직여 새로 생긴 부분만 받아들이고, 뒤의 물건이 들어오는 것은 막음
  // (예전의 네모 칸 경계 대신 거리로 서서히 바뀌어 계단 모양이 생기지 않음)
  if (!HQ.near || HQ.near.length !== m) HQ.near = new Float32Array(m);
  { const nb = HQ.near, N0 = mw / (SET.privacy ? 40 : 24), N1 = mw / (SET.privacy ? 16 : 10);
    distFrom(g, 0.5, mw, mh, t);
    for (let j = 0; j < m; j++) { const dd = t[j]; nb[j] = dd <= N0 ? 1 : dd >= N1 ? 0 : 1 - (dd - N0) / (N1 - N0); } }
  HQ.snap = al; HQ.sw = mw; HQ.sh = mh;
}
// 매 장면: MODNet 결과는 몇 장면 늦게 오므로, 그 사이 사람이 움직인 곳(지금 MediaPipe와 그때 MediaPipe가 다른 곳)은
// 지금 MediaPipe를 쓰고, 그대로인 곳은 MODNet 결과를 씀 → 움직일 때 잘리거나 잔상이 남지 않음
function hqCompose(al, mw, mh) {
  const w = HQ.W, h = HQ.H, f = HQ.fused, snap = HQ.snap, near = HQ.near, u32 = new Uint32Array(HQ.oimg.data.buffer), sx = mw / w, sy = mh / h;
  if (!HQ.ca || HQ.ca.length !== w * h) { HQ.ca = new Float32Array(w * h); HQ.cb = new Float32Array(w * h); }
  const ca = HQ.ca;
  const same = snap && HQ.sw === mw && HQ.sh === mh;
  for (let y = 0, i = 0; y < h; y++) {
    const gy = Math.min(mh - 1, (y * sy) | 0) * mw;
    for (let x = 0; x < w; x++, i++) {
      const j = gy + Math.min(mw - 1, (x * sx) | 0), now = al[j];
      let k = same ? Math.abs(now - snap[j]) * 2.5 : 1; k = k > 1 ? 1 : k;
      // 사라진 곳(사람이 비켜남)은 그대로 따르고, 새로 생긴 곳은 사람 근처일 때만(지금 MediaPipe 영역은 fxMask에서
      // 이미 '움직이지 않았는데 멀리서 갑자기 생긴 곳'을 걸러 냈으므로 의자·선반이 들어오지 않음)
      ca[i] = now < f[i] ? f[i] + (now - f[i]) * k : f[i] + (now - f[i]) * k * near[j];
    }
  }
  fxDisplayMask(ca, HQ.cb, w, h, HQ);
  const cb = HQ.cb; for (let i = 0; i < w * h; i++) u32[i] = ((cb[i] * 255 + 0.5) << 24 | 0xffffff) >>> 0;
  HQ.octx.putImageData(HQ.oimg, 0, 0);
}

function fxRun(fps) {
  if (FX.fps === fps && FX.timer) return;
  if (FX.timer) ticker.stop(FX.timer);
  FX.fps = fps; FX.timer = ticker.every(Math.round(1000 / fps), fxFrame);
}
function fxStop() { if (FX.timer) ticker.stop(FX.timer); FX.timer = 0; FX.fps = 0; FX.mode = ''; if (FX.video) FX.video.srcObject = null; fxFreeFrames(); }

// 모델 출력 → 화소마다 '사람일 확률'(0~1)
//  multiclass 모델은 6장: 0 배경, 1 머리카락, 2 몸 피부, 3 얼굴 피부, 4 옷, 5 기타(의자·쿠션 같은 물건이 여기로 감)
//  → 예전처럼 '1 − 배경'을 쓰면 뒤의 의자·침대까지 사람으로 남으므로, 사람은 1~4번만 더함
// 모델의 마스크는 카메라 해상도(예: 1280×720)로 나오지만 실제 정보는 256×256 수준이므로,
// 계산은 폭 320 이하의 작은 격자(gw×gh)에서 함 → 화면 크기와 상관없이 가벼움
function fxPerson(masks, gw, gh) {
  const n = gw * gh, out = FX.pbuf && FX.pbuf.length === n ? FX.pbuf : (FX.pbuf = new Float32Array(n));
  const mw = masks[0].width, mh = masks[0].height;
  const ix = FX.ix && FX.ix.length === n ? FX.ix : (FX.ix = new Int32Array(n));     // 격자 → 원래 마스크 위치
  if (FX.ixKey !== `${mw}x${mh}>${gw}x${gh}`) { FX.ixKey = `${mw}x${mh}>${gw}x${gh}`;
    for (let y = 0, i = 0; y < gh; y++) { const sy = Math.min(mh - 1, Math.floor((y + 0.5) * mh / gh)) * mw;
      for (let x = 0; x < gw; x++, i++) ix[i] = sy + Math.min(mw - 1, Math.floor((x + 0.5) * mw / gw)); } }
  if (FX.multi && masks.length >= 5) {
    out.fill(0);
    for (let k = 1; k <= 4; k++) { const a = masks[k].getAsFloat32Array(); for (let i = 0; i < n; i++) out[i] += a[ix[i]]; }
    return out;
  }
  const d = masks[masks.length - 1].getAsFloat32Array();
  for (let i = 0; i < n; i++) out[i] = d[ix[i]];
  // 한 장짜리 모델: 출력이 '사람' 확률인지 '배경' 확률인지 처음 몇 프레임으로 판별
  if (FX.votes < 20) {
    let ctr = 0, edge = 0, nc = 0, ne = 0;
    for (let y = 0; y < gh; y += 2) for (let x = 0; x < gw; x += 2) { const v = out[y * gw + x];
      if (Math.abs(x - gw / 2) < gw * 0.15 && y > gh * 0.3 && y < gh * 0.8) { ctr += v; nc++; } else if (x < gw * 0.08 || x > gw * 0.92) { edge += v; ne++; } }
    if (nc && ne && Math.abs(ctr / nc - edge / ne) > 0.2) { FX.votes++; FX.invSum += ctr / nc < edge / ne ? 1 : -1; FX.invert = FX.invSum > 0; }
  }
  if (FX.invert === true) for (let i = 0; i < n; i++) out[i] = 1 - out[i];
  return out;
}

// 0.5 이상(thr)인 영역을 덩어리로 나눠, 가장 큰 덩어리의 ratio 이상인 것만 남김(두 사람까지 유지).
// 남길 덩어리 주변 margin 화소는 부드러운 가장자리로 둠. buf: 작업용 버퍼를 담아 둘 객체
function keepMain(alpha, mw, mh, thr, ratio, margin, buf) {
  const n = mw * mh;
  if (!buf.lab || buf.lab.length !== n) { buf.lab = new Int32Array(n); buf.stk = new Int32Array(n); buf.ok = new Uint8Array(n); buf.nx = new Uint8Array(n); }
  const lab = buf.lab, stack = buf.stk; lab.fill(0); const area = [0];
  for (let s = 0; s < n; s++) {
    if (lab[s] || alpha[s] < thr) continue;
    const id = area.length; let top = 0, cnt = 0; stack[top++] = s; lab[s] = id;
    while (top) { const i = stack[--top]; cnt++; const x = i % mw, y = (i - x) / mw;
      if (x > 0 && !lab[i - 1] && alpha[i - 1] >= thr) { lab[i - 1] = id; stack[top++] = i - 1; }
      if (x < mw - 1 && !lab[i + 1] && alpha[i + 1] >= thr) { lab[i + 1] = id; stack[top++] = i + 1; }
      if (y > 0 && !lab[i - mw] && alpha[i - mw] >= thr) { lab[i - mw] = id; stack[top++] = i - mw; }
      if (y < mh - 1 && !lab[i + mw] && alpha[i + mw] >= thr) { lab[i + mw] = id; stack[top++] = i + mw; } }
    area.push(cnt);
  }
  if (area.length <= 2) return;                       // 덩어리가 0~1개
  const big = Math.max(...area), keepIt = area.map(a => a >= big * ratio);
  let ok = buf.ok, nx = buf.nx;
  for (let i = 0; i < n; i++) ok[i] = lab[i] && keepIt[lab[i]] ? 1 : 0;
  for (let r = 0; r < margin; r++) {
    for (let y = 0, i = 0; y < mh; y++) for (let x = 0; x < mw; x++, i++)
      nx[i] = ok[i] || (x > 0 && ok[i - 1]) || (x < mw - 1 && ok[i + 1]) || (y > 0 && ok[i - mw]) || (y < mh - 1 && ok[i + mw]) ? 1 : 0;
    const t = ok; ok = nx; nx = t;
  }
  for (let i = 0; i < n; i++) if (!ok[i]) alpha[i] = 0;
}
// 사람과 떨어진 작은 덩어리(뒤의 물건이 사람처럼 잡힌 것) 지우기: MediaPipe 격자, 가장 큰 덩어리의 30% 미만, 여유 2화소
const fxKeepMain = (alpha, mw, mh) => keepMain(alpha, mw, mh, 0.5, 0.3, 2, FX);

// 화면에 쓸 마스크를 r칸 안쪽으로 깎음(회색조 최솟값, 가로→세로). 키울 때의 흐림이 사람 바깥으로 번지면
// 그 띠에 원래 방이 비치므로(USENIX Security '25, Weissberg 외), 흐림 폭만큼 먼저 깎아 부드러운 경계가 사람 안쪽에 생기게 함
function erodeAlpha(src, dst, w, h, r, buf) {
  if (r <= 0) { dst.set(src); return; }
  const n = w * h; if (!buf.et || buf.et.length !== n) buf.et = new Float32Array(n);
  const t = buf.et;
  for (let y = 0; y < h; y++) { const b = y * w;
    for (let x = 0; x < w; x++) { let m = src[b + x]; const x0 = x - r < 0 ? 0 : x - r, x1 = x + r >= w ? w - 1 : x + r;
      for (let k = x0; k <= x1 && m > 0; k++) { const v = src[b + k]; if (v < m) m = v; } t[b + x] = m; } }
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) { let m = t[y * w + x]; const y0 = y - r < 0 ? 0 : y - r, y1 = y + r >= h ? h - 1 : y + r;   // 화면 밖은 무시(아래 끝에서 잘린 몸은 깎지 않음)
      for (let k = y0; k <= y1 && m > 0; k++) { const v = t[k * w + x]; if (v < m) m = v; } dst[y * w + x] = m; }
}
// 화면용 마스크를 깎을 양(1280 폭 기준 화소). 배경 흐림 모드는 보호 기능이 아니라 깎지 않음
// 기본은 2화소(고품질 512 격자에서 1칸, MediaPipe 320 격자에서는 0칸): 더 깎으면 손가락처럼 가는 부분이 사라짐(실측).
// 개인정보 보호 강화는 6화소(고품질 2칸, MediaPipe 1칸): 방이 덜 비치는 대신 윤곽·손가락이 조금 가늘어짐
// 보호 강화일 때 더하는 것(USENIX Security '25 Weissberg 외의 측정에 따름. 기본 설정에는 적용하지 않음: 손가락 같은 가는 부분이 가늘어짐)
//  - 배경 효과를 켠 뒤 처음 10초는 4화소 더(누출이 통화 초반 10초에 몰림)
//  - 크게 움직이는 곳은 14화소까지(일어서기·팔 흔들기처럼 큰 움직임에서 누출이 가장 큼. 움직이는 순간은 윤곽이 잘려도 덜 보임)
const fxErodePx = () => (FX.mode === 'blur' ? 0 : SET.privacy ? 6 + (performance.now() - (FX.fxStart || 0) < 10000 ? 4 : 0) : 2);
const FX_MOVE_PX = 14;
// 화면용 마스크 만들기: 기본만큼 깎고, 보호 강화면 움직임 지도(MediaPipe 격자)에 따라 더 깎은 것과 섞음
function fxDisplayMask(src, dst, w, h, buf) {
  const r = fxCells(w, fxErodePx());
  erodeAlpha(src, dst, w, h, r, buf);
  const mot = FX.mot, mw = FX.mask.width, mh = FX.mask.height, r2 = fxCells(w, FX_MOVE_PX);
  if (!SET.privacy || FX.mode === 'blur' || !mot || mot.length !== mw * mh || r2 <= r) return;
  if (!buf.strong || buf.strong.length !== w * h) buf.strong = new Float32Array(w * h);
  const st = buf.strong; erodeAlpha(src, st, w, h, r2, buf);
  const sx = mw / w, sy = mh / h;
  for (let y = 0, i = 0; y < h; y++) { const gy = Math.min(mh - 1, (y * sy) | 0) * mw;
    for (let x = 0; x < w; x++, i++) { let m = mot[gy + Math.min(mw - 1, (x * sx) | 0)] * 1.5; if (m <= 0) continue; if (m > 1) m = 1; dst[i] += (st[i] - dst[i]) * m; } }
}
const fxCells = (gridW, px) => Math.round(px * gridW / 1280 - 0.01);

// 가는 돌기 지우기(열림 연산): 0.5 이상을 r만큼 깎았다가 r+1만큼 되살림 → 팔 끝의 가는 실·삐침처럼 폭 2r보다 얇은 것은 사라짐
function fxOpen(alpha, mw, mh, r, buf) {
  const n = mw * mh;
  if (!buf.o1 || buf.o1.length !== n) { buf.o1 = new Uint8Array(n); buf.o2 = new Uint8Array(n); }
  const a = buf.o1, b = buf.o2;
  for (let i = 0; i < n; i++) a[i] = alpha[i] >= 0.5 ? 1 : 0;
  // 한 줄씩 누적합으로 창 안의 개수를 세어 깎기(모두 1)·되살리기(하나라도 1)를 한 번에 → 반경과 상관없이 가벼움
  if (!buf.ps || buf.ps.length < Math.max(mw, mh) + 1) buf.ps = new Int32Array(Math.max(mw, mh) + 1);
  const ps = buf.ps;
  const pass = (src, dst, rad, isMin, horiz) => {
    const L = horiz ? mw : mh, M = horiz ? mh : mw, st = horiz ? 1 : mw, lineStep = horiz ? mw : 1;
    for (let l = 0; l < M; l++) {
      const base = l * lineStep;
      ps[0] = 0; for (let k = 0; k < L; k++) ps[k + 1] = ps[k] + src[base + k * st];
      for (let k = 0; k < L; k++) {
        const lo = k - rad < 0 ? 0 : k - rad, hi = k + rad >= L ? L - 1 : k + rad, c = ps[hi + 1] - ps[lo];   // 화면 밖은 무시
        dst[base + k * st] = isMin ? (c === hi - lo + 1 ? 1 : 0) : (c > 0 ? 1 : 0);
      }
    }
  };
  pass(a, b, r, true, true); pass(b, a, r, true, false);          // 깎기
  pass(a, b, r + 1, false, true); pass(b, a, r + 1, false, false); // 되살리기(조금 더 넓게: 가장자리의 부드러운 부분 유지)
  for (let i = 0; i < n; i++) if (!a[i]) alpha[i] = 0;
}
// 몸 안의 구멍 메우기: 위·왼쪽·오른쪽 화면 가장자리에서 배경(thr 미만)을 따라 닿지 않는 '갇힌 배경'은 사람 안의 구멍
// (사람은 보통 화면 아래에 붙어 있으므로 아래 가장자리는 바깥으로 치지 않음). 구멍은 fill 값(0~1)까지 채움
function fxFillHoles(alpha, w, h, thr, fill, buf) {
  const n = w * h;
  if (!buf.hv || buf.hv.length !== n) { buf.hv = new Uint8Array(n); buf.hs = new Int32Array(n); }
  const vis = buf.hv, st = buf.hs; vis.fill(0); let top = 0;
  const push = i => { if (!vis[i] && alpha[i] < thr) { vis[i] = 1; st[top++] = i; } };
  for (let x = 0; x < w; x++) push(x);
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (top) { const i = st[--top], x = i % w;
    if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (i >= w) push(i - w); if (i + w < n) push(i + w); }
  // 구멍과 그 둘레 2화소(구멍 가장자리의 반쯤 투명한 띠까지)를 채움
  const hole = buf.hv; for (let i = 0; i < n; i++) hole[i] = !vis[i] && alpha[i] < thr ? 1 : 0;
  for (let r = 0; r < 2; r++) { for (let i = 0; i < n; i++) st[i] = hole[i];
    for (let i = 0; i < n; i++) if (!st[i]) { const x = i % w; if ((x > 0 && st[i - 1]) || (x < w - 1 && st[i + 1]) || (i >= w && st[i - w]) || (i + w < n && st[i + w])) hole[i] = 1; } }
  for (let i = 0; i < n; i++) if (hole[i]) { const v = fill(i); if (v > alpha[i]) alpha[i] = v; }
}

// 사람 영역(src ≥ thr)에서 떨어진 거리(화소, 8방향 근사)를 dist에 계산. 두 번 훑는 방식이라 가벼움(320×180에서 1ms 미만)
function distFrom(src, thr, mw, mh, dist) {
  const INF = 1e6, D = 1.4142;
  for (let i = 0; i < mw * mh; i++) dist[i] = src[i] >= thr ? 0 : INF;
  for (let y = 0, i = 0; y < mh; y++) for (let x = 0; x < mw; x++, i++) { let d = dist[i]; if (!d) continue;
    if (x > 0) d = Math.min(d, dist[i - 1] + 1);
    if (y > 0) { d = Math.min(d, dist[i - mw] + 1); if (x > 0) d = Math.min(d, dist[i - mw - 1] + D); if (x < mw - 1) d = Math.min(d, dist[i - mw + 1] + D); }
    dist[i] = d; }
  for (let y = mh - 1, i = mw * mh - 1; y >= 0; y--) for (let x = mw - 1; x >= 0; x--, i--) { let d = dist[i]; if (!d) continue;
    if (x < mw - 1) d = Math.min(d, dist[i + 1] + 1);
    if (y < mh - 1) { d = Math.min(d, dist[i + mw] + 1); if (x < mw - 1) d = Math.min(d, dist[i + mw + 1] + D); if (x > 0) d = Math.min(d, dist[i + mw - 1] + D); }
    dist[i] = d; }
}

// 움직임 지도(MediaPipe 격자): 앞 장면과 밝기가 달라진 곳. 사람이 움직여 새로 생긴 자리는 화면이 바뀌고,
// 뒤의 의자·선반이 잘못 사람으로 잡힌 자리는 화면이 그대로임 → 이 차이로 둘을 구분.
// 몇 장면 동안 서서히 사라지게 남겨 둠(고품질 결과가 늦게 와도 쓸 수 있게)
function fxMotion(v, mw, mh) {
  const n = mw * mh;
  if (!FX.lc) { FX.lc = el('canvas'); FX.lctx = FX.lc.getContext('2d', { willReadFrequently: true }); }
  if (FX.lc.width !== mw || FX.lc.height !== mh || !FX.mot || FX.mot.length !== n) {
    FX.lc.width = mw; FX.lc.height = mh; FX.lum = new Float32Array(n); FX.lum0 = null; FX.mot = new Float32Array(n); FX.mt = new Float32Array(n); }
  if (window.__fakeMotion) { window.__fakeMotion(FX.mot, mw, mh); return; }   // 시험용
  FX.lctx.drawImage(v, 0, 0, mw, mh);
  const px = FX.lctx.getImageData(0, 0, mw, mh).data, lum = FX.lum, mot = FX.mot, t = FX.mt;
  const had = !!FX.lum0; if (!had) FX.lum0 = new Float32Array(n);
  const l0 = FX.lum0;
  for (let i = 0, j = 0; i < n; i++, j += 4) { lum[i] = px[j] * 0.3 + px[j + 1] * 0.59 + px[j + 2] * 0.11; t[i] = had ? Math.abs(lum[i] - l0[i]) : 0; }
  l0.set(lum);
  if (!had) return;
  // 3×3 평균(카메라 잡음 무시) → 밝기 차 8 미만은 움직임 아님, 24 이상은 확실한 움직임
  for (let y = 0, i = 0; y < mh; y++) for (let x = 0; x < mw; x++, i++) {
    let s = 0, c = 0;
    for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= mh) continue;
      for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= mw) continue; s += t[yy * mw + xx]; c++; } }
    let m = (s / c - 8) / 16; m = m <= 0 ? 0 : m >= 1 ? 1 : m;
    const old = mot[i] * 0.75; mot[i] = m > old ? m : old;
  }
}

// 사람일 확률을 깔끔한 투명도 마스크로 바꿈
//  ① 앞 프레임과 섞어 깜박임 줄임(움직인 곳은 새 값을 더 많이 써서 잔상 방지)
//  ② 0.5 근처의 애매한 값을 또렷하게 + 가장자리를 조금 안쪽으로(머리카락 주변에 원래 배경이 남는 것 방지)
//  ③ 사람과 떨어진 물건 덩어리 지우기
function fxMask(res) {
  const masks = res.confidenceMasks || []; if (!masks.length) return;
  const sw = masks[0].width, sh = masks[0].height;
  const mw = Math.min(sw, 320), mh = Math.max(1, Math.round(sh * mw / sw)), n = mw * mh;   // 계산 격자(16:9면 320×180)
  if (FX.mask.width !== mw || FX.mask.height !== mh || !FX.mimg) {
    FX.mask.width = mw; FX.mask.height = mh; FX.mimg = FX.mctx.createImageData(mw, mh); FX.prev = new Float32Array(n).fill(-1);
    FX.alpha = new Float32Array(n); FX.invert = null; FX.votes = 0; FX.invSum = 0;
  }
  const d = fxPerson(masks, mw, mh), px = FX.mimg.data, prev = FX.prev, al = FX.alpha, LO = 0.5, HI = 0.85;
  // 앞 장면의 사람 영역에서 먼 곳이 갑자기 사람으로 잡히면(뒤의 의자·선반이 잠깐 잡힘) 천천히만 받아들임.
  // 사람이 움직여 새로 생기는 곳은 앞 영역 바로 옆이라 그대로 따라감
  if (!FX.dist || FX.dist.length !== n) FX.dist = new Float32Array(n);
  const strict = !!SET.privacy;   // 개인정보 보호 강화: 사람에서 떨어진 곳이 새로 생기는 것을 더 엄격하게
  const dist = FX.dist, G0 = mw / (strict ? 96 : 48), G1 = mw / (strict ? 32 : 16), SLOW = strict ? 0.05 : 0.12, MOT = strict ? 0.6 : 1, first = prev[0] < 0;   // 320 격자: 약 7화소까지 즉시, 20화소부터 가장 느리게
  // 기준 = 3장면 연속 사람이었던 곳(방금 잘못 잡혀 넓어진 곳에서 또 번져 나가지 않게)
  if (!FX.stab || FX.stab.length !== n) FX.stab = new Uint8Array(n);
  const stab = FX.stab;
  if (!first) { for (let i = 0; i < n; i++) stab[i] = al[i] >= 0.5 ? (stab[i] < 3 ? stab[i] + 1 : 3) : 0; distFrom(stab, 3, mw, mh, dist); }
  const mot = FX.mot && FX.mot.length === n ? FX.mot : null;
  for (let i = 0; i < n; i++) {
    let p = d[i] > 1 ? 1 : d[i];
    const q = prev[i];
    if (q >= 0) { let w = Math.min(1, 0.5 + Math.abs(p - q) * 1.5);
      if (p > q && !first) { const dd = dist[i];
        if (dd > G0) { let f = dd >= G1 ? SLOW : 1 - (1 - SLOW) * (dd - G0) / (G1 - G0); const mv = mot ? mot[i] * MOT : 0; if (mv > f) f = mv; w *= f; } }   // 움직인 곳은 바로 따라감
      p = q + (p - q) * w; }
    prev[i] = p;
    let a = (p - LO) / (HI - LO); al[i] = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
  }
  fxKeepMain(al, mw, mh);
  fxOpen(al, mw, mh, 1, FX);   // 폭 2칸(1280 기준 8화소) 이하의 가는 삐침만 제거. 더 크게 잡으면 든 손의 손가락이 지워짐(실측)
  const u32 = FX.mu32 && FX.mu32.buffer === px.buffer ? FX.mu32 : (FX.mu32 = new Uint32Array(px.buffer, px.byteOffset, n));
  if (!FX.disp || FX.disp.length !== n) FX.disp = new Float32Array(n);
  fxDisplayMask(al, FX.disp, mw, mh, FX);   // 화면용만 깎음(다음 장면 계산에 쓰는 al은 그대로)
  const dp = FX.disp;
  for (let i = 0; i < n; i++) u32[i] = ((dp[i] * 255 + 0.5) << 24 | 0xffffff) >>> 0;   // 흰색 + 투명도(RGBA, little-endian)
  FX.maskAt = performance.now();
  FX.mctx.putImageData(FX.mimg, 0, 0);
  // 고품질: 0.3초 안에 만든 MODNet×MediaPipe 마스크가 있으면 그것을 씀(없으면 MediaPipe만)
  FX.hq = !!HQ.fused && !HQ.failed && performance.now() - HQ.at < (window.__fakeOrt ? 5000 : 300);
  if (FX.hq) hqCompose(al, mw, mh);
}
// 지금 쓰는 마스크 그림(고품질이면 512×288 MODNet 합성, 아니면 MediaPipe 256×256)
const fxMaskImg = () => (FX.hq ? HQ.out : FX.mask);

// 배경 흐림: 사람 자리를 비운 배경만 흐림 → 사람(머리카락·어두운 옷) 색이 배경으로 번져 생기는 '후광'을 막음
//  ① 전체를 흐린 바탕(사람 뒤쪽 빈자리용)  ② 사람을 지운 배경을 흐려 3번 겹쳐 가장자리를 배경 색으로 채움
//  흐림은 절반 크기에서 한 뒤 키움(흐린 그림이라 화질 차이가 없고 4배 가벼움)
function fxBlurBack(ctx, v, W, H) {
  const hw = Math.max(8, W >> 1), hh = Math.max(8, H >> 1);
  if (!FX.half) { FX.half = el('canvas'); FX.hctx = FX.half.getContext('2d'); FX.half2 = el('canvas'); FX.h2ctx = FX.half2.getContext('2d'); }
  for (const c of [FX.half, FX.half2]) if (c.width !== hw || c.height !== hh) { c.width = hw; c.height = hh; }
  const h = FX.hctx, g = FX.h2ctx;
  h.globalCompositeOperation = 'copy'; h.drawImage(v, 0, 0, hw, hh);            // 배경에서 사람 자리를 지움(조금 넓게)
  h.globalCompositeOperation = 'destination-out';
  if (CANVAS_FILTER) h.filter = 'blur(2px)';
  const M = fxMaskImg(); h.drawImage(M, 0, 0, hw, hh); h.drawImage(M, 0, 0, hw, hh); h.filter = 'none';
  h.globalCompositeOperation = 'source-over';
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, hw, hh);
  drawBlurred(g, v, -12, -12, hw + 24, hh + 24, 7);
  for (let k = 0; k < 3; k++) drawBlurred(g, FX.half, -12, -12, hw + 24, hh + 24, 7);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(FX.half2, 0, 0, W, H);
}

function fxFrame() {
  const c = FX.canvas, ctx = FX.ctx;
  if (FX.mode === 'pic') {
    if (c.width !== 1280) { c.width = 1280; c.height = 720; }
    ctx.fillStyle = '#20242e'; ctx.fillRect(0, 0, c.width, c.height);
    if (FX.off) drawCover(ctx, FX.off, 0, 0, c.width, c.height);
    return;
  }
  const cam = FX.video; if (!cam || cam.readyState < 2 || !cam.videoWidth) return;
  const sc = Math.min(1, 1280 / cam.videoWidth), W = Math.round(cam.videoWidth * sc), H = Math.round(cam.videoHeight * sc);
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  let v = cam;
  // 작업자 멈춤 감시: 장면을 보낸 뒤 5초 넘게 답이 없으면 다시 시작. 화면 쪽이 바빴거나(장면 사이 1초 이상) 창이 가려져
  // 답을 늦게 읽은 경우는 멈춤으로 보지 않음
  const nowT = performance.now(), gap = nowT - (FX.lastFrameAt || nowT); FX.lastFrameAt = nowT;
  if (FX.seg?.worker && FX.wbusy) { if (gap > 1000 || document.hidden) FX.wSent = nowT; else if (nowT - FX.wSent > 5000) segWorkerRestart('응답 없음'); }
  // 고품질 처리가 일시적인 오류로 꺼졌으면 30초 뒤 자동으로 다시 시도(2번까지. '느림'으로 꺼진 경우는 제외)
  if (HQ.failed && HQ.retryAt && nowT > HQ.retryAt && SET.hq !== false && FX.seg) { hqReset(); if (hqWanted()) hqLoad(); }
  if (FX.seg?.worker) {
    // 작업자 방식: 다음 장면을 보내고, 화면에는 '마스크가 나온 장면'(FX.cur)을 그림 → 마스크와 영상이 정확히 맞음
    segWorkerSend(cam);
    if (FX.cur && FX.cur.width === cam.videoWidth) v = FX.cur;
    if (FX.cur && FX.curDrawn === FX.cur && !FX.dirty && performance.now() - (FX.maskAt || 0) <= 500) return;   // 새 장면이 없으면 그대로 둠
    FX.curDrawn = FX.cur; FX.dirty = false;
    if (FX.cur && HQ.sess && hqWanted()) hqRun(v);
  } else if (FX.seg) {
    try {
      if (FX.mimg) fxMotion(v, FX.mask.width, FX.mask.height);   // 첫 마스크로 격자 크기가 정해진 뒤부터
      FX.seg.segmentForVideo(v, performance.now(), res => { try { fxMask(res); } finally { res.close?.(); } });
      if (HQ.sess && hqWanted()) hqRun(v);   // 같은 장면을 MODNet에(앞 계산이 끝났을 때만)
      FX.errs = 0;
    } catch (e) {
      console.warn('segment error', e);
      if (++FX.errs >= 30) { fxFail(); return; }   // 1초 동안 계속 실패: 방이 보이지 않게 꺼짐 그림으로
    }
  }
  const back = () => { if (FX.mode === 'blur') { if (FX.prev) fxBlurBack(ctx, v, W, H); else drawBlurred(ctx, v, -24, -24, W + 48, H + 48, 14); }
    else if (FX.bg) drawCover(ctx, FX.bg, 0, 0, W, H); else { ctx.fillStyle = '#1f2937'; ctx.fillRect(0, 0, W, H); } };
  // 첫 마스크 전, 또는 마스크가 0.5초 넘게 갱신되지 않음(처리 멈춤): 지난 마스크에 지금 장면을 맞추면 방이 비치므로 배경만
  if (!FX.prev || performance.now() - (FX.maskAt || 0) > 500) { ctx.save(); ctx.globalCompositeOperation = 'copy'; back(); ctx.restore(); return; }
  // 저해상도(256) 마스크를 부드럽게 키우고, 화면 크기에 맞춰 가장자리를 흐림
  const B = FX.big, b = FX.bctx;
  if (B.width !== W || B.height !== H) { B.width = W; B.height = H; }
  b.globalCompositeOperation = 'copy'; b.imageSmoothingEnabled = true; b.imageSmoothingQuality = 'high';
  const M = fxMaskImg();   // 저해상도 마스크를 키울 때 생기는 계단을 흐림으로 없앰(고품질 매트는 더 촘촘해 조금만)
  if (CANVAS_FILTER) b.filter = `blur(${(FX.hq ? Math.max(0.8, W / 960) : Math.max(1.5, W / 480)).toFixed(1)}px)`; b.drawImage(M, 0, 0, W, H); b.filter = 'none';
  ctx.save();
  ctx.globalCompositeOperation = 'copy'; ctx.drawImage(B, 0, 0);                                       // 사람 영역
  ctx.globalCompositeOperation = 'source-in'; ctx.drawImage(v, 0, 0, W, H);                            // 사람만 남김
  ctx.globalCompositeOperation = 'destination-over';                                                    // 뒤에 배경
  back();
  ctx.restore();
}

// 진단: Ctrl+Shift+F9 → 지금 장면의 카메라 원본·MediaPipe 마스크·고품질 마스크·결과를 PNG로 저장(배경 문제를 확인할 때)
addEventListener('keydown', e => {
  if (!(e.ctrlKey && e.shiftKey && e.key === 'F9') || !FX.video?.videoWidth) return;
  e.preventDefault();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const save = (src, name, w, h) => { const c = Object.assign(el('canvas'), { width: w || src.width || src.videoWidth, height: h || src.height || src.videoHeight }), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
    c.toBlob(b => b && download(b, `GTMeet_diag_${stamp}_${name}.png`)); };
  save(FX.video, '1camera');
  if (FX.mimg) save(FX.mask, '2mediapipe', 640, Math.round(640 * FX.mask.height / FX.mask.width));
  if (FX.hq && HQ.out) save(HQ.out, '3hq', 640, Math.round(640 * HQ.H / HQ.W));
  save(FX.canvas, '4result');
  // 자체 점검: 화면에 쓴 마스크에서 반투명한 경계 띠(사람과 배경이 섞이는 곳 = 방이 비칠 수 있는 곳)의 넓이.
  // 실제 누출량은 아니고, 설정을 바꿨을 때 띠가 줄었는지 비교하는 용도. 띠는 카메라 그림 위에 빨갛게 표시해 저장
  let band = '';
  const M = FX.mimg && FX.big && FX.big.width > 1 ? FX.big : null;   // 합성에 실제로 쓴 마스크(화면 크기로 키우고 가장자리를 흐린 것)
  if (M && M.width) {
    const w = M.width, h = M.height, c = Object.assign(el('canvas'), { width: w, height: h }), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(M, 0, 0); const a = x.getImageData(0, 0, w, h).data;
    x.globalCompositeOperation = 'copy'; x.drawImage(FX.cur || FX.video, 0, 0, w, h); const im = x.getImageData(0, 0, w, h), d = im.data;
    let nb = 0; for (let i = 0; i < w * h; i++) { const v = a[i * 4 + 3]; if (v > 12 && v < 243) { nb++; d[i * 4] = 255; d[i * 4 + 1] >>= 2; d[i * 4 + 2] >>= 2; } }
    x.putImageData(im, 0, 0); c.toBlob(b => b && download(b, `GTMeet_diag_${stamp}_5edge.png`));
    band = ` · 경계 띠 ${(nb / (w * h) * 100).toFixed(1)}%`;
  }
  toast(`진단 그림 저장 (고품질 ${FX.hq ? '켜짐' : '꺼짐'}, 보호 강화 ${SET.privacy ? '켜짐' : '꺼짐'}${band})`);
});

// 지금 상태(카메라 켬/끔, 배경 설정)에 맞는 '보낼 영상'을 정하고 상대방·미리보기에 반영
async function updateVideoOut() {
  const gen = ++FX.gen;
  if (SET.bg === 'none') FX.failed = false;   // '그대로'를 고르면 실패 상태 해제
  let want = (S.cam && S.camOn) ? (SET.bg === 'none' ? 'raw' : FX.failed ? 'pic' : 'fx') : (SET.offImage ? 'pic' : 'raw');
  if (S.cam) S.cam.enabled = S.camOn;
  if (want === 'fx') {
    fxSetup();
    if (!FX.seg) {
      setFxBusy(true);
      try { FX.seg = await loadSegmenter(); }
      catch (e) { console.warn(e); FX.failed = true; want = 'pic';
        if (gen === FX.gen) toast(T("배경 효과를 불러오지 못했습니다(인터넷 연결 확인). 방이 보이지 않게 카메라 꺼짐 그림을 보냅니다. 원래 화면을 보내려면 ⚙ 설정에서 배경을 '그대로'로 바꾸세요."), 'warn'); }
      setFxBusy(false);
    }
    if (FX.seg && hqWanted()) hqLoad();   // 고품질(PC): 뒤에서 준비되면 바로 바뀜
    else if (CFG.fxPlus === 'downloading' && !HQ.poll) HQ.poll = setInterval(async () => {   // 모델을 받는 중이면 끝날 때까지 확인
      await refreshConfig();
      if (CFG.fxPlus !== 'downloading') { clearInterval(HQ.poll); HQ.poll = 0; if (FX.seg && FX.mode && hqWanted()) hqLoad(); }
    }, 10000);
  }
  if (gen !== FX.gen) return; // 그 사이 설정이 또 바뀜
  if (want === 'raw') { fxStop(); S.out = S.cam; }
  else {
    fxSetup();
    FX.bg = await loadImg(bgSrc()); FX.off = await loadImg(SET.offImage);
    if (gen !== FX.gen) return;
    if (want !== 'pic' && (!FX.mode || FX.mode === 'pic')) FX.fxStart = performance.now();   // 배경 효과를 켠 시각
    FX.mode = want === 'pic' ? 'pic' : SET.bg; FX.dirty = true;
    if (want === 'fx') { if (FX.video.srcObject?.getVideoTracks()[0] !== S.cam) { FX.video.srcObject = new MediaStream([S.cam]); FX.video.play().catch(() => {}); } }
    else FX.video.srcObject = null;
    fxFrame(); fxRun(want === 'pic' ? 2 : 30);
    S.out = FX.track;
  }
  for (const p of S.peers.values()) replaceSenders(p);
  updatePreview();
  if (S.id) { renderSelf(); sendMediaState(); }
}
// 배경 효과를 쓸 수 없을 때: 원래 화면(방)을 보내지 않고 카메라 꺼짐 그림(없으면 어두운 바탕)을 보냄.
// 원래 화면을 보내려면 사용자가 설정에서 배경을 '그대로'로 바꿈
function fxFail() {
  if (FX.failed) return; FX.failed = true;
  toast(T("배경 효과를 쓸 수 없어 카메라 화면 대신 꺼짐 그림을 보냅니다. 원래 화면을 보내려면 ⚙ 설정에서 배경을 '그대로'로 바꾸세요."), 'warn');
  updateVideoOut();
}
function setFxBusy(on) { document.querySelectorAll('.fx-busy').forEach(e => e.hidden = !on); }

// ================= 대기실 =================
const fmtId = id => String(id || '').replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d+)$/, '$1 $2 $3');
const inviteLink = () => `${publicBase()}?id=${S.room}#pw=${S.password}`;

let CFG = {};
// 초대 링크 해석: 다른 PC(외부 접속 주소)의 회의면 그 서버로 연결
function useInvite(text) {
  let u; try { u = new URL(text.trim().match(/https?:\/\/\S+/i)[0]); } catch { return; }
  const id = (u.searchParams.get('id') || '').replace(/\D/g, ''), pw = (new URLSearchParams(u.hash.slice(1)).get('pw') || '').replace(/\D/g, '');
  S.remote = u.origin === location.origin ? null : u.origin;
  $('#inMeetingId').value = fmtId(id) || id; if (pw) $('#inPw').value = pw;
  $('#remoteNote').hidden = !S.remote; $('#remoteNote').textContent = S.remote ? T('🌐 회의 주소: {u}', { u: S.remote.replace(/^https?:\/\//, '') }) : '';
}
async function initLobby() {
  applyI18n(); bindLang(); bindHelp(); initUpdate(); window.gtmeet?.setLang?.(LANG);
  // 초대 링크: ?id=123456789#pw=123456  (비밀번호는 # 뒤라 서버로 전송·기록되지 않음)
  const qs = new URLSearchParams(location.search), hs = new URLSearchParams(location.hash.slice(1));
  $('#inName').value = SET.name;
  S.micOn = SET.micOn; S.camOn = SET.camOn;
  await refreshConfig();
  S.iceServers = CFG.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
  $('#hostCodeRow').hidden = !CFG.needHostCode;
  if (CFG.canHost === false) { $('#btnStart').hidden = true; }

  const showJoin = window.__showJoin = on => { $('#choose').hidden = on; $('#joinForm').hidden = !on; $('#lobbyErr').textContent = ''; if (on) setTimeout(() => ($('#inMeetingId').value ? $('#inPw') : $('#inMeetingId')).focus(), 0); };
  $('#btnShowJoin').onclick = () => showJoin(true);
  $('#btnBack').onclick = () => showJoin(false);
  $('#inMeetingId').oninput = e => {
    const v = e.target.value;
    if (/https?:\/\//i.test(v)) return useInvite(v);       // 초대 링크를 붙여 넣은 경우
    const d = v.replace(/\D/g, '').slice(0, 9); e.target.value = fmtId(d) || d;
  };
  $('#inPw').oninput = e => { e.target.value = e.target.value.replace(/\D/g, ''); };
  $('#inName').onchange = () => { SET.name = $('#inName').value.trim(); saveSet(); };
  // 서버 없이 실행되는 모드(안드로이드 앱·고정 주소 웹앱): 회의 참여 전용
  if (CFG.static) {
    $('#choose').hidden = true; $('#joinForm').hidden = false; $('#btnBack').hidden = true;
    $('#joinHint').hidden = false;
    if (SET.lastRemote) { S.remote = SET.lastRemote; $('#remoteNote').hidden = false; $('#remoteNote').textContent = T('최근 회의 주소: {u}', { u: SET.lastRemote.replace(/^https?:\/\//, '') }); }
    if (IOS && !navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches) $('#iosHint').hidden = false;
  }
  $('#btnPaste').hidden = !(navigator.clipboard?.readText || ANDROID);
  $('#btnPaste').onclick = async () => {
    let t = ''; try { t = ANDROID ? window.GTMeetAndroid.clipboard() : await navigator.clipboard.readText(); } catch {}
    if (/https?:\/\//i.test(t)) { useInvite(t); toast(T('초대문에서 회의 정보를 채웠습니다.')); } else toast(T('복사한 초대문이 없습니다. 메신저에서 초대문을 길게 눌러 복사한 뒤 다시 누르세요.'), 'warn');
  };
  window.__gtmeetInvite = text => { showJoin(true); useInvite(text); }; // 안드로이드: 공유받은 초대문
  if (window.__pendingInvite) { window.__gtmeetInvite(window.__pendingInvite); window.__pendingInvite = null; }
  if (qs.get('s')) S.remote = 'https://' + qs.get('s').replace(/^https?:\/\//, '');
  if (qs.get('id')) { $('#inMeetingId').value = fmtId(qs.get('id')); $('#inPw').value = (hs.get('pw') || '').replace(/\D/g, ''); showJoin(true); }

  $('#btnStart').onclick = () => {
    if (!needName()) return; askNotify();
    if (!$('#hostCodeRow').hidden && !$('#inHostCode').value) { $('#inHostCode').focus(); return err(T('회의 개설 코드를 입력하세요.')); }
    connect({ type: 'host', name: S.name, hostCode: $('#inHostCode').value });
  };
  $('#joinForm').onsubmit = e => {
    e.preventDefault(); if (!needName()) return; askNotify();
    const id = $('#inMeetingId').value.replace(/\D/g, ''), pw = $('#inPw').value;
    if (id.length !== 9) { $('#inMeetingId').focus(); return err(T('회의 ID 9자리를 입력하세요.')); }
    if (!pw) { $('#inPw').focus(); return err(T('비밀번호를 입력하세요.')); }
    if (CFG.static && !S.remote) return err(T('회의 주소가 필요합니다. 받은 초대문(링크)을 붙여 넣어 주세요.'));
    connect({ type: 'join', name: S.name, meetingId: id, password: pw });
  };
  if (NATIVE || CFG.static) $('#inMeetingId').placeholder = T('000 000 000 또는 초대 링크');
  $('#btnCancelWait').onclick = () => { wsSend({ type: 'cancel' }); S.ws?.close(); setWaiting(false); };

  if (!window.isSecureContext) err(T('⚠ HTTPS(또는 localhost)로 접속해야 카메라·마이크를 쓸 수 있습니다.'));
  bindSettings();
  updatePreview();
  await openDevices();
  await fillDeviceLists();
  $('#pvMic').onclick = () => setMic(!S.micOn, true);
  $('#pvCam').onclick = () => setCam(S.cam ? !S.camOn : true, true);   // 카메라를 못 열었으면 누를 때 다시 열어 봄
  lobbyMeter();
  initInstall();
  if (CFG.local && SET.tunnelAuto && CFG.tunnel?.state === 'off') setTunnel(true);
  // 서버 상태 확인(앱 모드에서는 '사용 중' 신호 역할도 함)
  const poll = async () => { await refreshConfig(); setTimeout(poll, ['starting', 'downloading'].includes(CFG.tunnel?.state) ? 1500 : 20000); };
  setTimeout(poll, 1500);
}

// ================= 언어 =================
function bindLang() {
  for (const sel of [$('#langSel'), $('#optLang')]) {
    sel.innerHTML = ''; LANGS.forEach(l => { const o = el('option', 'no-i18n', l.name); o.value = l.code; sel.append(o); });
    sel.value = LANG; sel.onchange = () => changeLang(sel.value);
  }
}
function changeLang(code) {
  const sttFollow = SET.sttLang === LANG_INFO.stt; // 녹취 언어를 바꾼 적 없으면 함께 변경
  setLangVars(code); SET.lang = code; if (sttFollow) SET.sttLang = LANG_INFO.stt; saveSet();
  $('#langSel').value = code; $('#optLang').value = code; $('#sttLang').value = SET.sttLang; $('#optSttLang').value = SET.sttLang;
  applyI18n(); renderNet(); renderSettings(); renderHelp(); renderUpdate(); window.gtmeet?.setLang?.(code);
  if (S.id) { setMic(S.micOn); setCam(S.camOn); renderPeople(); $('#tScreen').querySelector('span').textContent = T(S.screen ? '공유 중지' : '화면공유');
    $('#tRec').querySelector('span').textContent = T(S.rec ? '녹화 중지' : '녹화'); if (isHost()) applyRoomState(); }
}

// ================= 업데이트 (PC 앱) =================
let UPD = null;
function initUpdate() {
  const u = window.gtmeet?.update; if (!u) return;
  $('#aboutSection').hidden = false;
  $('#btnUpdCheck').onclick = () => u.check();
  $('#btnUpdInstall').onclick = () => u.install();
  u.on(x => { UPD = x; renderUpdate(); });
  u.get().then(x => { UPD = x; renderUpdate(); });
}
function renderUpdate() {
  if (!UPD) return;
  const x = UPD, v = x.next || '';
  $('#appVer').textContent = 'v' + x.version;
  const line = {
    dev: T('개발용 실행 — 자동 업데이트를 사용하지 않습니다.'), idle: T('업데이트 확인 대기 중'), checking: T('새 버전 확인 중…'),
    latest: T('최신 버전입니다.'), available: (x.mandatory ? '⚠ ' + T('필수 업데이트') + ' · ' : '') + T('새 버전 {v}을(를) 설치할 수 있습니다.', { v }),
    downloading: T('새 버전 {v} 내려받는 중… {p}%', { v, p: x.percent || 0 }),
    ready: T('새 버전 {v} 준비 완료 — 다시 시작하면 적용됩니다.', { v }), error: T('업데이트 확인 실패:') + ' ' + (x.msg || ''),
  }[x.state] || '';
  $('#updLine').textContent = line;
  $('#btnUpdInstall').hidden = !['ready', 'available'].includes(x.state);
  $('#btnUpdInstall').textContent = T(x.state === 'ready' ? '지금 다시 시작' : '지금 업데이트');
  $('#btnUpdCheck').disabled = ['checking', 'downloading', 'dev'].includes(x.state);
  // 첫 화면 안내 줄
  const box = $('#updBox');
  box.hidden = !['available', 'downloading', 'ready'].includes(x.state);
  box.classList.toggle('must', !!x.mandatory && x.state !== 'ready');
  let msg = '', btn = '';
  if (x.state === 'available') { msg = x.mandatory ? `⚠ ${T('필수 업데이트 {v}: 업데이트하지 않으면 새 버전 사용자와 회의를 만들거나 참여할 수 없습니다.', { v })}` : `⬆ ${T('새 버전 {v}을(를) 설치할 수 있습니다.', { v })}`; btn = T('지금 업데이트'); }
  if (x.state === 'downloading') msg = `⬇ ${T('새 버전 {v} 내려받는 중… {p}%', { v, p: x.percent || 0 })}`;
  if (x.state === 'ready') { msg = `⬆ ${T('새 버전 {v} 준비 완료 — 다시 시작하면 적용됩니다.', { v })}`; btn = T('지금 다시 시작'); }
  box.innerHTML = `<span>${esc(msg)}</span>`;
  if (btn) { const b = el('button', null, btn); b.onclick = updateAction; box.append(b); }
}
function updateAction() {
  const u = window.gtmeet?.update; if (!u || !UPD) return;
  if (UPD.state === 'ready') u.install(); else if (UPD.state === 'available') u.download(); else u.check();
}
// 회의 호환이 안 될 때: 필수 업데이트 안내
function needUpgrade(serverVersion) {
  const msg = T('회의 호환을 위해 GT-Meet 업데이트가 필요합니다.') + (serverVersion ? ' (' + T('필요 버전 {v} 이상', { v: serverVersion }) + ')' : '');
  err(msg);
  const box = $('#lobbyErr');
  const b = el('button', 'chip', NATIVE ? T('지금 업데이트') : T('새로 고침'));
  b.style.marginLeft = '8px';
  b.onclick = () => { if (!NATIVE) return location.reload();
    if (UPD && ['available', 'ready'].includes(UPD.state)) updateAction(); else { window.gtmeet.update.check(); toast(T('새 버전 확인 중…')); } };
  box.append(b);
  if (NATIVE && UPD?.state === 'available') updateAction(); // 이미 받을 수 있는 새 버전이 있으면 바로 진행 여부를 물음
}

// ================= 사용 설명서 =================
function bindHelp() {
  const open = () => { renderHelp(); $('#helpDlg').showModal(); };
  $('#btnHelp').onclick = open; $('#tHelp').onclick = open;
  addEventListener('keydown', e => { if (e.key === 'F1') { e.preventDefault(); open(); } });
}
function renderHelp() {
  const html = (window.HELP && (HELP[LANG] || HELP.en)) || '';
  const body = $('#helpBody'); body.innerHTML = html;
  const toc = $('#helpToc'); toc.innerHTML = '';
  body.querySelectorAll('h2').forEach((h, i) => { h.id = 'help-' + i;
    const a = el('a', null, h.textContent); a.href = '#'; a.onclick = e => { e.preventDefault(); h.scrollIntoView({ behavior: 'smooth' });
      toc.querySelectorAll('a').forEach(x => x.classList.toggle('on', x === a)); }; toc.append(a); });
}

// ================= 외부 접속 상태 =================
async function refreshConfig() {
  try { CFG = await (await fetch('config.json', { cache: 'no-store' })).json(); } catch { return; }
  renderNet();
}
async function setTunnel(on) {
  try { const r = await fetch('api/tunnel?on=' + (on ? 1 : 0), { method: 'POST' }); CFG.tunnel = await r.json(); } catch {}
  renderNet(); setTimeout(refreshConfig, 1200);
}
const publicBase = () => S.remote ? S.remote + '/' : (CFG.local && CFG.tunnel?.state === 'on' && CFG.tunnel.url) ? CFG.tunnel.url + '/' : location.origin + location.pathname;
function renderNet() {
  const t = CFG.tunnel || {}; const box = $('#netBox'), info = $('#infoNet');
  $('#netSection').hidden = !CFG.local || !CFG.appMode;
  if (!CFG.local || !CFG.appMode) { box.hidden = true; if (info) info.hidden = true; return; }
  const line = {
    off: ['', T('🌐 외부 접속 꺼짐 — 지금은 이 PC에서만 접속됩니다.'), T('켜기')],
    downloading: ['', T('🌐 외부 접속 준비 중… (처음 한 번 프로그램을 내려받습니다)'), ''],
    starting: ['', T('🌐 외부 접속 연결 중…'), ''],
    on: ['on', `${T('🌐 외부 접속 켜짐')} · <span class="url">${esc(t.url)}</span>`, T('끄기')],
    error: ['err', `${T('⚠ 외부 접속 실패:')} ${esc(T(t.msg || ''))}`, T('다시 시도')],
  }[t.state] || ['', '', ''];
  box.hidden = false; box.className = 'net ' + line[0]; box.innerHTML = `<span>${line[1]}</span>`;
  if (line[2]) { const b = el('button', t.state === 'on' ? 'off' : '', line[2]); b.onclick = () => setTunnel(t.state !== 'on'); box.append(b); }
  if (info) {
    info.hidden = t.state === 'on' || !!S.remote;
    info.innerHTML = `<span>${T('⚠ 외부 접속이 꺼져 있어 이 링크는 이 PC에서만 열립니다.')}</span>`;
    if (t.state !== 'on') { const b = el('button', null, ['starting', 'downloading'].includes(t.state) ? T('연결 중…') : T('외부 접속 켜기')); b.onclick = () => setTunnel(true); info.append(b); }
  }
  if ($('#infoDlg').open && S.room) $('#inviteText').value = inviteText();
}

// ================= 설정 화면 =================
function bindSettings() {
  const open = async () => { renderSettings(); $('#setDlg').showModal(); updatePreview(); await fillDeviceLists(); };
  $('#btnSettings').onclick = open; $('#tSettings').onclick = open;
  $('#setDlg').addEventListener('close', () => { updatePreview(); });
  $('#selCam').onchange = () => { SET.camId = $('#selCam').value; saveSet(); openDevices(); };
  $('#selMic').onchange = () => { SET.micId = $('#selMic').value; saveSet(); openDevices(); };
  $('#optMicOn').onchange = e => { SET.micOn = e.target.checked; saveSet(); if (!S.id) setMic(SET.micOn); };
  $('#optCamOn').onchange = e => { SET.camOn = e.target.checked; saveSet(); if (!S.id) setCam(SET.camOn); };
  document.querySelectorAll('#bgMode input').forEach(r => r.onchange = () => { SET.bg = r.value; saveSet(); renderSettings(); updateVideoOut(); });
  $('#bgFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { SET.bgCustom = await readImageFile(f); SET.bgSel = 'custom'; SET.bg = 'image'; saveSet(); renderSettings(); updateVideoOut(); } catch (x) { toast(T(x.message), 'bad'); } };
  $('#btnOffPick').onclick = () => $('#offFile').click();
  $('#offFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { SET.offImage = await readImageFile(f); saveSet(); renderSettings(); updateVideoOut(); } catch (x) { toast(T(x.message), 'bad'); } };
  $('#btnOffClear').onclick = () => { SET.offImage = ''; saveSet(); renderSettings(); updateVideoOut(); };
  $('#optSttLang').onchange = e => { SET.sttLang = e.target.value; saveSet(); $('#sttLang').value = SET.sttLang; S.stt?.setLang(SET.sttLang); };
  $('#optAutoCap').onchange = e => { SET.autoCap = e.target.checked; saveSet(); $('#autoCap').checked = SET.autoCap; };
  $('#optHq').onchange = e => { SET.hq = e.target.checked; saveSet(); hqReset(); HQ.retries = 0; if (SET.hq && FX.seg && FX.mode && hqWanted()) hqLoad(); $('#hqStatus').textContent = hqStatusText(); };
  $('#optPrivacy').onchange = e => { SET.privacy = e.target.checked; saveSet(); };   // 다음 장면부터 바로 적용
  $('#optTunnelAuto').onchange = e => { SET.tunnelAuto = e.target.checked; saveSet(); if (SET.tunnelAuto && CFG.tunnel?.state !== 'on') setTunnel(true); };
  // 회의 패널의 같은 항목과 연동
  $('#sttLang').value = SET.sttLang; $('#autoCap').checked = SET.autoCap;
  $('#sttLang').addEventListener('change', e => { SET.sttLang = e.target.value; saveSet(); });
  $('#autoCap').addEventListener('change', e => { SET.autoCap = e.target.checked; saveSet(); });
}
function renderSettings() {
  $('#optMicOn').checked = SET.micOn; $('#optCamOn').checked = SET.camOn;
  document.querySelectorAll('#bgMode input').forEach(r => r.checked = r.value === SET.bg);
  $('#optSttLang').value = SET.sttLang; $('#optAutoCap').checked = SET.autoCap; $('#optTunnelAuto').checked = SET.tunnelAuto;
  $('#hqRow').hidden = !hqAvailable(); $('#optHq').checked = SET.hq !== false; $('#optHq').disabled = false;
  $('#hqStatus').hidden = !hqAvailable() && CFG.fxPlus !== 'downloading'; $('#hqStatus').textContent = hqStatusText();
  $('#optPrivacy').checked = !!SET.privacy;
  const th = $('#bgThumbs'); th.innerHTML = ''; th.classList.toggle('dim', SET.bg !== 'image');
  const mk = (id, src, name) => { const b = el('button', 'thumb' + (SET.bgSel === id ? ' on' : '')); b.type = 'button';
    b.style.backgroundImage = `url("${src}")`; b.append(el('span', null, T(name)));
    b.onclick = () => { SET.bgSel = id; SET.bg = 'image'; saveSet(); renderSettings(); updateVideoOut(); }; th.append(b); };
  BG_PRESETS.forEach(p => mk(p.id, presetUrl(p.id), p.name));
  if (SET.bgCustom) mk('custom', SET.bgCustom, T('내 사진'));
  const add = el('button', 'thumb add', SET.bgCustom ? T('＋ 다른 사진') : T('＋ 내 사진 선택')); add.type = 'button';
  add.onclick = () => { th.classList.remove('dim'); $('#bgFile').click(); }; th.append(add);
  const ot = $('#offThumb'); ot.style.backgroundImage = SET.offImage ? `url("${SET.offImage}")` : ''; ot.querySelector('span').hidden = !!SET.offImage;
  $('#btnOffClear').disabled = !SET.offImage;
}

function err(msg) { $('#lobbyErr').textContent = msg; }
function needName() {
  S.name = $('#inName').value.trim(); SET.name = S.name; saveSet();
  if (!S.name) { $('#inName').focus(); err(T('이름을 입력하세요.')); return false; }
  return true;
}
function setBusy(b) { ['#btnStart', '#btnShowJoin', '#btnJoin'].forEach(s => $(s).disabled = b); }
function setWaiting(on, info = '') {
  $('#waitBox').hidden = !on; $('#inName').disabled = on;
  if (on) { $('#choose').hidden = true; $('#joinForm').hidden = true; $('#waitInfo').textContent = info; }
  else { $('#choose').hidden = true; $('#joinForm').hidden = false; setBusy(false); }
}

async function openDevices() {
  const camId = SET.camId, micId = SET.micId;
  [S.mic, S.cam].forEach(t => t?.stop());
  S.mic = S.cam = null;
  const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, ...(micId && { deviceId: { ideal: micId } }) };
  const video = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, ...(camId && { deviceId: { ideal: camId } }) };
  let st = null;
  try { st = await navigator.mediaDevices.getUserMedia({ audio, video }); S.camErr = ''; }
  catch (e0) {
    // 카메라만 따로 시도해 '왜' 안 되는지 알아냄(권한 막힘 / 다른 프로그램이 사용 중 / 카메라 없음)
    let vt = null, ve = null;
    try { vt = await navigator.mediaDevices.getUserMedia({ video }); } catch (e) { ve = e; }
    let at = null;
    try { at = await navigator.mediaDevices.getUserMedia({ audio }); } catch {}
    st = new MediaStream([...(at ? at.getTracks() : []), ...(vt ? vt.getTracks() : [])]);
    S.camErr = ve ? camErrorText(ve) : '';
    if (ve) { console.warn('카메라 오류', ve.name, ve.message); toast(S.camErr, 'warn'); }
    if (!at) toast(T('마이크를 사용할 수 없습니다.'), 'warn');
  }
  S.mic = st?.getAudioTracks()[0] || null;
  S.cam = st?.getVideoTracks()[0] || null;
  if (S.mic) S.mic.enabled = S.micOn;
  if (S.cam) { S.cam.enabled = S.camOn; S.cam.contentHint = 'motion'; }
  S.local = new MediaStream([S.mic, S.cam].filter(Boolean));
  await updateVideoOut();
  if (S.id && S.mic) { watchSpeaking({ tile: S.selfTile, stream: S.local }, S.mic); }
}

// 카메라를 못 켠 이유를 사람이 알 수 있게(예전에는 '카메라를 사용할 수 없음'만 나와 원인을 알 수 없었음)
function camErrorText(e) {
  const n = e && e.name;
  if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError')
    return T('카메라 권한이 막혀 있습니다. 창 위쪽(주소 표시줄 또는 ⋮ 메뉴 → 사이트 정보)에서 카메라를 \'허용\'으로 바꾼 뒤 카메라 버튼을 다시 누르세요.');
  if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError')
    return T('다른 프로그램이 카메라를 쓰고 있습니다(다른 GT-Meet 창·브라우저 탭, 카메라 앱, Zoom·Teams 등). 그 프로그램을 닫고 카메라 버튼을 다시 누르세요.');
  if (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError')
    return T('카메라를 찾지 못했습니다. 카메라 연결을 확인하거나 ⚙ 설정에서 다른 카메라를 고르세요.');
  return T('카메라를 켜지 못했습니다: ') + (n || '') + ' ' + (e && e.message || '');
}

async function fillDeviceLists() {
  const devs = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  const fill = (sel, kind, cur) => { sel.innerHTML = ''; devs.filter(d => d.kind === kind).forEach((d, i) => {
    const o = el('option', null, d.label || `${T(kind === 'videoinput' ? T('카메라') : T('마이크'))} ${i + 1}`); o.value = d.deviceId;
    if (d.deviceId === cur) o.selected = true; sel.append(o); });
    if (!sel.options.length) sel.append(el('option', null, T('없음'))); };
  fill($('#selCam'), 'videoinput', S.cam?.getSettings().deviceId);
  fill($('#selMic'), 'audioinput', S.mic?.getSettings().deviceId);
}

function updatePreview() {
  $('#pvMic').innerHTML = icon('mic', !S.micOn || !S.mic); $('#pvCam').innerHTML = icon('cam', !S.camOn || !S.cam);
  const showing = !!S.out && ((S.camOn && S.cam) || (!S.camOn && SET.offImage));
  for (const v of [$('#previewVideo'), $('#setPreview')]) {
    if (!v) continue;
    const cur = v.srcObject?.getVideoTracks()[0];
    if (showing && cur !== S.out) v.srcObject = new MediaStream([S.out]); else if (!showing) v.srcObject = null;
    v.classList.toggle('nomirror', !S.camOn);
  }
  $('#previewOff').hidden = showing; $('#setPreviewOff').hidden = showing;
}

function lobbyMeter() {
  let ctx, an, src, data, curTrack;
  const loop = () => {
    if (!$('#lobby').hidden) requestAnimationFrame(loop); else { ctx?.close(); return; }
    if (S.mic !== curTrack) { curTrack = S.mic; src?.disconnect(); src = null;
      if (S.mic) { ctx ||= new AudioContext(); an ||= Object.assign(ctx.createAnalyser(), { fftSize: 512 }); data ||= new Uint8Array(an.fftSize);
        src = ctx.createMediaStreamSource(new MediaStream([S.mic])); src.connect(an); } }
    if (!an || !src) return;
    an.getByteTimeDomainData(data); let m = 0; for (const v of data) m = Math.max(m, Math.abs(v - 128));
    $('#pvMeter').style.width = (S.micOn ? Math.min(100, m * 1.6) : 0) + '%';
  };
  addEventListener('pointerdown', () => ctx?.resume(), { once: true });
  loop();
}

// ================= 입장 / 시그널링 =================
async function connect(first) {
  setBusy(true); err('');
  first.proto = CFG.proto || 1; // 내 프로그램의 회의 통신 규약 버전
  let base = location.origin;
  if (S.remote) { // 다른 PC의 회의: 그 서버의 호환 버전·연결 정보 확인
    base = S.remote;
    try {
      const rc = await (await fetch(S.remote + '/config.json', { cache: 'no-store' })).json();
      if ((rc.minProto || 1) > (CFG.proto || 1)) { setBusy(false); return needUpgrade(rc.version); }
      if ((rc.proto || 1) < (CFG.minProto || 1)) { setBusy(false); return err(T('회의를 연 사람의 GT-Meet가 오래된 버전이라 함께 쓸 수 없습니다. 호스트에게 업데이트를 요청하세요.')); }
      S.iceServers = rc.iceServers || S.iceServers;
    } catch { setBusy(false); return err(T('회의 주소에 연결할 수 없습니다. 초대 링크가 맞는지, 호스트의 외부 접속이 켜져 있는지 확인하세요.')); }
  }
  const ws = S.ws = new WebSocket(base.replace(/^http/, 'ws') + '/ws');
  ws.onopen = () => ws.send(JSON.stringify(first));
  ws.onmessage = e => onServer(JSON.parse(e.data));
  ws.onclose = () => {
    if (S.ended) return;
    if (S.id) { toast(T('서버 연결이 끊겼습니다. 이미 연결된 참가자와의 영상은 유지됩니다.'), 'bad'); addSys(T('서버 연결 끊김')); }
    else { setBusy(false); if (!$('#waitBox').hidden) setWaiting(false); if (!$('#lobbyErr').textContent) err(T('서버에 연결할 수 없습니다.')); }
  };
}
const wsSend = m => S.ws?.readyState === 1 && S.ws.send(JSON.stringify(m));
const isHost = () => S.hostId === S.id;

function onServer(m) {
  switch (m.type) {
    case 'error':
      if (!$('#waitBox').hidden) setWaiting(false);
      if (m.code === 'upgrade') { setBusy(false); S.ws.close(); needUpgrade(m.version); break; }
      err(m.code === 'full' ? T('회의 정원({n}명)이 찼습니다.', { n: CFG.maxRoom || 8 }) : T(m.message)); setBusy(false); S.ws.close();
      if (m.code === 'password') { $('#inPw').select(); $('#inPw').focus(); }
      if (m.code === 'notfound') $('#inMeetingId').focus();
      break;
    case 'waiting': setWaiting(true, T('회의 {id}', { id: fmtId(m.meetingId) }) + (m.host ? ' · ' + T('호스트 {name}', { name: m.host }) : '')); break;
    case 'joined':
      if (S.remote) { SET.lastRemote = S.remote; saveSet(); }
      S.id = m.id; S.room = m.meetingId; S.password = m.password; S.hostId = m.hostId; S.created = m.created;
      S.locked = m.locked; S.waitingRoom = m.waitingRoom; S.names.set(S.id, S.name);
      enterMeeting();
      for (const p of m.peers) { S.names.set(p.id, p.name); S.media.set(p.id, p.media || {}); renderPeerState(createPeer(p.id, true)); }
      for (const g of m.waiting || []) addKnock(g);
      applyRoomState();
      if (isHost() && !m.peers.length) { addSys(T('회의를 시작했습니다. ✉ 초대하기로 회의 ID와 비밀번호를 팀원에게 보내세요.')); setTimeout(() => $('#btnInfo').click(), 400); }
      else addSys(T('{names} 님이 회의 중입니다.', { names: m.peers.map(p => p.name).join(', ') }));
      break;
    case 'knock': addKnock(m); break;
    case 'knock-cancel': removeKnock(m.id); addSys(T('{name} 님이 입장 요청을 취소했습니다.', { name: S.waitList.get(m.id) || T('대기자') })); break;
    case 'settings': S.locked = m.locked; S.waitingRoom = m.waitingRoom; applyRoomState(); break;
    case 'host-changed':
      S.hostId = m.hostId; applyRoomState();
      if (isHost()) { toast(T('👑 이제 내가 호스트입니다. 입장 요청을 수락할 수 있습니다.')); addSys(T('호스트 권한을 넘겨받았습니다.')); }
      else addSys(T('{name} 님이 새 호스트입니다.', { name: m.name }));
      break;
    case 'kicked': case 'ended': meetingOver(T(m.message)); break;
    case 'peer-join': S.names.set(m.id, m.name); removeKnock(m.id); addSys(T('{name} 님이 입장했습니다.', { name: m.name })); toast('👋 ' + T('{name} 님 입장', { name: m.name })); break;
    case 'peer-leave': { const p = S.peers.get(m.id); if (p) { addSys(T('{name} 님이 나갔습니다.', { name: nameOf(m.id) })); closePeer(p); } break; }
    case 'signal': onSignal(m.from, m.data); break;
    case 'media': { S.media.set(m.from, m.media); const p = S.peers.get(m.from); if (p) { const wasScreen = p.media.screen; p.media = m.media; renderPeerState(p);
      if (m.media.screen && !wasScreen) { toast('🖥️ ' + T('{name} 님이 화면을 공유합니다.', { name: nameOf(m.from) })); setTimeout(() => autoShot(T('화면공유 시작') + ' · ' + nameOf(m.from), { gap: 0 }), 2500); }
      updateRecBadge(); } break; }
    case 'chat': onChat(m); break;
    case 'transcript': onTranscript(m); break;
    case 'mark': shot(`📌 ${T('북마크')} · ${m.name}${m.reason ? ' — ' + m.reason : ''}`, { force: true, ts: m.ts }); break;
  }
}

// ================= 호스트: 입장 요청 / 회의 관리 =================
function beep() {
  try { const c = S.audioCtx; const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; g.gain.value = 0.08;
    o.connect(g).connect(c.destination); o.start(); o.frequency.setValueAtTime(1175, c.currentTime + 0.12); o.stop(c.currentTime + 0.25); } catch {}
}
function addKnock(g) {
  if (S.waitList.has(g.id)) return;
  S.waitList.set(g.id, g.name); renderPeople();
  if (!isHost()) return;
  const k = el('div', 'knock'); k.dataset.id = g.id;
  const t = el('span'); t.append(el('b', null, g.name), document.createTextNode(T('님이 입장을 요청합니다')));
  const ok = el('button', 'ok', T('수락')), no = el('button', 'no', T('거절'));
  ok.onclick = () => { wsSend({ type: 'admit', id: g.id }); removeKnock(g.id); };
  no.onclick = () => { wsSend({ type: 'deny', id: g.id }); removeKnock(g.id); addSys(T('{name} 님의 입장을 거절했습니다.', { name: g.name })); };
  k.append(t, ok, no);
  document.querySelectorAll('dialog[open]').forEach(d => d.close()); // 열린 창이 수락 버튼을 가리지 않게
  $('#knocks').append(k); refreshAdmitAll(); beep(); notifyUser(T('입장 요청'), T('{name}님이 회의 입장을 요청합니다.', { name: g.name }));
}
function removeKnock(id) { S.waitList.delete(id); document.querySelector(`.knock[data-id="${id}"]`)?.remove(); refreshAdmitAll(); renderPeople(); }
function refreshAdmitAll() {
  $('#knocks .knock.allrow')?.remove();
  if (S.waitList.size > 1 && isHost()) { const k = el('div', 'knock allrow'); const b = el('button', 'all', T('대기 중인 {n}명 모두 수락', { n: S.waitList.size }));
    b.onclick = () => { wsSend({ type: 'admit-all' }); [...S.waitList.keys()].forEach(removeKnock); }; k.append(b); $('#knocks').append(k); }
}
function applyRoomState() {
  const host = isHost();
  $('#hostBadge').hidden = !host; $('#lockBadge').hidden = !S.locked;
  $('#hostCtl').hidden = !host; $('#optLock').checked = S.locked; $('#optWaiting').checked = S.waitingRoom;
  $('#infoHost').textContent = nameOf(S.hostId);
  if (!host) { $('#knocks').innerHTML = ''; S.waitList.clear(); }
  else for (const [id, name] of S.waitList) if (!document.querySelector(`.knock[data-id="${id}"]`)) { S.waitList.delete(id); addKnock({ id, name }); }
  renderPeople();
}
function inviteText() {
  return T('[GT-Meet 화상회의 초대]\n{name} 님이 회의에 초대했습니다.\n\n▶ 바로 참여: {link}\n\n📱 휴대폰·태블릿: 위 링크를 누르거나, GT-Meet 앱의 "초대문 붙여넣기"에 이 메시지를 붙여 넣으세요.\n💻 PC 앱: "회의 참여"에 링크를 붙여 넣거나 아래 정보를 입력하세요.\n회의 ID: {id}\n비밀번호: {pw}', { name: S.name, link: inviteLink(), id: fmtId(S.room), pw: S.password });
}
async function copy(text, msg) { try { await navigator.clipboard.writeText(text); toast(msg); } catch { prompt(T('아래 내용을 복사하세요'), text); } }
function openInfo() {
  $('#infoId').textContent = fmtId(S.room); $('#infoPw').textContent = S.password; $('#infoHost').textContent = nameOf(S.hostId);
  $('#inviteText').value = inviteText(); renderNet(); $('#btnShareInvite').hidden = !(navigator.share || ANDROID); $('#infoDlg').showModal();
}
function meetingOver(message) {
  S.ended = true; window.gtmeet?.inMeeting(false); S.rec?.stop(); stopSTT();
  for (const p of S.peers.values()) { try { p.pc.close(); } catch {} }
  [S.mic, S.cam, S.screen].forEach(t => t?.stop());
  const hasData = S.transcript.length || S.shots.length;
  setTimeout(() => {
    if (hasData && confirm(`${message}\n\n${T('회의록(녹취록·캡처 포함)을 저장할까요?')}`)) exportMinutes(); else if (!hasData) alert(message);
    location.href = location.pathname;
  }, 300);
}

// ================= WebRTC =================
function createPeer(id, initiator) {
  const pc = new RTCPeerConnection({ iceServers: S.iceServers, bundlePolicy: 'max-bundle' });
  const peer = { id, pc, initiator, polite: S.id < id, makingOffer: false, ignoreOffer: false, chain: Promise.resolve(),
    stream: new MediaStream(), media: S.media.get(id) || {}, dc: null, sendQ: [], sending: false, incoming: null, tile: null };
  S.peers.set(id, peer);
  makeTile(peer); renderPeerState(peer);

  if (initiator) {
    // 새로 들어온 쪽이 오디오·비디오 자리를 만들고 제안(offer)
    pc.addTransceiver(S.mic || 'audio', { direction: 'sendrecv', streams: [S.local] });
    pc.addTransceiver(currentVideo() || 'video', { direction: 'sendrecv', streams: [S.local] });
    setupDC(peer);
  }
  pc.onnegotiationneeded = async () => {
    try { peer.makingOffer = true; await pc.setLocalDescription(); wsSend({ type: 'signal', to: id, data: { description: pc.localDescription } }); }
    catch (e) { console.warn(e); } finally { peer.makingOffer = false; }
  };
  pc.onicecandidate = e => e.candidate && wsSend({ type: 'signal', to: id, data: { candidate: e.candidate } });
  pc.ontrack = e => {
    peer.stream.getTracks().filter(t => t.kind === e.track.kind).forEach(t => peer.stream.removeTrack(t));
    peer.stream.addTrack(e.track);
    const v = peer.tile.querySelector('video'); v.srcObject = peer.stream; v.play().catch(() => {});
    if (e.track.kind === 'audio') { watchSpeaking(peer); S.rec?.addAudio(e.track); }
  };
  pc.onconnectionstatechange = () => {
    const st = pc.connectionState; peer.tile.querySelector('.conn').hidden = st === 'connected';
    peer.tile.querySelector('.conn').textContent = T({ new: '연결 준비', connecting: '연결 중…', disconnected: '연결 불안정…', failed: '연결 실패 · 재시도 중', closed: '종료' }[st] || st);
    if (st === 'failed') pc.restartIce();
  };
  return peer;
}

function onSignal(from, data) {
  let peer = S.peers.get(from) || createPeer(from, false);
  const pc = peer.pc;
  peer.chain = peer.chain.then(async () => {
    try {
      if (data.description) {
        const d = data.description;
        const collision = d.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
        peer.ignoreOffer = !peer.polite && collision;
        if (peer.ignoreOffer) return;
        await pc.setRemoteDescription(d);
        if (d.type === 'offer') {
          attachLocal(peer);            // 받은 자리(transceiver)에 내 트랙 연결
          if (!peer.dc) setupDC(peer);
          await pc.setLocalDescription();
          wsSend({ type: 'signal', to: from, data: { description: pc.localDescription } });
        }
      } else if (data.candidate) {
        try { await pc.addIceCandidate(data.candidate); } catch (e) { if (!peer.ignoreOffer) console.warn(e); }
      }
    } catch (e) { console.warn('signal error', e); }
  });
  // 상대가 내 미디어 상태를 알 수 있도록
  if (data.description?.type === 'offer') setTimeout(sendMediaState, 300);
}

function attachLocal(peer) {
  for (const t of peer.pc.getTransceivers()) {
    if (t.stopped || t.mid == null) continue;
    const kind = t.receiver.track.kind;
    const track = kind === 'audio' ? S.mic : currentVideo();
    if (!t.sender.track && track) { t.sender.replaceTrack(track); t.sender.setStreams?.(S.local); }
    if (t.direction !== 'sendrecv') t.direction = 'sendrecv';
  }
}
function replaceSenders(peer) {
  for (const t of peer.pc.getTransceivers()) {
    if (t.stopped || (t.mid == null && !peer.initiator)) continue;
    const kind = t.receiver.track.kind;
    t.sender.replaceTrack(kind === 'audio' ? S.mic : currentVideo()).catch(() => {});
  }
}
const currentVideo = () => S.screen || S.out || S.cam;

function closePeer(peer) {
  try { peer.dc?.close(); peer.pc.close(); } catch {}
  peer.tile?.remove(); S.peers.delete(peer.id); layout(); renderPeople(); updateRecBadge();
}

// ================= 영상 타일 / 레이아웃 =================
function makeTile(peer, self = false) {
  const t = el('div', 'tile' + (self ? ' self' : ''));
  t.innerHTML = `<video autoplay playsinline ${self ? 'muted' : ''}></video><div class="avatar"><b></b></div>
    <div class="label"><span class="nm"></span></div><div class="state"></div>${self ? '' : `<div class="conn">${T('연결 중…')}</div>`}`;
  const nm = self ? S.name + T(' (나)') : nameOf(peer.id);
  t.querySelector('.nm').textContent = nm; t.querySelector('.avatar b').textContent = (self ? S.name : nameOf(peer.id)).slice(0, 1).toUpperCase();
  t.dataset.id = self ? S.id : peer.id;
  t.ondblclick = () => t.requestFullscreen?.();
  $('#grid').append(t);
  if (peer) peer.tile = t;
  layout(); renderPeople();
  return t;
}

function renderSelf() {
  const t = S.selfTile; const v = t.querySelector('video');
  const vt = currentVideo(); v.srcObject = vt ? new MediaStream([vt]) : null;
  t.classList.toggle('screen', !!S.screen);
  t.classList.toggle('camoff', !S.screen && !(S.cam && S.camOn) && !SET.offImage);
  t.classList.toggle('pic', !S.screen && !(S.cam && S.camOn) && !!SET.offImage);
  t.querySelector('.state').innerHTML = (!S.micOn || !S.mic ? `<span>${icon('mic', true)}</span>` : '') + (!S.screen && !(S.cam && S.camOn) ? `<span>${icon('cam', true)}</span>` : '') + (S.screen ? `<span>🖥️ ${T('공유 중')}</span>` : '');
  layout();
}
function renderPeerState(p) {
  const m = p.media; if (!p.tile) return;
  p.tile.classList.toggle('screen', !!m.screen);
  p.tile.classList.toggle('camoff', !m.screen && m.cam === false && !m.pic);
  p.tile.classList.toggle('pic', !m.screen && m.cam === false && !!m.pic);
  p.tile.querySelector('.state').innerHTML = (m.mic === false ? `<span>${icon('mic', true)}</span>` : '') + (m.cam === false && !m.screen ? `<span>${icon('cam', true)}</span>` : '') + (m.screen ? `<span>🖥️ ${T('공유 중')}</span>` : '') + (m.rec ? `<span>⏺ ${T('녹화')}</span>` : '');
  layout(); renderPeople();
}

function layout() {
  const g = $('#grid'); const tiles = [...g.children]; const n = tiles.length;
  const main = tiles.find(t => t.classList.contains('screen'));
  tiles.forEach(t => t.classList.toggle('main', t === main));
  g.classList.toggle('spot', !!main);
  if (main) { g.prepend(main); g.style.setProperty('--rows', Math.max(4, n - 1)); }
  else {
    const w = g.clientWidth || 1, h = g.clientHeight || 1;
    let best = 1, bestArea = 0;
    for (let c = 1; c <= n; c++) { const r = Math.ceil(n / c); const tw = w / c, th = h / r; const a = Math.min(tw, th * 16 / 9); if (a > bestArea) { bestArea = a; best = c; } }
    g.style.setProperty('--cols', best);
  }
  $('#peopleCount').textContent = S.peers.size + 1;
}
addEventListener('resize', () => !$('#meeting').hidden && layout());

function renderPeople() {
  const ul = $('#people'); if (!ul) return; ul.innerHTML = '';
  const host = isHost();
  const icons = m => icon('mic', m.mic === false) + icon('cam', m.cam === false) + (m.screen ? '🖥️' : '') + (m.rec ? '⏺' : '');
  const row = (id, name, m) => {
    const li = el('li'); const who = el('span', 'who', name + (id === S.hostId ? ' 👑' : ''));
    const acts = el('span', 'acts'); const ic = el('span', 'ics'); ic.innerHTML = icons(m); acts.append(ic);
    if (host && id !== S.id) {
      const mk = el('button', null, T('호스트 넘기기')); mk.onclick = () => confirm(T('{name} 님에게 호스트를 넘길까요?', { name })) && wsSend({ type: 'make-host', id });
      const kick = el('button', null, T('내보내기')); kick.onclick = () => confirm(T('{name} 님을 회의에서 내보낼까요?', { name })) && wsSend({ type: 'kick', id });
      acts.append(mk, kick);
    }
    li.append(who, acts); ul.append(li);
  };
  row(S.id, S.name + T(' (나)'), { mic: S.micOn && !!S.mic, cam: S.camOn && !!S.cam, screen: !!S.screen, rec: !!S.rec });
  for (const p of S.peers.values()) row(p.id, nameOf(p.id), p.media);
  if (S.waitList?.size) {
    const sec = el('li', 'sec'); sec.append(el('span', null, T('입장 대기 {n}명', { n: S.waitList.size })));
    if (host) { const all = el('button', 'chip', T('모두 수락')); all.onclick = () => { wsSend({ type: 'admit-all' }); [...S.waitList.keys()].forEach(removeKnock); }; sec.append(all); }
    ul.append(sec);
    for (const [id, name] of S.waitList) {
      const li = el('li', 'wait'); const acts = el('span', 'acts');
      if (host) { const ok = el('button', 'ok', T('수락')), no = el('button', null, T('거절'));
        ok.onclick = () => { wsSend({ type: 'admit', id }); removeKnock(id); };
        no.onclick = () => { wsSend({ type: 'deny', id }); removeKnock(id); }; acts.append(ok, no); }
      li.append(el('span', 'who', '⏳ ' + name), acts); ul.append(li);
    }
  }
  const cnt = $('#peopleCount'); if (cnt) cnt.textContent = S.peers.size + 1 + (S.waitList?.size ? ` +${S.waitList.size}` : '');
}

// 말하는 사람 표시
function watchSpeaking(peer, track) {
  if (!S.audioCtx) return;
  const at = track || peer.stream.getAudioTracks()[0]; if (!at) return;
  const tile = peer.tile || S.selfTile;
  const an = S.audioCtx.createAnalyser(); an.fftSize = 512;
  try { S.audioCtx.createMediaStreamSource(new MediaStream([at])).connect(an); } catch { return; }
  const buf = new Uint8Array(an.fftSize); let hold = 0;
  const id = ticker.every(150, () => {
    if (!tile.isConnected || at.readyState === 'ended') return ticker.stop(id);
    an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128));
    if (m > 14 && at.enabled) hold = 4; tile.classList.toggle('speaking', hold-- > 0);
  });
}

// ================= 회의 화면 진입 =================
function enterMeeting() {
  $('#lobby').hidden = true; $('#meeting').hidden = false; window.gtmeet?.inMeeting(true);
  if (matchMedia('(max-width: 820px)').matches) document.querySelector('.stage').classList.add('nopanel'); // 휴대폰: 영상부터 보이게
  $('#roomLabel').textContent = fmtId(S.room);
  history.replaceState(null, '', location.pathname);
  S.audioCtx = new AudioContext();
  S.selfTile = makeTile(null, true); renderSelf();
  if (S.mic) watchSpeaking({ tile: S.selfTile, stream: S.local }, S.mic);
  ticker.every(1000, () => { $('#timer').textContent = fmtRel(Date.now()); });
  ticker.every(1500, screenChangeWatch);
  bindToolbar(); bindPanel();
  setMic(S.micOn); setCam(S.camOn);
  if (!('MediaRecorder' in window)) $('#tRec').disabled = true;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR || ANDROID) { $('#tStt').disabled = true; $('#sttNote').textContent = ANDROID ? T('안드로이드 앱에서는 녹취를 지원하지 않습니다. 다른 참가자의 녹취 내용은 그대로 표시됩니다. (휴대폰 Chrome으로 초대 링크를 열어 참여하면 녹취를 켤 수 있습니다)') : T('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge를 사용하세요. 다른 참가자의 녹취 내용은 그대로 표시됩니다.'); }
  else $('#sttNote').textContent = T('각 참가자는 자기 브라우저에서 자기 목소리만 인식해 공유합니다. 녹취를 켠 사람의 발언만 기록됩니다.');
  if (!navigator.mediaDevices.getDisplayMedia) $('#tScreen').hidden = true;
  addEventListener('beforeunload', e => { if (S.rec) { e.preventDefault(); e.returnValue = ''; } });
}

function sendMediaState() { wsSend({ type: 'media', mic: S.micOn && !!S.mic, cam: S.camOn && !!S.cam, pic: !(S.camOn && S.cam) && !!SET.offImage, screen: !!S.screen, rec: !!S.rec }); }

function setMic(on, remember) {
  S.micOn = on; if (S.mic) S.mic.enabled = on;
  if (remember) { SET.micOn = on; saveSet(); }
  updatePreview();
  if (!S.id) return;
  $('#tMic').classList.toggle('off', !on || !S.mic); $('#tMic').querySelector('i').innerHTML = icon('mic', !on || !S.mic);
  $('#tMic').title = on ? T('마이크 끄기 (M)') : T('마이크 켜기 (M)');
  if (S.stt) on ? S.stt.resume() : S.stt.pause(); // 음소거 중엔 녹취도 일시정지
  renderSelf(); renderPeople(); sendMediaState();
}
function setCam(on, remember, retried) {
  // 카메라를 못 연 상태에서 켜기를 누르면 한 번 다시 열어 봄(다른 프로그램을 닫은 뒤 등). openDevices가 안 되면 이유를 안내함
  if (on && !S.cam && !retried) { S.camOn = true; if (remember) { SET.camOn = true; saveSet(); }
    return openDevices().then(() => setCam(true, false, true)); }
  S.camOn = on; if (S.cam) S.cam.enabled = on;
  if (remember) { SET.camOn = on; saveSet(); }
  updateVideoOut();
  if (!S.id) return;
  $('#tCam').classList.toggle('off', !on || !S.cam); $('#tCam').querySelector('i').innerHTML = icon('cam', !on || !S.cam);
  $('#tCam').title = on ? T('카메라 끄기 (V)') : T('카메라 켜기 (V)');
  renderSelf(); renderPeople(); sendMediaState();
}

// ================= 화면 공유 =================
async function toggleScreen() {
  if (S.screen) return stopScreen();
  try {
    const st = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15, max: 30 }, width: { max: 1920 } }, audio: false });
    S.screen = st.getVideoTracks()[0]; S.screen.contentHint = 'detail';
    S.screen.onended = stopScreen;
    for (const p of S.peers.values()) replaceSenders(p);
    $('#tScreen').classList.add('active'); $('#tScreen').querySelector('span').textContent = T('공유 중지');
    renderSelf(); renderPeople(); sendMediaState();
    setTimeout(() => autoShot(T('화면공유 시작') + ' · ' + S.name, { gap: 0 }), 1500);
  } catch (e) { if (e.name !== 'NotAllowedError') toast(T('화면 공유를 시작할 수 없습니다: ') + e.message, 'bad'); }
}
function stopScreen() {
  if (!S.screen) return; S.screen.onended = null; S.screen.stop(); S.screen = null;
  for (const p of S.peers.values()) replaceSenders(p);
  $('#tScreen').classList.remove('active'); $('#tScreen').querySelector('span').textContent = T('화면공유');
  renderSelf(); renderPeople(); sendMediaState();
}

// ================= 합성 화면 (녹화·캡처 공용) =================
function tilesForComposite() {
  return [...$('#grid').children].map(t => ({ v: t.querySelector('video'), name: t.querySelector('.nm').textContent,
    screen: t.classList.contains('screen'), off: t.classList.contains('camoff'), self: t.classList.contains('self'), speaking: t.classList.contains('speaking') }));
}
function drawComposite(ctx, W, H) {
  ctx.fillStyle = '#0f1115'; ctx.fillRect(0, 0, W, H);
  const tiles = tilesForComposite(); const main = tiles.find(t => t.screen);
  const rects = [];
  if (main) {
    const side = tiles.filter(t => t !== main); const sw = side.length ? Math.round(W * 0.2) : 0;
    rects.push([main, 0, 0, W - sw, H]);
    const sh = Math.min(H / Math.max(side.length, 1), sw * 9 / 16);
    side.forEach((t, i) => rects.push([t, W - sw + 4, i * sh + 4, sw - 8, sh - 8]));
  } else {
    const n = tiles.length || 1; const cols = Math.ceil(Math.sqrt(n)); const rows = Math.ceil(n / cols);
    const cw = W / cols, ch = H / rows;
    tiles.forEach((t, i) => rects.push([t, (i % cols) * cw + 4, Math.floor(i / cols) * ch + 4, cw - 8, ch - 8]));
  }
  for (const [t, x, y, w, h] of rects) {
    ctx.save(); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, 10); else ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h);
    const v = t.v;
    if (!t.off && v.readyState >= 2 && v.videoWidth) {
      const vr = v.videoWidth / v.videoHeight, r = w / h;
      let dw = w, dh = h, dx = x, dy = y;
      if (t.screen ? vr > r : vr < r) { dh = w / vr; dy = y + (h - dh) / 2; } else { dw = h * vr; dx = x + (w - dw) / 2; }
      ctx.drawImage(v, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = '#20242e'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#3a6fd8'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.16, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `600 ${Math.min(w, h) * 0.14}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t.name.slice(0, 1), x + w / 2, y + h / 2);
    }
    ctx.restore();
    if (t.speaking) { ctx.strokeStyle = '#2fbf71'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); }
    const fs = Math.max(12, Math.min(18, h * 0.06)); ctx.font = `${fs}px sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const tw = ctx.measureText(t.name).width; ctx.fillStyle = '#000a'; ctx.fillRect(x + 8, y + h - fs - 16, tw + 14, fs + 10);
    ctx.fillStyle = '#fff'; ctx.fillText(t.name, x + 15, y + h - 12);
  }
}

// ================= 녹화 =================
async function toggleRec() {
  if (S.rec) return S.rec.stop();
  if (!confirm(T('회의를 녹화합니다.\n모든 참가자 화면에 “녹화 중” 표시가 나타납니다.\n녹화 파일은 이 PC에만 저장됩니다. 시작할까요?'))) return;
  const W = 1280, H = 720; const cv = el('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const dest = S.audioCtx.createMediaStreamDestination(); const srcs = new Map();
  const addAudio = tr => { if (!tr || srcs.has(tr.id)) return; try { const s = S.audioCtx.createMediaStreamSource(new MediaStream([tr])); s.connect(dest); srcs.set(tr.id, s); } catch {} };
  addAudio(S.mic); for (const p of S.peers.values()) p.stream.getAudioTracks().forEach(addAudio);
  const stream = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  const chunks = []; mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  const timer = ticker.every(33, () => drawComposite(ctx, W, H));
  const started = Date.now();
  mr.onstop = () => {
    ticker.stop(timer); srcs.forEach(s => s.disconnect()); stream.getTracks().forEach(t => t.stop());
    const ext = mr.mimeType.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: mr.mimeType || 'video/webm' });
    const fname = `GTMeet_recording_${safeRoom()}_${stamp()}.${ext}`;
    download(blob, fname);
    addSys(T('녹화 종료 ({size}, {time})', { size: fmtSize(blob.size), time: fmtRel(S.created + Date.now() - started) }));
    const card = fileCard(true, S.name, fname, blob.size); card.bar.remove();
    card.status.textContent = T('자동 저장이 안 됐다면 아래 버튼을 누르세요');
    const link = el('a', 'rec-link', T('⬇ 녹화 파일 저장')); link.href = URL.createObjectURL(blob); link.download = fname; card.box.append(link);
    S.rec = null; $('#tRec').classList.remove('rec'); $('#tRec').querySelector('span').textContent = T('녹화');
    updateRecBadge(); sendMediaState(); renderPeople();
  };
  mr.start(1000);
  S.rec = { stop: () => mr.state !== 'inactive' && mr.stop(), addAudio };
  $('#tRec').classList.add('rec'); $('#tRec').querySelector('span').textContent = T('녹화 중지');
  updateRecBadge(); sendMediaState(); renderPeople();
  addSys(T('{name} 님이 녹화를 시작했습니다.', { name: S.name }));
  setTimeout(() => autoShot(T('녹화 시작')), 800);
}
function updateRecBadge() {
  const any = !!S.rec || [...S.peers.values()].some(p => p.media.rec);
  $('#recBadge').hidden = !any;
}

// ================= 녹취 (음성 인식) =================
function createSTT() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = $('#sttLang').value;
  let want = true, paused = !S.micOn, segStart = Date.now();
  // 브라우저가 지원하면 기기 내 인식(음성이 외부로 나가지 않음)을 우선 사용
  (async () => {
    try {
      if (!DESKTOP && typeof SR.available === 'function') {   // PC 앱(Electron)은 이 호출만으로 화면 프로세스가 강제 종료됨(검은 화면)
        const st = await SR.available({ langs: [r.lang], processLocally: true });
        if (st === 'available') { r.processLocally = true; $('#sttNote').textContent = T('기기 내 음성 인식을 사용 중입니다(음성이 외부로 전송되지 않음).'); return; }
      }
    } catch {}
    $('#sttNote').textContent = T('⚠ 이 브라우저의 음성 인식은 음성을 브라우저 제조사(Google 등) 서버로 보내 처리합니다. 민감한 회의에서는 녹취를 끄세요.');
  })();
  r.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) { const text = res[0].transcript.trim(); if (text) wsSend({ type: 'transcript', text, ts: segStart }); segStart = Date.now(); }
      else interim += res[0].transcript;
    }
    showCaption(S.id, S.name, interim, true);
  };
  r.onspeechstart = () => { segStart = Date.now(); };
  let netErr = 0;
  r.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { want = false; toast(T('음성 인식 권한이 거부되었습니다.'), 'bad'); stopSTT(); }
    if (e.error === 'network' && ++netErr >= 2) { want = false; stopSTT();
      const msg = DESKTOP ? T('PC 앱에서는 브라우저 음성 인식 서비스를 쓸 수 없습니다. 녹취가 필요하면 Chrome·Edge로 참여한 참가자가 녹취를 켜면 모두에게 공유됩니다.') : T('음성 인식 서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.');
      toast(msg, 'bad'); $('#sttNote').textContent = '⚠ ' + msg; }
  };
  r.onresult = (orig => function (e) { netErr = 0; return orig.call(this, e); })(r.onresult);
  r.onend = () => { if (want && !paused) setTimeout(() => { try { r.start(); } catch {} }, 250); }; // 크롬은 주기적으로 끊김 → 자동 재시작
  if (!paused) r.start();
  return {
    stop() { want = false; try { r.stop(); } catch {} },
    pause() { paused = true; try { r.stop(); } catch {} },
    resume() { if (!want) return; paused = false; try { r.start(); } catch {} },
    setLang(l) { r.lang = l; try { r.stop(); } catch {} },
  };
}
function toggleSTT() { S.stt ? stopSTT() : startSTT(); }
function startSTT() {
  try { S.stt = createSTT(); } catch (e) { return toast(T('음성 인식 시작 실패: ') + e.message, 'bad'); }
  $('#tStt').classList.add('active'); $('#sttBadge').hidden = false;
  if (!S.micOn) toast(T('마이크가 꺼져 있어 녹취가 대기 중입니다.'), 'warn');
}
function stopSTT() { S.stt?.stop(); S.stt = null; $('#tStt').classList.remove('active'); $('#sttBadge').hidden = true; showCaption(S.id, '', '', true); }

function onTranscript(m) {
  const key = KEYWORDS.test(m.text);
  const item = { ts: m.ts, from: m.from, name: m.name, text: m.text, key };
  S.transcript.push(item); S.transcript.sort((a, b) => a.ts - b.ts);
  const li = el('li', key ? 'key' : ''); li.append(el('span', 't', fmtRel(m.ts)), el('span', 'n', m.name), document.createTextNode(m.text));
  const ul = $('#sttLines'); const stick = ul.scrollHeight - ul.scrollTop - ul.clientHeight < 40; ul.append(li); if (stick) ul.scrollTop = ul.scrollHeight;
  showCaption(m.from, m.name, m.text, false);
  if (key) autoShot(`${T('핵심어')} “${m.text.match(KEYWORDS)[0]}” · ${m.name}: ${m.text.slice(0, 60)}`);
}

const capState = new Map();
function showCaption(id, name, text, interim) {
  let c = capState.get(id);
  if (!c) { c = { el: el('div'), timer: 0 }; capState.set(id, c); }
  clearTimeout(c.timer);
  if (!text) { c.el.remove(); return; }
  c.el.className = interim ? 'interim' : ''; c.el.innerHTML = ''; c.el.append(el('b', null, name), document.createTextNode(text));
  if (!c.el.isConnected) $('#captions').append(c.el);
  c.timer = setTimeout(() => c.el.remove(), interim ? 6000 : 5000);
  while ($('#captions').children.length > 3) $('#captions').firstChild.remove();
}

// ================= 중요 시점 캡처 =================
function activeScreenVideo() {
  const t = [...$('#grid').children].find(t => t.classList.contains('screen'));
  const v = t?.querySelector('video'); return v && v.videoWidth ? v : null;
}
function signature(src, w = 48, h = 27) {
  const c = signature.c ||= Object.assign(el('canvas'), { width: w, height: h });
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data; const g = new Float32Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  return g;
}
const sigDiff = (a, b) => { if (!a || !b || a.length !== b.length) return 1; let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };

// 공유 화면이 크게 바뀌고(슬라이드 전환) 잠시 멈추면 캡처
let scrPrev = null, scrStable = null, scrChanged = false;
function screenChangeWatch() {
  if (!$('#autoCap').checked) return;
  const v = activeScreenVideo(); if (!v) { scrPrev = scrStable = null; return; }
  const sig = signature(v);
  if (!scrStable) { scrStable = scrPrev = sig; return; }
  const moving = sigDiff(sig, scrPrev) > 0.015; scrPrev = sig;
  if (!moving && sigDiff(sig, scrStable) > 0.06) { scrChanged = true; }
  if (scrChanged && !moving) { scrChanged = false; scrStable = sig; autoShot(T('공유 화면 전환 감지'), { gap: 4000 }); }
}

function autoShot(reason, opt = {}) {
  if (!$('#autoCap').checked) return;
  const gap = opt.gap ?? 6000;
  if (Date.now() - S.lastAutoShot < gap) return;
  shot(reason, opt);
}
function shot(reason, { force = false, ts = Date.now() } = {}) {
  const sv = activeScreenVideo();
  const cv = el('canvas');
  if (sv) { const sc = Math.min(1, 1920 / sv.videoWidth); cv.width = sv.videoWidth * sc; cv.height = sv.videoHeight * sc; cv.getContext('2d').drawImage(sv, 0, 0, cv.width, cv.height); }
  else { cv.width = 1280; cv.height = 720; drawComposite(cv.getContext('2d'), 1280, 720); }
  const sig = signature(cv);
  if (!force && sigDiff(sig, S.lastShotSig) < 0.012) return; // 직전 캡처와 거의 같으면 생략
  S.lastShotSig = sig; S.lastAutoShot = Date.now();
  const data = cv.toDataURL('image/jpeg', 0.85);
  const last = S.transcript.at(-1);
  const item = { ts, reason, data, context: last && ts - last.ts < 60000 ? `${last.name}: ${last.text}` : '' };
  S.shots.push(item);
  const d = el('div', 'shot'); const img = el('img'); img.src = data; img.loading = 'lazy';
  const cap = el('div'); cap.append(el('b', null, `${fmtRel(ts)} · ${fmtClock(ts)}`), document.createTextNode(reason));
  d.append(img, cap); d.onclick = () => { $('#viewerImg').src = data; $('#viewerCap').textContent = `${fmtRel(ts)} — ${reason}${item.context ? '\n' + item.context : ''}`; $('#viewer').showModal(); };
  d.oncontextmenu = e => { e.preventDefault(); download(data, `GTMeet_capture_${safeRoom()}_${fmtRel(ts).replace(/:/g, '')}.jpg`); };
  $('#shots').prepend(d); $('#shotCount').textContent = S.shots.length;
  toast('📸 ' + reason);
}

// ================= 채팅 =================
function addMsg(li) { const ul = $('#msgs'); const stick = ul.scrollHeight - ul.scrollTop - ul.clientHeight < 60; ul.append(li); if (stick) ul.scrollTop = ul.scrollHeight;
  const closed = document.querySelector('.stage').classList.contains('nopanel');
  if (!$('#tab-chat').classList.contains('on') || closed) $('#chatDot').hidden = false;
  if (closed && !li.classList.contains('sys')) $('#btnPanel').classList.add('unread'); }
function addSys(text) { S.chat.push({ ts: Date.now(), sys: true, text }); addMsg(el('li', 'msg sys', `${fmtClock(Date.now())} · ${text}`)); }
function onChat(m) {
  S.chat.push({ ts: m.ts, from: m.from, name: m.name, text: m.text });
  const me = m.from === S.id; const li = el('li', 'msg' + (me ? ' me' : ''));
  li.append(el('div', 'who', `${me ? T('나') : m.name} · ${fmtClock(m.ts)}`), el('div', 'bubble', m.text));
  addMsg(li);
  if (!me && document.querySelector('.stage').classList.contains('nopanel')) toast(`💬 ${m.name}: ${m.text.slice(0, 50)}`);
  if (!me) notifyUser(`💬 ${m.name}`, m.text.slice(0, 120));
  if (KEYWORDS.test(m.text)) autoShot(`${T('채팅 핵심어')} · ${m.name}: ${m.text.slice(0, 50)}`);
}

// ================= 파일 전송 (P2P DataChannel) =================
function setupDC(peer) {
  const dc = peer.pc.createDataChannel('data', { negotiated: true, id: 0, ordered: true });
  dc.binaryType = 'arraybuffer'; dc.bufferedAmountLowThreshold = 1 << 20;
  peer.dc = dc;
  dc.onopen = () => pumpFiles(peer);
  dc.onmessage = e => onDC(peer, e.data);
}

function sendFiles(files) {
  if (!S.peers.size) return toast(T('파일을 받을 참가자가 없습니다.'), 'warn');
  for (const f of files) {
    if (f.size > MAX_FILE) { toast(`${f.name}: ${T('1GB 이하 파일만 보낼 수 있습니다.')}`, 'bad'); continue; }
    const fid = Math.random().toString(36).slice(2, 10);
    const card = fileCard(true, S.name, f.name, f.size); card.status.textContent = T('전송 대기');
    const targets = [...S.peers.values()]; const prog = new Map(targets.map(p => [p.id, 0]));
    const onProgress = (pid, sent) => { prog.set(pid, sent); const tot = [...prog.values()].reduce((a, b) => a + b, 0) / (targets.length * (f.size || 1));
      card.bar.value = tot; card.status.textContent = tot >= 1 ? T('{n}명에게 전송 완료', { n: targets.length }) : `${T('전송 중')} ${(tot * 100).toFixed(0)}%`; };
    for (const p of targets) { p.sendQ.push({ fid, file: f, onProgress: s => onProgress(p.id, s) }); pumpFiles(p); }
    S.chat.push({ ts: Date.now(), from: S.id, name: S.name, file: { name: f.name, size: f.size } });
  }
}
async function pumpFiles(peer) {
  if (peer.sending || !peer.dc || peer.dc.readyState !== 'open') return;
  peer.sending = true;
  try {
    while (peer.sendQ.length) {
      const { fid, file, onProgress } = peer.sendQ.shift(); const dc = peer.dc;
      dc.send(JSON.stringify({ t: 'file-start', fid, name: file.name, size: file.size, mime: file.type, from: S.name }));
      let off = 0;
      while (off < file.size) {
        if (dc.readyState !== 'open') throw new Error('연결 끊김');
        if (dc.bufferedAmount > 8 << 20) await new Promise(r => { dc.onbufferedamountlow = () => { dc.onbufferedamountlow = null; r(); }; });
        const buf = await file.slice(off, off + 256 * 1024).arrayBuffer();
        for (let i = 0; i < buf.byteLength; i += CHUNK) dc.send(buf.slice(i, i + CHUNK));
        off += buf.byteLength; onProgress(off);
      }
      dc.send(JSON.stringify({ t: 'file-end', fid })); onProgress(file.size);
    }
  } catch (e) { toast(T('{name} 님에게 파일 전송 실패: {msg}', { name: nameOf(peer.id), msg: T(e.message) }), 'bad'); }
  peer.sending = false;
}
function onDC(peer, data) {
  if (typeof data === 'string') {
    const m = JSON.parse(data);
    if (m.t === 'file-start') {
      const card = fileCard(false, m.from || nameOf(peer.id), m.name, m.size);
      peer.incoming = { ...m, chunks: [], got: 0, card };
      if (!m.size) onDC(peer, JSON.stringify({ t: 'file-end', fid: m.fid }));
    } else if (m.t === 'file-end' && peer.incoming?.fid === m.fid) {
      const f = peer.incoming; peer.incoming = null;
      const blob = new Blob(f.chunks, { type: f.mime || 'application/octet-stream' });
      const a = el('a', null, T('⬇ 다운로드')); a.href = URL.createObjectURL(blob); a.download = f.name;
      f.card.bar.remove(); f.card.status.textContent = T('수신 완료 · 출처를 확인하고 여세요'); f.card.box.append(a);
      S.chat.push({ ts: Date.now(), from: peer.id, name: f.from, file: { name: f.name, size: f.size } });
      toast(`📎 ${f.from}: ${f.name}`);
    }
    return;
  }
  const f = peer.incoming; if (!f) return;
  f.chunks.push(data); f.got += data.byteLength;
  if (f.got - (f.lastUi || 0) > 512 * 1024 || f.got === f.size) { f.lastUi = f.got; f.card.bar.value = f.got / f.size; f.card.status.textContent = `${T('수신 중')} ${(f.got / f.size * 100).toFixed(0)}%`; }
}
function fileCard(me, who, name, size) {
  const li = el('li', 'msg' + (me ? ' me' : '')); li.append(el('div', 'who', `${me ? T('나') : who} · ${fmtClock(Date.now())}`));
  const bub = el('div', 'bubble'); const box = el('div', 'file');
  const bar = el('progress'); bar.max = 1; bar.value = 0; const status = el('div', 'fsize');
  box.append(el('div', 'fname', '📄 ' + name), el('div', 'fsize', fmtSize(size)), bar, status); bub.append(box); li.append(bub); addMsg(li);
  return { box, bar, status };
}

// ================= 내보내기 =================
function transcriptText() {
  return S.transcript.map(t => `[${fmtRel(t.ts)}] ${t.name}: ${t.text}`).join('\n');
}
function exportMinutes() {
  const start = new Date(S.created), end = new Date();
  const people = [...new Set(S.names.values())];
  const keys = S.transcript.filter(t => t.key);
  const html = `<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><title>${T('회의록')} - ${fmtId(S.room)}</title>
<style>body{font-family:"Pretendard","Malgun Gothic",sans-serif;max-width:900px;margin:30px auto;padding:0 20px;color:#222;line-height:1.6}
h1{border-bottom:3px solid #3a6fd8;padding-bottom:8px}h2{margin-top:36px;color:#3a6fd8}table{border-collapse:collapse}td{padding:3px 12px 3px 0;vertical-align:top}
.t{color:#888;font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}.n{font-weight:700;white-space:nowrap}.key{background:#fff4dc}
figure{margin:18px 0;border:1px solid #ddd;border-radius:8px;overflow:hidden;break-inside:avoid}figure img{width:100%;display:block}figcaption{padding:8px 12px;font-size:13px;background:#f6f7f9}
.memo{border:1px dashed #bbb;min-height:80px;padding:10px;border-radius:6px;color:#999}@media print{h2{break-before:auto}}</style></head><body>
<h1>${T('회의록')} · ${T('회의 ID')} ${fmtId(S.room)}</h1>
<table><tr><td>${T('일시')}</td><td>${start.toLocaleString(LOCALE)} ~ ${end.toLocaleTimeString(LOCALE)} (${fmtRel(end.getTime())})</td></tr>
<tr><td>${T('호스트')}</td><td>${esc(nameOf(S.hostId))}</td></tr>
<tr><td>${T('참석자')}</td><td>${people.map(esc).join(', ')}</td></tr><tr><td>${T('작성')}</td><td>${esc(S.name)} · ${T('GT-Meet 자동 생성')}</td></tr></table>
<h2>${T('요약 · 결정사항 (직접 작성)')}</h2><div class="memo" contenteditable="true">${T('여기에 회의 요약과 결정사항을 적으세요.')}</div>
<h2>${T('핵심 발언')} (${keys.length})</h2>${keys.length ? '<table>' + keys.map(t => `<tr><td class="t">${fmtRel(t.ts)}</td><td class="n">${esc(t.name)}</td><td>${esc(t.text)}</td></tr>`).join('') + '</table>' : `<p>${T('없음')}</p>`}
<h2>${T('중요 시점 캡처')} (${S.shots.length})</h2>${S.shots.map(s => `<figure><img src="${s.data}" alt=""><figcaption><b>${fmtRel(s.ts)}</b> (${fmtClock(s.ts)}) — ${esc(s.reason)}${s.context ? '<br><span style="color:#666">' + esc(s.context) + '</span>' : ''}</figcaption></figure>`).join('') || `<p>${T('없음')}</p>`}
<h2>${T('전체 녹취록')} (${S.transcript.length})</h2>${S.transcript.length ? '<table>' + S.transcript.map(t => `<tr class="${t.key ? 'key' : ''}"><td class="t">${fmtRel(t.ts)}</td><td class="n">${esc(t.name)}</td><td>${esc(t.text)}</td></tr>`).join('') + '</table>' : `<p>${T('녹취 기록 없음')}</p>`}
<h2>${T('채팅 · 파일')}</h2><table>${S.chat.map(c => `<tr><td class="t">${fmtClock(c.ts)}</td><td class="n">${c.sys ? '' : esc(c.name)}</td><td>${c.sys ? '<i>' + esc(c.text) + '</i>' : c.file ? '📎 ' + esc(c.file.name) + ' (' + fmtSize(c.file.size) + ')' : esc(c.text)}</td></tr>`).join('')}</table>
</body></html>`;
  download(new Blob([html], { type: 'text/html' }), `GTMeet_minutes_${safeRoom()}_${stamp()}.html`);
  toast(T('회의록을 저장했습니다. 브라우저에서 열어 인쇄 → PDF로 저장할 수 있습니다.'));
}

// ================= UI 바인딩 =================
function bindToolbar() {
  $('#tMic').onclick = () => S.mic ? setMic(!S.micOn, true) : toast(T('마이크가 없습니다.'), 'warn');
  $('#tCam').onclick = () => setCam(S.cam ? !S.camOn : true, true);
  $('#tScreen').onclick = toggleScreen;
  $('#tRec').onclick = toggleRec;
  $('#tStt').onclick = toggleSTT;
  $('#tMark').onclick = () => { const reason = prompt(T('중요 표시 메모 (선택)'), '') ; if (reason === null) return; wsSend({ type: 'mark', reason }); };
  $('#tExport').onclick = exportMinutes;
  $('#tLeave').onclick = leave;
  $('#btnInvite').onclick = $('#btnInfo').onclick = openInfo;
  $('#btnCopyInvite').onclick = () => copy(inviteText(), T('초대문을 복사했습니다. 메신저·메일에 붙여넣으세요.'));
  $('#btnCopyLink').onclick = () => copy(inviteLink(), T('참여 링크를 복사했습니다.'));
  $('#btnShareInvite').onclick = async () => { const text = inviteText();
    if (ANDROID) return window.GTMeetAndroid.share(text);
    try { await navigator.share({ title: 'GT-Meet', text }); } catch {} };
  $('#optLock').onchange = e => wsSend({ type: 'settings', locked: e.target.checked });
  $('#optWaiting').onchange = e => wsSend({ type: 'settings', waitingRoom: e.target.checked });
  $('#btnEndAll').onclick = () => doLeave(true);
  $('#btnLeaveOnly').onclick = () => doLeave(false);
  $('#btnPanelClose').onclick = () => { document.querySelector('.stage').classList.add('nopanel'); setTimeout(layout, 50); };
  $('#btnPanel').onclick = () => { const st = document.querySelector('.stage'); st.classList.toggle('nopanel'); if (!st.classList.contains('nopanel')) $('#btnPanel').classList.remove('unread'); setTimeout(layout, 50); };
  addEventListener('keydown', e => {
    if (e.target.matches('input,textarea')) return;
    if (e.key === 'm') $('#tMic').click(); else if (e.key === 'v') $('#tCam').click(); else if (e.key === 'b') $('#tMark').click();
  });
}
function bindPanel() {
  document.querySelectorAll('.tabs button[data-tab]').forEach(b => b.onclick = () => {
    document.querySelectorAll('.tabs button[data-tab]').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
    if (b.dataset.tab === 'chat') $('#chatDot').hidden = true;
  });
  const ta = $('#chatInput');
  $('#chatForm').onsubmit = e => { e.preventDefault(); const text = ta.value.trim(); if (!text) return; wsSend({ type: 'chat', text }); ta.value = ''; ta.style.height = ''; };
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#chatForm').requestSubmit(); } };
  ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; };
  $('#btnAttach').onclick = () => $('#fileInput').click();
  $('#fileInput').onchange = e => { sendFiles([...e.target.files]); e.target.value = ''; };
  const msgs = $('#msgs');
  msgs.ondragover = e => e.preventDefault();
  msgs.ondrop = e => { e.preventDefault(); sendFiles([...e.dataTransfer.files]); };
  $('#sttLang').onchange = e => S.stt?.setLang(e.target.value);
  $('#btnSttTxt').onclick = () => S.transcript.length ? download(new Blob(['\ufeff' + T('회의 ID') + ': ' + fmtId(S.room) + '\n' + new Date(S.created).toLocaleString(LOCALE) + '\n\n' + transcriptText()], { type: 'text/plain' }), `GTMeet_transcript_${safeRoom()}_${stamp()}.txt`) : toast(T('녹취 내용이 없습니다.'), 'warn');
  $('#btnShotsZip').onclick = async () => { for (const s of S.shots) { download(s.data, `GTMeet_capture_${safeRoom()}_${fmtRel(s.ts).replace(/:/g, '')}.jpg`); await new Promise(r => setTimeout(r, 250)); } };
}

function leave() {
  if (isHost() && S.peers.size) return $('#leaveDlg').showModal();
  doLeave(false);
}
function doLeave(endAll) {
  $('#leaveDlg').close();
  if (S.rec && !confirm(T('녹화 중입니다. 녹화를 저장하고 나갈까요?'))) return;
  S.ended = true; window.gtmeet?.inMeeting(false); S.rec?.stop(); stopSTT();
  if (S.transcript.length || S.shots.length) { if (confirm(T('나가기 전에 회의록(녹취록·캡처 포함)을 저장할까요?'))) exportMinutes(); }
  wsSend({ type: endAll || !S.peers.size ? 'end' : 'leave' });
  for (const p of S.peers.values()) { try { p.pc.close(); } catch {} }
  [S.mic, S.cam, S.screen].forEach(t => t?.stop());
  setTimeout(() => { location.href = location.pathname; }, 600);
}

// ================= 앱 설치 (PWA) =================
function initInstall() {
  if ('serviceWorker' in navigator && window.isSecureContext && !ANDROID) navigator.serviceWorker.register('sw.js').catch(() => {});
  let evt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); evt = e; $('#btnInstall').hidden = false; });
  addEventListener('appinstalled', () => { $('#btnInstall').hidden = true; toast(T('GT-Meet가 설치되었습니다. 바탕화면·시작 메뉴에서 실행하세요.')); });
  $('#btnInstall').onclick = async () => { if (!evt) return; evt.prompt(); await evt.userChoice; evt = null; $('#btnInstall').hidden = true; };
}

initLobby();
