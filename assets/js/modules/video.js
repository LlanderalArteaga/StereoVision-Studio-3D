export class VideoController {
  constructor(video, renderer, ui) { this.video = video; this.renderer = renderer; this.ui = ui; this.raf = 0; }
  load(url) {
    this.dispose();
    const video = document.createElement('video');
    video.src = url; video.preload = 'metadata'; video.playsInline = true; video.setAttribute('playsinline',''); video.muted = false; video.volume = Number(this.ui.volume.value);
    video.addEventListener('loadedmetadata', () => { this.ui.duration.textContent = this.format(video.duration); this.ui.play.disabled = this.ui.back.disabled = this.ui.forward.disabled = this.ui.timeline.disabled = this.ui.volume.disabled = this.ui.mute.disabled = false; this.ui.play.textContent = '▶'; this.renderer.setSource(video, 'video'); }, { once: true });
    video.addEventListener('error', () => this.ui.error('No se pudo reproducir este MP4 en el navegador. Prueba otro archivo H.264 compatible.'));
    video.addEventListener('timeupdate', () => { this.ui.current.textContent = this.format(video.currentTime); this.ui.timeline.value = video.duration ? Math.round(video.currentTime / video.duration * 1000) : 0; });
    video.addEventListener('play', () => { this.ui.play.textContent = 'Ⅱ'; document.querySelector('#vrPlaybackButton').textContent = 'Ⅱ Pausar'; this.renderer.draw(); });
    video.addEventListener('pause', () => { this.ui.play.textContent = '▶'; document.querySelector('#vrPlaybackButton').textContent = '▶ Reproducir'; this.renderer.draw(); });
    video.addEventListener('ended', () => { this.ui.play.textContent = '▶'; document.querySelector('#vrPlaybackButton').textContent = '▶ Reproducir'; });
    this.video = video;
    return new Promise((resolve, reject) => { video.addEventListener('loadedmetadata', resolve, { once: true }); video.addEventListener('error', () => reject(new Error('No se pudo leer la duración del video. Comprueba que sea un MP4 válido.')), { once: true }); video.load(); });
  }
  async toggle() { if (!this.video) return; if (this.video.paused) { try { await this.video.play(); } catch { this.ui.error('El navegador bloqueó la reproducción. Pulsa reproducir de nuevo.'); } } else this.video.pause(); }
  seek(value) { if (this.video?.duration) this.video.currentTime = Number(value) / 1000 * this.video.duration; }
  seekBy(seconds) { if (this.video?.duration) this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + seconds)); }
  setVolume(value) { if (this.video) this.video.volume = Number(value); }
  toggleMute() { if (!this.video) return; this.video.muted = !this.video.muted; this.ui.mute.textContent = this.video.muted ? '×' : '◖'; }
  format(seconds) { if (!Number.isFinite(seconds)) return '00:00'; return `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`; }
  dispose() { if (this.video) { this.video.pause(); this.video.removeAttribute('src'); this.video.load(); this.video = null; } }
}
