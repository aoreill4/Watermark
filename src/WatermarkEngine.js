import { defaults } from './config/defaults.js';
import { AnimationLoop } from './animation/AnimationLoop.js';
import { ImageLayer } from './layers/ImageLayer.js';
import { DecoyLayer } from './layers/DecoyLayer.js';
import { WatermarkLayer } from './layers/WatermarkLayer.js';
import { TiledLayer } from './layers/TiledLayer.js';
import { SpotlightLayer } from './layers/SpotlightLayer.js';

export class WatermarkEngine {
  constructor(container, options = {}) {
    this._config = Object.assign({}, defaults, options);
    this._container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText = 'display:block;width:100%;height:100%;user-select:none;';
    this._ctx = this._canvas.getContext('2d');
    this._container.appendChild(this._canvas);

    this._canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this._imageLayer    = new ImageLayer();
    this._decoyLayer    = new DecoyLayer();
    this._spotlightLayer= new SpotlightLayer(this._config);
    this._watermarkLayer= new WatermarkLayer(this._config);
    this._tiledLayer    = new TiledLayer(this._config);

    // Intermediate canvas used to mask the real image to the spotlight area
    this._maskedCanvas = document.createElement('canvas');
    this._maskedCtx    = this._maskedCanvas.getContext('2d');

    this._loop = new AnimationLoop(this._config.targetFps);
    this._loop.onTick(this._onTick.bind(this));

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this._container);
    this._resize();
  }

  async setImage(source) {
    await this._imageLayer.setImage(source, this._config.imagePosition);
    const w = this._canvas.width;
    const h = this._canvas.height;
    this._imageLayer.resize(w, h);
    // Build decoy from the now-rendered image layer
    this._decoyLayer.setImage(this._imageLayer.canvas);
    return this;
  }

  start() { this._loop.start(); return this; }
  stop()  { this._loop.stop();  return this; }

  update(options = {}) {
    this._config = Object.assign({}, this._config, options);
    this._spotlightLayer.update(this._config);
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

  export(type = 'image/png') {
    return this._canvas.toDataURL(type);
  }

  _resize() {
    const w = this._container.clientWidth || 800;
    const h = this._container.clientHeight || 600;
    this._canvas.width = w;
    this._canvas.height = h;
    this._maskedCanvas.width = w;
    this._maskedCanvas.height = h;
    this._imageLayer.resize(w, h);
    this._decoyLayer.resize(w, h);
    this._spotlightLayer.resize(w, h);
    this._watermarkLayer.resize(w, h);
    this._tiledLayer.resize(w, h);
  }

  _onTick(info) {
    this._spotlightLayer.tick(info);

    const externalCenter = this._config.watermarkFollowsSpotlight
      ? this._spotlightLayer.center
      : null;

    this._watermarkLayer.tick({ ...info, externalCenter });
    this._tiledLayer.tick(info);
    this._compose();
    if (this._config.onFrame) this._config.onFrame(info);
  }

  _compose() {
    const ctx  = this._ctx;
    const mCtx = this._maskedCtx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Decoy (tile-scrambled image) fills the entire canvas
    ctx.drawImage(this._decoyLayer.canvas, 0, 0);

    // 2. Mask the real image to the spotlight area and draw it over the decoy.
    //    destination-in keeps only the pixels where the mask has non-zero alpha.
    mCtx.clearRect(0, 0, w, h);
    mCtx.drawImage(this._imageLayer.canvas, 0, 0);
    mCtx.globalCompositeOperation = 'destination-in';
    mCtx.drawImage(this._spotlightLayer.canvas, 0, 0);
    mCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this._maskedCanvas, 0, 0);

    // 3. Watermark text (in spotlight window if watermarkFollowsSpotlight)
    if (this._config.text) {
      ctx.drawImage(this._watermarkLayer.canvas, 0, 0);
    }

    // 4. Tiled ghost — always on top
    ctx.drawImage(this._tiledLayer.canvas, 0, 0);
  }
}
