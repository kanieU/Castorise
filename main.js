import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.getElementById('threejs-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// Câmera
const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.01,
  1000
);
camera.position.z = 0.2;

// Renderizador
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setAnimationLoop(animate);
container.appendChild(renderer.domElement);

// Controles
const controls = new OrbitControls(camera, renderer.domElement);

// Luzes
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Loader GLTF
const gltfLoader = new GLTFLoader();
let loadedModel = null;
let userTexture = null;

const modelos = [
  './assets/cartao/cartao.gltf',
  './assets/caneca/caneca.gltf',
  './assets/bone/bone.gltf',
];

let modeloIndex = 0;

// Função para carregar o modelo
function carregarModelo(url) {
  if (loadedModel) {
    scene.remove(loadedModel);
    loadedModel.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if (mat.map) mat.map.dispose();
            mat.dispose();
          });
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    });
    loadedModel = null;
  }

  gltfLoader.load(
    url,
    (gltf) => {
      loadedModel = gltf.scene;
      scene.add(loadedModel);

      const box = new THREE.Box3().setFromObject(loadedModel);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());

      loadedModel.position.sub(center);

      const fov = camera.fov * (Math.PI / 180);
      const distance = size / (2 * Math.tan(fov / 2));
      camera.position.set(center.x, center.y, distance * 1.5);
      camera.lookAt(center);

      if (userTexture) aplicarTextura(userTexture);
    },
    undefined,
    (error) => console.error('Erro ao carregar modelo:', error)
  );
}

// Função para aplicar textura (com suporte multi-material)
function aplicarTextura(texture) {
  if (!loadedModel) return;

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  texture.repeat.set(
    parseFloat(document.getElementById('repeatX').value) || 0.3,
    parseFloat(document.getElementById('repeatY').value) || 0.3
  );
  texture.offset.set(
    parseFloat(document.getElementById('offsetX').value) || 0,
    parseFloat(document.getElementById('offsetY').value) || 0
  );
  texture.needsUpdate = true;

  loadedModel.traverse((child) => {
    if (child.isMesh) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          mat.map = texture;
          mat.needsUpdate = true;
        });
      } else {
        child.material.map = texture;
        child.material.needsUpdate = true;
      }
    }
  });
}

// Primeira carga
carregarModelo(modelos[modeloIndex]);

// Botões ← →
document.querySelectorAll('.botao-three')[1].addEventListener('click', () => {
  modeloIndex = (modeloIndex + 1) % modelos.length;
  carregarModelo(modelos[modeloIndex]);
});
document.querySelectorAll('.botao-three')[0].addEventListener('click', () => {
  modeloIndex = (modeloIndex - 1 + modelos.length) % modelos.length;
  carregarModelo(modelos[modeloIndex]);
});

// Upload de textura usando TextureLoader (seguro!)
document.getElementById('myFile').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const loader = new THREE.TextureLoader();
    loader.load(e.target.result, function (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      userTexture = texture;
      aplicarTextura(texture);
    });
  };
  reader.readAsDataURL(file);
});

// Sliders para ajuste dinâmico
['repeatX', 'repeatY', 'offsetX', 'offsetY'].forEach((id) => {
  document.getElementById(id).addEventListener('input', () => {
    if (userTexture) aplicarTextura(userTexture);
  });
});

// Animação
function animate() {
  if (loadedModel) loadedModel.rotation.y += 0.01;
  controls.update();
  renderer.render(scene, camera);
}
