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
let userTexture = null; // 🔑 Nova variável para guardar a textura do usuário

// Função para carregar modelo
function carregarModelo(url) {
  if (loadedModel) {
    scene.remove(loadedModel);
    loadedModel.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
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

      // 🔑 Se existir textura do usuário, aplica de novo
      if (userTexture) {
        aplicarTextura(userTexture);
      }
    },
    undefined,
    (error) => {
      console.error('Erro ao carregar o modelo:', error);
    }
  );
}

// Função para aplicar textura em todas as meshes do modelo atual
function aplicarTextura(texture) {
  if (!loadedModel) return;

  loadedModel.traverse((child) => {
    if (child.isMesh) {
      if (child.material.map) {
        child.material.map.dispose();
      }
      child.material.map = texture;
      child.material.needsUpdate = true;
    }
  });
}

// Carrega o primeiro modelo (cartão de visita)
carregarModelo('./assets/cartaovisita/scene.gltf');

// Seleciona os botões ← e →
const buttons = document.querySelectorAll('.botao-three');
const prevButton = buttons[0]; // ←
const nextButton = buttons[1]; // →

// Botão → troca para caneca
nextButton.addEventListener('click', () => {
  carregarModelo('./assets/caneca/caneca.gltf');
});

// Botão ← volta para cartão de visita
prevButton.addEventListener('click', () => {
  carregarModelo('./assets/cartaovisita/scene.gltf');
});

// Animação
function animate() {
  if (loadedModel) {
    loadedModel.rotation.y += 0.01;
  }

  controls.update();
  renderer.render(scene, camera);
}

// Input de imagem do usuário
document.getElementById('myFile').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;

      userTexture = texture; // 🔑 Salva a textura pra ser reaplicada depois

      aplicarTextura(userTexture); // Aplica no modelo atual
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});
