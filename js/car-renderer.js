import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let renderer, scene, camera, carGroup;
let videoTexture, bgMesh;
let targetRotationY = 0;
let currentRotationY = 0;

export function initCarRenderer(videoEl) {
  // Un solo canvas WebGL para todo — cámara como textura + auto encima
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const layer = document.getElementById('car-layer');
  layer.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 5);
  camera.lookAt(0, 0.5, 0);

  // Textura de video para el fondo (cámara)
  videoTexture = new THREE.VideoTexture(videoEl);
  videoTexture.colorSpace = THREE.SRGBColorSpace;

  // Plano de fondo que cubre toda la pantalla, espejado horizontalmente
  const bgGeo = new THREE.PlaneGeometry(2, 2);
  const bgMat = new THREE.MeshBasicMaterial({ map: videoTexture, depthWrite: false });
  bgMesh = new THREE.Mesh(bgGeo, bgMat);
  // Espejo horizontal
  bgMesh.scale.x = -1;

  // Cámara ortográfica para el fondo (siempre llena la pantalla)
  const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgScene = new THREE.Scene();
  bgScene.add(bgMesh);

  // Guardar para el loop
  renderer._bgCamera = bgCamera;
  renderer._bgScene = bgScene;

  // Luces
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  // Placeholder hasta que cargue el GLB
  carGroup = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1, 4),
    new THREE.MeshStandardMaterial({ color: 0xff3333 })
  );
  carGroup.add(box);
  scene.add(carGroup);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
}

export function setCarRotation(yaw) {
  targetRotationY = yaw * Math.PI;
}

export function renderCar() {
  currentRotationY += (targetRotationY - currentRotationY) * 0.08;
  if (carGroup) carGroup.rotation.y = currentRotationY;

  // 1) Dibujar fondo de cámara (sin depth)
  renderer.autoClear = false;
  renderer.clear();
  renderer.render(renderer._bgScene, renderer._bgCamera);

  // 2) Dibujar auto encima
  renderer.clearDepth();
  renderer.render(scene, camera);
}

export async function loadCarModel(glbPath) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(glbPath, (gltf) => {
      while (carGroup.children.length) carGroup.remove(carGroup.children[0]);
      carGroup.add(gltf.scene);

      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(center);

      resolve(gltf.scene);
    }, undefined, reject);
  });
}

export function setCarColor(hexColor) {
  if (!carGroup) return;
  carGroup.traverse((child) => {
    if (child.isMesh && child.material) {
      const mat = child.material;
      if (mat.transparent && mat.opacity < 0.9) return;
      mat.color.set(hexColor);
    }
  });
}
