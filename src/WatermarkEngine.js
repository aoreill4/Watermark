import { defaults } from './config/defaults.js';
import { AnimationLoop } from './animation/AnimationLoop.js';
import { ImageLayer } from './layers/ImageLayer.js';
import { WatermarkLayer } from './layers/WatermarkLayer.js';
import { TiledLayer } from './layers/TiledLayer.js';

export class WatermarkEngine {
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
