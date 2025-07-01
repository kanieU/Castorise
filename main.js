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

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

const gltfLoader = new GLTFLoader();
let loadedModel = null;
let userTexture = null;

const modelos = [
  './assets/cartao/cartao.gltf',
  './assets/caneca/caneca.gltf',
  './assets/bone/bone.gltf',
];

let modeloIndex = 0;

let editTextureMode = false;

document.getElementById('toggle-carimbo').addEventListener('click', () => {
  editTextureMode = !editTextureMode;
  document.getElementById('toggle-carimbo').textContent = editTextureMode
    ? 'Desativar Modo Mockup'
    : 'Ativar Modo Mockup';
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
      scene.add(loadedModel);

      const box = new THREE.Box3().setFromObject(loadedModel);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());

      loadedModel.position.sub(center);

      const fov = camera.fov * (Math.PI / 180);
      const distance = size / (2 * Math.tan(fov / 2));
      camera.position.set(center.x, center.y, distance * 1.5);
      camera.lookAt(center);

      controls.target.copy(center);
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

// Upload
document.getElementById('myFile').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const loader = new THREE.TextureLoader();
    loader.load(e.target.result, function (texture) {
      userTexture = texture;
    });
  };
  reader.readAsDataURL(file);
});

// Mockup Decalque ao clicar no objeto
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
    const position = intersect.point;
    const normal = intersect.face.normal.clone().transformDirection(intersect.object.matrixWorld);

    const orientation = new THREE.Euler();
    orientation.setFromVector3(normal);

    const decalSize = new THREE.Vector3(0.2, 0.2, 0.2);

    const decalGeom = new DecalGeometry(intersect.object, position, orientation, decalSize);

    const decalMat = new THREE.MeshBasicMaterial({
      map: userTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });

    const decalMesh = new THREE.Mesh(decalGeom, decalMat);
    scene.add(decalMesh);
  }
});

function animate() {
  if (loadedModel && !editTextureMode) {
    loadedModel.rotation.y += 0.01;
  }
  controls.update();
  renderer.render(scene, camera);
}
