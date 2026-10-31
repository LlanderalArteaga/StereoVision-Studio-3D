export class StereoRenderer {
  constructor(canvas, onError = () => {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.source = null;
    this.mode = 'anaglyph';
    this.settings = {};
    this.onError = onError;
    this.raf = 0;
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(canvas.parentElement);
  }
  setSource(source, mode) { this.source = source; this.mode = mode; this.draw(); }
  setMode(mode) { this.mode = mode; this.draw(); }
  setSettings(settings) { this.settings = { ...settings }; this.draw(); }
  draw() {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.paint());
  }
  paint() {
    const { canvas, ctx, source } = this;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(box.width * dpr));
    const height = Math.max(1, Math.round(box.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#141720'; ctx.fillRect(0, 0, width, height);
    if (!source || !(source.videoWidth || source.naturalWidth || source.width)) return;
    const sw = source.videoWidth || source.naturalWidth || source.width, sh = source.videoHeight || source.naturalHeight || source.height;
    const s = this.settings;
    ctx.filter = `brightness(${(s.brightness ?? 100) / 100}) contrast(${(s.contrast ?? 100) / 100})`;
    try {
      if (this.mode === 'anaglyph') this.drawImage(ctx, source, 0, 0, sw, sh, 0, 0, width, height, (s.scale ?? 100) / 100, 0, 0, width, height);
      else {
        const swapped = Boolean(s.swap), sep = (s.shift ?? 0) * dpr, vertical = (s.vertical ?? 0) * dpr, scale = (s.sbsScale ?? 100) / 100;
        const mono = s.layout === 'mono', cropW = mono ? sw : Math.floor(sw / 2);
        const left = mono ? 0 : swapped ? cropW : 0, right = mono ? 0 : swapped ? 0 : cropW;
        this.drawImage(ctx, source, left, 0, cropW, sh, 0, 0, width / 2, height, scale, -sep / 2, -vertical / 2, width / 2, height);
        this.drawImage(ctx, source, right, 0, cropW, sh, width / 2, 0, width / 2, height, scale, sep / 2, vertical / 2, width / 2, height);
        ctx.filter = 'none'; ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = dpr; ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); ctx.stroke();
      }
    } catch (error) { this.onError('No se pudo dibujar este contenido. Prueba con otro archivo.'); }
    ctx.filter = 'none';
    if (this.mode === 'video' && !source.paused && !source.ended) this.raf = requestAnimationFrame(() => this.paint());
  }
  drawImage(ctx, source, sx, sy, sw, sh, x, y, w, h, scale = 1, dx = 0, dy = 0, clipW = w, clipH = h) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, clipW, clipH); ctx.clip();
    const fit = Math.min(w / sw, h / sh) * scale;
    const dw = sw * fit, dh = sh * fit;
    ctx.drawImage(source, sx, sy, sw, sh, x + (w - dw) / 2 + dx, y + (h - dh) / 2 + dy, dw, dh);
    ctx.restore();
  }
  clear() { this.source = null; this.draw(); }
  destroy() { cancelAnimationFrame(this.raf); this.resizeObserver.disconnect(); }
}
