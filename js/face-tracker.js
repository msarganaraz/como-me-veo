import { FaceLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js';

let faceLandmarker = null;
let lastTimestamp = -1;

export async function initFaceTracker() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFacialTransformationMatrixes: true
  });
}

export function detectFace(videoEl) {
  if (!faceLandmarker || videoEl.readyState < 2) return null;

  const now = performance.now();
  if (now === lastTimestamp) return null;
  lastTimestamp = now;

  return faceLandmarker.detectForVideo(videoEl, now);
}

export function calculateYaw(result) {
  if (!result?.facialTransformationMatrixes?.length) return 0;

  // Matrix 4x4 column-major del primer rostro detectado
  const m = result.facialTransformationMatrixes[0].data;

  // Yaw (rotación Y) del modelo de transformación facial
  // m[0] = cos(yaw), m[8] = sin(yaw) en coordenadas de cámara
  const rawYaw = Math.atan2(m[8], m[0]);

  // Normalizar a rango -1..1 (±60° = rango máximo)
  return Math.max(-1, Math.min(1, rawYaw / (Math.PI / 3)));
}
