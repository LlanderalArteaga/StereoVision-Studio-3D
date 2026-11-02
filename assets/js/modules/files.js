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
export function loadImage(url, label = 'la imagen') {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const decode = () => {
      attempt += 1;
      const image = new Image();
      image.decoding = 'async';
      image.onload = async () => {
        if (!image.naturalWidth || !image.naturalHeight) return retry();
        try {
          if (image.decode) await image.decode();
          resolve(image);
        } catch {
          retry();
        }
      };
      image.onerror = retry;
      image.src = url;
    };
    const retry = () => {
      if (attempt < 3) setTimeout(decode, attempt * 180);
      else reject(new Error(`No se pudo decodificar ${label} después de varios intentos. Comprueba que el archivo terminó de copiarse y vuelve a seleccionarlo; también puedes guardar una copia como JPG o PNG.`));
    };
    decode();
  });
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
