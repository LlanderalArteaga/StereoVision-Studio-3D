import { StereoRenderer } from './modules/renderer.js';
import { validateFile, loadImage, combineAnaglyph } from './modules/files.js';
import { readCalibration, resetCalibration, updateReadouts } from './modules/calibration.js';
import { VideoController } from './modules/video.js';
import { VRViewer } from './modules/vr.js';

const $ = selector => document.querySelector(selector);
const ui = {
  canvas: $('#stereoCanvas'), stage: $('#stage'), file: $('#fileInput'), status: $('#statusChip'), empty: $('#emptyState'), loading: $('#loadingState'), toast: $('#toast'),
  name: $('#libraryName'), meta: $('#libraryMeta'), thumb: $('#libraryThumb'), activeName: $('#activeFileName'), activeType: $('#activeFileType'), count: $('#libraryCount'), remove: $('#removeButton'),
  videoControls: $('#videoControls'), play: $('#playButton'), back: $('#backButton'), forward: $('#forwardButton'), timeline: $('#timeline'), volume: $('#volumeSlider'), mute: $('#muteButton'), current: $('#currentTime'), duration: $('#duration'),
  reset: $('#resetButton'), vr: $('#vrButton'),
};
let mode = 'anaglyph', layout = 'joined', source = null, objectUrls = [], toastTimer = 0;
const renderer = new StereoRenderer(ui.canvas, message => showError(message));
const video = new VideoController(null, renderer, { ...ui, error: showError });
const vr = new VRViewer($('#vrCanvas'), renderer, () => ({ source, mode, settings: { ...readCalibration(), layout } }));

const moduleCopy = {
  anaglyph: { title: 'Visor anaglifo', breadcrumb: 'ANAGLIFO', description: 'Visualiza imágenes anaglifo con lentes rojo-cian.', info: 'El anaglifo combina los canales rojo y cian de una imagen estereoscópica. Usa lentes rojo-cian para percibir profundidad.', accept: 'image/jpeg,image/png,image/webp', formats: 'JPG, PNG o WebP · máximo 250 MB' },
  sbs: { title: 'Visor de imagen SBS', breadcrumb: 'IMAGEN SBS', description: 'Calibra las perspectivas izquierda y derecha de una imagen.', info: 'En una imagen SBS, la mitad izquierda corresponde al ojo izquierdo y la derecha al ojo derecho. La escala y alineación no modifican el original.', accept: 'image/jpeg,image/png,image/webp', formats: 'JPG, PNG o WebP · imagen SBS' },
  video: { title: 'Visor de video SBS', breadcrumb: 'VIDEO SBS', description: 'Reproduce y ajusta video estereoscópico en tiempo real.', info: 'El video se reproduce desde una sola fuente para conservar el mismo tiempo, pausa y volumen en ambas perspectivas.', accept: 'video/mp4,.mp4', formats: 'MP4 · compatibilidad según navegador' },
};
const inputChoices = {
  anaglyph: { title: 'Tipo de imagen', choices: [['joined', 'Anaglifo preparado'], ['pair', 'Dos fotos: izquierda + derecha']] },
  sbs: { title: 'Tipo de imagen', choices: [['stereo', 'Imagen SBS'], ['mono', 'Una foto 2D duplicada']] },
  video: { title: 'Tipo de video', choices: [['stereo', 'Video SBS'], ['mono', 'Video 2D duplicado']] },
};

function showError(message) {
  ui.toast.textContent = message; ui.toast.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.add('hidden'), 6000);
}
function setStatus(ready) { ui.status.classList.toggle('ready', ready); ui.status.innerHTML = `<i></i> ${ready ? 'LISTO' : 'SIN CONTENIDO'}`; }
function syncControls() {
  const ready = Boolean(source);
  ui.empty.classList.toggle('hidden', ready);
  ui.stage.classList.toggle('has-content', ready);
  ui.reset.disabled = !ready; ui.remove.disabled = !ready; ui.vr.disabled = !ready || mode === 'anaglyph';
  document.querySelectorAll('.control-panel input').forEach(input => input.disabled = !ready);
  ui.videoControls.classList.toggle('hidden', mode !== 'video');
  $('#anaglyphPanel').classList.toggle('hidden', mode !== 'anaglyph');
  $('#sbsPanel').classList.toggle('hidden', mode === 'anaglyph');
  setStatus(ready);
}
function updateCalibration() {
  const values = { ...readCalibration(), layout }; renderer.setSettings(values); updateReadouts();
  if (vr.active) vr.draw();
}
function changeMode(nextMode) {
  if (mode === nextMode) return;
  clearContent(false);
  mode = nextMode;
  document.querySelectorAll('.module-tab').forEach(tab => { const selected = tab.dataset.mode === mode; tab.classList.toggle('active', selected); tab.setAttribute('aria-selected', String(selected)); });
  const copy = moduleCopy[mode];
  $('#modeTitle').textContent = copy.title; $('#modeBreadcrumb').textContent = copy.breadcrumb; $('#modeDescription').textContent = copy.description; $('#infoText').textContent = copy.info;
  $('#formatHint').textContent = copy.formats; ui.file.accept = copy.accept;
  updateInputChoices(); ui.file.disabled = false;
  syncControls(); updateCalibration();
}
function updateInputChoices() {
  const config = inputChoices[mode];
  $('#inputMethodTitle').textContent = config.title;
  $('#inputMethodOptions').innerHTML = config.choices.map(([value, label], index) => `<label class="input-choice"><input type="radio" name="inputLayout" value="${value}" ${index === 0 ? 'checked' : ''}><span>${label}</span></label>`).join('');
  layout = config.choices[0][0];
  ui.file.multiple = mode === 'anaglyph' && layout === 'pair';
  $('#importButtonText').textContent = mode === 'anaglyph' && layout === 'pair' ? 'Importar las dos fotos' : 'Importar archivo';
  $('#infoText').textContent = mode === 'sbs' && layout === 'mono'
    ? 'La foto 2D se duplicará para llenar ambas vistas. Esto genera formato SBS, pero no crea profundidad estereoscópica.'
    : mode === 'video' && layout === 'mono'
      ? 'El video 2D se mostrará en ambas vistas sincronizadas. Duplicarlo no crea profundidad estereoscópica.'
      : mode === 'anaglyph' && layout === 'pair'
        ? 'Selecciona primero la foto del ojo izquierdo y después la del derecho. Se combinarán en un anaglifo rojo-cian.'
        : moduleCopy[mode].info;
}
function clearContent(reset = true) {
  video.dispose();
  objectUrls.forEach(url => URL.revokeObjectURL(url));
  objectUrls = []; source = null;
  renderer.clear();
  if (reset) { resetCalibration(); updateReadouts(); }
  ui.name.textContent = 'Sin archivo'; ui.meta.textContent = 'Importa un contenido para empezar'; ui.thumb.innerHTML = '<span class="thumb-glyph">＋</span>';
  ui.activeName.textContent = 'Esperando archivo'; ui.activeType.textContent = '—'; ui.count.textContent = '0';
  ui.play.disabled = ui.back.disabled = ui.forward.disabled = ui.timeline.disabled = ui.volume.disabled = ui.mute.disabled = true; ui.play.textContent = '▶'; ui.current.textContent = '00:00'; ui.duration.textContent = '00:00'; ui.timeline.value = 0;
  syncControls();
}
async function importFile(file) {
  const files = Array.from(ui.file.files || (file ? [file] : []));
  try {
    if (mode === 'anaglyph' && layout === 'pair' && files.length !== 2) throw new Error('Selecciona exactamente dos fotos: primero la perspectiva izquierda y después la derecha.');
    if (!(mode === 'anaglyph' && layout === 'pair') && files.length !== 1) throw new Error('Selecciona un solo archivo para este tipo de contenido.');
    files.forEach(item => validateFile(item, mode));
  }
  catch (error) { showError(error.message); ui.file.value = ''; return; }
  try {
    clearContent(true); objectUrls = files.map(item => URL.createObjectURL(item));
    ui.loading.classList.remove('hidden'); ui.empty.classList.add('hidden');
    if (mode === 'video') {
      await video.load(objectUrls[0]); source = video.video;
    } else if (mode === 'anaglyph' && layout === 'pair') {
      source = await combineAnaglyph(objectUrls[0], objectUrls[1]);
      objectUrls.forEach(url => URL.revokeObjectURL(url)); objectUrls = [];
    }
    else source = await loadImage(objectUrls[0]);
    renderer.setSource(source, mode); updateCalibration();
    const fileName = files.map(item => item.name).join(' + ');
    const totalSize = files.reduce((sum, item) => sum + item.size, 0);
    const sizeLabel = `${(totalSize / 1024 / 1024).toFixed(totalSize > 1024 * 1024 ? 1 : 2)} MB`;
    const kindLabel = mode === 'video' ? (layout === 'mono' ? 'MP4 · 2D duplicado' : 'MP4 SBS') : mode === 'sbs' ? (layout === 'mono' ? 'Imagen 2D duplicada' : 'Imagen SBS') : layout === 'pair' ? 'Anaglifo generado' : 'Anaglifo';
    ui.name.textContent = fileName; ui.meta.textContent = `${sizeLabel} · ${kindLabel}`;
    ui.activeName.textContent = fileName; ui.activeType.textContent = kindLabel.toUpperCase(); ui.count.textContent = '1';
    const thumbSource = mode === 'video' ? '' : layout === 'pair' ? source.toDataURL('image/png') : objectUrls[0];
    ui.thumb.innerHTML = mode === 'video' ? '<span class="thumb-glyph">▷</span>' : `<img src="${thumbSource}" alt="Miniatura">`;
    syncControls();
  } catch (error) {
    video.dispose();
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = []; source = null; renderer.clear();
    syncControls(); showError(error.message || 'No se pudo abrir el archivo.');
  } finally { ui.loading.classList.add('hidden'); ui.file.value = ''; }
}

document.querySelectorAll('.module-tab').forEach(tab => tab.addEventListener('click', () => changeMode(tab.dataset.mode)));
ui.file.addEventListener('change', event => importFile(event.target.files?.[0]));
$('#inputMethodOptions').addEventListener('change', event => {
  if (event.target.name !== 'inputLayout') return;
  clearContent(true); layout = event.target.value;
  ui.file.multiple = mode === 'anaglyph' && layout === 'pair';
  $('#importButtonText').textContent = mode === 'anaglyph' && layout === 'pair' ? 'Importar las dos fotos' : 'Importar archivo';
  $('#infoText').textContent = mode === 'sbs' && layout === 'mono'
    ? 'La foto 2D se duplicará para llenar ambas vistas. Esto genera formato SBS, pero no crea profundidad estereoscópica.'
    : mode === 'video' && layout === 'mono'
      ? 'El video 2D se mostrará en ambas vistas sincronizadas. Duplicarlo no crea profundidad estereoscópica.'
      : mode === 'anaglyph' && layout === 'pair'
        ? 'Selecciona primero la foto del ojo izquierdo y después la del derecho. Se combinarán en un anaglifo rojo-cian.'
        : moduleCopy[mode].info;
});
$('#openFileButton').addEventListener('click', () => ui.file.click());
ui.remove.addEventListener('click', () => clearContent(true));
ui.reset.addEventListener('click', () => { resetCalibration(); updateCalibration(); });
document.querySelectorAll('.control-panel input').forEach(input => input.addEventListener('input', updateCalibration));
$('#fitButton').addEventListener('click', () => { resetCalibration(); updateCalibration(); });
$('#fullscreenButton').addEventListener('click', async () => { try { if (!document.fullscreenElement) await $('#viewerCard').requestFullscreen(); else await document.exitFullscreen(); } catch { showError('La pantalla completa no está disponible en este navegador.'); } });
ui.play.addEventListener('click', () => video.toggle());
ui.timeline.addEventListener('input', () => video.seek(ui.timeline.value));
ui.back.addEventListener('click', () => video.seekBy(-10));
ui.forward.addEventListener('click', () => video.seekBy(10));
ui.volume.addEventListener('input', () => video.setVolume(ui.volume.value));
ui.mute.addEventListener('click', () => video.toggleMute());
ui.vr.addEventListener('click', () => { vr.enter(); });
$('#vrPlaybackButton').addEventListener('click', () => video.toggle());
$('#exitVrButton').addEventListener('click', () => vr.exit());
$('#creditsLink').addEventListener('click', event => { event.preventDefault(); $('#creditsDialog').showModal(); });
document.addEventListener('keydown', event => { if (event.key.toLowerCase() === 'v' && !event.repeat && source && mode !== 'anaglyph' && !vr.active && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) vr.enter(); if (event.key === 'Escape' && vr.active) vr.exit(); });
window.addEventListener('resize', () => { renderer.draw(); if (vr.active) vr.draw(); });

ui.file.disabled = false; ui.file.accept = moduleCopy[mode].accept; updateInputChoices();
updateReadouts(); syncControls();
