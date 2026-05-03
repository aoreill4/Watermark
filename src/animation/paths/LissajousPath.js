import { degToRad } from '../../utils/mathUtils.js';

// Parametric Lissajous curve. t in [0, 1) maps to one full period.
// With a=3, b=2, provides dense coverage of the canvas over ~8s at default speed.
export class LissajousPath {
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
