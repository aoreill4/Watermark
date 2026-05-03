// Bernoulli lemniscate (figure-8 / infinity path)
export class LemniscatePath {
  getPoint(t) {
    const angle = t * 2 * Math.PI;
    const denom = 1 + Math.sin(angle) * Math.sin(angle);
    return {
      x: Math.cos(angle) / denom,
      y: (Math.sin(angle) * Math.cos(angle)) / denom,
    };
  }

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
