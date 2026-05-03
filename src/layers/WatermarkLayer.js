import { LissajousPath } from '../animation/paths/LissajousPath.js';
import { LemniscatePath } from '../animation/paths/LemniscatePath.js';
import { RandomWalkPath } from '../animation/paths/RandomWalkPath.js';
import { parseRgba, rgbToHsl, hslToRgb, toRgbaString } from '../utils/colorUtils.js';
import { mod } from '../utils/mathUtils.js';

export class WatermarkLayer {
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
