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

let activeModelIndex = 0;
let activeColorIndex = 0;

function buildUI() {
  // Chips de modelos
  MODELS.forEach((model, i) => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (i === 0 ? ' active' : '');
    chip.textContent = model.label;
    chip.addEventListener('click', () => selectModel(i));
    modelChips.appendChild(chip);
  });

  // Dots de colores del primer modelo
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

  // Actualizar chip activo
  document.querySelectorAll('.chip').forEach((c, i) => {
    c.classList.toggle('active', i === index);
  });

  // Cargar nuevo GLB
  loadCarModel(MODELS[index].glb)
    .then(() => {
      setCarColor(MODELS[index].colors[0].hex);
    })
    .catch(err => console.error('Error cargando modelo:', err));

  renderColorDots(index);
}

function selectColor(modelIndex, colorIndex) {
  activeColorIndex = colorIndex;
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === colorIndex);
  });
  setCarColor(MODELS[modelIndex].colors[colorIndex].hex);
}

async function init() {
  // UI y renderer arrancan inmediatamente sin esperar la cámara
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  initCarRenderer();
  buildUI();

  loadCarModel(MODELS[0].glb)
    .then(() => setCarColor(MODELS[0].colors[0].hex))
    .catch(err => console.warn('Error cargando GLB:', err));

  initFaceTracker().then(() => console.log('Face tracker listo'));

  // Loop arranca ya (muestra el auto aunque no haya cámara todavía)
  loop();

  // Cámara se pide después — si el usuario acepta, empieza a verse
  await initCamera(video);
  setTimeout(() => hint.classList.add('hidden'), 3000);
}

function loop() {
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  const result = detectFace(video);
  if (result) {
    const yaw = calculateYaw(result);
    setCarRotation(yaw);
  }

  const carCanvas = renderCar();
  ctx.drawImage(carCanvas, 0, 0);

  requestAnimationFrame(loop);
}

init().catch(err => {
  console.error('Error:', err);
  alert('No se pudo acceder a la cámara.');
});
