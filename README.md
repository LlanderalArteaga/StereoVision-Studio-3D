# StereoVision Studio 3D

Aplicación web estática para importar desde el dispositivo y visualizar imágenes anaglifo rojo-cian, imágenes estereoscópicas Side-by-Side (SBS) y videos SBS. Está pensada para estudiantes y docentes que necesitan inspeccionar material 3D, ajustar su presentación y usar un teléfono con visor de dos lentes.

## Qué resuelve

El anaglifo mezcla información de ambas perspectivas en canales de color y se observa con lentes rojo-cian. El formato SBS conserva las perspectivas en dos mitades horizontales: la izquierda alimenta el ojo izquierdo y la derecha el ojo derecho. StereoVision Studio permite ajustar la representación en pantalla, pero no genera profundidad a partir de una imagen plana ni altera el archivo fuente. La IPD física de cada persona queda fuera de los ajustes digitales.

La aplicación procesa los archivos localmente en el navegador. No hay cuentas, backend, base de datos ni carga de archivos. Se aceptan imágenes JPG/JPEG, PNG y WebP, además de video MP4 según los códecs que soporte el navegador.

## Funciones

- Módulo anaglifo con escala, brillo y contraste.
- Entrada de anaglifo ya preparado o generación rojo-cian a partir de dos fotos ordenadas (izquierda y derecha).
- Visor de imagen SBS con separación horizontal, alineación vertical, escala e intercambio real de perspectivas.
- Alternativa para duplicar una foto 2D en las dos vistas SBS; esto permite usar el visor, pero no inventa profundidad.
- Visor de video SBS con una sola fuente de reproducción, controles nativos propios de play/pausa, búsqueda, volumen y calibración simultánea.
- Alternativa para duplicar video 2D en ambas vistas, indicada como contenido sin profundidad estereoscópica.
- Modo Viewer con dos regiones para los ojos, salida táctil y aviso de orientación vertical.
- Perfiles de calibración con nombre, guardados en el navegador y reutilizables para el mismo módulo y tipo de entrada.
- Vista de anaglifo a pantalla completa, con salida en navegadores móviles que no ofrecen Fullscreen API.
- Descarga de anaglifo generado en PNG e imagen 2D duplicada a SBS en PNG. Los archivos que ya están preparados se descargan sin transformación.
- Exportación de video 2D duplicado a SBS como WebM mediante captura del video en tiempo real; incluye audio si el navegador permite capturarlo.
- Sustitución de archivo, validación de formatos y decodificación, restablecimiento de parámetros y liberación de recursos temporales.
- Diseño adaptable a escritorio y teléfono.

## Arquitectura

```text
index.html
assets/
  css/styles.css             Interfaz, diseño adaptable y modo visor
  img/favicon.svg            Favicon vectorial original
  js/main.js                 Inicio, estado de la interfaz y eventos
  js/modules/files.js        Validación de formato y decodificación de imagen
  js/modules/calibration.js  Valores, restablecimiento e indicadores
  js/modules/renderer.js     Composición Canvas 2D de imagen y perspectivas
  js/modules/video.js        Reproducción, búsqueda y liberación de video
  js/modules/exports.js      Descargas de imagen y captura de video SBS
  js/modules/vr.js           Presentación en dos regiones para móvil
```

La vista SBS recorta las dos mitades del mismo archivo. El video se dibuja desde un único elemento multimedia para mantener el sincronismo y sus controles. Los cambios de calibración actúan en la representación en pantalla.

El botón de descarga conserva los originales que ya son anaglifo, SBS o video SBS. Para dos fotos de anaglifo descarga el resultado combinado como PNG; para una foto 2D en modo SBS descarga un PNG con la foto duplicada a ambos lados. Al elegir un video 2D, **Crear y descargar SBS** reproduce el video completo y captura ambas vistas en un archivo WebM. La exportación tarda lo mismo que la duración del video y depende de que el navegador tenga `MediaRecorder` y `canvas.captureStream`; el audio se agrega cuando el navegador lo permite. No convierte a MP4.

Para generar un anaglifo, selecciona las fotos en los campos separados **Foto izquierda** y **Foto derecha**. También puedes usar el botón central: te pedirá primero la imagen izquierda y después la derecha. La primera aporta el canal rojo y la segunda los canales verde y azul. Los perfiles guardados se ofrecen cuando coinciden el módulo y el tipo de entrada; permanecen en el almacenamiento del navegador donde fueron creados.

## Ejecución local

Sirve la carpeta desde un origen HTTP; los módulos ES no deben abrirse con `file://`.

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`. También se puede usar Live Server en Visual Studio Code.

## Publicación en GitHub Pages

1. Sube el contenido del repositorio a GitHub.
2. En **Settings → Pages**, elige la rama principal y la carpeta raíz (`/`).
3. Espera a que GitHub Pages publique el sitio y comprueba la URL HTTPS.
4. Abre esa URL en escritorio y en el teléfono. Las rutas del proyecto son relativas para funcionar en la URL del repositorio.

## Material y pruebas

La colección de imágenes de ejemplo usa rutas relativas dentro de `assets/samples/`: `Foto_palma.jpeg` (anaglifo preparado), `Palmera_IZQ.jpeg` y `Palmera_DER.jpeg` (pareja para generar anaglifo), `Arco.jpg` (imagen SBS) y `Palmera_IZQ.jpeg` como entrada 2D para duplicar en SBS. Agrega esos archivos originales a esa carpeta para que los botones de muestra estén disponibles en GitHub Pages. Aún no hay un video de demostración; cuando se tenga, se puede añadir ahí como MP4 SBS. Comprueba la compatibilidad del video concreto en el teléfono de evaluación.

Registra la evidencia ejecutada antes de entregar:

| ID | Comprobación | Resultado / evidencia |
|---|---|---|
| P-01 | Inicio vacío y controles desactivados | Pendiente de prueba local |
| P-02 | Anaglifo: carga, escala, brillo y contraste | Pendiente de prueba local |
| P-03 | Imagen SBS: ojos, calibración e intercambio | Pendiente de prueba local |
| P-04 | Video SBS: play, pausa, búsqueda, volumen y tiempos | Pendiente de prueba local |
| P-05 | Calibración de video durante reproducción | Pendiente de prueba local |
| P-06 | Sustitución entre formatos y liberación | Pendiente de prueba local |
| P-07 | Archivo no compatible y recuperación | Pendiente de prueba local |
| P-08 | VR en teléfono horizontal y salida | Pendiente de prueba con dispositivo |
| P-09 | Sitio HTTPS en GitHub Pages | Pendiente de publicación |
| P-10 | Descargas PNG anaglifo/SBS y exportación WebM | Pendiente de prueba local |

Incluye en la entrega resultados reales, dispositivo/navegador, observaciones de calibración e incidencias resueltas. El repositorio público y la publicación HTTPS deben configurarse desde la cuenta del estudiante.

## Conclusiones

StereoVision Studio reúne en una sola interfaz tres flujos de visualización estereoscópica y mantiene separados el contenido fuente y los ajustes de presentación. El recorte por ojo permite trabajar con perspectivas SBS reales, mientras que una única fuente de video mantiene el avance y la pausa sincronizados. La publicación es estática y puede alojarse en GitHub Pages; la comprobación final de códecs, comodidad binocular y uso con gafas debe completarse con los archivos y dispositivos de la evaluación.

## Créditos

Proyecto académico del Tema 2. Diseño y desarrollo: Axel Llanderal Arteaga. Interfaz, código, iconografía y favicon originales. Tecnologías: HTML, CSS, JavaScript ES Modules y Canvas 2D; sin dependencias externas de ejecución. No se incluyen medios de terceros. Atribuye y verifica las licencias de cualquier contenido estereoscópico que añadas para la demostración.
