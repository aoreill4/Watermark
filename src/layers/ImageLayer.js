export class ImageLayer {
  constructor() {
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._img = null;
    this._position = 'cover';
  }

  setImage(source, position = 'cover') {
    this._position = position;
    return new Promise((resolve, reject) => {
      if (!source) { resolve(); return; }
      if (source instanceof HTMLImageElement) {
        this._img = source;
        resolve();
      } else if (typeof source === 'string') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { this._img = img; resolve(); };
        img.onerror = reject;
        img.src = source;
      } else {
        reject(new Error('Unsupported image source type'));
      }
    });
  }

  resize(w, h) {
    this._canvas.width = w;
    this._canvas.height = h;
    this._redraw();
  }

  _redraw() {
    const { _canvas: c, _ctx: ctx, _img: img, _position: pos } = this;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!img) return;

    const cw = c.width, ch = c.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    let sx = 0, sy = 0, sw = iw, sh = ih;
    let dx = 0, dy = 0, dw = cw, dh = ch;

    if (pos === 'cover') {
      const scale = Math.max(cw / iw, ch / ih);
      dw = iw * scale; dh = ih * scale;
      dx = (cw - dw) / 2; dy = (ch - dh) / 2;
    } else if (pos === 'contain') {
      const scale = Math.min(cw / iw, ch / ih);
      dw = iw * scale; dh = ih * scale;
      dx = (cw - dw) / 2; dy = (ch - dh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  get canvas() { return this._canvas; }
}
