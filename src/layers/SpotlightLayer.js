import { LissajousPath } from '../animation/paths/LissajousPath.js';
import { LemniscatePath } from '../animation/paths/LemniscatePath.js';
import { RandomWalkPath } from '../animation/paths/RandomWalkPath.js';
import { mod } from '../utils/mathUtils.js';

// Renders a full-coverage obscure overlay with a moving clear spotlight cut through it.
// The spotlight reveals the sharp image underneath while everything outside is
// darkened, making screenshots only ever capture a partial view.
export class SpotlightLayer {
  constructor(config) {
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._t = 0;
    this._path = null;
    this._config = config;
    // Current spotlight centre, updated each tick, shared with WatermarkLayer
    this._cx = 0;
    this._cy = 0;
    this._buildPath();
  }

  _buildPath() {
    const c = this._config;
    switch (c.path) {
      case 'lemniscate': this._path = new LemniscatePath(); break;
      case 'random':     this._path = new RandomWalkPath(); break;
      default:
        this._path = new LissajousPath({
          a: c.lissajousA, b: c.lissajousB, delta: c.lissajousDelta,
        });
    }
  }

  resize(w, h) {
    this._canvas.width = w;
    this._canvas.height = h;
  }

  update(config) {
    const rebuildPath = config.path !== this._config.path;
    this._config = config;
    if (rebuildPath) this._buildPath();
  }

  tick({ timestamp }) {
    const c = this._config;
    const canvas = this._canvas;
    const ctx = this._ctx;
    const w = canvas.width;
    const h = canvas.height;

    // Advance path phase and get spotlight centre.
    // Pass 0×0 stamp size so toCanvas returns the centre point directly.
    this._t = mod(this._t + c.speed * 0.0005, 1);
    const pos = this._path.toCanvas(this._t, w, h, 0, 0, c.spotlightMargin);
    this._cx = pos.x;
    this._cy = pos.y;

    const radius = Math.min(w, h) * c.spotlightRadius;

    ctx.clearRect(0, 0, w, h);

    // Step 1: fill entire canvas with the obscure colour
    ctx.fillStyle = c.obscureColor;
    ctx.fillRect(0, 0, w, h);

    // Step 2: punch a soft radial hole through the overlay.
    // destination-out erases what we draw, revealing the image below.
    ctx.globalCompositeOperation = 'destination-out';

    const grad = ctx.createRadialGradient(this._cx, this._cy, 0, this._cx, this._cy, radius);
    grad.addColorStop(0,                              'rgba(0,0,0,1)');   // fully clear at centre
    grad.addColorStop(c.spotlightFeather,             'rgba(0,0,0,0.98)');
    grad.addColorStop(c.spotlightFeather + 0.25,      'rgba(0,0,0,0.35)');
    grad.addColorStop(1,                              'rgba(0,0,0,0)');   // fully obscured at edge

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'source-over';
  }

  // WatermarkLayer reads this to position text inside the clear window
  get center() { return { x: this._cx, y: this._cy }; }

  get canvas() { return this._canvas; }
}
