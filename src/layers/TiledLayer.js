import { degToRad } from '../utils/mathUtils.js';

export class TiledLayer {
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
