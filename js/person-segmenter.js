// Segmentación de persona en tiempo real con MediaPipe Image Segmenter.
// Recorta la silueta real (cabeza, hombros, pelo) en vez de un óvalo fijo.
// Comparte el mismo bundle de MediaPipe que face-tracker.js.
const MEDIAPIPE_VERSION = '0.10.14';
const MEDIAPIPE_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

let ImageSegmenter = null;
let segmenter = null;
let lastTimestamp = -1;

// Canvas auxiliar donde componemos: RGB del video + alfa de la máscara
let maskCanvas = null;
let maskCtx = null;
let latestMask = null; // Float32Array (0..1) de la última máscara de confianza

export async function initPersonSegmenter() {
  const vision = await import(`${MEDIAPIPE_BASE}/vision_bundle.mjs`);
  ImageSegmenter = vision.ImageSegmenter;

  const filesetResolver = await vision.FilesetResolver.forVisionTasks(`${MEDIAPIPE_BASE}/wasm`);

  segmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    outputCategoryMask: false,
    outputConfidenceMasks: true   // máscara continua 0..1 → bordes suaves
  });
}

// Llamar una vez por frame. No bloquea: usa el callback de MediaPipe.
export function segmentFrame(videoEl) {
  if (!segmenter || videoEl.readyState < 2) return;

  const now = performance.now();
  if (now === lastTimestamp) return;
  lastTimestamp = now;

  segmenter.segmentForVideo(videoEl, now, (result) => {
    const conf = result.confidenceMasks?.[0];
    if (conf) {
      latestMask = conf.getAsFloat32Array();
      latestMask._w = conf.width;
      latestMask._h = conf.height;
    }
    result.confidenceMasks?.forEach(m => m.close?.());
  });
}

// Devuelve un canvas 2D con: RGB = frame de cámara, Alpha = máscara de persona.
// Listo para usar como textura (CanvasTexture / VideoTexture-like).
export function getMattedCanvas(videoEl) {
  if (!latestMask) return null;

  const w = latestMask._w, h = latestMask._h;
  if (!maskCanvas) {
    maskCanvas = document.createElement('canvas');
    maskCtx = maskCanvas.getContext('2d');
  }
  if (maskCanvas.width !== w || maskCanvas.height !== h) {
    maskCanvas.width = w;
    maskCanvas.height = h;
  }

  // Dibujar el frame de video escalado a la resolución de la máscara
  maskCtx.drawImage(videoEl, 0, 0, w, h);
  const frame = maskCtx.getImageData(0, 0, w, h);
  const px = frame.data;

  for (let i = 0; i < latestMask.length; i++) {
    // Umbral suave: confidence ya viene 0..1, lo mapeamos directo a alfa,
    // con un realce de contraste para que el borde sea más limpio.
    let a = latestMask[i];
    a = Math.max(0, Math.min(1, (a - 0.35) / 0.3)); // realce de contraste
    px[i * 4 + 3] = Math.round(a * 255);
  }

  maskCtx.putImageData(frame, 0, 0);
  return maskCanvas;
}

export function isSegmenterReady() {
  return !!segmenter;
}
