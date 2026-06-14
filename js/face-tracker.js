// El bundle se llama vision_bundle.mjs (no .js)
const MEDIAPIPE_VERSION = '0.10.14';
const MEDIAPIPE_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;

let FaceLandmarker = null;
let FilesetResolver = null;
let faceLandmarker = null;
let lastTimestamp = -1;

export async function initFaceTracker() {
  // Import dinámico para que un 404 no rompa el módulo entero
  const vision = await import(`${MEDIAPIPE_BASE}/vision_bundle.mjs`);
  FaceLandmarker = vision.FaceLandmarker;
  FilesetResolver = vision.FilesetResolver;

  const filesetResolver = await FilesetResolver.forVisionTasks(`${MEDIAPIPE_BASE}/wasm`);

  faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
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

  const m = result.facialTransformationMatrixes[0].data;
  const rawYaw = Math.atan2(m[8], m[0]);
  return Math.max(-1, Math.min(1, rawYaw / (Math.PI / 3)));
}
