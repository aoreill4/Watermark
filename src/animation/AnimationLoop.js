export class AnimationLoop {
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
