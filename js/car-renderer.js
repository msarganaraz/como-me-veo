import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Loader compartido con soporte DRACO (el Ferrari está comprimido)
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// ── Parámetros ajustables del efecto "cara en ventanilla" ──
const CONFIG = {
  carTargetSize: 3.4,        // largo del auto en unidades 3D (normalizado)
  rotationRange: Math.PI / 5, // ±36° de giro máximo con la cabeza
  // Posición ABSOLUTA de la cara en el espacio del auto normalizado.
  // Auto: largo ~3.4 (Z), ancho ~1.5 (X de -0.75 a 0.75), centrado.
  // Ajustada al asiento del conductor del Ferrari (ver iteración con debug).
  face: {
    x: -0.10,   // asiento delantero
    y: 0.13,    // altura de la cabeza sentada
    z: -0.25,   // cabina (detrás del parabrisas)
    width: 0.42,
    height: 0.50,
    rotY: 0
  },
  glassOpacity: 0.12         // transparencia de los vidrios (0 = invisible)
};

let renderer, scene, camera, carGroup, carModel, facePlane;
let faceTexture;
let targetRotationY = 0;
let currentRotationY = 0;
let bodyMaterials = [];

export function initCarRenderer(faceCanvas) {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const layer = document.getElementById('car-layer');
  layer.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = makeGradientBackground();

  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(3.2, 1.4, 5);
  camera.lookAt(0, 0.5, 0);

  // Iluminación tipo showroom (más brillante)
  scene.add(new THREE.AmbientLight(0xffffff, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(5, 10, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcce0ff, 1.2);
  fill.position.set(-6, 4, -4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.0);
  rim.position.set(0, 6, -8);
  scene.add(rim);

  // Grupo que rota con la cabeza (contiene auto + cara)
  carGroup = new THREE.Group();
  scene.add(carGroup);

  // Plano de la cara: usa el MISMO canvas (tamaño fijo) que entrega el
  // segmentador de persona durante toda la sesión — nunca se reasigna a
  // otro objeto ni cambia de tamaño, así Three.js no necesita reasignar
  // el almacenamiento de la textura en GPU (eso rompía el render antes).
  faceTexture = new THREE.CanvasTexture(faceCanvas);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  // Espejo horizontal (efecto selfie) vía UVs, NO vía escala negativa:
  // escalar la geometría en X invierte el winding del plano y Three.js
  // lo descarta como cara trasera (culling) → la cara quedaba invisible.
  faceTexture.wrapS = THREE.RepeatWrapping;
  faceTexture.repeat.x = -1;
  faceTexture.offset.x = 1;

  const faceMat = new THREE.MeshBasicMaterial({
    map: faceTexture,
    toneMapped: false,
    transparent: true
  });
  facePlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), faceMat);
  carGroup.add(facePlane);
  positionFace();

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    scene.background = makeGradientBackground();
  });
}

// Fondo degradado tipo estudio
function makeGradientBackground() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#dfe4ea');
  grad.addColorStop(0.55, '#c4ccd4');
  grad.addColorStop(1, '#9aa3ad');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function positionFace() {
  const f = CONFIG.face;
  facePlane.position.set(f.x, f.y, f.z);
  facePlane.scale.set(f.width, f.height, 1);
  facePlane.rotation.y = f.rotY;
}

// El canvas de la cara (mismo objeto siempre) ya fue mutado por
// updateFaceCanvas() en person-segmenter.js — solo avisamos a Three.js
// que vuelva a subir los píxeles (mismo tamaño, sin reallocs en GPU).
export function refreshFaceTexture() {
  if (faceTexture) faceTexture.needsUpdate = true;
}

export function setCarRotation(yaw) {
  targetRotationY = yaw * CONFIG.rotationRange;
}

export function renderCar() {
  currentRotationY += (targetRotationY - currentRotationY) * 0.08;
  carGroup.rotation.y = currentRotationY;
  renderer.render(scene, camera);
}

export async function loadCarModel(glbPath, spec = {}) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(glbPath, (gltf) => {
      // Quitar modelo anterior (pero conservar la cara)
      if (carModel) {
        carGroup.remove(carModel);
        carModel = null;
      }
      bodyMaterials = [];

      const model = gltf.scene;

      // Centrar y normalizar tamaño
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = CONFIG.carTargetSize / maxDim;

      // Centrar el modelo en su propio origen
      model.position.sub(center);

      // Wrapper: escala y rota el auto para verlo de FRENTE
      // (cada modelo tiene su orientación original → baseRotation por modelo)
      const wrapper = new THREE.Group();
      wrapper.add(model);
      wrapper.scale.setScalar(scale);
      wrapper.rotation.y = spec.baseRotation ?? Math.PI;

      // Nombres de material específicos del modelo (opcionales)
      const bodySpec = (spec.body || '').toLowerCase();
      const glassSpec = (spec.glass || []).map(g => g.toLowerCase());

      // Procesar materiales: vidrios transparentes, carrocería coloreable
      model.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          const name = (mat.name || '').toLowerCase();
          const meshName = (child.name || '').toLowerCase();

          // ── Vidrios → transparentes ──
          const isGlass = glassSpec.length
            ? glassSpec.some(g => name === g || name.includes(g))
            : (name.includes('glass') || meshName.includes('glass') ||
               name.includes('window') || meshName.includes('window'));
          if (isGlass) {
            mat.transparent = true;
            mat.opacity = CONFIG.glassOpacity;
            mat.depthWrite = false;
          }

          // ── Carrocería → coloreable ──
          const isBody = bodySpec
            ? (name === bodySpec || name.includes(bodySpec))
            : (meshName === 'body' || name.includes('body') || name.includes('paint') ||
               name.includes('carpaint') || name.includes('car_paint'));
          if (isBody && !isGlass) {
            bodyMaterials.push(mat);
          }
        });
      });

      carModel = wrapper;
      carGroup.add(carModel);

      // Posición de la cara específica del modelo (si la define)
      if (spec.face) Object.assign(CONFIG.face, spec.face);
      positionFace();

      resolve(model);
    }, undefined, reject);
  });
}

export function setCarColor(hexColor) {
  // Si identificamos materiales de carrocería, colorear solo esos
  if (bodyMaterials.length) {
    bodyMaterials.forEach((mat) => mat.color.set(hexColor));
    return;
  }
  // Fallback: colorear todo lo que no sea transparente
  if (!carModel) return;
  carModel.traverse((child) => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (mat.transparent && mat.opacity < 0.9) return;
        mat.color.set(hexColor);
      });
    }
  });
}
