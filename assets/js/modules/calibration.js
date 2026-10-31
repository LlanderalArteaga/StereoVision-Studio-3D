export const DEFAULTS = Object.freeze({ scale: 100, brightness: 100, contrast: 100, shift: 0, vertical: 0, sbsScale: 100, swap: false });
const PRESET_KEY = 'stereovision-calibration-presets-v1';
export function readCalibration() {
  return { scale: Number(document.querySelector('#scaleControl').value), brightness: Number(document.querySelector('#brightnessControl').value), contrast: Number(document.querySelector('#contrastControl').value), shift: Number(document.querySelector('#shiftControl').value), vertical: Number(document.querySelector('#verticalControl').value), sbsScale: Number(document.querySelector('#sbsScaleControl').value), swap: document.querySelector('#swapControl').checked };
}
export function resetCalibration() {
  for (const [id, value] of Object.entries({ scaleControl: 100, brightnessControl: 100, contrastControl: 100, shiftControl: 0, verticalControl: 0, sbsScaleControl: 100 })) document.getElementById(id).value = value;
  document.querySelector('#swapControl').checked = false;
}
export function applyCalibration(settings) {
  const pairs = [['scaleControl','scale'],['brightnessControl','brightness'],['contrastControl','contrast'],['shiftControl','shift'],['verticalControl','vertical'],['sbsScaleControl','sbsScale']];
  for (const [id, key] of pairs) {
    const input = document.getElementById(id), raw = Number(settings[key]);
    if (Number.isFinite(raw)) input.value = Math.max(Number(input.min), Math.min(Number(input.max), raw));
  }
  document.querySelector('#swapControl').checked = Boolean(settings.swap);
}
export function updateReadouts() {
  for (const [input, output, suffix] of [['scaleControl','scaleOutput','%'],['brightnessControl','brightnessOutput','%'],['contrastControl','contrastOutput','%'],['shiftControl','shiftOutput',' px'],['verticalControl','verticalOutput',' px'],['sbsScaleControl','sbsScaleOutput','%']]) document.getElementById(output).value = document.getElementById(input).value + suffix;
  const scale = Number(document.querySelector('#sbsScaleControl').value || document.querySelector('#scaleControl').value);
  document.querySelector('#zoomReadout').textContent = `${scale}%`;
  document.querySelectorAll('.control-group input[type=range]').forEach(input => { const min = Number(input.min), max = Number(input.max), value = Number(input.value); input.style.background = `linear-gradient(90deg,#55e1c6 0%,#55e1c6 ${(value-min)/(max-min)*100}%,#414857 ${(value-min)/(max-min)*100}%,#414857 100%)`; });
}
export function getCalibrationPresets() {
  try {
    const stored = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && item.settings) : [];
  } catch { return []; }
}
export function saveCalibrationPreset(name, mode, layout, settings) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Escribe un nombre para guardar el ajuste.');
  const presets = getCalibrationPresets();
  const preset = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: cleanName, mode, layout, settings: { ...settings }, savedAt: new Date().toISOString() };
  presets.unshift(preset);
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
  return preset;
}
