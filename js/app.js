import { initCamera } from './camera.js';
import { initCarRenderer, renderCar, setCarRotation } from './car-renderer.js';
import { initFaceTracker, detectFace, calculateYaw } from './face-tracker.js';

const video = document.getElementById('video');
const canvas = document.getElementById('main');
const ctx = canvas.getContext('2d');
const hint = document.getElementById('hint');

async function init() {
  await initCamera(video);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  initCarRenderer();

  // Face tracker carga en paralelo (no bloquea la cámara)
  initFaceTracker().then(() => {
    console.log('Face tracker listo');
  });

  // Ocultar hint después de 3 segundos
  setTimeout(() => hint.classList.add('hidden'), 3000);

  loop();
}

function loop() {
  // Cámara (espejada)
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Face tracking → yaw → rotación del auto
  const result = detectFace(video);
  if (result) {
    const yaw = calculateYaw(result);
    setCarRotation(yaw);
  }

  // Auto 3D encima
  const carCanvas = renderCar();
  ctx.drawImage(carCanvas, 0, 0);

  requestAnimationFrame(loop);
}

init().catch(err => {
  console.error('Error:', err);
  alert('No se pudo acceder a la cámara.');
});
