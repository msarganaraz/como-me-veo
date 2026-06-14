import { initCamera } from './camera.js';
import { initCarRenderer, renderCar, setCarRotation, loadCarModel, setCarColor } from './car-renderer.js';
import { initFaceTracker, detectFace, calculateYaw } from './face-tracker.js';
import { MODELS } from './models-config.js';

const video = document.getElementById('video');
const cameraCanvas = document.getElementById('camera-canvas');
const ctx = cameraCanvas.getContext('2d');
const hint = document.getElementById('hint');
const modelChips = document.getElementById('model-chips');
const colorDots = document.getElementById('color-dots');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const panel = document.getElementById('panel');
const errorMsg = document.getElementById('error-msg');

let started = false;
let rendererReady = false;

function showError(msg) {
  errorMsg.textContent = msg;
  console.error(msg);
}

function buildUI() {
  MODELS.forEach((model, i) => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (i === 0 ? ' active' : '');
    chip.textContent = model.label;
    chip.addEventListener('click', () => selectModel(i));
    modelChips.appendChild(chip);
  });
  renderColorDots(0);
}

function renderColorDots(modelIndex) {
  colorDots.innerHTML = '';
  MODELS[modelIndex].colors.forEach((color, i) => {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.style.background = color.hex;
    dot.title = color.label;
    dot.addEventListener('click', () => selectColor(modelIndex, i));
    colorDots.appendChild(dot);
  });
}

function selectModel(index) {
  document.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('active', i === index));
  loadCarModel(MODELS[index].glb)
    .then(() => setCarColor(MODELS[index].colors[0].hex))
    .catch(err => console.warn('Error cargando modelo:', err));
  renderColorDots(index);
}

function selectColor(modelIndex, colorIndex) {
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === colorIndex));
  setCarColor(MODELS[modelIndex].colors[colorIndex].hex);
}

function loop() {
  // Dibujar feed de cámara (espejado) en el canvas inferior
  if (video.readyState >= 2) {
    ctx.save();
    ctx.translate(cameraCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height);
    ctx.restore();
  }

  // Three.js renderiza directo a su canvas DOM (capa superior)
  if (rendererReady) {
    const result = detectFace(video);
    if (result) {
      const yaw = calculateYaw(result);
      setCarRotation(yaw);
    }
    renderCar();
  }

  requestAnimationFrame(loop);
}

async function start() {
  if (started) return;
  started = true;
  startBtn.textContent = 'Esperando permiso...';
  startBtn.disabled = true;
  errorMsg.textContent = '';

  try {
    await initCamera(video);

    startOverlay.classList.add('hidden');
    panel.classList.remove('hidden');
    setTimeout(() => hint.classList.add('hidden'), 3000);

  } catch (err) {
    started = false;
    startBtn.textContent = '📷 Activar Cámara';
    startBtn.disabled = false;
    const msg = err?.name === 'NotAllowedError'
      ? 'Permiso denegado. Habilitá la cámara en la config del navegador.'
      : 'Error de cámara: ' + (err?.message || String(err));
    showError(msg);
    console.error(err);
  }
}

// Setup al cargar la página
cameraCanvas.width = window.innerWidth;
cameraCanvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  cameraCanvas.width = window.innerWidth;
  cameraCanvas.height = window.innerHeight;
});

panel.classList.add('hidden');

// Three.js y MediaPipe cargan en background mientras el overlay está visible
initCarRenderer();
buildUI();
loadCarModel(MODELS[0].glb)
  .then(() => setCarColor(MODELS[0].colors[0].hex))
  .catch(err => console.warn('Modelo inicial no cargó:', err));

initFaceTracker()
  .then(() => { rendererReady = true; })
  .catch(err => {
    console.warn('Face tracker no disponible:', err);
    rendererReady = true;
  });

loop();

startBtn.addEventListener('click', start);
console.log('✓ app.js listo');
