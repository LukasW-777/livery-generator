// main.js
// Fenix A320 Livery Studio — 2D-Editor-Logik (Fabric.js)
// Nur relative Pfade verwendet — GitHub-Pages-kompatibel.
// Hinweis: Zusätzliche lokale Assets (eigene Fonts/Bilder) bitte ebenfalls
// ausschließlich mit "./" referenzieren, niemals mit absolutem "/" Pfad.

'use strict';

const CANVAS_SIZE = 2048;

const state = {
  canvas: null,
  baseParts: { fuselage: [], tail: [], engine: [] },
  guidesGroup: null,
  guidesVisible: false,
  zoom: 1,
  minZoom: 0.08,
  maxZoom: 2,
  drawingModeActive: false,
};

const GOOGLE_FONTS = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Oswald', value: 'Oswald' },
  { label: 'Bebas Neue', value: 'Bebas Neue' },
  { label: 'Orbitron', value: 'Orbitron' },
  { label: 'Archivo Black', value: 'Archivo Black' },
  { label: 'Teko', value: 'Teko' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono' },
];

document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  buildBaseAircraft();
  buildGuides();
  populateFontSelect();
  setupColorPickers();
  setupPresetButtons();
  setupRegistrationTool();
  setupTextTool();
  setupShapeTools();
  setupImageUpload();
  setupGuidesToggle();
  setupZoomControls();
  setupLayerAndPropertyPanel();
  setupProjectPersistence();
  setupKeyboardShortcuts();
  fitCanvasToContainer();
  window.addEventListener('resize', fitCanvasToContainer);
});

/* ==========================================================
   CANVAS-INITIALISIERUNG & ZOOM
   ========================================================== */

function initCanvas() {
  const canvasEl = document.getElementById('livery-canvas');
  state.canvas = new fabric.Canvas(canvasEl, {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: null,
    preserveObjectStacking: true,
    selection: true,
  });

  // Freihand-Pfade nach dem Zeichnen als Ebene markieren
  state.canvas.on('path:created', (e) => {
    e.path.set({ part: 'shape', name: 'Freihand-Pfad' });
    refreshLayersList();
  });
}

function fitCanvasToContainer() {
  const wrapper = document.getElementById('canvas-stage');
  if (!wrapper) return;
  const padding = 48;
  const availableW = wrapper.clientWidth - padding;
  const availableH = wrapper.clientHeight - padding;
  const fitZoom = Math.max(state.minZoom, Math.min(availableW, availableH) / CANVAS_SIZE);
  applyZoom(fitZoom);
}

function applyZoom(zoomLevel) {
  const clamped = Math.min(state.maxZoom, Math.max(state.minZoom, zoomLevel));
  state.zoom = clamped;
  state.canvas.setZoom(clamped);
  state.canvas.setDimensions({
    width: CANVAS_SIZE * clamped,
    height: CANVAS_SIZE * clamped,
  });
  const label = document.getElementById('zoom-level-label');
  if (label) label.textContent = Math.round(clamped * 100) + ' %';
}

function setupZoomControls() {
  const inBtn = document.getElementById('zoom-in-btn');
  const outBtn = document.getElementById('zoom-out-btn');
  const resetBtn = document.getElementById('zoom-reset-btn');
  if (inBtn) inBtn.addEventListener('click', () => applyZoom(state.zoom + 0.1));
  if (outBtn) outBtn.addEventListener('click', () => applyZoom(state.zoom - 0.1));
  if (resetBtn) resetBtn.addEventListener('click', fitCanvasToContainer);
}

/* ==========================================================
   BASIS-FLUGZEUGSILHOUETTE (Rumpf, Tragfläche, Leitwerk, Triebwerk)
   ========================================================== */

function buildBaseAircraft() {
  const fuselage = new fabric.Path(
    'M 150 1024 C 150 900 300 850 500 840 L 1500 840 C 1700 840 1850 900 1900 1024 ' +
      'C 1850 1148 1700 1208 1500 1208 L 500 1208 C 300 1198 150 1148 150 1024 Z',
    {
      fill: '#C9CFD6',
      selectable: false,
      evented: false,
      part: 'fuselage',
      isBase: true,
      name: 'Rumpf',
    }
  );

  const wing = new fabric.Polygon(
    [
      { x: 760, y: 1180 },
      { x: 1080, y: 1180 },
      { x: 1260, y: 1720 },
      { x: 960, y: 1760 },
      { x: 820, y: 1400 },
    ],
    {
      fill: '#C9CFD6',
      selectable: false,
      evented: false,
      part: 'fuselage',
      isBase: true,
      name: 'Tragfläche',
    }
  );

  const tailFin = new fabric.Polygon(
    [
      { x: 1660, y: 855 },
      { x: 1760, y: 855 },
      { x: 1930, y: 470 },
      { x: 1850, y: 855 },
    ],
    {
      fill: '#1B2530',
      selectable: false,
      evented: false,
      part: 'tail',
      isBase: true,
      name: 'Leitwerk',
    }
  );

  const engine = new fabric.Ellipse({
    left: 620,
    top: 1182,
    rx: 120,
    ry: 68,
    fill: '#2A323C',
    selectable: false,
    evented: false,
    part: 'engine',
    isBase: true,
    name: 'Triebwerk',
  });

  const engineIntake = new fabric.Ellipse({
    left: 654,
    top: 1192,
    rx: 46,
    ry: 60,
    fill: '#0B0F14',
    selectable: false,
    evented: false,
    isBase: true,
    isDetail: true,
    name: 'Triebwerkseinlass',
  });

  const cockpitWindow = new fabric.Ellipse({
    left: 195,
    top: 995,
    rx: 55,
    ry: 26,
    fill: '#0B0F14',
    opacity: 0.85,
    angle: -6,
    selectable: false,
    evented: false,
    isBase: true,
    isDetail: true,
    name: 'Cockpitfenster',
  });

  state.baseParts.fuselage = [fuselage, wing];
  state.baseParts.tail = [tailFin];
  state.baseParts.engine = [engine];

  [fuselage, wing, tailFin, engine, engineIntake, cockpitWindow].forEach((o) =>
    state.canvas.add(o)
  );

  state.canvas.renderAll();
}

/* ==========================================================
   UV-GRID / UMRISS-GUIDES
   ========================================================== */

function buildGuides() {
  const lines = [];
  const step = CANVAS_SIZE / 16;

  for (let i = 0; i <= 16; i++) {
    const pos = i * step;
    lines.push(
      new fabric.Line([pos, 0, pos, CANVAS_SIZE], {
        stroke: 'rgba(51, 225, 255, 0.10)',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      })
    );
    lines.push(
      new fabric.Line([0, pos, CANVAS_SIZE, pos], {
        stroke: 'rgba(51, 225, 255, 0.10)',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      })
    );
  }

  const centerV = new fabric.Line([CANVAS_SIZE / 2, 0, CANVAS_SIZE / 2, CANVAS_SIZE], {
    stroke: 'rgba(255, 176, 32, 0.35)',
    strokeWidth: 3,
    strokeDashArray: [16, 12],
    selectable: false,
    evented: false,
  });
  const centerH = new fabric.Line([0, CANVAS_SIZE / 2, CANVAS_SIZE, CANVAS_SIZE / 2], {
    stroke: 'rgba(255, 176, 32, 0.35)',
    strokeWidth: 3,
    strokeDashArray: [16, 12],
    selectable: false,
    evented: false,
  });

  const outlineOptions = {
    fill: 'transparent',
    stroke: '#33E1FF',
    strokeWidth: 4,
    strokeDashArray: [14, 10],
    opacity: 0.7,
    selectable: false,
    evented: false,
  };

  const fuselageOutline = new fabric.Path(
    'M 150 1024 C 150 900 300 850 500 840 L 1500 840 C 1700 840 1850 900 1900 1024 ' +
      'C 1850 1148 1700 1208 1500 1208 L 500 1208 C 300 1198 150 1148 150 1024 Z',
    outlineOptions
  );
  const wingOutline = new fabric.Polygon(
    [
      { x: 760, y: 1180 },
      { x: 1080, y: 1180 },
      { x: 1260, y: 1720 },
      { x: 960, y: 1760 },
      { x: 820, y: 1400 },
    ],
    outlineOptions
  );
  const tailOutline = new fabric.Polygon(
    [
      { x: 1660, y: 855 },
      { x: 1760, y: 855 },
      { x: 1930, y: 470 },
      { x: 1850, y: 855 },
    ],
    outlineOptions
  );

  state.guidesGroup = new fabric.Group(
    [...lines, centerV, centerH, fuselageOutline, wingOutline, tailOutline],
    {
      selectable: false,
      evented: false,
      visible: false,
      id: 'uvGuides',
    }
  );

  state.canvas.add(state.guidesGroup);
  state.canvas.renderAll();
}

function setupGuidesToggle() {
  const toggle = document.getElementById('guides-toggle-checkbox');
  if (!toggle) return;
  toggle.addEventListener('change', () => {
    state.guidesVisible = toggle.checked;
    state.guidesGroup.set('visible', state.guidesVisible);
    if (state.guidesVisible) state.canvas.bringToFront(state.guidesGroup);
    state.canvas.renderAll();
  });
}

/* ==========================================================
   FARBWERKZEUGE (Rumpf / Leitwerk / Triebwerke)
   ========================================================== */

function setupColorPickers() {
  const map = [
    { input: 'fuselage-color', hex: 'fuselage-hex', part: 'fuselage' },
    { input: 'tail-color', hex: 'tail-hex', part: 'tail' },
    { input: 'engine-color', hex: 'engine-hex', part: 'engine' },
  ];

  map.forEach(({ input, hex, part }) => {
    const inputEl = document.getElementById(input);
    const hexEl = document.getElementById(hex);
    if (!inputEl) return;
    inputEl.addEventListener('input', () => {
      applyPartColor(part, inputEl.value);
      if (hexEl) hexEl.textContent = inputEl.value.toUpperCase();
    });
  });
}

function applyPartColor(part, color) {
  state.baseParts[part].forEach((obj) => obj.set('fill', color));
  state.canvas.renderAll();
}

/* ==========================================================
   PRESETS
   ========================================================== */

function setupPresetButtons() {
  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });
}

function applyPreset(presetName) {
  const presets = {
    'modern-streak': {
      fuselage: '#F4F6F8',
      tail: '#0F6FFF',
      engine: '#20242B',
      accentColor: '#0F6FFF',
      registrationColor: '#0F6FFF',
    },
    'classic-flag': {
      fuselage: '#FDFDFB',
      tail: '#C81E2C',
      engine: '#232C36',
      accentColor: '#C81E2C',
      registrationColor: '#1B2530',
    },
    'clean-white': {
      fuselage: '#FFFFFF',
      tail: '#DADFE4',
      engine: '#3A4552',
      accentColor: '#8592A0',
      registrationColor: '#3A4552',
    },
  };

  const preset = presets[presetName];
  if (!preset) return;

  applyPartColor('fuselage', preset.fuselage);
  applyPartColor('tail', preset.tail);
  applyPartColor('engine', preset.engine);

  document.getElementById('fuselage-color').value = preset.fuselage;
  document.getElementById('tail-color').value = preset.tail;
  document.getElementById('engine-color').value = preset.engine;
  document.getElementById('fuselage-hex').textContent = preset.fuselage;
  document.getElementById('tail-hex').textContent = preset.tail;
  document.getElementById('engine-hex').textContent = preset.engine;

  clearPresetAccentShapes();

  if (presetName === 'modern-streak') {
    const streak = new fabric.Polygon(
      [
        { x: 260, y: 1140 },
        { x: 1870, y: 900 },
        { x: 1870, y: 960 },
        { x: 260, y: 1200 },
      ],
      { fill: preset.accentColor, opacity: 0.9, part: 'accent', name: 'Streifen' }
    );
    state.canvas.add(streak);
  }

  if (presetName === 'classic-flag') {
    const stripeTop = new fabric.Rect({
      left: 150,
      top: 870,
      width: 1750,
      height: 26,
      fill: preset.accentColor,
      part: 'accent',
      name: 'Zierlinie oben',
    });
    const stripeBottom = new fabric.Rect({
      left: 150,
      top: 1170,
      width: 1750,
      height: 26,
      fill: preset.accentColor,
      part: 'accent',
      name: 'Zierlinie unten',
    });
    state.canvas.add(stripeTop, stripeBottom);
  }

  applyRegistrationColorHint(preset.registrationColor);
  refreshLayersList();
  state.canvas.renderAll();
}

function clearPresetAccentShapes() {
  const toRemove = state.canvas.getObjects().filter((o) => o.part === 'accent');
  toRemove.forEach((o) => state.canvas.remove(o));
}

function applyRegistrationColorHint(color) {
  const colorInput = document.getElementById('text-color-input');
  if (colorInput) colorInput.value = color;
}

/* ==========================================================
   KENNZEICHEN-GENERATOR
   ========================================================== */

function setupRegistrationTool() {
  const applyBtn = document.getElementById('registration-apply-btn');
  const input = document.getElementById('registration-input');
  if (!applyBtn || !input) return;

  applyBtn.addEventListener('click', () => {
    const raw = input.value.trim().toUpperCase();
    if (!raw) return;
    input.value = raw;
    setRegistrationText(raw);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyBtn.click();
  });
}

function setRegistrationText(value) {
  let regObject = state.canvas.getObjects().find((o) => o.part === 'registration');

  if (regObject) {
    regObject.set('text', value);
  } else {
    regObject = new fabric.IText(value, {
      left: 1520,
      top: 905,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 78,
      fontWeight: '700',
      fill: '#1B2530',
      charSpacing: 60,
      part: 'registration',
      name: 'Kennzeichen',
    });
    state.canvas.add(regObject);
  }

  state.canvas.setActiveObject(regObject);
  state.canvas.renderAll();
  refreshLayersList();
}

/* ==========================================================
   TEXT-WERKZEUG (Google Fonts + Arc/Biegung)
   ========================================================== */

function populateFontSelect() {
  const select = document.getElementById('text-font-select');
  if (!select) return;
  GOOGLE_FONTS.forEach((font) => {
    const opt = document.createElement('option');
    opt.value = font.value;
    opt.textContent = font.label;
    opt.style.fontFamily = `"${font.value}"`;
    select.appendChild(opt);
  });
}

function setupTextTool() {
  const addBtn = document.getElementById('text-add-btn');
  const updateBtn = document.getElementById('text-update-btn');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const config = readTextToolConfig();
      if (!config.text) return;
      const obj = createTextObject(config);
      obj.set({ left: 874, top: 1550 });
      state.canvas.add(obj);
      state.canvas.setActiveObject(obj);
      state.canvas.renderAll();
      refreshLayersList();
    });
  }

  if (updateBtn) {
    updateBtn.addEventListener('click', () => {
      const active = state.canvas.getActiveObject();
      if (!active || active.part !== 'text') return;
      const config = readTextToolConfig();
      const left = active.left;
      const top = active.top;
      const angle = active.angle || 0;
      state.canvas.remove(active);
      const rebuilt = createTextObject(config);
      rebuilt.set({ left, top, angle });
      state.canvas.add(rebuilt);
      state.canvas.setActiveObject(rebuilt);
      state.canvas.renderAll();
      refreshLayersList();
    });
  }
}

function readTextToolConfig() {
  return {
    text: document.getElementById('text-content-input').value,
    fontFamily: document.getElementById('text-font-select').value,
    fontSize: parseInt(document.getElementById('text-size-range').value, 10),
    fill: document.getElementById('text-color-input').value,
    curve: parseInt(document.getElementById('text-curve-range').value, 10),
  };
}

// Erzeugt entweder ein normales IText-Objekt (curve = 0) oder eine
// entlang eines Kreisbogens angeordnete Zeichen-Gruppe (curve != 0).
function createTextObject({ text, fontFamily, fontSize, fill, curve }) {
  if (!curve) {
    return new fabric.IText(text, {
      fontFamily: `"${fontFamily}"`,
      fontSize,
      fill,
      part: 'text',
      name: text.slice(0, 18) || 'Text',
      curveValue: 0,
      baseText: text,
      baseFontFamily: fontFamily,
      baseFontSize: fontSize,
      baseFill: fill,
    });
  }

  const chars = text.split('');
  const direction = curve > 0 ? 1 : -1;
  const magnitude = Math.abs(curve);
  const radius = Math.max(220, 1400 - magnitude * 11);
  const angleStep = (fontSize * 0.62) / radius;
  const totalAngle = angleStep * (chars.length - 1);
  let currentAngle = -totalAngle / 2;

  const glyphs = chars.map((char) => {
    const x = radius * Math.sin(currentAngle);
    const y = direction * -radius * Math.cos(currentAngle);
    const glyph = new fabric.Text(char, {
      left: x,
      top: y,
      fontFamily: `"${fontFamily}"`,
      fontSize,
      fill,
      originX: 'center',
      originY: 'center',
      angle: direction * (currentAngle * (180 / Math.PI)),
    });
    currentAngle += angleStep;
    return glyph;
  });

  return new fabric.Group(glyphs, {
    part: 'text',
    name: text.slice(0, 18) || 'Text (gebogen)',
    curveValue: curve,
    baseText: text,
    baseFontFamily: fontFamily,
    baseFontSize: fontSize,
    baseFill: fill,
  });
}

/* ==========================================================
   FORMEN (Rechteck, Kreis, Freihand-Pfad)
   ========================================================== */

function setupShapeTools() {
  const rectBtn = document.getElementById('shape-rect-btn');
  const circleBtn = document.getElementById('shape-circle-btn');
  const pathBtn = document.getElementById('shape-path-btn');
  const fillInput = document.getElementById('shape-fill-input');

  if (rectBtn) {
    rectBtn.addEventListener('click', () => {
      exitDrawingMode();
      const rect = new fabric.Rect({
        left: 900,
        top: 900,
        width: 260,
        height: 160,
        fill: fillInput.value,
        part: 'shape',
        name: 'Rechteck',
      });
      state.canvas.add(rect);
      state.canvas.setActiveObject(rect);
      state.canvas.renderAll();
      refreshLayersList();
    });
  }

  if (circleBtn) {
    circleBtn.addEventListener('click', () => {
      exitDrawingMode();
      const circle = new fabric.Circle({
        left: 900,
        top: 900,
        radius: 120,
        fill: fillInput.value,
        part: 'shape',
        name: 'Kreis',
      });
      state.canvas.add(circle);
      state.canvas.setActiveObject(circle);
      state.canvas.renderAll();
      refreshLayersList();
    });
  }

  if (pathBtn) {
    pathBtn.addEventListener('click', () => {
      toggleDrawingMode(fillInput.value);
    });
  }
}

function toggleDrawingMode(color) {
  const canvas = state.canvas;
  state.drawingModeActive = !state.drawingModeActive;
  canvas.isDrawingMode = state.drawingModeActive;

  if (state.drawingModeActive) {
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = color;
    canvas.freeDrawingBrush.width = 6;
  }

  const btn = document.getElementById('shape-path-btn');
  if (btn) {
    btn.classList.toggle('border-hud', state.drawingModeActive);
    btn.classList.toggle('text-hud', state.drawingModeActive);
  }
}

function exitDrawingMode() {
  state.drawingModeActive = false;
  state.canvas.isDrawingMode = false;
  const btn = document.getElementById('shape-path-btn');
  if (btn) {
    btn.classList.remove('border-hud');
    btn.classList.remove('text-hud');
  }
}

/* ==========================================================
   BILD-UPLOAD (PNG / SVG, mit Transparenz & Layering)
   ========================================================== */

function setupImageUpload() {
  const input = document.getElementById('image-upload-input');
  if (!input) return;

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;

      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        fabric.loadSVGFromURL(dataUrl, (objects, options) => {
          const obj = fabric.util.groupSVGElements(objects, options);
          placeUploadedObject(obj, file.name);
        });
      } else {
        fabric.Image.fromURL(
          dataUrl,
          (img) => placeUploadedObject(img, file.name),
          { crossOrigin: 'anonymous' }
        );
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  });
}

function placeUploadedObject(obj, fileName) {
  const maxDim = 700;
  const scale = Math.min(maxDim / obj.width, maxDim / obj.height, 1);
  obj.set({
    left: 1024 - (obj.width * scale) / 2,
    top: 1024 - (obj.height * scale) / 2,
    scaleX: scale,
    scaleY: scale,
    part: 'image',
    name: fileName,
  });
  state.canvas.add(obj);
  state.canvas.setActiveObject(obj);
  state.canvas.renderAll();
  refreshLayersList();
}

/* ==========================================================
   EBENEN- & EIGENSCHAFTEN-PANEL
   ========================================================== */

function setupLayerAndPropertyPanel() {
  state.canvas.on('selection:created', updatePropertiesPanel);
  state.canvas.on('selection:updated', updatePropertiesPanel);
  state.canvas.on('selection:cleared', clearPropertiesPanel);
  state.canvas.on('object:added', refreshLayersList);
  state.canvas.on('object:removed', refreshLayersList);
  state.canvas.on('object:modified', refreshLayersList);
  refreshLayersList();
}

function getManagedObjects() {
  return state.canvas
    .getObjects()
    .filter((o) => !o.isBase && o.id !== 'uvGuides')
    .reverse();
}

function refreshLayersList() {
  const list = document.getElementById('layers-list');
  if (!list) return;
  list.innerHTML = '';

  const objects = getManagedObjects();

  if (objects.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'text-cockpit-400 text-xs px-3 py-4 text-center';
    empty.textContent = 'Noch keine Ebenen. Füge Text, Formen oder Logos hinzu.';
    list.appendChild(empty);
    return;
  }

  objects.forEach((obj) => {
    const li = document.createElement('li');
    li.className =
      'flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-cockpit-600 bg-cockpit-700/60 hover:border-hud/60 cursor-pointer transition-colors';
    if (state.canvas.getActiveObject() === obj) {
      li.classList.add('border-hud');
    }

    const label = document.createElement('span');
    label.className = 'text-sm truncate flex-1';
    label.textContent = obj.name || partLabel(obj.part);
    label.addEventListener('click', () => {
      state.canvas.setActiveObject(obj);
      state.canvas.renderAll();
      updatePropertiesPanel();
      refreshLayersList();
    });

    const controls = document.createElement('div');
    controls.className = 'flex items-center gap-1 shrink-0';

    const upBtn = iconButton('▲', 'Nach vorne');
    upBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.canvas.bringForward(obj);
      refreshLayersList();
    });

    const downBtn = iconButton('▼', 'Nach hinten');
    downBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.canvas.sendBackwards(obj);
      refreshLayersList();
    });

    const deleteBtn = iconButton('✕', 'Löschen');
    deleteBtn.classList.add('hover:text-red-400');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.canvas.remove(obj);
      state.canvas.renderAll();
      refreshLayersList();
      clearPropertiesPanel();
    });

    controls.append(upBtn, downBtn, deleteBtn);
    li.append(label, controls);
    list.appendChild(li);
  });
}

function iconButton(symbol, title) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = title;
  btn.textContent = symbol;
  btn.className =
    'w-6 h-6 flex items-center justify-center text-xs rounded text-cockpit-400 hover:text-hud hover:bg-cockpit-600';
  return btn;
}

function partLabel(part) {
  const labels = {
    text: 'Text',
    shape: 'Form',
    image: 'Bild / Logo',
    registration: 'Kennzeichen',
    accent: 'Akzent',
  };
  return labels[part] || 'Objekt';
}

function updatePropertiesPanel() {
  const panel = document.getElementById('properties-panel');
  if (!panel) return;
  const obj = state.canvas.getActiveObject();
  panel.innerHTML = '';

  if (!obj) {
    panel.innerHTML =
      '<p class="text-xs text-cockpit-400">Wähle ein Element aus, um seine Eigenschaften zu bearbeiten.</p>';
    return;
  }

  const title = document.createElement('p');
  title.className = 'text-sm font-semibold mb-3';
  title.textContent = obj.name || partLabel(obj.part);
  panel.appendChild(title);

  if (obj.fill !== undefined && typeof obj.fill === 'string') {
    const row = buildPropertyRow('Farbe');
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = toHex(obj.fill);
    colorInput.className = 'w-9 h-9 rounded border border-cockpit-600 bg-transparent cursor-pointer';
    colorInput.addEventListener('input', () => {
      obj.set('fill', colorInput.value);
      state.canvas.renderAll();
    });
    row.appendChild(colorInput);
    panel.appendChild(row);
  }

  const opacityRow = buildPropertyRow('Deckkraft');
  const opacityInput = document.createElement('input');
  opacityInput.type = 'range';
  opacityInput.min = '0';
  opacityInput.max = '1';
  opacityInput.step = '0.05';
  opacityInput.value = obj.opacity !== undefined ? obj.opacity : 1;
  opacityInput.className = 'w-32';
  opacityInput.addEventListener('input', () => {
    obj.set('opacity', parseFloat(opacityInput.value));
    state.canvas.renderAll();
  });
  opacityRow.appendChild(opacityInput);
  panel.appendChild(opacityRow);

  const orderRow = document.createElement('div');
  orderRow.className = 'flex gap-2 mt-4';

  const frontBtn = smallButton('In den Vordergrund');
  frontBtn.addEventListener('click', () => {
    state.canvas.bringToFront(obj);
    refreshLayersList();
  });

  const backBtn = smallButton('In den Hintergrund');
  backBtn.addEventListener('click', () => {
    state.canvas.sendToBack(obj);
    if (state.guidesGroup && state.guidesGroup.visible) {
      state.canvas.bringToFront(state.guidesGroup);
    }
    refreshLayersList();
  });

  orderRow.append(frontBtn, backBtn);
  panel.appendChild(orderRow);

  const deleteRow = document.createElement('button');
  deleteRow.type = 'button';
  deleteRow.textContent = 'Element löschen';
  deleteRow.className =
    'mt-4 w-full text-center text-sm py-2 rounded-md border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors';
  deleteRow.addEventListener('click', () => {
    state.canvas.remove(obj);
    state.canvas.renderAll();
    refreshLayersList();
    clearPropertiesPanel();
  });
  panel.appendChild(deleteRow);
}

function buildPropertyRow(labelText) {
  const row = document.createElement('div');
  row.className = 'flex items-center justify-between gap-3 mb-3';
  const label = document.createElement('span');
  label.className = 'text-xs text-cockpit-400';
  label.textContent = labelText;
  row.appendChild(label);
  return row;
}

function smallButton(text) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = text;
  btn.className =
    'flex-1 text-xs py-2 rounded-md border border-cockpit-600 hover:border-hud hover:text-hud transition-colors';
  return btn;
}

function clearPropertiesPanel() {
  const panel = document.getElementById('properties-panel');
  if (panel) {
    panel.innerHTML =
      '<p class="text-xs text-cockpit-400">Wähle ein Element aus, um seine Eigenschaften zu bearbeiten.</p>';
  }
  refreshLayersList();
}

function toHex(color) {
  if (typeof color === 'string' && color.startsWith('#')) return color;
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = color;
  return ctx.fillStyle;
}

/* ==========================================================
   PROJEKT: SPEICHERN / LADEN ALS JSON
   ========================================================== */

function setupProjectPersistence() {
  const saveBtn = document.getElementById('save-project-btn');
  const loadInput = document.getElementById('load-project-input');
  const newBtn = document.getElementById('new-project-btn');

  if (saveBtn) saveBtn.addEventListener('click', saveProject);
  if (loadInput) loadInput.addEventListener('change', loadProjectFromFile);
  if (newBtn) newBtn.addEventListener('click', resetProject);
}

function saveProject() {
  const registration = document.getElementById('registration-input').value.trim() || 'A320';

  const payload = {
    meta: {
      app: 'Fenix A320 Livery Studio',
      version: 1,
      registration,
      createdAt: new Date().toISOString(),
    },
    canvas: state.canvas.toJSON([
      'part',
      'isBase',
      'isDetail',
      'id',
      'name',
      'curveValue',
      'baseText',
      'baseFontFamily',
      'baseFontSize',
      'baseFill',
      'selectable',
      'evented',
    ]),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `livery-${registration.replace(/[^A-Z0-9-]/gi, '')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function loadProjectFromFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const payload = JSON.parse(evt.target.result);
      state.canvas.loadFromJSON(payload.canvas, () => {
        rebindBasePartsAfterLoad();
        state.canvas.renderAll();
        refreshLayersList();
        clearPropertiesPanel();
        if (payload.meta && payload.meta.registration) {
          document.getElementById('registration-input').value = payload.meta.registration;
        }
      });
    } catch (err) {
      alert('Die Projektdatei konnte nicht gelesen werden. Bitte prüfe das Dateiformat.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function rebindBasePartsAfterLoad() {
  state.baseParts = { fuselage: [], tail: [], engine: [] };
  state.guidesGroup = null;

  state.canvas.getObjects().forEach((obj) => {
    if (obj.id === 'uvGuides') {
      state.guidesGroup = obj;
      return;
    }
    if (obj.isBase && state.baseParts[obj.part]) {
      state.baseParts[obj.part].push(obj);
    }
  });

  if (!state.guidesGroup) buildGuides();

  const toggle = document.getElementById('guides-toggle-checkbox');
  if (toggle) toggle.checked = state.guidesGroup.visible;
  state.guidesVisible = state.guidesGroup.visible;

  // Farbwerkzeuge im UI mit den geladenen Basisfarben synchronisieren
  syncColorInputsFromCanvas();
}

function syncColorInputsFromCanvas() {
  const map = [
    { part: 'fuselage', input: 'fuselage-color', hex: 'fuselage-hex' },
    { part: 'tail', input: 'tail-color', hex: 'tail-hex' },
    { part: 'engine', input: 'engine-color', hex: 'engine-hex' },
  ];
  map.forEach(({ part, input, hex }) => {
    const first = state.baseParts[part][0];
    if (!first) return;
    const color = toHex(first.fill);
    const inputEl = document.getElementById(input);
    const hexEl = document.getElementById(hex);
    if (inputEl) inputEl.value = color;
    if (hexEl) hexEl.textContent = color.toUpperCase();
  });
}

function resetProject() {
  const confirmed = confirm('Neues Projekt starten? Alle nicht gespeicherten Änderungen gehen verloren.');
  if (!confirmed) return;

  state.canvas.getObjects().forEach((obj) => {
    if (!obj.isBase && obj.id !== 'uvGuides') state.canvas.remove(obj);
  });

  applyPartColor('fuselage', '#C9CFD6');
  applyPartColor('tail', '#1B2530');
  applyPartColor('engine', '#2A323C');

  document.getElementById('fuselage-color').value = '#C9CFD6';
  document.getElementById('tail-color').value = '#1B2530';
  document.getElementById('engine-color').value = '#2A323C';
  document.getElementById('fuselage-hex').textContent = '#C9CFD6';
  document.getElementById('tail-hex').textContent = '#1B2530';
  document.getElementById('engine-hex').textContent = '#2A323C';
  document.getElementById('registration-input').value = '';

  refreshLayersList();
  clearPropertiesPanel();
  state.canvas.renderAll();
}

/* ==========================================================
   TASTATURKÜRZEL
   ========================================================== */

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const isTyping =
      active &&
      (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    if (isTyping) return;

    const obj = state.canvas.getActiveObject();
    if ((e.key === 'Delete' || e.key === 'Backspace') && obj && !obj.isBase && obj.id !== 'uvGuides') {
      e.preventDefault();
      state.canvas.remove(obj);
      state.canvas.renderAll();
      refreshLayersList();
      clearPropertiesPanel();
    }
  });
}
