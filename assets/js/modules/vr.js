export class VRViewer {
  constructor(canvas, renderer, getState) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.renderer = renderer; this.getState = getState; this.active = false; this.frame = 0; }
  enter() { this.active = true; document.querySelector('#vrView').classList.remove('hidden'); document.querySelector('#appShell').classList.add('hidden'); document.querySelector('#vrPlaybackButton').classList.toggle('hidden', this.getState().mode !== 'video'); this.draw(); }
  exit() { this.active = false; cancelAnimationFrame(this.frame); document.querySelector('#vrView').classList.add('hidden'); document.querySelector('#appShell').classList.remove('hidden'); }
  draw() {
    if (!this.active) return;
    const { source, mode, settings } = this.getState();
    const box = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(box.width * dpr)); this.canvas.height = Math.max(1, Math.round(box.height * dpr));
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
    if (source && mode !== 'anaglyph') {
      const sw = source.videoWidth || source.naturalWidth || source.width, sh = source.videoHeight || source.naturalHeight || source.height, cw = settings.layout === 'mono' ? sw : Math.floor(sw / 2), sep = settings.shift * dpr, v = settings.vertical * dpr, scale = settings.sbsScale / 100;
      [0,1].forEach(eye => {
        const paneW = w / 2, sxEye = settings.layout === 'mono' ? 0 : (eye === 0) !== settings.swap ? 0 : cw;
        const fit = Math.min(paneW / cw, h / sh) * scale, dw = cw * fit, dh = sh * fit;
        ctx.save(); ctx.beginPath(); ctx.rect(eye * paneW,0,paneW,h); ctx.clip(); ctx.filter = 'none';
        ctx.drawImage(source,sxEye,0,cw,sh,eye*paneW+(paneW-dw)/2+(eye===0?-sep/2:sep/2), (h-dh)/2+(eye===0?-v/2:v/2),dw,dh); ctx.restore();
      });
      ctx.strokeStyle='#ffffff18';ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();
    } else if(source) {
      const sw=source.naturalWidth||source.videoWidth,sh=source.naturalHeight||source.videoHeight,fit=Math.min((w/2)/sw,h/sh)*(settings.scale/100),dw=sw*fit,dh=sh*fit;
      ctx.filter=`brightness(${settings.brightness/100}) contrast(${settings.contrast/100})`;
      [0,1].forEach(eye=>ctx.drawImage(source,eye*w/2+(w/2-dw)/2,(h-dh)/2,dw,dh));
      ctx.filter='none'; ctx.strokeStyle='#ffffff18';ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();
    }
    if(source?.tagName==='VIDEO'&&!source.paused&&!source.ended)this.frame=requestAnimationFrame(()=>this.draw());
  }
}
