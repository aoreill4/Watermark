import { DynaMark } from '../src/index.js';

let engine = null;
let frameCount = 0;

// ─── Init engine ─────────────────────────────────────────────────────────────

function getConfig() {
  const fontSize = document.getElementById('font-size').value;
  return {
    text: document.getElementById('wm-text').value || 'CONFIDENTIAL',
    font: `bold ${fontSize}px Arial, sans-serif`,
    opacity: parseFloat(document.getElementById('opacity').value),
    rotation: parseInt(document.getElementById('rotation').value),
    path: document.getElementById('path-select').value,
    speed: parseFloat(document.getElementById('speed').value),
    targetFps: parseInt(document.getElementById('fps').value),
    tiledEnabled: document.getElementById('tiled-enabled').checked,
    tiledOpacity: parseFloat(document.getElementById('tiled-opacity').value),
    tiledSpacing: parseInt(document.getElementById('tiled-spacing').value),
    colorPerturbation: document.getElementById('color-perturb').checked,
    colorPerturbationDepth: parseInt(document.getElementById('perturb-depth').value),
    onFrame: ({ frame }) => {
      frameCount = frame;
      document.getElementById('frame-info').textContent = `Frame ${frame}`;
    },
  };
}

function initEngine() {
  if (engine) engine.destroy();
  document.getElementById('placeholder').style.display = 'none';

  engine = new DynaMark(document.getElementById('preview-container'), getConfig());
  engine.start();
  return engine;
}

// ─── Image loading ────────────────────────────────────────────────────────────

async function loadImage(src) {
  const e = initEngine();
  await e.setImage(src);
}

// Sample image: a generated gradient canvas used as placeholder
document.getElementById('load-sample-btn').addEventListener('click', async () => {
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 800;
  sampleCanvas.height = 500;
  const ctx = sampleCanvas.getContext('2d');

  // Draw a gradient landscape as sample
  const grad = ctx.createLinearGradient(0, 0, 800, 500);
  grad.addColorStop(0, '#1a237e');
  grad.addColorStop(0.4, '#0288d1');
  grad.addColorStop(0.7, '#4caf50');
  grad.addColorStop(1, '#8d6e63');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 500);

  // Sun
  ctx.beginPath();
  ctx.arc(640, 120, 60, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,235,59,0.9)';
  ctx.fill();

  // Clouds
  for (const [cx, cy] of [[150, 80], [400, 60], [600, 100]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.arc(cx + 40, cy - 10, 30, 0, Math.PI * 2);
    ctx.arc(cx + 70, cy, 35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  }

  // Mountains
  ctx.beginPath();
  ctx.moveTo(0, 320);
  ctx.lineTo(120, 180); ctx.lineTo(240, 300);
  ctx.lineTo(350, 150); ctx.lineTo(480, 290);
  ctx.lineTo(600, 160); ctx.lineTo(720, 260);
  ctx.lineTo(800, 200); ctx.lineTo(800, 500); ctx.lineTo(0, 500);
  ctx.fillStyle = '#2e7d32';
  ctx.fill();

  // Text label
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('Sample Image — DynaMark Demo', 20, 480);

  const dataUrl = sampleCanvas.toDataURL('image/png');
  await loadImage(dataUrl);
});

// File drop / click
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('click', (e) => {
  if (e.target.id !== 'load-sample-btn') fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) loadImage(URL.createObjectURL(file));
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImage(URL.createObjectURL(file));
});

// ─── Live config updates ──────────────────────────────────────────────────────

function bindControl(id, key, transform, displayId, format) {
  const el = document.getElementById(id);
  const disp = displayId ? document.getElementById(displayId) : null;
  el.addEventListener('input', () => {
    const v = transform(el.value);
    if (disp) disp.textContent = format ? format(v) : v;
    if (engine) engine.update(getConfig());
  });
}

bindControl('wm-text', 'text', (v) => v, null, null);
document.getElementById('wm-text').addEventListener('input', () => engine && engine.update(getConfig()));

bindControl('font-size', 'font', (v) => v, 'font-size-val', (v) => `${v}px`);
bindControl('opacity', 'opacity', parseFloat, 'opacity-val', (v) => v.toFixed(2));
bindControl('rotation', 'rotation', parseInt, 'rotation-val', (v) => `${v >= 0 ? '' : '−'}${Math.abs(v)}°`);
bindControl('speed', 'speed', parseFloat, 'speed-val', (v) => `${v.toFixed(1)}×`);
bindControl('fps', 'targetFps', parseInt, 'fps-val', (v) => `${v}`);
bindControl('tiled-opacity', 'tiledOpacity', parseFloat, 'tiled-opacity-val', (v) => v.toFixed(2));
bindControl('tiled-spacing', 'tiledSpacing', parseInt, 'tiled-spacing-val', (v) => `${v}px`);
bindControl('perturb-depth', 'colorPerturbationDepth', parseInt, 'perturb-depth-val', (v) => `${v}°`);

document.getElementById('path-select').addEventListener('change', () => engine && engine.update(getConfig()));
document.getElementById('tiled-enabled').addEventListener('change', () => engine && engine.update(getConfig()));
document.getElementById('color-perturb').addEventListener('change', () => engine && engine.update(getConfig()));

// ─── Attack simulator ─────────────────────────────────────────────────────────

function showResult(title, canvas, desc) {
  const overlay = document.getElementById('result-overlay');
  const resultCanvas = document.getElementById('result-canvas');
  const ctx = resultCanvas.getContext('2d');
  resultCanvas.width = canvas.width;
  resultCanvas.height = canvas.height;
  ctx.drawImage(canvas, 0, 0);
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-desc').textContent = desc;
  overlay.classList.add('visible');
}

document.getElementById('close-overlay').addEventListener('click', () => {
  document.getElementById('result-overlay').classList.remove('visible');
});

// Attack 1: Screenshot (just grab the current frame)
document.getElementById('attack-screenshot').addEventListener('click', () => {
  if (!engine) return alert('Load an image first.');
  const previewCanvas = document.querySelector('#preview-container canvas');
  const snap = document.createElement('canvas');
  snap.width = previewCanvas.width;
  snap.height = previewCanvas.height;
  snap.getContext('2d').drawImage(previewCanvas, 0, 0);
  showResult(
    '📸 Screenshot Attack — Watermark Captured',
    snap,
    'The screenshot captured the watermark exactly as it appeared at this moment. Because the watermark is always visible and never leaves any region for more than a few seconds, every screenshot will contain it. The tiled ghost layer is also visible across the entire image.'
  );
});

// Attack 2: Frame average
document.getElementById('attack-average').addEventListener('click', async () => {
  if (!engine) return alert('Load an image first.');
  const btn = document.getElementById('attack-average');
  btn.textContent = 'Capturing 60 frames…';
  btn.disabled = true;

  const previewCanvas = document.querySelector('#preview-container canvas');
  const w = previewCanvas.width;
  const h = previewCanvas.height;

  const accumulator = new Float32Array(w * h * 4);
  const frameCount = 60;
  const delay = () => new Promise((r) => requestAnimationFrame(r));

  for (let i = 0; i < frameCount; i++) {
    await delay();
    const data = previewCanvas.getContext('2d').getImageData(0, 0, w, h).data;
    for (let j = 0; j < data.length; j++) accumulator[j] += data[j];
  }

  const result = document.createElement('canvas');
  result.width = w;
  result.height = h;
  const rCtx = result.getContext('2d');
  const img = rCtx.createImageData(w, h);
  for (let j = 0; j < img.data.length; j++) {
    img.data[j] = j % 4 === 3 ? 255 : Math.round(accumulator[j] / frameCount);
  }
  rCtx.putImageData(img, 0, 0);

  btn.innerHTML = '<span class="icon">🎞</span> Try Frame Average (60 frames)';
  btn.disabled = false;

  showResult(
    '🎞 Frame Average Attack — Watermark Survives',
    result,
    'After averaging 60 frames, the primary watermark blurs into a ghost that traces its Lissajous path — making it obvious that the image was watermarked and that the watermark was attempted to be removed. The tiled ghost layer remains fully visible across the entire image at all times.'
  );
});

// Attack 3: Canvas extraction via toDataURL
document.getElementById('attack-extract').addEventListener('click', () => {
  if (!engine) return alert('Load an image first.');
  const dataUrl = engine.export('image/png');
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    showResult(
      '🔓 Canvas Extraction — Watermark Burned In',
      c,
      'The exported image contains the watermark burned into the frame at the moment of extraction. In production, this export can be intercepted to return a blank canvas or throw an error, making DevTools-based extraction return nothing useful.'
    );
  };
  img.src = dataUrl;
});
