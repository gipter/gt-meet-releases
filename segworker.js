// GT-Meet 인물 분리 작업자(Web Worker): MediaPipe를 CPU로 실행
// - 일부 PC의 그래픽카드(WebGL)에서 MediaPipe 결과에 네모난 덩어리가 섞여 나와(방이 계단 모양으로 비침) CPU를 씀
// - 화면 그리기와 따로 돌아 회의 화면이 멈추지 않음. 화면 쪽은 처리 중이면 새 장면을 보내지 않음(최신 장면 우선)
let mp = null, seg = null, multi = false, lastTs = 0;

// MediaPipe가 wasm 실행기를 importScripts로 불러오는데, 모듈 작업자는 이를 막음 → 같은 일을 하는 대체 함수
self.importScripts = (...urls) => {
  for (const u of urls) {
    const x = new XMLHttpRequest(); x.open('GET', u, false); x.send();
    if (x.status && x.status >= 400) throw new Error(`HTTP ${x.status} ${u}`);
    (0, eval)(`${x.responseText}\n//# sourceURL=${u}`);   // 전역 범위에서 실행(일반 스크립트처럼)
  }
};

async function loadLib(base, cdn) {
  try {
    mp = await import(new URL('vendor/mediapipe/vision_bundle.mjs', base).href);
    return await mp.FilesetResolver.forVisionTasks(new URL('vendor/mediapipe/wasm', base).href);
  } catch (e) {
    mp = await import(`${cdn}/vision_bundle.mjs`);
    return await mp.FilesetResolver.forVisionTasks(`${cdn}/wasm`);
  }
}

async function init({ base, cdn, models }) {
  const files = await loadLib(base, cdn);
  let err;
  for (const m of models) for (const src of [new URL('vendor/mediapipe/' + m.file, base).href, m.url]) {
    try {
      seg = await mp.ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: src, delegate: 'CPU' },
        runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true,
      });
      multi = m.multi;
      return m.file;
    } catch (e) { err = e; }
  }
  throw err || new Error('model');
}

// 유도 필터(guided filter, He 외 2010): 카메라 그림의 밝기 경계를 따라 마스크 경계를 맞춤
// (설계안의 Joint Bilateral Filter와 같은 목적, 상자 평균만 써서 가벼움: 320×180에서 약 1ms)
let gc = null, gx = null, gb = {};
function box(src, dst, w, h, r) {   // 누적합 상자 평균(가로→세로)
  const t = gb.t && gb.t.length === w * h ? gb.t : (gb.t = new Float32Array(w * h)), row = gb.row && gb.row.length >= Math.max(w, h) + 1 ? gb.row : (gb.row = new Float64Array(Math.max(w, h) + 1));
  for (let y = 0; y < h; y++) { row[0] = 0; for (let x = 0; x < w; x++) row[x + 1] = row[x] + src[y * w + x];
    for (let x = 0; x < w; x++) { const a = Math.max(0, x - r), b = Math.min(w - 1, x + r); t[y * w + x] = (row[b + 1] - row[a]) / (b - a + 1); } }
  for (let x = 0; x < w; x++) { row[0] = 0; for (let y = 0; y < h; y++) row[y + 1] = row[y] + t[y * w + x];
    for (let y = 0; y < h; y++) { const a = Math.max(0, y - r), b = Math.min(h - 1, y + r); dst[y * w + x] = (row[b + 1] - row[a]) / (b - a + 1); } }
}
function guide(p, bitmap, w, h) {
  const n = w * h;
  if (!gc || gc.width !== w || gc.height !== h) { gc = new OffscreenCanvas(w, h); gx = gc.getContext('2d', { willReadFrequently: true });
    for (const k of ['I', 'mI', 'mp', 'Ip', 'II', 'a', 'b', 'ma', 'mb', 'tmp']) gb[k] = new Float32Array(n); }
  gx.drawImage(bitmap, 0, 0); const px = gx.getImageData(0, 0, w, h).data;
  const { I, mI, mp: mP, Ip, II, a, b, ma, mb, tmp } = gb, r = 3, eps = 0.004;
  for (let i = 0, j = 0; i < n; i++, j += 4) I[i] = (px[j] * 0.299 + px[j + 1] * 0.587 + px[j + 2] * 0.114) / 255;
  box(I, mI, w, h, r); box(p, mP, w, h, r);
  for (let i = 0; i < n; i++) tmp[i] = I[i] * p[i]; box(tmp, Ip, w, h, r);
  for (let i = 0; i < n; i++) tmp[i] = I[i] * I[i]; box(tmp, II, w, h, r);
  for (let i = 0; i < n; i++) { const va = II[i] - mI[i] * mI[i], cv = Ip[i] - mI[i] * mP[i]; a[i] = cv / (va + eps); b[i] = mP[i] - a[i] * mI[i]; }
  box(a, ma, w, h, r); box(b, mb, w, h, r);
  for (let i = 0; i < n; i++) { const q = ma[i] * I[i] + mb[i]; p[i] = q < 0 ? 0 : q > 1 ? 1 : q; }
}

self.onmessage = async e => {
  const m = e.data;
  if (m.type === 'init') {
    try { const model = await init(m); self.postMessage({ type: 'ready', model, multi }); }
    catch (x) { self.postMessage({ type: 'error', msg: String(x && x.message || x) }); }
    return;
  }
  if (m.type === 'frame') {
    const t0 = performance.now();
    try {
      const ts = Math.max(lastTs + 1, Math.round(m.ts)); lastTs = ts;   // VIDEO 모드는 시각이 계속 늘어나야 함
      const res = seg.segmentForVideo(m.bitmap, ts);
      const ms = res.confidenceMasks || [], w = ms[0].width, h = ms[0].height;
      const out = ms.map(k => k.getAsFloat32Array().slice());   // close() 전에 복사
      res.close?.();
      if (!multi && out.length === 1 && m.bitmap.width === w && m.bitmap.height === h) guide(out[0], m.bitmap, w, h);
      m.bitmap.close?.();
      self.postMessage({ type: 'mask', id: m.id, w, h, masks: out, ms: performance.now() - t0 }, out.map(a => a.buffer));
    } catch (x) {
      m.bitmap.close?.();
      self.postMessage({ type: 'fail', id: m.id, msg: String(x && x.message || x) });
    }
  }
};
