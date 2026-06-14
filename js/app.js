// Propaga el query de versión (?v=N) de app.js a los imports locales,
// para saltar el cache del navegador en cada deploy.
const V = new URL(import.meta.url).search || '';

const video = document.getElementById('video');
const hint = document.getElementById('hint');
const modelChips = document.getElementById('model-chips');
const colorDots = document.getElementById('color-dots');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const panel = document.getElementById('panel');
const errorMsg = document.getElementById('error-msg');

let initCamera;
let initCarRenderer, renderCar, setCarRotation, loadCarModel, setCarColor;
let initFaceTracker, detectFace, calculateYaw, MODELS;

let started = false;
let cameraReady = false;
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
  if (rendererReady) {
    if (cameraReady) {
      const result = detectFace(video);
      if (result) setCarRotation(calculateYaw(result));
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
    cameraReady = true;

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

async function boot() {
  // Cargar módulos locales con versión propagada (cache-bust)
  const [cam, car, ft, cfg] = await Promise.all([
    import('./camera.js' + V),
    import('./car-renderer.js' + V),
    import('./face-tracker.js' + V),
    import('./models-config.js' + V)
  ]);

  initCamera = cam.initCamera;
  ({ initCarRenderer, renderCar, setCarRotation, loadCarModel, setCarColor } = car);
  ({ initFaceTracker, detectFace, calculateYaw } = ft);
  MODELS = cfg.MODELS;

  panel.classList.add('hidden');

  initCarRenderer(video);
  rendererReady = true;

  buildUI();
  loadCarModel(MODELS[0].glb)
    .then(() => setCarColor(MODELS[0].colors[0].hex))
    .catch(err => console.warn('Modelo inicial no cargó:', err));

  initFaceTracker()
    .catch(err => console.warn('Face tracker no disponible:', err));

  loop();

  startBtn.addEventListener('click', start);
  console.log('✓ app.js listo (v=' + (V || 'sin version') + ')');
}

boot().catch(err => {
  showError('Error al iniciar: ' + (err?.message || String(err)));
  console.error(err);
});
