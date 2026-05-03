// Constrained random walk. Unlike the parametric paths this is stateful.
export class RandomWalkPath {
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
