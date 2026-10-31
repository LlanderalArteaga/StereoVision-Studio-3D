export const DEFAULTS = Object.freeze({ scale: 100, brightness: 100, contrast: 100, shift: 0, vertical: 0, sbsScale: 100, swap: false });
export function readCalibration() {
  return { scale: Number(document.querySelector('#scaleControl').value), brightness: Number(document.querySelector('#brightnessControl').value), contrast: Number(document.querySelector('#contrastControl').value), shift: Number(document.querySelector('#shiftControl').value), vertical: Number(document.querySelector('#verticalControl').value), sbsScale: Number(document.querySelector('#sbsScaleControl').value), swap: document.querySelector('#swapControl').checked };
}
export function resetCalibration() {
  for (const [id, value] of Object.entries({ scaleControl: 100, brightnessControl: 100, contrastControl: 100, shiftControl: 0, verticalControl: 0, sbsScaleControl: 100 })) document.getElementById(id).value = value;
  document.querySelector('#swapControl').checked = false;
}
export function updateReadouts() {
  for (const [input, output, suffix] of [['scaleControl','scaleOutput','%'],['brightnessControl','brightnessOutput','%'],['contrastControl','contrastOutput','%'],['shiftControl','shiftOutput',' px'],['verticalControl','verticalOutput',' px'],['sbsScaleControl','sbsScaleOutput','%']]) document.getElementById(output).value = document.getElementById(input).value + suffix;
  const scale = Number(document.querySelector('#sbsScaleControl').value || document.querySelector('#scaleControl').value);
  document.querySelector('#zoomReadout').textContent = `${scale}%`;
  document.querySelectorAll('.control-group input[type=range]').forEach(input => { const min = Number(input.min), max = Number(input.max), value = Number(input.value); input.style.background = `linear-gradient(90deg,#55e1c6 0%,#55e1c6 ${(value-min)/(max-min)*100}%,#414857 ${(value-min)/(max-min)*100}%,#414857 100%)`; });
}
