const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function validateFile(file, mode) {
  if (!file) throw new Error('No se seleccionó ningún archivo.');
  if (file.size > 250 * 1024 * 1024) throw new Error('El archivo supera el límite de 250 MB. Elige uno más pequeño.');
  if (mode === 'video') {
    if (!['video/mp4', 'video/x-m4v'].includes(file.type) && !/\.mp4$/i.test(file.name)) throw new Error('Este módulo acepta video MP4. Selecciona un archivo .mp4 compatible con tu navegador.');
    return;
  }
  if (!IMAGE_TYPES.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error('Formato no compatible. Selecciona una imagen JPG, PNG o WebP.');
}
export function loadImage(url) {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('El navegador no pudo decodificar la imagen. Prueba con otro archivo.')); image.src = url; });
}

export async function combineAnaglyph(leftUrl, rightUrl) {
  const [left, right] = await Promise.all([loadImage(leftUrl), loadImage(rightUrl)]);
  const leftRatio = left.naturalWidth / left.naturalHeight;
  const rightRatio = right.naturalWidth / right.naturalHeight;
  if (Math.abs(leftRatio - rightRatio) / leftRatio > 0.015) throw new Error('Las dos fotos tienen proporciones distintas. Usa imágenes del mismo encuadre y proporción.');
  const factor = Math.min(1, 4096 / Math.max(left.naturalWidth, left.naturalHeight), Math.sqrt(12000000 / (left.naturalWidth * left.naturalHeight)));
  const width = Math.max(1, Math.round(left.naturalWidth * factor));
  const height = Math.max(1, Math.round(left.naturalHeight * factor));
  const leftCanvas = document.createElement('canvas');
  const rightCanvas = document.createElement('canvas');
  const output = document.createElement('canvas');
  for (const canvas of [leftCanvas, rightCanvas, output]) { canvas.width = width; canvas.height = height; }
  const leftContext = leftCanvas.getContext('2d', { willReadFrequently: true });
  const rightContext = rightCanvas.getContext('2d', { willReadFrequently: true });
  leftContext.drawImage(left, 0, 0, width, height);
  rightContext.drawImage(right, 0, 0, width, height);
  const leftPixels = leftContext.getImageData(0, 0, width, height).data;
  const rightPixels = rightContext.getImageData(0, 0, width, height).data;
  const outputContext = output.getContext('2d');
  const result = outputContext.createImageData(width, height);
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = leftPixels[i];
    result.data[i + 1] = rightPixels[i + 1];
    result.data[i + 2] = rightPixels[i + 2];
    result.data[i + 3] = 255;
  }
  outputContext.putImageData(result, 0, 0);
  return output;
}
