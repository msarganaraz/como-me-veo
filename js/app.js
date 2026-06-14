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
let carRenderer = null;
let faceTracker = null;

function showError(msg) {
  errorMsg.textContent = msg;
  console.error('showError:', msg);
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
  if (carRenderer) {
    carRenderer.loadCarModel(MODELS[index].glb)
      .then(() => carRenderer.setCarColor(MODELS[index].colors[0].hex))
      .catch(err => showError('Error cargando modelo: ' + err.message));
  }
  renderColorDots(index);
}

function selectColor(modelIndex, colorIndex) {
  activeColorIndex = colorIndex;
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === colorIndex));
  if (carRenderer) carRenderer.setCarColor(MODELS[modelIndex].colors[colorIndex].hex);
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

  if (faceTracker) {
    const result = faceTracker.detectFace(video);
    if (result && carRenderer) {
      const yaw = faceTracker.calculateYaw(result);
      carRenderer.setCarRotation(yaw);
    }
  }

  if (carRenderer) {
    const carCanvas = carRenderer.renderCar();
    ctx.drawImage(carCanvas, 0, 0);
  }

  requestAnimationFrame(loop);
}

async function start() {
  if (started) return;
  started = true;
  startBtn.textContent = 'Iniciando...';
  startBtn.disabled = true;
  errorMsg.textContent = '';

  try {
    // Tamaño del canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });

    // Pedir cámara primero — esto dispara el permiso del browser
    startBtn.textContent = 'Esperando permiso...';
    const { initCamera } = await import('./camera.js');
    await initCamera(video);

    // Cámara OK — ocultar overlay
    startOverlay.classList.add('hidden');

    // Cargar Three.js renderer en paralelo con face tracker
    startBtn.textContent = 'Cargando...';
    const [rendererModule] = await Promise.all([
      import('./car-renderer.js'),
      import('./face-tracker.js').then(ft => {
        faceTracker = ft;
        return ft.initFaceTracker().catch(err => {
          console.warn('Face tracker no disponible:', err);
        });
      })
    ]);

    carRenderer = rendererModule;
    carRenderer.initCarRenderer();
    buildUI();
    panel.classList.remove('hidden');

    carRenderer.loadCarModel(MODELS[0].glb)
      .then(() => carRenderer.setCarColor(MODELS[0].colors[0].hex))
      .catch(err => console.warn('Modelo inicial no cargó:', err));

    loop();
    setTimeout(() => hint.classList.add('hidden'), 3000);

  } catch (err) {
    started = false;
    startBtn.textContent = '📷 Activar Cámara';
    startBtn.disabled = false;
    const msg = err?.name === 'NotAllowedError'
      ? 'Permiso de cámara denegado. Habilitalo en configuración del navegador.'
      : 'Error: ' + (err?.message || String(err));
    showError(msg);
    console.error(err);
  }
}

// Panel oculto hasta que empiece
panel.classList.add('hidden');

// Botón listo — el script base cargó correctamente
startBtn.addEventListener('click', start);
console.log('✓ app.js listo');
