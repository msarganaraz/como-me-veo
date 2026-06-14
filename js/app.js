import { initCamera } from './camera.js';
import { initCarRenderer, renderCar, setCarRotation } from './car-renderer.js';

const video = document.getElementById('video');
const canvas = document.getElementById('main');
const ctx = canvas.getContext('2d');

async function init() {
  await initCamera(video);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  initCarRenderer();

  loop();
}

function loop() {
  // 1. Fondo: cámara espejada
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 2. Auto encima (transparente donde hay vidrios)
  const carCanvas = renderCar();
  ctx.drawImage(carCanvas, 0, 0);

  requestAnimationFrame(loop);
}

init().catch(err => {
  console.error('Error iniciando:', err);
  alert('No se pudo acceder a la cámara.');
});
