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
  // Posición de la cara dentro del auto (relativa al tamaño normalizado)
  face: {
    x: -0.45,   // lado del conductor (-X = izquierda)
    y: 0.55,    // altura de la cabeza
    z: 0.15,    // hacia adelante (asiento delantero)
    width: 0.95,
    height: 1.15,
    rotY: 0.35  // leve giro para mirar hacia afuera de la ventanilla
  },
  glassOpacity: 0.12         // transparencia de los vidrios (0 = invisible)
};

let renderer, scene, camera, carGroup, carModel, facePlane;
let videoTexture;
let targetRotationY = 0;
let currentRotationY = 0;
let bodyMaterials = [];

export function initCarRenderer(videoEl) {
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

  // Iluminación tipo showroom
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(5, 10, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xaaccff, 0.7);
  fill.position.set(-6, 4, -4);
  scene.add(fill);

  // Grupo que rota con la cabeza (contiene auto + cara)
  carGroup = new THREE.Group();
  scene.add(carGroup);

  // Plano de la cara con la textura de cámara
  videoTexture = new THREE.VideoTexture(videoEl);
  videoTexture.colorSpace = THREE.SRGBColorSpace;
  // Espejo horizontal (efecto selfie)
  videoTexture.wrapS = THREE.RepeatWrapping;
  videoTexture.repeat.x = -1;
  videoTexture.offset.x = 1;

  const faceMat = new THREE.MeshBasicMaterial({ map: videoTexture, toneMapped: false });
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
  grad.addColorStop(0, '#2a2d4a');
  grad.addColorStop(0.55, '#1a1b2e');
  grad.addColorStop(1, '#0d0d1a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function positionFace() {
  const s = CONFIG.carTargetSize;
  const f = CONFIG.face;
  facePlane.position.set(f.x * s, f.y * s * 0.4, f.z * s);
  facePlane.scale.set(f.width, f.height, 1);
  facePlane.rotation.y = f.rotY;
}

export function setCarRotation(yaw) {
  targetRotationY = yaw * CONFIG.rotationRange;
}

export function renderCar() {
  currentRotationY += (targetRotationY - currentRotationY) * 0.08;
  carGroup.rotation.y = currentRotationY;
  renderer.render(scene, camera);
}

export async function loadCarModel(glbPath) {
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

      model.position.sub(center);
      model.scale.setScalar(scale);
      // Reposicionar: apoyar sobre el "piso" del grupo
      model.position.y += (size.y * scale) / 2 - (center.y * scale);

      // Procesar materiales: vidrios transparentes, carrocería coloreable
      model.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          const name = (mat.name || '').toLowerCase();
          const meshName = (child.name || '').toLowerCase();
          // Vidrios → transparentes para ver la cara
          if (name.includes('glass') || meshName.includes('glass') ||
              name.includes('window') || meshName.includes('window')) {
            mat.transparent = true;
            mat.opacity = CONFIG.glassOpacity;
            mat.depthWrite = false;
          }
          // Carrocería → coloreable
          if (meshName === 'body' || name.includes('body') || name.includes('paint') ||
              name.includes('carpaint') || name.includes('car_paint')) {
            bodyMaterials.push(mat);
          }
        });
      });

      carModel = model;
      carGroup.add(carModel);
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
