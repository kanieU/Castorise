import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

const container = document.getElementById('threejs-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.01,
  1000
);
camera.position.z = 0.2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setAnimationLoop(animate);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

const gltfLoader = new GLTFLoader();
let loadedModel = null;
let userTexture = null;
let selectedDecal = null;

const modelos = [
  './assets/cartao/cartao.gltf',
  './assets/caneca/caneca.gltf',
  './assets/bone/bone.gltf',
];

let modeloIndex = 0;
let editTextureMode = false;
let rotationSpeed = 0.01;

let decalPosition = null;
let decalNormal = null;
let decalScale = 0.2;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

const botaoCarimbo = document.getElementById('toggle-carimbo');
const textoCarimbo = document.querySelector('#toggle-carimbo .carimbo-text');

botaoCarimbo.dataset.ativo = 'false';

botaoCarimbo.addEventListener('click', () => {
  const isAtivo = botaoCarimbo.dataset.ativo === 'true';

  if (isAtivo) {
    botaoCarimbo.dataset.ativo = 'false';
    botaoCarimbo.classList.remove('ativo');
    if (window.innerWidth > 767) {
      textoCarimbo.textContent = '';
    }
    editTextureMode = false;
    rotationSpeed = 0.01;
    if (selectedDecal) {
      scene.remove(selectedDecal);
      selectedDecal = null;
    }
  } else {
    botaoCarimbo.dataset.ativo = 'true';
    botaoCarimbo.classList.add('ativo');
    if (window.innerWidth > 767) {
      textoCarimbo.textContent = '';
    }
    editTextureMode = true;
    rotationSpeed = 0;
  }
});

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

      const box = new THREE.Box3().setFromObject(loadedModel);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());

      loadedModel.position.x += (loadedModel.position.x - center.x);
      loadedModel.position.y += (loadedModel.position.y - center.y);
      loadedModel.position.z += (loadedModel.position.z - center.z);

      scene.add(loadedModel);

      const fov = camera.fov * (Math.PI / 180);
      const distance = size / (2 * Math.tan(fov / 2));

      camera.position.set(0, 0, distance * 1.5);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    },
    undefined,
    (error) => console.error('Erro ao carregar modelo:', error)
  );
}

carregarModelo(modelos[modeloIndex]);

document.querySelectorAll('.botao-three')[1].addEventListener('click', () => {
  modeloIndex = (modeloIndex + 1) % modelos.length;
  carregarModelo(modelos[modeloIndex]);
});
document.querySelectorAll('.botao-three')[0].addEventListener('click', () => {
  modeloIndex = (modeloIndex - 1 + modelos.length) % modelos.length;
  carregarModelo(modelos[modeloIndex]);
});

document.getElementById('myFile').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const loader = new THREE.TextureLoader();
    loader.load(e.target.result, function (texture) {
      userTexture = texture;
      userTexture.needsUpdate = true;
      console.log('Texture loaded');
    });
  };
  reader.readAsDataURL(file);
});

renderer.domElement.addEventListener('click', function (event) {
  if (!editTextureMode || !loadedModel || !userTexture) return;

  const mouse = new THREE.Vector2(
    (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
    -(event.clientY / renderer.domElement.clientHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(loadedModel, true);

  if (intersects.length > 0) {
    const intersect = intersects[0];
    decalPosition = intersect.point.clone();
    decalNormal = intersect.face.normal.clone().transformDirection(intersect.object.matrixWorld);

    createOrUpdateDecal();
    isDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
});

renderer.domElement.addEventListener('mousemove', function (event) {
  if (editTextureMode && isDragging && decalPosition) {
    const dx = (event.clientX - lastMouseX) * 0.001;
    const dy = (event.clientY - lastMouseY) * 0.001;

    decalPosition.x += dx;
    decalPosition.y -= dy;

    createOrUpdateDecal();

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
});

renderer.domElement.addEventListener('mouseup', () => {
  isDragging = false;
});

renderer.domElement.addEventListener('wheel', function (event) {
  if (editTextureMode && selectedDecal) {
    const delta = event.deltaY < 0 ? 1.1 : 0.9;
    decalScale *= delta;
    createOrUpdateDecal();
  }
});

function createOrUpdateDecal() {
  if (!decalPosition || !decalNormal) return;

  if (selectedDecal) {
    scene.remove(selectedDecal);
    selectedDecal.geometry.dispose();
    selectedDecal.material.dispose();
    selectedDecal = null;
  }

  const orientation = new THREE.Euler();
  const up = new THREE.Vector3(0, 1, 0);
  const lookAtMatrix = new THREE.Matrix4();
  lookAtMatrix.lookAt(new THREE.Vector3(), decalNormal, up);
  orientation.setFromRotationMatrix(lookAtMatrix);

  const size = new THREE.Vector3(decalScale, decalScale, decalScale);

  const decalGeom = new DecalGeometry(loadedModel, decalPosition, orientation, size);

  const decalMat = new THREE.MeshBasicMaterial({
    map: userTexture,
    transparent: true,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });

  selectedDecal = new THREE.Mesh(decalGeom, decalMat);
  scene.add(selectedDecal);
}

function animate() {
  if (loadedModel && !editTextureMode) {
    loadedModel.rotation.y += rotationSpeed;
  }

  if (editTextureMode && loadedModel) {
    rotationSpeed = 0;
  }

  controls.update();
  renderer.render(scene, camera);
}
