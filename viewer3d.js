// viewer3d.js
// Fenix A320 Livery Studio — 3D-Live-Vorschau (Three.js, ES-Module)
// Nur relative Pfade für lokale Assets ("./assets/a320.glb") — GitHub-Pages-kompatibel.
// "three" und "three/addons/" werden über die Import-Map in index.html aufgelöst.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODEL_URL = './assets/a320.glb';

// Namens-Konvention: Damit die Livery-Textur exakt auf den richtigen Mesh(en)
// landet, sollte im 3D-Programm (Blender etc.) das Material der lackierbaren
// Außenhaut "Livery" (oder ein Name, der einen der folgenden Begriffe enthält)
// heißen. Wird kein Treffer gefunden, wird die Textur vorsorglich auf ALLE
// Materialien des Modells gelegt, damit man sofort ein Ergebnis sieht.
const LIVERY_MATERIAL_HINTS = ['livery', 'fuselage', 'rumpf', 'paint', 'lackierung', 'body'];

// Kamera-Presets werden relativ zur berechneten Bounding-Box des geladenen
// Modells positioniert (nicht mit absoluten Koordinaten), damit die Presets
// auch bei abweichender Modellgröße/-skalierung sinnvolle Ansichten liefern.
// Die longitudinale Achse (Rumpflänge) wird automatisch anhand der größeren
// horizontalen Ausdehnung (X vs. Z) erkannt; "Nase" wird auf die negative
// Seite dieser Achse gelegt. Falls das eigene Modell anders ausgerichtet ist,
// hier die Vorzeichen/Faktoren anpassen.
const CAMERA_PRESET_CONFIG = {
  overall: { distanceFactor: 1.35, elevation: 0.55, side: 0.9 },
  cockpit: { alongFactor: -0.9, elevation: 0.15, sideFactor: 0.35, distanceFactor: 0.35 },
  tail: { alongFactor: 0.85, elevation: 0.75, sideFactor: 0.55, distanceFactor: 0.55 },
  engine: { alongFactor: -0.1, elevation: -0.25, sideFactor: 0.7, distanceFactor: 0.4 },
};

const state3d = {
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  stage: null,
  canvasEl: null,
  fabricCanvas: null,
  liveryTexture: null,
  liveryMaterials: [],
  modelRoot: null,
  bounds: null, // { center: THREE.Vector3, size: THREE.Vector3, longAxis: 'x' | 'z', length: number }
  cameraAnimation: null,
  resizeObserver: null,
};

document.addEventListener('DOMContentLoaded', () => {
  initScene();
  initLighting();
  setupCameraPresetButtons();
  setupPbrControls();
  loadAircraftModel();
  observeViewportResize();
  startRenderLoop();
});

// Wartet auf das vom klassischen main.js gefeuerte Event und hängt sich dann
// an den Fabric-Canvas, um die 3D-Textur bei jeder 2D-Änderung zu aktualisieren.
document.addEventListener('livery:canvas-ready', (e) => {
  attachLiveTexture(e.detail.canvasElement, e.detail.fabricCanvas);
});

/* ==========================================================
   SZENE, KAMERA, RENDERER, CONTROLS
   ========================================================== */

function initScene() {
  state3d.stage = document.getElementById('viewport-3d-stage');
  state3d.canvasEl = document.getElementById('viewport-3d');

  state3d.renderer = new THREE.WebGLRenderer({
    canvas: state3d.canvasEl,
    antialias: true,
    alpha: true,
  });
  state3d.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state3d.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  state3d.renderer.toneMappingExposure = 1.05;
  state3d.renderer.outputColorSpace = THREE.SRGBColorSpace;

  state3d.scene = new THREE.Scene();
  state3d.scene.background = new THREE.Color(0x070a0e);

  state3d.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 5000);
  state3d.camera.position.set(8, 4, 10);

  state3d.controls = new OrbitControls(state3d.camera, state3d.renderer.domElement);
  state3d.controls.enableDamping = true;
  state3d.controls.dampingFactor = 0.08;
  state3d.controls.minDistance = 0.5;
  state3d.controls.maxDistance = 500;
  state3d.controls.target.set(0, 0, 0);

  // Umgebungsreflexion (PMREM aus einem einfachen "RoomEnvironment"), damit
  // Metallic/Roughness auf der Lackierung sichtbar auf Licht reagieren.
  const pmremGenerator = new THREE.PMREMGenerator(state3d.renderer);
  state3d.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  resizeRendererToStage();
}

function initLighting() {
  const hemiLight = new THREE.HemisphereLight(0xbfd9ff, 0x0b0f14, 0.6);
  state3d.scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(6, 9, 6);
  state3d.scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x33e1ff, 0.4);
  rimLight.position.set(-8, 3, -6);
  state3d.scene.add(rimLight);

  const grid = new THREE.GridHelper(40, 40, 0x232c36, 0x182029);
  grid.position.y = -2.5;
  state3d.scene.add(grid);
}

function resizeRendererToStage() {
  if (!state3d.stage || !state3d.renderer) return;
  const width = Math.max(1, state3d.stage.clientWidth);
  const height = Math.max(1, state3d.stage.clientHeight);
  state3d.renderer.setSize(width, height, false);
  state3d.camera.aspect = width / height;
  state3d.camera.updateProjectionMatrix();
}

function observeViewportResize() {
  state3d.resizeObserver = new ResizeObserver(() => resizeRendererToStage());
  state3d.resizeObserver.observe(state3d.stage);
}

function startRenderLoop() {
  const tick = () => {
    state3d.controls.update();
    state3d.renderer.render(state3d.scene, state3d.camera);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ==========================================================
   GLTF-MODELL LADEN
   ========================================================== */

function loadAircraftModel() {
  const statusEl = document.getElementById('viewport-3d-status');
  const loader = new GLTFLoader();

  loader.load(
    MODEL_URL,
    (gltf) => {
      state3d.modelRoot = gltf.scene;
      state3d.scene.add(state3d.modelRoot);

      state3d.modelRoot.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });

      computeBounds();
      centerAndFrameModel();
      collectLiveryMaterials();
      applyLiveTextureIfReady();
      applyPbrValuesFromUi();
      focusCameraPreset('overall', true);

      if (statusEl) statusEl.style.display = 'none';
    },
    (progressEvent) => {
      if (!statusEl || !progressEvent.total) return;
      const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
      statusEl.textContent = `3D-Modell wird geladen … ${percent}%`;
    },
    (error) => {
      console.error('A320-Modell konnte nicht geladen werden:', error);
      if (statusEl) {
        statusEl.style.display = 'flex';
        statusEl.textContent =
          `Modell nicht gefunden unter "${MODEL_URL}". Bitte a320.glb dort ablegen.`;
      }
    }
  );
}

function computeBounds() {
  const box = new THREE.Box3().setFromObject(state3d.modelRoot);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const longAxis = size.x >= size.z ? 'x' : 'z';
  const length = longAxis === 'x' ? size.x : size.z;

  state3d.bounds = { box, center, size, longAxis, length };
}

// Zentriert das Modell auf den Welt-Ursprung, damit OrbitControls-Target und
// Kamera-Presets unabhängig von der Export-Position des Modells funktionieren.
function centerAndFrameModel() {
  if (!state3d.bounds) return;
  const { center } = state3d.bounds;
  state3d.modelRoot.position.sub(center);
  // Bounding Box nach dem Verschieben neu berechnen (jetzt um den Ursprung).
  computeBounds();
}

/* ==========================================================
   LIVERY-MATERIAL FINDEN & LIVE-TEXTUR VERKNÜPFEN
   ========================================================== */

function collectLiveryMaterials() {
  const matched = new Set();
  const all = new Set();

  state3d.modelRoot.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];

    materials.forEach((mat) => {
      all.add(mat);
      const haystack = `${mat.name || ''} ${child.name || ''}`.toLowerCase();
      const isLiveryCandidate = LIVERY_MATERIAL_HINTS.some((hint) => haystack.includes(hint));
      if (isLiveryCandidate) matched.add(mat);
    });
  });

  if (matched.size > 0) {
    state3d.liveryMaterials = Array.from(matched);
  } else {
    console.warn(
      '[Livery Studio] Kein Material mit Namen wie "Livery" gefunden — ' +
        'die 2D-Textur wird vorsorglich auf alle Materialien des Modells angewendet. ' +
        'Für präzises UV-Mapping ein Material "Livery" auf der Rumpf-/Außenhaut-Mesh benennen.'
    );
    state3d.liveryMaterials = Array.from(all);
  }
}

// Wird sowohl beim Modell-Laden als auch beim Fabric-"ready"-Event aufgerufen —
// je nachdem, was zuerst eintritt, wird hier die Verknüpfung fertiggestellt.
function attachLiveTexture(canvasElement, fabricCanvas) {
  state3d.canvasEl2d = canvasElement;
  state3d.fabricCanvas = fabricCanvas;

  if (!state3d.liveryTexture) {
    state3d.liveryTexture = new THREE.CanvasTexture(canvasElement);
    // Korrektes UV-Mapping: Fabric zeichnet mit Ursprung oben links,
    // ohne flipY würde die Textur auf dem Modell vertikal gespiegelt sein.
    state3d.liveryTexture.flipY = false;
    state3d.liveryTexture.colorSpace = THREE.SRGBColorSpace;
    // Live-Updates sind pro Frame teuer mit Mipmaps — daher deaktiviert.
    state3d.liveryTexture.generateMipmaps = false;
    state3d.liveryTexture.minFilter = THREE.LinearFilter;
    state3d.liveryTexture.magFilter = THREE.LinearFilter;
    state3d.liveryTexture.needsUpdate = true;
  }

  // Bei jeder Fabric-Render-Passe (Objekt hinzugefügt/verschoben/eingefärbt,
  // Text bearbeitet, Bild eingefügt, Undo/Redo, Projekt geladen usw.) wird
  // die Three.js-Textur live aktualisiert.
  fabricCanvas.on('after:render', () => {
    if (state3d.liveryTexture) state3d.liveryTexture.needsUpdate = true;
  });

  applyLiveTextureIfReady();
}

function applyLiveTextureIfReady() {
  if (!state3d.liveryTexture || state3d.liveryMaterials.length === 0) return;

  state3d.liveryMaterials.forEach((mat) => {
    mat.map = state3d.liveryTexture;
    mat.needsUpdate = true;
  });
}

/* ==========================================================
   PBR-REGLER (ROUGHNESS / METALNESS)
   ========================================================== */

function setupPbrControls() {
  const roughnessInput = document.getElementById('pbr-roughness-range');
  const roughnessLabel = document.getElementById('pbr-roughness-value');
  const metalnessInput = document.getElementById('pbr-metalness-range');
  const metalnessLabel = document.getElementById('pbr-metalness-value');

  if (roughnessInput) {
    roughnessInput.addEventListener('input', () => {
      const value = parseFloat(roughnessInput.value);
      if (roughnessLabel) roughnessLabel.textContent = value.toFixed(2);
      setLiveryRoughness(value);
    });
  }

  if (metalnessInput) {
    metalnessInput.addEventListener('input', () => {
      const value = parseFloat(metalnessInput.value);
      if (metalnessLabel) metalnessLabel.textContent = value.toFixed(2);
      setLiveryMetalness(value);
    });
  }
}

function applyPbrValuesFromUi() {
  const roughnessInput = document.getElementById('pbr-roughness-range');
  const metalnessInput = document.getElementById('pbr-metalness-range');
  if (roughnessInput) setLiveryRoughness(parseFloat(roughnessInput.value));
  if (metalnessInput) setLiveryMetalness(parseFloat(metalnessInput.value));
}

function setLiveryRoughness(value) {
  state3d.liveryMaterials.forEach((mat) => {
    if ('roughness' in mat) {
      mat.roughness = value;
      mat.needsUpdate = true;
    }
  });
}

function setLiveryMetalness(value) {
  state3d.liveryMaterials.forEach((mat) => {
    if ('metalness' in mat) {
      mat.metalness = value;
      mat.needsUpdate = true;
    }
  });
}

/* ==========================================================
   KAMERA-PRESETS
   ========================================================== */

function setupCameraPresetButtons() {
  const buttons = document.querySelectorAll('[data-camera-preset]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      focusCameraPreset(btn.dataset.cameraPreset, false);
      buttons.forEach((b) => b.removeAttribute('data-active'));
      btn.setAttribute('data-active', 'true');
    });
  });
}

function focusCameraPreset(presetName, instant) {
  if (!state3d.bounds) return; // Modell noch nicht geladen

  const { center, size, longAxis, length } = state3d.bounds;
  const longVec = longAxis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const sideVec = longAxis === 'x' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  const maxSpan = Math.max(size.x, size.y, size.z, 1);

  let targetPoint;
  let cameraPoint;

  if (presetName === 'overall') {
    const cfg = CAMERA_PRESET_CONFIG.overall;
    const distance = maxSpan * cfg.distanceFactor + length * 0.6;
    cameraPoint = center
      .clone()
      .add(longVec.clone().multiplyScalar(distance * cfg.side))
      .add(new THREE.Vector3(0, distance * cfg.elevation, 0))
      .add(sideVec.clone().multiplyScalar(distance * 0.7));
    targetPoint = center.clone();
  } else {
    const cfg = CAMERA_PRESET_CONFIG[presetName];
    if (!cfg) return;
    const along = longVec.clone().multiplyScalar(length * cfg.alongFactor);
    const focus = center.clone().add(along).add(new THREE.Vector3(0, size.y * cfg.elevation * 0.5, 0));
    const distance = Math.max(1.5, maxSpan * cfg.distanceFactor);
    cameraPoint = focus
      .clone()
      .add(sideVec.clone().multiplyScalar(distance * cfg.sideFactor))
      .add(new THREE.Vector3(0, distance * 0.5 + size.y * cfg.elevation, 0))
      .add(longVec.clone().multiplyScalar(distance * 0.25));
    targetPoint = focus;
  }

  animateCameraTo(cameraPoint, targetPoint, instant ? 0 : 650);
}

function animateCameraTo(position, target, durationMs) {
  if (state3d.cameraAnimation) cancelAnimationFrame(state3d.cameraAnimation.frameId);

  if (durationMs <= 0) {
    state3d.camera.position.copy(position);
    state3d.controls.target.copy(target);
    state3d.controls.update();
    return;
  }

  const startPosition = state3d.camera.position.clone();
  const startTarget = state3d.controls.target.clone();
  const startTime = performance.now();

  const step = (now) => {
    const t = Math.min(1, (now - startTime) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

    state3d.camera.position.lerpVectors(startPosition, position, eased);
    state3d.controls.target.lerpVectors(startTarget, target, eased);
    state3d.controls.update();

    if (t < 1) {
      state3d.cameraAnimation = { frameId: requestAnimationFrame(step) };
    } else {
      state3d.cameraAnimation = null;
    }
  };

  state3d.cameraAnimation = { frameId: requestAnimationFrame(step) };
}
