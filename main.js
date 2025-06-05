import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';

const container = document.getElementById('threejs-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// Câmera
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.01, 1000);
camera.position.z = 0.2;

// Renderizador
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setAnimationLoop(animate);
container.appendChild(renderer.domElement);

// Controles
const controls = new OrbitControls(camera, renderer.domElement);

// Luzes
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Loader GLTF
const gltfLoader = new GLTFLoader();
let loadedModel = null;

gltfLoader.load('./assets/cartaovisita/scene.gltf',
  (gltf) => {
    console.log('Modelo carregado:', gltf);

    loadedModel = gltf.scene;
    scene.add(loadedModel);

    // Centralizar modelo
    const box = new THREE.Box3().setFromObject(loadedModel);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());

    loadedModel.position.sub(center); // Centraliza

    // Ajustar câmera com base no fov
    const fov = camera.fov * (Math.PI / 180);
    const distance = size / (2 * Math.tan(fov / 2));
    camera.position.set(center.x, center.y, distance * 1.5);
    camera.lookAt(center);
  },
  undefined,
  (error) => {
    console.error('Erro ao carregar o modelo:', error);
  }
);

// Animação
function animate() {
  if (loadedModel) {
    loadedModel.rotation.y += 0.01;
  }

  controls.update();
  renderer.render(scene, camera);
}
