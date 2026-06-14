import { initCamera } from './camera.js';
import { initCarRenderer, renderCar, setCarRotation, loadCarModel, setCarColor } from './car-renderer.js';
import { initFaceTracker, detectFace, calculateYaw } from './face-tracker.js';
import { MODELS } from './models-config.js';

const video = document.getElementById('video');
const canvas = document.getElementById('main');
const ctx = canvas.getContext('2d');
const hint = document.getElementById('hint');
const modelChips = document.getElementById('model-chips');
const colorDots = document.getElementById('color-dots');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const panel = document.getElementById('panel');
const errorMsg = document.getElementById('error-msg');

let activeModelIndex = 0;
let activeColorIndex = 0;
let started = false;

function showError(msg) {
  errorMsg.textContent = msg;
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
  activeModelIndex = index;
  activeColorIndex = 0;
  document.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('active', i === index));
  loadCarModel(MODELS[index].glb)
    .then(() => setCarColor(MODELS[index].colors[0].hex))
    .catch(err => showError('Error cargando modelo: ' + err.message));
  renderColorDots(index);
}

function selectColor(modelIndex, colorIndex) {
  activeColorIndex = colorIndex;
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === colorIndex));
  setCarColor(MODELS[modelIndex].colors[colorIndex].hex);
}

function loop() {
  if (video.readyState >= 2) {
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const result = detectFace(video);
  if (result) {
    const yaw = calculateYaw(result);
    setCarRotation(yaw);
  }

  const carCanvas = renderCar();
  ctx.drawImage(carCanvas, 0, 0);

  requestAnimationFrame(loop);
}

async function start() {
  if (started) return;
  started = true;
  startBtn.textContent = 'Iniciando...';
  startBtn.disabled = true;

  try {
    // Inicializar canvas y renderer
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });

    initCarRenderer();
    buildUI();
    panel.classList.remove('hidden');

    // Cargar modelo inicial (pequeño, carga rápido)
    loadCarModel(MODELS[0].glb)
      .then(() => setCarColor(MODELS[0].colors[0].hex))
      .catch(err => showError('Modelo no cargó, usando placeholder'));

    // Face tracker en paralelo (no bloquea)
    initFaceTracker().then(() => console.log('Face tracker listo'));

    // Pedir cámara — esto sí dispara el permiso del browser
    await initCamera(video);

    // Ocultar overlay de inicio
    startOverlay.classList.add('hidden');
    setTimeout(() => hint.classList.add('hidden'), 3000);

    // Arrancar loop de render
    loop();

  } catch (err) {
    started = false;
    startBtn.textContent = '📷 Activar Cámara';
    startBtn.disabled = false;
    showError('No se pudo acceder a la cámara: ' + err.message);
    console.error(err);
  }
}

// Panel y hint ocultos hasta que el usuario inicie
panel.classList.add('hidden');

// El botón de inicio dispara todo — requerido por mobile para getUserMedia
startBtn.addEventListener('click', start);
