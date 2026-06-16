// Segmentación de persona en tiempo real con MediaPipe Image Segmenter.
// Recorta la silueta real (cabeza, hombros, pelo) en vez de un óvalo fijo.
// Comparte el mismo bundle de MediaPipe que face-tracker.js.
const MEDIAPIPE_VERSION = '0.10.14';
const MEDIAPIPE_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

// Tamaño de salida FIJO. El canvas que se usa como textura de Three.js
// nunca cambia de tamaño durante toda la sesión: si lo hiciera, Three.js
// intenta un texSubImage2D asumiendo las dimensiones viejas y WebGL tira
// "Offset overflows texture dimensions" en cada frame — la textura queda
// rota y la cara desaparece (bug real que causó "no se ve la cara").
const OUT_W = 240, OUT_H = 320;

let ImageSegmenter = null;
let segmenter = null;
let lastTimestamp = -1;

let workCanvas = null, workCtx = null;     // tamaño variable (= resolución de la máscara)
const outputCanvas = document.createElement('canvas'); // tamaño FIJO, es la textura
outputCanvas.width = OUT_W;
outputCanvas.height = OUT_H;
const outputCtx = outputCanvas.getContext('2d');

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

// Devuelve el canvas que actúa como fuente de la textura — SIEMPRE el mismo
// objeto, tamaño fijo. Llamar una vez al iniciar y pasarlo a car-renderer.
export function getFaceCanvas() {
  return outputCanvas;
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

// Compone RGB(video) + alpha(máscara) en el canvas de salida de tamaño FIJO.
// Devuelve true si se actualizó algo (hay máscara disponible).
export function updateFaceCanvas(videoEl) {
  if (!latestMask) return false;

  const w = latestMask._w, h = latestMask._h;
  if (!workCanvas) {
    workCanvas = document.createElement('canvas');
    workCtx = workCanvas.getContext('2d');
  }
  if (workCanvas.width !== w || workCanvas.height !== h) {
    workCanvas.width = w;
    workCanvas.height = h;
  }

  // Dibujar el frame de video en el canvas de trabajo (tamaño = máscara)
  workCtx.drawImage(videoEl, 0, 0, w, h);
  const frame = workCtx.getImageData(0, 0, w, h);
  const px = frame.data;

  for (let i = 0; i < latestMask.length; i++) {
    // Realce de contraste suave: empuja hacia 0/1 sin recortar de golpe
    // confidencias medias (mala luz, pelo, bordes).
    let a = latestMask[i];
    a = Math.max(0, Math.min(1, (a - 0.15) / 0.45));
    px[i * 4 + 3] = Math.round(a * 255);
  }
  workCtx.putImageData(frame, 0, 0);

  // Escalar el resultado al canvas de salida de tamaño FIJO (la textura
  // nunca cambia de tamaño, así que esto es seguro de hacer cada frame).
  outputCtx.clearRect(0, 0, OUT_W, OUT_H);
  outputCtx.drawImage(workCanvas, 0, 0, OUT_W, OUT_H);
  return true;
}

export function isSegmenterReady() {
  return !!segmenter;
}
