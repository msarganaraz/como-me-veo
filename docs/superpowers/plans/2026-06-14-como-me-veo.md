# "¿Cómo me veo?" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile AR web app where the user's face appears through the driver-side window of a 3D car that rotates with head movement, with model and color selector.

**Architecture:** A `<canvas>` element composites the camera feed (background) with a Three.js offscreen render (car with transparent windows on top). MediaPipe FaceLandmarker runs on the video stream each frame to extract a yaw angle, which drives the Three.js car Y-rotation via lerp smoothing. All JS modules use native ES modules loaded via importmap — no build step needed.

**Tech Stack:** MediaPipe Tasks Vision 0.10.14, Three.js r165, GLTFLoader, HTML5 Canvas 2D API, GitHub Pages

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | App shell, importmap, DOM structure, UI panels |
| `css/style.css` | Mobile-first full-screen layout, bottom panel |
| `js/app.js` | Entry point: init all modules, main RAF loop, orchestration |
| `js/camera.js` | Camera stream init, video element management |
| `js/face-tracker.js` | MediaPipe FaceLandmarker init, detectForVideo, yaw calculation |
| `js/car-renderer.js` | Three.js scene, offscreen renderer, GLB loader, color/model switching |
| `modelos/` | GLB files (one per car model) |

---

## Task 1: Project scaffold + HTML shell

**Files:**
- Create: `index.html`
- Create: `css/style.css`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>¿Cómo me veo?</title>
  <link rel="stylesheet" href="css/style.css">
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <video id="video" autoplay playsinline muted></video>
  <canvas id="main"></canvas>

  <div id="hint">← mové la cabeza →</div>

  <div id="panel">
    <div id="model-chips"></div>
    <div id="color-dots"></div>
  </div>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `css/style.css`**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #000;
  overflow: hidden;
  width: 100vw;
  height: 100vh;
  font-family: sans-serif;
}

#video {
  display: none;
}

#main {
  position: fixed;
  top: 0; left: 0;
  width: 100vw;
  height: 100vh;
  display: block;
}

#hint {
  position: fixed;
  top: 40%;
  width: 100%;
  text-align: center;
  color: rgba(255,255,255,0.6);
  font-size: 14px;
  letter-spacing: 2px;
  pointer-events: none;
  transition: opacity 1s;
}

#hint.hidden { opacity: 0; }

#panel {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(8px);
  padding: 12px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#model-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

#model-chips::-webkit-scrollbar { display: none; }

.chip {
  flex-shrink: 0;
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.3);
  color: rgba(255,255,255,0.7);
  font-size: 13px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.chip.active {
  background: #fff;
  color: #000;
  border-color: #fff;
}

#color-dots {
  display: flex;
  gap: 10px;
  padding-left: 4px;
}

.dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.dot.active {
  border-color: #fff;
}
```

- [ ] **Step 3: Verificar en browser**

Corré `python -m http.server 8080` en `C:\Claude\Auto` y abrí `http://localhost:8080`.

Esperado: pantalla negra con panel oscuro en la parte inferior. Sin errores en la consola del browser.

- [ ] **Step 4: Commit**

```bash
cd C:/Claude/Auto
git init
git add index.html css/style.css
git commit -m "feat: scaffold HTML shell and mobile CSS"
```

---

## Task 2: Camera feed en canvas

**Files:**
- Create: `js/camera.js`
- Create: `js/app.js` (stub)

- [ ] **Step 1: Crear `js/camera.js`**

```javascript
export async function initCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return videoEl;
}
```

- [ ] **Step 2: Crear `js/app.js` (stub con cámara)**

```javascript
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
```

- [ ] **Step 3: Verificar en browser**

Abrí `http://localhost:8080`. El browser va a pedir permiso de cámara. Al aceptar, deberías ver tu cara en la pantalla completa (efecto espejo). El panel inferior permanece visible.

- [ ] **Step 4: Commit**

```bash
git add js/camera.js js/app.js
git commit -m "feat: camera feed on canvas with mirror effect"
```

---

## Task 3: Three.js renderer (con cubo placeholder)

**Files:**
- Create: `js/car-renderer.js`

- [ ] **Step 1: Crear `js/car-renderer.js`**

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let renderer, scene, camera, carGroup;
let targetRotationY = 0;
let currentRotationY = 0;

export function initCarRenderer() {
  // Offscreen canvas — Three.js renderiza aquí
  const offscreen = document.createElement('canvas');
  offscreen.width = window.innerWidth;
  offscreen.height = window.innerHeight;

  renderer = new THREE.WebGLRenderer({
    canvas: offscreen,
    alpha: true,        // fondo transparente
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0); // transparente

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 5);
  camera.lookAt(0, 0.5, 0);

  // Iluminación
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  // Placeholder: cubo rojo hasta que llegue el GLB
  carGroup = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(2, 1, 4);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xff3333 });
  const box = new THREE.Mesh(boxGeo, boxMat);
  carGroup.add(box);
  scene.add(carGroup);

  window.addEventListener('resize', () => {
    offscreen.width = window.innerWidth;
    offscreen.height = window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  return renderer;
}

export function setCarRotation(yaw) {
  // yaw en rango -1..1 → rotación -PI..PI
  targetRotationY = yaw * Math.PI;
}

export function renderCar() {
  // Suavizado con lerp (factor 0.08 = movimiento fluido)
  currentRotationY += (targetRotationY - currentRotationY) * 0.08;
  if (carGroup) carGroup.rotation.y = currentRotationY;
  renderer.render(scene, camera);
  return renderer.domElement; // canvas con el auto renderizado
}

export async function loadCarModel(glbPath) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      glbPath,
      (gltf) => {
        // Remover contenido anterior
        while (carGroup.children.length) carGroup.remove(carGroup.children[0]);
        carGroup.add(gltf.scene);

        // Centrar el modelo
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.sub(center);

        resolve(gltf.scene);
      },
      undefined,
      reject
    );
  });
}

export function setCarColor(hexColor) {
  if (!carGroup) return;
  carGroup.traverse((child) => {
    if (child.isMesh && child.material) {
      // Sólo colorea materiales de carrocería (no vidrios)
      const mat = child.material;
      if (mat.transparent && mat.opacity < 0.9) return;
      mat.color.set(hexColor);
    }
  });
}
```

- [ ] **Step 2: Actualizar `js/app.js` para incorporar el renderer**

Reemplazá el contenido completo de `js/app.js`:

```javascript
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
```

- [ ] **Step 3: Verificar en browser**

Recargá `http://localhost:8080`. Deberías ver tu imagen de cámara con un cubo rojo 3D superpuesto en el centro de la pantalla.

- [ ] **Step 4: Commit**

```bash
git add js/car-renderer.js js/app.js
git commit -m "feat: Three.js offscreen renderer composited on camera canvas"
```

---

## Task 4: MediaPipe face tracking + cálculo de yaw

**Files:**
- Create: `js/face-tracker.js`

- [ ] **Step 1: Crear `js/face-tracker.js`**

```javascript
import { FaceLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js';

let faceLandmarker = null;
let lastTimestamp = -1;

export async function initFaceTracker() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
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

  // Matrix 4x4 column-major del primer rostro detectado
  const m = result.facialTransformationMatrixes[0].data;

  // Yaw (rotación Y) del modelo de transformación facial
  // m[0] = cos(yaw), m[8] = sin(yaw) en coordenadas de cámara
  const rawYaw = Math.atan2(m[8], m[0]);

  // Normalizar a rango -1..1 (±60° = rango máximo)
  return Math.max(-1, Math.min(1, rawYaw / (Math.PI / 3)));
}
```

- [ ] **Step 2: Actualizar `js/app.js` para conectar face tracking**

Reemplazá el contenido completo de `js/app.js`:

```javascript
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
```

- [ ] **Step 3: Verificar en browser**

Recargá `http://localhost:8080`. Esperá ~5 segundos a que cargue MediaPipe (descarga ~30MB la primera vez). Luego mové la cabeza izquierda/derecha — el cubo rojo debe rotar suavemente. La consola debe mostrar "Face tracker listo".

- [ ] **Step 4: Commit**

```bash
git add js/face-tracker.js js/app.js
git commit -m "feat: MediaPipe face tracking drives car rotation via yaw"
```

---

## Task 5: Conseguir modelo GLB del auto

**Files:**
- Add: `modelos/auto.glb`

- [ ] **Step 1: Descargar modelo gratuito de Sketchfab**

Entrá a este link (modelo de auto gratuito con licencia CC):
`https://sketchfab.com/tags/car?features=downloadable&sort_by=-likeCount`

Buscá un modelo que:
- Tenga botón "Download" disponible (no bloqueado por Pro)
- Sea un auto de perfil reconocible (sedan, SUV, pickup)
- Descargues en formato `.glb` o `.gltf`

Alternativa directa si el anterior no funciona, buscá en Sketchfab:
- "low poly car free download glb"

- [ ] **Step 2: Colocar el GLB**

Renombrá el archivo descargado a `auto.glb` y copialo a `C:\Claude\Auto\modelos\auto.glb`.

- [ ] **Step 3: Actualizar `js/app.js` para cargar el GLB**

Agregá el import y la llamada a `loadCarModel` en el `init()`:

```javascript
import { initCamera } from './camera.js';
import { initCarRenderer, renderCar, setCarRotation, loadCarModel } from './car-renderer.js';
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

  // Cargar modelo GLB
  loadCarModel('modelos/auto.glb')
    .then(() => console.log('Modelo cargado'))
    .catch(err => console.warn('Error cargando GLB, usando placeholder:', err));

  initFaceTracker().then(() => console.log('Face tracker listo'));

  setTimeout(() => hint.classList.add('hidden'), 3000);

  loop();
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
```

- [ ] **Step 4: Verificar**

Recargá el browser. El cubo rojo debe reemplazarse por el modelo 3D del auto. Si el auto aparece muy grande o muy chico, ajustá `camera.position.set(0, 1.5, 5)` en `car-renderer.js` (acercá o alejá el `z`).

- [ ] **Step 5: Commit**

```bash
git add modelos/auto.glb js/app.js
git commit -m "feat: load real GLB car model"
```

---

## Task 6: Selector de modelos (chips)

**Files:**
- Create: `js/models-config.js`
- Modify: `js/app.js`

- [ ] **Step 1: Crear `js/models-config.js`**

```javascript
export const MODELS = [
  {
    id: 'auto',
    label: 'Auto',
    glb: 'modelos/auto.glb',
    colors: [
      { label: 'Negro', hex: '#1a1a1a' },
      { label: 'Rojo', hex: '#c0392b' },
      { label: 'Azul', hex: '#2980b9' },
      { label: 'Blanco', hex: '#ecf0f1' }
    ]
  }
  // Agregá más modelos acá cuando tengas más GLBs:
  // { id: 'suv', label: 'SUV', glb: 'modelos/suv.glb', colors: [...] }
];
```

- [ ] **Step 2: Actualizar `js/app.js` con selector de modelos y colores**

Reemplazá el contenido completo:

```javascript
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
  await initCamera(video);

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

  setTimeout(() => hint.classList.add('hidden'), 3000);

  loop();
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
```

- [ ] **Step 3: Verificar**

Recargá el browser. El panel inferior debe mostrar el chip "Auto" activo y 4 dots de color. Al hacer clic en un dot, el color del auto debe cambiar.

- [ ] **Step 4: Commit**

```bash
git add js/models-config.js js/app.js
git commit -m "feat: model chip selector and color dot picker"
```

---

## Task 7: Deploy a GitHub Pages

**Files:** ninguno nuevo — solo git remoto

- [ ] **Step 1: Crear repositorio en GitHub**

En el browser, abrí `https://github.com/new` y creá un repositorio llamado `como-me-veo`. Público, sin README ni .gitignore.

- [ ] **Step 2: Conectar y pushear**

```bash
cd C:/Claude/Auto
git remote add origin https://github.com/msarganaraz/como-me-veo.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Habilitar GitHub Pages**

En el repositorio en GitHub: Settings → Pages → Source: "Deploy from a branch" → Branch: `main` → folder: `/ (root)` → Save.

- [ ] **Step 4: Verificar**

Esperá 2-3 minutos y abrí `https://msarganaraz.github.io/como-me-veo/` desde el celular.

La cámara frontal debe activarse y el auto debe rotar con el movimiento de la cabeza.

- [ ] **Step 5: Generar QR**

Para generar el QR de la URL, abrí `https://qr.io` o `https://qrcode.tec-it.com` y pegá la URL. Descargá el QR para usarlo en el concesionario.

---

## Notas de implementación

**Si el auto aparece muy pequeño:** En `car-renderer.js`, bajá el `z` de la cámara: `camera.position.set(0, 1.5, 3)`.

**Si el auto aparece muy grande:** Subí el `z`: `camera.position.set(0, 1.5, 8)`.

**Si la rotación es inversa (mueve cabeza izquierda y el auto rota derecha):** En `face-tracker.js`, negá el yaw: `return Math.max(-1, Math.min(1, -rawYaw / (Math.PI / 3)));`

**Si MediaPipe no carga (timeout):** Verificar que el servidor esté en HTTPS (GitHub Pages) o localhost. MediaPipe requiere HTTPS salvo en localhost.

**Para agregar un modelo nuevo:**
1. Agregá el `.glb` en `modelos/`
2. Agregá el objeto en `MODELS` dentro de `js/models-config.js`
