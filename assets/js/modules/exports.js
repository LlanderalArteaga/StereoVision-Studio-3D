export function downloadUrl(url, filename) {
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.hidden = true;
  document.body.append(link); link.click(); link.remove();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function canvasBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('El navegador no pudo crear la descarga de imagen.')), type));
}

export function makeSbsImage(source) {
  const sourceWidth = source.naturalWidth || source.videoWidth || source.width;
  const sourceHeight = source.naturalHeight || source.videoHeight || source.height;
  if (!sourceWidth || !sourceHeight) throw new Error('La imagen aún no está lista para descargar.');
  const factor = Math.min(1, 4096 / sourceWidth, 8192 / sourceHeight);
  const eyeWidth = Math.max(1, Math.round(sourceWidth * factor));
  const height = Math.max(1, Math.round(sourceHeight * factor));
  const canvas = document.createElement('canvas');
  canvas.width = eyeWidth * 2; canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#000'; context.fillRect(0, 0, canvas.width, height);
  context.drawImage(source, 0, 0, eyeWidth, height);
  context.drawImage(source, eyeWidth, 0, eyeWidth, height);
  return canvas;
}

export async function recordMonoVideoAsSbs(video, { onProgress = () => {}, onPhase = () => {} } = {}) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('Este navegador no permite exportar video SBS. Prueba la descarga en Chrome o Firefox actualizado.');
  }
  const sourceWidth = video.videoWidth, sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight || !Number.isFinite(video.duration)) throw new Error('El video todavía no está listo para exportarse.');

  const scale = Math.min(1, 1920 / sourceWidth, 1080 / sourceHeight);
  const eyeWidth = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = eyeWidth * 2; canvas.height = height;
  const context = canvas.getContext('2d');
  const paint = () => {
    context.fillStyle = '#000'; context.fillRect(0, 0, canvas.width, height);
    context.drawImage(video, 0, 0, eyeWidth, height);
    context.drawImage(video, eyeWidth, 0, eyeWidth, height);
  };
  paint();

  const canvasStream = canvas.captureStream(30);
  let sourceStream = null;
  try { sourceStream = video.captureStream?.() || video.mozCaptureStream?.() || null; } catch { sourceStream = null; }
  const tracks = [...canvasStream.getVideoTracks(), ...(sourceStream?.getAudioTracks() || [])];
  const outputStream = new MediaStream(tracks);
  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) { tracks.forEach(track => track.stop()); throw new Error('Este navegador no tiene un codificador WebM compatible para exportar el video.'); }

  const previousTime = video.currentTime;
  const wasPlaying = !video.paused;
  const chunks = [];
  let frame = 0;
  let recorder;
  let stopOnEnded;
  onPhase('Preparando video…'); onProgress(0);
  try {
    video.pause();
    if (video.currentTime !== 0) video.currentTime = 0;
    paint();
    recorder = new MediaRecorder(outputStream, { mimeType });
    const result = new Promise((resolve, reject) => {
      recorder.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
      recorder.addEventListener('error', () => reject(new Error('El navegador interrumpió la exportación del video.')));
      recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType })));
    });
    const drawFrame = () => {
      paint(); onProgress(video.duration ? Math.min(100, video.currentTime / video.duration * 100) : 0);
      if (recorder.state === 'recording') frame = requestAnimationFrame(drawFrame);
    };
    stopOnEnded = () => { if (recorder.state === 'recording') recorder.stop(); };
    video.addEventListener('ended', stopOnEnded, { once: true });
    recorder.start(1000);
    const playback = video.play();
    await playback;
    onPhase('Generando video SBS…');
    frame = requestAnimationFrame(drawFrame);
    const blob = await result;
    if (!blob.size) throw new Error('La exportación quedó vacía. Inténtalo de nuevo.');
    onProgress(100);
    return { blob, hasAudio: tracks.length > canvasStream.getVideoTracks().length };
  } catch (error) {
    if (recorder?.state === 'recording') recorder.stop();
    throw error;
  } finally {
    cancelAnimationFrame(frame);
    if (stopOnEnded) video.removeEventListener('ended', stopOnEnded);
    if (recorder?.state === 'recording') recorder.stop();
    canvasStream.getTracks().forEach(track => track.stop());
    sourceStream?.getTracks().forEach(track => track.stop());
    video.pause();
    try {
      if (Number.isFinite(previousTime) && previousTime < video.duration) video.currentTime = previousTime;
      if (wasPlaying) await video.play();
    } catch { /* El video puede seguir abierto aunque el navegador no permita reanudarlo. */ }
  }
}
