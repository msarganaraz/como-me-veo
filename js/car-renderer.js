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
