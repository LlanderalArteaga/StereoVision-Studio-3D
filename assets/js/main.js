import { StereoRenderer } from './modules/renderer.js';
import { validateFile, loadImage, combineAnaglyph } from './modules/files.js';
import { readCalibration, resetCalibration, updateReadouts, getCalibrationPresets, saveCalibrationPreset, applyCalibration } from './modules/calibration.js';
import { VideoController } from './modules/video.js';
import { VRViewer } from './modules/vr.js';
import { canvasBlob, downloadUrl, downloadBlob, makeSbsImage, recordMonoVideoAsSbs } from './modules/exports.js';

const $ = selector => document.querySelector(selector);
const ui = {
  canvas: $('#stereoCanvas'), stage: $('#stage'), file: $('#fileInput'), status: $('#statusChip'), empty: $('#emptyState'), loading: $('#loadingState'), toast: $('#toast'),
  name: $('#libraryName'), meta: $('#libraryMeta'), thumb: $('#libraryThumb'), activeName: $('#activeFileName'), activeType: $('#activeFileType'), count: $('#libraryCount'), remove: $('#removeButton'),
  videoControls: $('#videoControls'), play: $('#playButton'), back: $('#backButton'), forward: $('#forwardButton'), timeline: $('#timeline'), volume: $('#volumeSlider'), mute: $('#muteButton'), current: $('#currentTime'), duration: $('#duration'),
  reset: $('#resetButton'), vr: $('#vrButton'),
  downloadImage: $('#downloadImageButton'), videoExportTools: $('#videoExportTools'), downloadVideo: $('#downloadVideoButton'), videoExportMessage: $('#videoExportMessage'),
  savePreset: $('#savePresetButton'), presetName: $('#presetName'), presetSelect: $('#presetSelect'), applyPreset: $('#applyPresetButton'),
};
let mode = 'anaglyph', layout = 'joined', source = null, objectUrls = [], pairFiles = { left: null, right: null }, toastTimer = 0;
let exportBusy = false;
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
const sampleCatalog = [
  { id: 'anaglyph-joined', mode: 'anaglyph', layout: 'joined', title: 'Foto_palma.jpeg', detail: 'Anaglifo preparado', files: ['assets/samples/Foto_palma.jpeg'] },
  { id: 'anaglyph-pair', mode: 'anaglyph', layout: 'pair', title: 'Palmera_IZQ + DER', detail: 'Dos perspectivas · anaglifo', files: ['assets/samples/Palmera_IZQ.jpeg', 'assets/samples/Palmera_DER.jpeg'] },
  { id: 'sbs-joined', mode: 'sbs', layout: 'stereo', title: 'Arco.jpg', detail: 'Imagen SBS', files: ['assets/samples/Arco.jpg'] },
  { id: 'sbs-mono', mode: 'sbs', layout: 'mono', title: 'Palmera_IZQ.jpeg', detail: 'Foto 2D · duplicada a SBS', files: ['assets/samples/Palmera_IZQ.jpeg'] },
];

function showError(message) {
  ui.toast.classList.remove('success'); ui.toast.textContent = message; ui.toast.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.add('hidden'), 6000);
}
function showSuccess(message) {
  ui.toast.classList.add('success'); ui.toast.textContent = message; ui.toast.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.add('hidden'), 4000);
}
function setStatus(ready) { ui.status.classList.toggle('ready', ready); ui.status.innerHTML = `<i></i> ${ready ? 'LISTO' : 'SIN CONTENIDO'}`; }
function syncControls() {
  const ready = Boolean(source);
  ui.empty.classList.toggle('hidden', ready);
  ui.stage.classList.toggle('has-content', ready);
  ui.reset.disabled = !ready; ui.remove.disabled = !ready; ui.vr.disabled = !ready || mode === 'anaglyph';
  ui.vr.classList.toggle('hidden', mode === 'anaglyph');
  ui.savePreset.disabled = !ready; ui.applyPreset.disabled = !ready || !ui.presetSelect.value;
  ui.downloadImage.disabled = !ready || mode === 'video';
  ui.videoExportTools.classList.toggle('hidden', mode !== 'video');
  ui.downloadVideo.disabled = !ready || exportBusy;
  $('#downloadImageButton').title = mode === 'anaglyph' ? 'Descargar imagen anaglifo' : 'Descargar imagen SBS';
  $('#fullscreenButton').title = mode === 'anaglyph' ? 'Ver anaglifo en pantalla completa' : 'Pantalla completa';
  $('#fullscreenButton').setAttribute('aria-label', $('#fullscreenButton').title);
  $('#fullscreenButtonLabel').textContent = mode === 'anaglyph' ? 'Ver grande' : 'Expandir';
  $('.shortcut').classList.toggle('hidden', mode === 'anaglyph');
  updateVideoExportInfo();
  document.querySelectorAll('.control-panel input').forEach(input => input.disabled = !ready);
  ui.videoControls.classList.toggle('hidden', mode !== 'video');
  $('#anaglyphPanel').classList.toggle('hidden', mode !== 'anaglyph');
  $('#sbsPanel').classList.toggle('hidden', mode === 'anaglyph');
  setStatus(ready);
  refreshSampleCollection();
}
function refreshSampleCollection() {
  const labels = { anaglyph: 'ANAGLIFO', sbs: 'IMAGEN SBS', video: 'VIDEO SBS' };
  $('#sampleModeLabel').textContent = labels[mode];
  const list = $('#sampleList');
  if (mode === 'video') {
    list.innerHTML = '<div class="sample-empty">Aún no hay un video de ejemplo. Cuando tengas uno, colócalo en <code>assets/samples/</code> y podrá añadirse a esta colección.</div>';
    return;
  }
  const available = sampleCatalog.filter(item => item.mode === mode && item.layout === layout);
  list.innerHTML = available.map(item => `<button class="sample-card" type="button" data-sample="${item.id}" aria-label="Cargar muestra ${item.title}"><img class="sample-thumb" src="${item.files[0]}" alt="Vista previa de ${item.title}" loading="lazy"><span class="sample-card-copy"><b>${item.title}</b><small>${item.detail}</small></span></button>`).join('');
}
async function loadSample(id) {
  const sample = sampleCatalog.find(item => item.id === id);
  if (!sample) return;
  if (mode !== sample.mode) changeMode(sample.mode);
  const layoutOption = document.querySelector(`#inputMethodOptions input[value="${sample.layout}"]`);
  if (layoutOption && !layoutOption.checked) {
    layoutOption.checked = true;
    layoutOption.dispatchEvent(new Event('change', { bubbles: true }));
  }
  try {
    const files = await Promise.all(sample.files.map(async path => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`No se encontró ${path}. Copia la imagen correspondiente en la carpeta assets/samples/ del proyecto.`);
      const blob = await response.blob();
      const filename = path.split('/').pop();
      return new File([blob], filename, { type: blob.type || (filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg') });
    }));
    if (sample.layout === 'pair') {
      pairFiles = { left: files[0], right: files[1] };
      $('#leftFileName').textContent = files[0].name;
      $('#rightFileName').textContent = files[1].name;
      $('#generatePairButton').disabled = false;
    }
    await importFile(files);
  } catch (error) { showError(error.message || 'No se pudo cargar la imagen de ejemplo.'); }
}
function updateVideoExportInfo() {
  if (mode !== 'video') return;
  const label = $('#downloadVideoButton span');
  if (layout === 'mono') {
    label.textContent = exportBusy ? 'Generando SBS…' : 'Crear y descargar SBS';
    ui.videoExportMessage.textContent = exportBusy ? 'El video se procesa en tiempo real. No cierres esta pestaña.' : 'Se creará un WebM SBS; el audio se incluirá si el navegador lo permite.';
  } else {
    label.textContent = 'Descargar video SBS';
    ui.videoExportMessage.textContent = 'Descarga una copia del archivo SBS original.';
  }
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
  syncControls(); updateCalibration(); refreshPresets();
}
function updateInputChoices() {
  const config = inputChoices[mode];
  $('#inputMethodTitle').textContent = config.title;
  $('#inputMethodOptions').innerHTML = config.choices.map(([value, label], index) => `<label class="input-choice"><input type="radio" name="inputLayout" value="${value}" ${index === 0 ? 'checked' : ''}><span>${label}</span></label>`).join('');
  layout = config.choices[0][0];
  const pairMode = mode === 'anaglyph' && layout === 'pair';
  ui.file.multiple = false;
  $('#pairUpload').classList.toggle('hidden', !pairMode);
  $('.import-button').classList.toggle('hidden', pairMode);
  $('#openFileButton').classList.toggle('hidden', pairMode);
  $('#importButtonText').textContent = 'Importar archivo';
  pairFiles = { left: null, right: null };
  $('#leftFileInput').value = $('#rightFileInput').value = '';
  $('#leftFileName').textContent = $('#rightFileName').textContent = 'Sin seleccionar';
  $('#generatePairButton').disabled = true;
  updateCenterImportButton();
  $('#infoText').textContent = mode === 'sbs' && layout === 'mono'
    ? 'La foto 2D se duplicará para llenar ambas vistas. Esto genera formato SBS, pero no crea profundidad estereoscópica.'
    : mode === 'video' && layout === 'mono'
      ? 'El video 2D se mostrará en ambas vistas sincronizadas. Duplicarlo no crea profundidad estereoscópica.'
      : mode === 'anaglyph' && layout === 'pair'
        ? 'Selecciona primero la foto del ojo izquierdo y después la del derecho. Se combinarán en un anaglifo rojo-cian.'
        : moduleCopy[mode].info;
}
function updateCenterImportButton() {
  const pairMode = mode === 'anaglyph' && layout === 'pair';
  const text = !pairMode ? 'Seleccionar archivo'
    : !pairFiles.left ? 'Seleccionar foto izquierda'
      : !pairFiles.right ? 'Seleccionar foto derecha'
        : 'Combinar anaglifo';
  $('#centerImportText').textContent = text;
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
  syncControls(); refreshPresets();
}
function outputName(suffix, extension) {
  const base = (ui.activeName.textContent || 'stereovision').replace(/\.[^.]+$/, '').replace(/[<>:"\\|?*]+/g, '_').replace(/\//g, '_').replace(/\s+/g, '_').slice(0, 90) || 'stereovision';
  return `${base}_${suffix}.${extension}`;
}
async function downloadImageResult() {
  try {
    if (mode === 'anaglyph' && layout === 'pair') {
      const blob = await canvasBlob(source);
      downloadBlob(blob, outputName('anaglifo', 'png'));
    } else if (mode === 'sbs' && layout === 'mono') {
      const blob = await canvasBlob(makeSbsImage(source));
      downloadBlob(blob, outputName('SBS', 'png'));
    } else if (objectUrls[0]) downloadUrl(objectUrls[0], ui.activeName.textContent);
    else throw new Error('No hay una imagen lista para descargar.');
    showSuccess('Descarga de imagen iniciada.');
  } catch (error) { showError(error.message || 'No se pudo descargar la imagen.'); }
}
function setExportBusy(busy) {
  exportBusy = busy;
  document.querySelectorAll('.module-tab, #inputMethodOptions input, #fileInput, #leftFileInput, #rightFileInput, #removeButton, #playButton, #backButton, #forwardButton, #timeline, #muteButton, #volumeSlider').forEach(control => { control.disabled = busy || (control.id === 'removeButton' && !source); });
  ui.downloadVideo.disabled = busy || !source;
  updateVideoExportInfo();
}
async function downloadVideoResult() {
  if (!source || !objectUrls[0]) return;
  if (layout !== 'mono') {
    downloadUrl(objectUrls[0], ui.activeName.textContent);
    showSuccess('Descarga del video SBS original iniciada.');
    return;
  }
  setExportBusy(true);
  try {
    const result = await recordMonoVideoAsSbs(video.video, {
      onProgress: percent => { ui.videoExportMessage.textContent = `Generando SBS… ${Math.round(percent)}%`; },
      onPhase: message => { ui.videoExportMessage.textContent = message; },
    });
    downloadBlob(result.blob, outputName('SBS', 'webm'));
    showSuccess(result.hasAudio ? 'Video SBS WebM descargado con audio.' : 'Video SBS WebM descargado. El navegador no entregó una pista de audio para incluir.');
  } catch (error) { showError(error.message || 'No se pudo exportar el video SBS.'); }
  finally { setExportBusy(false); }
}
function refreshPresets() {
  const selected = ui.presetSelect.value;
  const profiles = getCalibrationPresets().filter(item => item.mode === mode && item.layout === layout);
  ui.presetSelect.replaceChildren(new Option('Mis ajustes guardados', ''));
  profiles.forEach(item => ui.presetSelect.add(new Option(item.name, item.id)));
  if (profiles.some(item => item.id === selected)) ui.presetSelect.value = selected;
  ui.applyPreset.disabled = !source || !ui.presetSelect.value;
}
async function importFile(selection = null) {
  const files = selection ? Array.from(selection) : Array.from(ui.file.files || []);
  try {
    if (mode === 'anaglyph' && layout === 'pair' && (!pairFiles.left || !pairFiles.right)) throw new Error('Selecciona cada perspectiva en su campo: foto izquierda y foto derecha.');
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
    else source = await loadImage(objectUrls[0], files[0].name);
    renderer.setSource(source, mode); updateCalibration();
    const fileName = mode === 'anaglyph' && layout === 'pair' ? `${files[0].name} (izquierda) + ${files[1].name} (derecha)` : files[0].name;
    const totalSize = files.reduce((sum, item) => sum + item.size, 0);
    const sizeLabel = `${(totalSize / 1024 / 1024).toFixed(totalSize > 1024 * 1024 ? 1 : 2)} MB`;
    const kindLabel = mode === 'video' ? (layout === 'mono' ? 'MP4 · 2D duplicado' : 'MP4 SBS') : mode === 'sbs' ? (layout === 'mono' ? 'Imagen 2D duplicada' : 'Imagen SBS') : layout === 'pair' ? 'Anaglifo generado' : 'Anaglifo';
    ui.name.textContent = fileName; ui.meta.textContent = `${sizeLabel} · ${kindLabel}`;
    ui.activeName.textContent = fileName; ui.activeType.textContent = kindLabel.toUpperCase(); ui.count.textContent = '1';
    const thumbSource = mode === 'video' ? '' : layout === 'pair' ? source.toDataURL('image/png') : objectUrls[0];
    ui.thumb.innerHTML = mode === 'video' ? '<span class="thumb-glyph">▷</span>' : `<img src="${thumbSource}" alt="Miniatura">`;
    syncControls(); refreshPresets();
  } catch (error) {
    video.dispose();
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = []; source = null; renderer.clear();
    syncControls(); refreshPresets(); showError(error.message || 'No se pudo abrir el archivo.');
  } finally { ui.loading.classList.add('hidden'); ui.file.value = ''; }
}

document.querySelectorAll('.module-tab').forEach(tab => tab.addEventListener('click', () => changeMode(tab.dataset.mode)));
$('#sampleList').addEventListener('click', event => {
  const button = event.target.closest('[data-sample]');
  if (button) loadSample(button.dataset.sample);
});
ui.file.addEventListener('change', () => importFile(Array.from(ui.file.files || [])));
$('#inputMethodOptions').addEventListener('change', event => {
  if (event.target.name !== 'inputLayout') return;
  clearContent(true); layout = event.target.value;
  const pairMode = mode === 'anaglyph' && layout === 'pair';
  ui.file.multiple = false;
  $('#pairUpload').classList.toggle('hidden', !pairMode);
  $('.import-button').classList.toggle('hidden', pairMode);
  $('#openFileButton').classList.toggle('hidden', pairMode);
  pairFiles = { left: null, right: null };
  $('#leftFileInput').value = $('#rightFileInput').value = '';
  $('#leftFileName').textContent = $('#rightFileName').textContent = 'Sin seleccionar';
  $('#generatePairButton').disabled = true;
  updateCenterImportButton();
  $('#infoText').textContent = mode === 'sbs' && layout === 'mono'
    ? 'La foto 2D se duplicará para llenar ambas vistas. Esto genera formato SBS, pero no crea profundidad estereoscópica.'
    : mode === 'video' && layout === 'mono'
      ? 'El video 2D se mostrará en ambas vistas sincronizadas. Duplicarlo no crea profundidad estereoscópica.'
      : mode === 'anaglyph' && layout === 'pair'
        ? 'Selecciona primero la foto del ojo izquierdo y después la del derecho. Se combinarán en un anaglifo rojo-cian.'
        : moduleCopy[mode].info;
  syncControls();
  refreshPresets();
});
$('#leftFileInput').addEventListener('change', event => { pairFiles.left = event.target.files?.[0] || null; $('#leftFileName').textContent = pairFiles.left?.name || 'Sin seleccionar'; $('#generatePairButton').disabled = !pairFiles.left || !pairFiles.right; updateCenterImportButton(); });
$('#rightFileInput').addEventListener('change', event => { pairFiles.right = event.target.files?.[0] || null; $('#rightFileName').textContent = pairFiles.right?.name || 'Sin seleccionar'; $('#generatePairButton').disabled = !pairFiles.left || !pairFiles.right; updateCenterImportButton(); });
$('#generatePairButton').addEventListener('click', () => importFile([pairFiles.left, pairFiles.right]));
$('#centerImportButton').addEventListener('click', () => {
  if (mode !== 'anaglyph' || layout !== 'pair') { ui.file.click(); return; }
  if (!pairFiles.left) $('#leftFileInput').click();
  else if (!pairFiles.right) $('#rightFileInput').click();
  else importFile([pairFiles.left, pairFiles.right]);
});
$('#openFileButton').addEventListener('click', () => ui.file.click());
ui.remove.addEventListener('click', () => clearContent(true));
ui.reset.addEventListener('click', () => { resetCalibration(); updateCalibration(); });
ui.presetSelect.addEventListener('change', () => { ui.applyPreset.disabled = !source || !ui.presetSelect.value; });
ui.savePreset.addEventListener('click', () => {
  try {
    const preset = saveCalibrationPreset(ui.presetName.value, mode, layout, readCalibration());
    ui.presetName.value = ''; refreshPresets(); ui.presetSelect.value = preset.id; ui.applyPreset.disabled = !source;
    showSuccess('Ajuste guardado para este módulo y tipo de contenido.');
  } catch (error) { showError(error.message || 'No se pudo guardar el ajuste en este navegador.'); }
});
ui.applyPreset.addEventListener('click', () => {
  const preset = getCalibrationPresets().find(item => item.id === ui.presetSelect.value && item.mode === mode && item.layout === layout);
  if (!preset) return;
  applyCalibration(preset.settings); updateCalibration();
});
document.querySelectorAll('.control-panel input').forEach(input => input.addEventListener('input', updateCalibration));
$('#fitButton').addEventListener('click', () => { resetCalibration(); updateCalibration(); });
$('#fullscreenButton').addEventListener('click', async () => {
  const card = $('#viewerCard');
  if (document.fullscreenElement) { await document.exitFullscreen(); return; }
  if (card.classList.contains('theater-mode')) { card.classList.remove('theater-mode'); return; }
  try { if (card.requestFullscreen) await card.requestFullscreen(); else card.classList.add('theater-mode'); }
  catch { card.classList.add('theater-mode'); }
});
$('#exitFullscreenButton').addEventListener('click', async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else $('#viewerCard').classList.remove('theater-mode');
});
document.addEventListener('fullscreenchange', () => $('#exitFullscreenButton').classList.toggle('hidden', !document.fullscreenElement));
ui.downloadImage.addEventListener('click', downloadImageResult);
ui.downloadVideo.addEventListener('click', downloadVideoResult);
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
updateReadouts(); syncControls(); refreshPresets();
