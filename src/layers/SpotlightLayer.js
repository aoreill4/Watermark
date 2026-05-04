import { LissajousPath } from '../animation/paths/LissajousPath.js';
import { LemniscatePath } from '../animation/paths/LemniscatePath.js';
import { RandomWalkPath } from '../animation/paths/RandomWalkPath.js';
import { mod } from '../utils/mathUtils.js';

// Emits a pure alpha-mask canvas.
// High alpha at the spotlight centre → real image shows through.
// Zero alpha at the edges → decoy image shows through.
// The engine composites real-over-decoy using this mask via destination-in.
export class SpotlightLayer {
  constructor(config) {
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._t = 0;
    this._cx = 0;
    this._cy = 0;
    this._config = config;
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

  tick() {
    const c = this._config;
    const { _canvas: canvas, _ctx: ctx } = this;
    const w = canvas.width;
    const h = canvas.height;

    this._t = mod(this._t + c.speed * 0.0005, 1);
    const pos = this._path.toCanvas(this._t, w, h, 0, 0, c.spotlightMargin);
    this._cx = pos.x;
    this._cy = pos.y;

    const radius = Math.min(w, h) * c.spotlightRadius;
    const feather = c.spotlightFeather;

    ctx.clearRect(0, 0, w, h);

    // Radial gradient: alpha 1 at centre → alpha 0 at edge.
    // Used by the engine as a destination-in mask so the real image only
    // shows inside the spotlight and the decoy shows everywhere else.
    const grad = ctx.createRadialGradient(this._cx, this._cy, 0, this._cx, this._cy, radius);
    grad.addColorStop(0,            'rgba(0,0,0,1)');
    grad.addColorStop(feather,      'rgba(0,0,0,0.97)');
    grad.addColorStop(feather + 0.2,'rgba(0,0,0,0.25)');
    grad.addColorStop(1,            'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  get center() { return { x: this._cx, y: this._cy }; }
  get canvas()  { return this._canvas; }
}
