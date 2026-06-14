import { initCamera } from './camera.js';

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

  loop();
}

function loop() {
  // Draw camera feed mirrored (espejo — más natural para selfie)
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  requestAnimationFrame(loop);
}

init().catch(err => {
  console.error('Error iniciando cámara:', err);
  alert('No se pudo acceder a la cámara. Asegurate de dar permiso.');
});
