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
let initCarRenderer, renderCar, setCarRotation, loadCarModel, setCarColor, refreshFaceTexture;
let initPersonSegmenter, segmentFrame, updateFaceCanvas, getFaceCanvas;
let MODELS;

let started = false;
let cameraReady = false;
let rendererReady = false;
let segmenterReady = false;

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
  const m = MODELS[index];
  loadCarModel(m.glb, { body: m.body, glass: m.glass, baseRotation: m.baseRotation, face: m.face })
    .then(() => setCarColor(m.colors[0].hex))
    .catch(err => console.warn('Error cargando modelo:', err));
  renderColorDots(index);
}

function selectColor(modelIndex, colorIndex) {
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === colorIndex));
  setCarColor(MODELS[modelIndex].colors[colorIndex].hex);
}

// ── Rotación manual con el dedo (en vez de seguir la cabeza) ──
// Así la persona puede mirar siempre de frente a la cámara mientras
// elige el ángulo del auto con un swipe, sin "perder" la foto al girar
// la cabeza para mover el auto.
let dragging = false;
let lastX = 0;
let manualYaw = 0; // -1..1

function isInteractiveTarget(el) {
  return !!(el.closest('#panel') || el.closest('#start-overlay'));
}

function onDragStart(e) {
  if (isInteractiveTarget(e.target)) return;
  dragging = true;
  lastX = e.clientX;
}

function onDragMove(e) {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX;
  manualYaw = Math.max(-1, Math.min(1, manualYaw + dx * 0.006));
  setCarRotation(manualYaw);
}

function onDragEnd() {
  dragging = false;
}

function setupDragRotation() {
  window.addEventListener('pointerdown', onDragStart);
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);
  window.addEventListener('pointercancel', onDragEnd);
}

function loop() {
  if (rendererReady) {
    if (cameraReady && segmenterReady) {
      segmentFrame(video);
      if (updateFaceCanvas(video)) refreshFaceTexture();
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
  const [cam, car, cfg, seg] = await Promise.all([
    import('./camera.js' + V),
    import('./car-renderer.js' + V),
    import('./models-config.js' + V),
    import('./person-segmenter.js' + V)
  ]);

  initCamera = cam.initCamera;
  ({ initCarRenderer, renderCar, setCarRotation, loadCarModel, setCarColor, refreshFaceTexture } = car);
  ({ initPersonSegmenter, segmentFrame, updateFaceCanvas, getFaceCanvas } = seg);
  MODELS = cfg.MODELS;

  panel.classList.add('hidden');

  // El canvas de la cara existe desde que se importa el módulo (tamaño
  // fijo) — se lo pasamos al renderer una sola vez, nunca se reemplaza.
  initCarRenderer(getFaceCanvas());
  rendererReady = true;

  buildUI();
  setupDragRotation();
  loadCarModel(MODELS[0].glb, { body: MODELS[0].body, glass: MODELS[0].glass, baseRotation: MODELS[0].baseRotation, face: MODELS[0].face })
    .then(() => setCarColor(MODELS[0].colors[0].hex))
    .catch(err => console.warn('Modelo inicial no cargó:', err));

  initPersonSegmenter()
    .then(() => { segmenterReady = true; })
    .catch(err => console.warn('Segmentador de persona no disponible:', err));

  loop();

  startBtn.addEventListener('click', start);
  console.log('✓ app.js listo (v=' + (V || 'sin version') + ')');
}

boot().catch(err => {
  showError('Error al iniciar: ' + (err?.message || String(err)));
  console.error(err);
});
