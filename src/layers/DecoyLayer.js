// Builds a tile-scrambled version of the source image used as the decoy background.
// Tiles are shuffled with a fixed seed so the result is stable but spatially wrong —
// same colour palette as the real image, which confuses AI reconstruction models.
export class DecoyLayer {
  constructor() {
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
  }

  setImage(sourceCanvas) {
    const sw = sourceCanvas.width;
    const sh = sourceCanvas.height;
    this._canvas.width = sw;
    this._canvas.height = sh;

    const COLS = 14;
    const ROWS = 10;
    const tw = sw / COLS;
    const th = sh / ROWS;

    // Build a list of source tile indices and shuffle with a fixed seed
    const total = COLS * ROWS;
    const indices = Array.from({ length: total }, (_, i) => i);
    let seed = 0xA5B4C3D2;
    for (let i = total - 1; i > 0; i--) {
      seed = Math.imul(seed ^ (seed >>> 15), seed | 1);
      seed ^= seed + Math.imul(seed ^ (seed >>> 7), seed | 61);
      seed = (seed ^ (seed >>> 14)) >>> 0;
      const j = seed % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Draw each destination tile using its shuffled source tile
    const ctx = this._ctx;
    ctx.clearRect(0, 0, sw, sh);
    for (let dest = 0; dest < total; dest++) {
      const src = indices[dest];
      const srcCol = src % COLS;
      const srcRow = Math.floor(src / COLS);
      const dstCol = dest % COLS;
      const dstRow = Math.floor(dest / COLS);
      ctx.drawImage(
        sourceCanvas,
        srcCol * tw, srcRow * th, tw, th,
        dstCol * tw, dstRow * th, tw, th,
      );
    }

    // Subtle darkening + desaturation tint so the decoy reads as background
    ctx.fillStyle = 'rgba(10,10,30,0.35)';
    ctx.fillRect(0, 0, sw, sh);
  }

  resize(w, h) {
    // Decoy is regenerated from the source image on setImage; just track size
    this._canvas.width = w;
    this._canvas.height = h;
  }

  get canvas() { return this._canvas; }
}
