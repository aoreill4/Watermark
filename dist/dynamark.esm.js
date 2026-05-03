const defaults = {
  // Source image
  image: null,
  imagePosition: 'cover', // 'cover' | 'contain' | 'fill'

  // Primary watermark
  text: 'CONFIDENTIAL',
  logo: null,
  font: 'bold 18px Arial, sans-serif',
  color: 'rgba(255,255,255,0.7)',
  strokeColor: 'rgba(0,0,0,0.4)',
  strokeWidth: 1,
  rotation: -30,       // degrees, stamp rotation
  rotationSpeed: 0,    // degrees/second continuous rotation

  // Motion
  path: 'lissajous',   // 'lissajous' | 'lemniscate' | 'random'
  speed: 1.0,
  lissajousA: 3,
  lissajousB: 2,
  lissajousDelta: Math.PI / 4,
  margin: 24,

  // Opacity
  opacity: 0.7,
  opacityPulse: true,
  opacityPulseSpeed: 0.6,  // Hz
  opacityPulseDepth: 0.15, // ± fraction

  // Color perturbation
  colorPerturbation: true,
  colorPerturbationSpeed: 0.25, // Hz
  colorPerturbationDepth: 20,   // ± degrees in HSL hue

  // Tiled ghost layer
  tiledEnabled: true,
  tiledOpacity: 0.07,
  tiledSpacing: 160,
  tiledAngle: -30,

  // Performance
  targetFps: 30,

  // Callbacks
  onFrame: null,
};

class AnimationLoop {
  constructor(targetFps = 30) {
    this._targetFps = targetFps;
    this._interval = 1000 / targetFps;
    this._callbacks = [];
    this._rafId = null;
    this._lastTime = null;
    this._frame = 0;
    this._running = false;
  }

  onTick(cb) {
    this._callbacks.push(cb);
  }

  offTick(cb) {
    this._callbacks = this._callbacks.filter((c) => c !== cb);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = null;
    this._rafId = requestAnimationFrame(this._tick.bind(this));
  }

  stop() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _tick(timestamp) {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(this._tick.bind(this));

    if (this._lastTime === null) {
      this._lastTime = timestamp;
      return;
    }

    const delta = timestamp - this._lastTime;
    if (delta < this._interval - 1) return; // throttle to targetFps

    this._lastTime = timestamp - (delta % this._interval);
    this._frame++;

    const info = { frame: this._frame, timestamp, delta };
    for (const cb of this._callbacks) cb(info);
  }

  setTargetFps(fps) {
    this._targetFps = fps;
    this._interval = 1000 / fps;
  }
}

class ImageLayer {
  constructor() {
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._img = null;
    this._position = 'cover';
  }

  setImage(source, position = 'cover') {
    this._position = position;
    return new Promise((resolve, reject) => {
      if (!source) { resolve(); return; }
      if (source instanceof HTMLImageElement) {
        this._img = source;
        resolve();
      } else if (typeof source === 'string') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { this._img = img; resolve(); };
        img.onerror = reject;
        img.src = source;
      } else {
        reject(new Error('Unsupported image source type'));
      }
    });
  }

  resize(w, h) {
    this._canvas.width = w;
    this._canvas.height = h;
    this._redraw();
  }

  _redraw() {
    const { _canvas: c, _ctx: ctx, _img: img, _position: pos } = this;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!img) return;

    const cw = c.width, ch = c.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    let sx = 0, sy = 0, sw = iw, sh = ih;
    let dx = 0, dy = 0, dw = cw, dh = ch;

    if (pos === 'cover') {
      const scale = Math.max(cw / iw, ch / ih);
      dw = iw * scale; dh = ih * scale;
      dx = (cw - dw) / 2; dy = (ch - dh) / 2;
    } else if (pos === 'contain') {
      const scale = Math.min(cw / iw, ch / ih);
      dw = iw * scale; dh = ih * scale;
      dx = (cw - dw) / 2; dy = (ch - dh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  get canvas() { return this._canvas; }
}

const mod = (n, m) => ((n % m) + m) % m;
const degToRad = (deg) => (deg * Math.PI) / 180;

// Parametric Lissajous curve. t in [0, 1) maps to one full period.
// With a=3, b=2, provides dense coverage of the canvas over ~8s at default speed.
class LissajousPath {
  constructor({ a = 3, b = 2, delta = Math.PI / 4 } = {}) {
    this._a = a;
    this._b = b;
    this._delta = delta;
    // period = 2π / GCD(a,b) normalised; we just use t in [0,1] over full cycle
  }

  // Returns { x, y } in [-1, 1] x [-1, 1]
  getPoint(t) {
    const angle = t * 2 * Math.PI;
    return {
      x: Math.sin(this._a * angle + this._delta),
      y: Math.sin(this._b * angle),
    };
  }

  // Map normalised [-1,1] point to canvas coordinates with margin
  toCanvas(t, canvasW, canvasH, stampW, stampH, margin = 0) {
    const { x, y } = this.getPoint(t);
    const hw = (canvasW - stampW) / 2 - margin;
    const hh = (canvasH - stampH) / 2 - margin;
    return {
      x: (canvasW - stampW) / 2 + x * hw,
      y: (canvasH - stampH) / 2 + y * hh,
    };
  }
}

// Bernoulli lemniscate (figure-8 / infinity path)
class LemniscatePath {
  getPoint(t) {
    const angle = t * 2 * Math.PI;
    const denom = 1 + Math.sin(angle) * Math.sin(angle);
    return {
      x: Math.cos(angle) / denom,
      y: (Math.sin(angle) * Math.cos(angle)) / denom,
    };
  }

  toCanvas(t, canvasW, canvasH, stampW, stampH, margin = 0) {
    const { x, y } = this.getPoint(t);
    const hw = (canvasW - stampW) / 2 - margin;
    const hh = (canvasH - stampH) / 2 - margin;
    return {
      x: (canvasW - stampW) / 2 + x * hw,
      y: (canvasH - stampH) / 2 + y * hh,
    };
  }
}

// Constrained random walk. Unlike the parametric paths this is stateful.
class RandomWalkPath {
  constructor() {
    this._x = 0;
    this._y = 0;
    this._vx = (Math.random() - 0.5) * 0.04;
    this._vy = (Math.random() - 0.5) * 0.04;
  }

  // Call once per frame; returns normalised position in [-1, 1]
  step() {
    // Random impulse
    this._vx += (Math.random() - 0.5) * 0.01;
    this._vy += (Math.random() - 0.5) * 0.01;

    // Return-to-centre force (keeps it on screen)
    this._vx -= this._x * 0.003;
    this._vy -= this._y * 0.003;

    // Damping
    this._vx *= 0.97;
    this._vy *= 0.97;

    this._x = Math.max(-1, Math.min(1, this._x + this._vx));
    this._y = Math.max(-1, Math.min(1, this._y + this._vy));
    return { x: this._x, y: this._y };
  }

  // RandomWalk ignores t; use step() instead. toCanvas calls step each frame.
  toCanvas(_t, canvasW, canvasH, stampW, stampH, margin = 0) {
    const { x, y } = this.step();
    const hw = (canvasW - stampW) / 2 - margin;
    const hh = (canvasH - stampH) / 2 - margin;
    return {
      x: (canvasW - stampW) / 2 + x * hw,
      y: (canvasH - stampH) / 2 + y * hh,
    };
  }
}

// Parse 'rgba(r,g,b,a)' or 'rgb(r,g,b)' to { r, g, b, a }
function parseRgba(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return { r: 255, g: 255, b: 255, a: 1 };
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
}

// RGB → HSL (h: 0-360, s: 0-100, l: 0-100)
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// HSL → RGB
function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function toRgbaString(r, g, b, a) {
  return `rgba(${r},${g},${b},${a})`;
}

class WatermarkLayer {
  constructor(config) {
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._stamp = null; // offscreen canvas with pre-rendered text/logo
    this._t = 0;        // path phase [0, 1)
    this._path = null;
    this._config = config;
    this._buildPath();
    this._buildStamp();
  }

  _buildPath() {
    const c = this._config;
    switch (c.path) {
      case 'lemniscate':
        this._path = new LemniscatePath();
        break;
      case 'random':
        this._path = new RandomWalkPath();
        break;
      default:
        this._path = new LissajousPath({
          a: c.lissajousA,
          b: c.lissajousB,
          delta: c.lissajousDelta,
        });
    }
  }

  _buildStamp() {
    const c = this._config;
    const stamp = document.createElement('canvas');
    const ctx = stamp.getContext('2d');

    if (c.logo) {
      // Logo mode: draw image into stamp
      const img = typeof c.logo === 'string' ? (() => { const i = new Image(); i.src = c.logo; return i; })() : c.logo;
      const maxW = 200, maxH = 80;
      const scale = Math.min(maxW / (img.naturalWidth || img.width || maxW), maxH / (img.naturalHeight || img.height || maxH));
      stamp.width = Math.round((img.naturalWidth || img.width || maxW) * scale);
      stamp.height = Math.round((img.naturalHeight || img.height || maxH) * scale);
      ctx.drawImage(img, 0, 0, stamp.width, stamp.height);
    } else {
      // Text mode
      ctx.font = c.font;
      const metrics = ctx.measureText(c.text);
      const textW = Math.ceil(metrics.width);
      const textH = Math.ceil(parseInt(c.font) * 1.4);
      stamp.width = textW + 8;
      stamp.height = textH + 4;
      ctx.font = c.font;
      ctx.textBaseline = 'middle';
      if (c.strokeWidth > 0 && c.strokeColor) {
        ctx.strokeStyle = c.strokeColor;
        ctx.lineWidth = c.strokeWidth * 2;
        ctx.strokeText(c.text, 4, stamp.height / 2);
      }
      ctx.fillStyle = c.color;
      ctx.fillText(c.text, 4, stamp.height / 2);
    }

    this._stamp = stamp;
  }

  resize(w, h) {
    this._canvas.width = w;
    this._canvas.height = h;
  }

  update(config) {
    const rebuild = config.text !== this._config.text
      || config.font !== this._config.font
      || config.color !== this._config.color
      || config.path !== this._config.path;
    this._config = config;
    if (rebuild) {
      this._buildPath();
      this._buildStamp();
    }
  }

  tick({ frame, timestamp }) {
    const c = this._config;
    const canvas = this._canvas;
    const ctx = this._ctx;

    // Advance path phase
    const speedFactor = c.speed * 0.0005; // tuned so speed=1 gives ~8s full Lissajous cycle
    this._t = mod(this._t + speedFactor, 1);

    // Compute position
    const sw = this._stamp.width;
    const sh = this._stamp.height;
    const pos = this._path.toCanvas(this._t, canvas.width, canvas.height, sw, sh, c.margin);

    // Compute current opacity with optional pulse
    let opacity = c.opacity;
    if (c.opacityPulse) {
      const pulse = Math.sin(timestamp * 0.001 * c.opacityPulseSpeed * 2 * Math.PI);
      opacity = Math.max(0.1, opacity + pulse * c.opacityPulseDepth);
    }

    // Compute color with optional hue perturbation
    let fillStyle = c.color;
    if (c.colorPerturbation) {
      const { r, g, b, a } = parseRgba(c.color);
      const { h, s, l } = rgbToHsl(r, g, b);
      const hueDelta = Math.sin(timestamp * 0.001 * c.colorPerturbationSpeed * 2 * Math.PI) * c.colorPerturbationDepth;
      const newHue = mod(h + hueDelta, 360);
      const { r: nr, g: ng, b: nb } = hslToRgb(newHue, s, l);
      fillStyle = toRgbaString(nr, ng, nb, a);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Apply rotation around stamp centre
    const cx = pos.x + sw / 2;
    const cy = pos.y + sh / 2;
    const totalRotation = c.rotation + (c.rotationSpeed * timestamp * 0.001);
    ctx.translate(cx, cy);
    ctx.rotate((totalRotation * Math.PI) / 180);
    ctx.translate(-sw / 2, -sh / 2);

    ctx.globalAlpha = opacity;

    // Re-tint the stamp if colorPerturbation is on (use composite trick)
    if (c.colorPerturbation && !c.logo) {
      // Draw a fresh text with the perturbed color instead of using the cached stamp
      ctx.font = c.font;
      ctx.textBaseline = 'middle';
      if (c.strokeWidth > 0 && c.strokeColor) {
        ctx.strokeStyle = c.strokeColor;
        ctx.lineWidth = c.strokeWidth * 2;
        ctx.strokeText(c.text, 4, this._stamp.height / 2);
      }
      ctx.fillStyle = fillStyle;
      ctx.fillText(c.text, 4, this._stamp.height / 2);
    } else {
      ctx.drawImage(this._stamp, 0, 0);
    }

    ctx.restore();
  }

  get canvas() { return this._canvas; }
}

class TiledLayer {
  constructor(config) {
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._config = config;
    this._dirty = true;
  }

  resize(w, h) {
    this._canvas.width = w;
    this._canvas.height = h;
    this._dirty = true;
  }

  update(config) {
    this._config = config;
    this._dirty = true;
  }

  tick() {
    if (!this._dirty) return;
    this._dirty = false;
    this._redraw();
  }

  _redraw() {
    const c = this._config;
    const { _canvas: canvas, _ctx: ctx } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    if (!c.tiledEnabled) return;

    ctx.save();
    ctx.globalAlpha = c.tiledOpacity;
    ctx.font = c.font;
    ctx.fillStyle = c.color;
    ctx.textBaseline = 'middle';

    const angleRad = degToRad(c.tiledAngle);
    const spacing = c.tiledSpacing;

    // Render on a rotated coordinate system large enough to cover the canvas
    const diagonal = Math.ceil(Math.sqrt(w * w + h * h));
    ctx.translate(w / 2, h / 2);
    ctx.rotate(angleRad);

    const cols = Math.ceil(diagonal / spacing) + 2;
    const rows = Math.ceil(diagonal / spacing) + 2;
    const startX = -cols * spacing / 2;
    const startY = -rows * spacing / 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * spacing;
        const y = startY + row * spacing;
        ctx.fillText(c.text, x, y);
      }
    }

    ctx.restore();
  }

  get canvas() { return this._canvas; }
}

class WatermarkEngine {
  constructor(container, options = {}) {
    this._config = Object.assign({}, defaults, options);
    this._container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    // Output canvas
    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText = 'display:block;width:100%;height:100%;user-select:none;';
    this._ctx = this._canvas.getContext('2d');
    this._container.appendChild(this._canvas);

    // Context-menu guard
    this._canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Layers
    this._imageLayer = new ImageLayer();
    this._watermarkLayer = new WatermarkLayer(this._config);
    this._tiledLayer = new TiledLayer(this._config);

    // Animation loop
    this._loop = new AnimationLoop(this._config.targetFps);
    this._loop.onTick(this._onTick.bind(this));

    // Resize handling
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this._container);
    this._resize();
  }

  async setImage(source) {
    await this._imageLayer.setImage(source, this._config.imagePosition);
    this._imageLayer.resize(this._canvas.width, this._canvas.height);
    return this;
  }

  start() {
    this._loop.start();
    return this;
  }

  stop() {
    this._loop.stop();
    return this;
  }

  update(options = {}) {
    this._config = Object.assign({}, this._config, options);
    this._watermarkLayer.update(this._config);
    this._tiledLayer.update(this._config);
    this._loop.setTargetFps(this._config.targetFps);
    return this;
  }

  destroy() {
    this._loop.stop();
    this._resizeObserver.disconnect();
    this._canvas.remove();
  }

  // Returns a data URL of the current composited frame (watermark burned in)
  export(type = 'image/png') {
    return this._canvas.toDataURL(type);
  }

  _resize() {
    const w = this._container.clientWidth || 800;
    const h = this._container.clientHeight || 600;
    this._canvas.width = w;
    this._canvas.height = h;
    this._imageLayer.resize(w, h);
    this._watermarkLayer.resize(w, h);
    this._tiledLayer.resize(w, h);
  }

  _onTick(info) {
    this._tiledLayer.tick(info);
    this._watermarkLayer.tick(info);
    this._compose();
    if (this._config.onFrame) this._config.onFrame(info);
  }

  _compose() {
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Layer 1: image
    ctx.drawImage(this._imageLayer.canvas, 0, 0);

    // Layer 2: primary animated watermark
    ctx.drawImage(this._watermarkLayer.canvas, 0, 0);

    // Layer 3: tiled ghost layer (on top so it's never fully masked)
    ctx.drawImage(this._tiledLayer.canvas, 0, 0);
  }
}

export { WatermarkEngine as DynaMark };
//# sourceMappingURL=dynamark.esm.js.map
