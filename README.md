# StereoVision Studio 3D

## Qué resuelve

StereoVision Studio 3D permite visualizar y calibrar contenido estereoscópico desde un navegador de escritorio o teléfono. El anaglifo mezcla las perspectivas en canales de color y se observa con lentes rojo-cian. Side-by-Side (SBS) muestra una perspectiva a cada lado para verla con un visor estereoscópico.

La aplicación está dirigida a estudiantes y personas que necesitan revisar contenido 3D. No crea profundidad a partir de una sola foto o video: al duplicar contenido 2D genera una presentación SBS, pero no una perspectiva estereoscópica real. El editor cambia únicamente la vista y no sobrescribe el archivo original.

## Función

- Importa imágenes JPG/JPEG, PNG y WebP, además de videos MP4 compatibles con el navegador.
- Muestra anaglifos preparados o combina imágenes de ojo izquierdo y derecho.
- Presenta imágenes SBS y permite duplicar una foto 2D en ambas vistas.
- Reproduce videos SBS desde una misma fuente para conservar sincronía. También permite duplicar un video 2D.
- Ajusta escala, brillo, contraste y alineación según el módulo, y guarda perfiles de calibración en el navegador.
- Ofrece vista grande para anaglifos y modo Viewer dividido para contenido SBS.
- Incluye muestras de anaglifo, imágenes SBS, pareja de perspectivas y videos 2D y SBS.

Las muestras están en `assets/samples/`: `Foto_palma.jpeg`, `Palmera_IZQ.jpeg`, `Palmera_DER.jpeg`, `Arco.jpg`, `Video_3_DER_Editado.mp4` (2D) y `video-lancha3.mp4` (SBS). El MP4 SBS ocupa aproximadamente 89.8 MiB y cumple el límite de 100 MiB por archivo para publicarlo como archivo normal en GitHub.

## Arquitectura

- `index.html`: estructura de la interfaz, módulos, colección y controles.
- `assets/css/styles.css`: diseño adaptable para escritorio y teléfono.
- `assets/js/main.js`: inicialización y coordinación de importación, muestras e interfaz.
- `assets/js/modules/files.js`: validación, decodificación y composición de anaglifo.
- `assets/js/modules/renderer.js`: renderizado Canvas de anaglifo e imágenes o videos SBS.
- `assets/js/modules/video.js`: carga, reproducción y liberación de videos.
- `assets/js/modules/calibration.js`: ajustes y perfiles de calibración.
- `assets/js/modules/exports.js`: descarga de imágenes y generación SBS de video duplicado.
- `assets/js/modules/vr.js`: presentación dividida para Viewer/VR.
- `assets/samples/`: imágenes y videos de ejemplo incluidos en la colección.
- `assets/img/favicon.svg`: favicon del proyecto.

La aplicación usa HTML, CSS y módulos ES de JavaScript, sin backend, cuentas, base de datos ni servicios externos. Los archivos importados se procesan en el navegador.

## Ejecución local

Desde la carpeta del proyecto, inicia un servidor HTTP:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`. También puedes usar Live Server en Visual Studio Code. No abras el HTML con `file://`, porque los módulos ES necesitan un origen HTTP.

## Publicación en GitHub Pages

1. Sube el contenido del proyecto, incluida `assets/samples/`, a la rama que publicarás.
2. En GitHub, abre **Settings → Pages** y selecciona esa rama y la carpeta raíz (`/`).
3. Abre la URL HTTPS publicada. Las rutas relativas permiten servir el proyecto desde la ruta del repositorio.

Los videos deben ser compatibles con los navegadores de destino. GitHub Pages admite los archivos normales del repositorio; mantén cada archivo por debajo de 100 MiB.

## Conclusiones

StereoVision Studio 3D reúne la visualización de anaglifos, imágenes SBS y videos SBS en una interfaz adaptable. La colección incluida permite explorar sus modalidades sin buscar archivos por separado, y la calibración modifica la vista sin alterar los originales. El sitio puede ejecutarse por HTTP en local y publicarse como una aplicación estática en GitHub Pages.

## Créditos

Proyecto académico del Tema 2. Diseño y desarrollo: **Axel Llanderal Arteaga**. Tecnologías: HTML, CSS, JavaScript ES Modules y Canvas 2D. Interfaz, iconografía y favicon originales.
