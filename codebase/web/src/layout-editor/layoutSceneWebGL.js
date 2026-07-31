/**
 * WebGL 3D layout scene — polygon floor, aisles, instanced overview shelves.
 * Mirrors the 2D floor plan WebGL module (`floorPlanWebGL.js`).
 */
import * as THREE from "three";
import {
  layoutCanvasBounds,
  layoutFixtureZoneRect,
  layoutStoreEnvelope,
} from "./polygonCanvas.js";
import { normalizeShelfUI, shelvesForScene3D } from "./shelfFaces.js";
import { shelf3dLocalBox } from "../scene3dDimensions.js";

/** Default 3D tab zoom: 70% of fit-store distance (slightly zoomed in). */
export const DEFAULT_OVERVIEW_ZOOM = 0.7;

export const SCENE_COLORS = {
  background: 0xe9e5e0,
  storeFill: 0xfbfaf8,
  storeBorder: 0x475569,
  fixtureFill: 0xfffbf8,
  fixtureBorder: 0xa30a2a,
  aisleDefault: 0x9aa1ab,
  grid: 0xe5e7eb,
  shelfDefault: 0xa30a2a,
};

/** Layout bounds for 3D camera + floor (polygon-aware). */
export function layoutSceneBounds(layout) {
  const canvas = layoutCanvasBounds(layout, { expandToEnvelope: true });
  const w = canvas.width;
  const d = canvas.height;
  return {
    minX: canvas.minX,
    minY: canvas.minY,
    widthMeters: w,
    depthMeters: d,
    heightMeters: Number(layout?.heightMeters) || 3,
    centerX: canvas.minX + w / 2,
    centerZ: canvas.minY + d / 2,
    maxDim: Math.max(w, d, 1),
    polygon: canvas.polygon,
    strict: canvas.strict,
  };
}

export function layoutOverviewCameraFromBounds(bounds) {
  const cx = bounds.centerX;
  const cz = bounds.centerZ;
  const span = bounds.maxDim * 1.08;
  const height = Math.max(span * 1.12, 8);
  return {
    camX: cx,
    camY: height,
    camZ: cz + span * 0.002,
    lookX: cx,
    lookY: 0,
    lookZ: cz,
    minDist: Math.max(2, span * 0.1),
    maxDist: Math.max(span * 4.5, 80),
  };
}

function polygonShape(points) {
  const shape = new THREE.Shape();
  points.forEach((p, i) => {
    if (i === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  });
  shape.closePath();
  return shape;
}

function addPolygonMesh(group, points, color, y, opacity = 1) {
  if (!points?.length || points.length < 3) return null;
  const geo = new THREE.ShapeGeometry(polygonShape(points));
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  group.add(mesh);
  return { geo, mat };
}

function addPolygonOutline(group, points, color, y) {
  if (!points?.length || points.length < 3) return null;
  const verts = points.map((p) => new THREE.Vector3(p.x, y, p.y));
  verts.push(verts[0].clone());
  const geo = new THREE.BufferGeometry().setFromPoints(verts);
  const mat = new THREE.LineBasicMaterial({ color });
  group.add(new THREE.Line(geo, mat));
  return { geo, mat };
}

/** Store envelope + fixture zone floor (matches 2D WebGL). */
export function buildStoreFloor(layout, bounds) {
  const root = new THREE.Group();
  const disposables = [];
  const envelope = layoutStoreEnvelope(layout);
  const fixture = layoutFixtureZoneRect(layout);

  const envPoints = [
    { x: envelope.x, y: envelope.y },
    { x: envelope.x + envelope.widthMeters, y: envelope.y },
    { x: envelope.x + envelope.widthMeters, y: envelope.y + envelope.depthMeters },
    { x: envelope.x, y: envelope.y + envelope.depthMeters },
  ];
  disposables.push(addPolygonMesh(root, envPoints, SCENE_COLORS.storeFill, 0.005));
  disposables.push(addPolygonOutline(root, envPoints, SCENE_COLORS.storeBorder, 0.012));

  const fixturePoly =
    bounds.polygon?.length >= 3
      ? bounds.polygon
      : [
          { x: fixture.x, y: fixture.y },
          { x: fixture.x + fixture.widthMeters, y: fixture.y },
          { x: fixture.x + fixture.widthMeters, y: fixture.y + fixture.depthMeters },
          { x: fixture.x, y: fixture.y + fixture.depthMeters },
        ];

  disposables.push(addPolygonMesh(root, fixturePoly, SCENE_COLORS.fixtureFill, 0.018));
  disposables.push(addPolygonOutline(root, fixturePoly, SCENE_COLORS.fixtureBorder, 0.028));

  if (layout.shape === "polygon" && layout.polygon?.length >= 3) {
    disposables.push(
      addPolygonMesh(root, layout.polygon, SCENE_COLORS.fixtureBorder, 0.022, 0.06)
    );
  }

  return { group: root, disposables: disposables.filter(Boolean) };
}

/** Walk aisle strips. */
export function buildAisleMeshes(layout, { overview = true } = {}) {
  const root = new THREE.Group();
  const disposables = [];
  for (const a of layout.aisles || []) {
    const aw = Math.max(0.4, Number(a.widthMeters) || 1);
    const len =
      a.lengthMeters != null ? Number(a.lengthMeters) : Math.max(2, (layout.widthMeters || 10) * 0.35);
    const vertical = a.orientation === "vertical";
    const geo = vertical
      ? new THREE.BoxGeometry(aw, 0.035, len)
      : new THREE.BoxGeometry(len, 0.035, aw);
    let color = SCENE_COLORS.aisleDefault;
    try {
      if (a.color) color = new THREE.Color(a.color);
    } catch {
      /* keep */
    }
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      transparent: true,
      opacity: overview ? 0.28 : 0.38,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const ax = a.x != null ? Number(a.x) : 1;
    const az = a.y != null ? Number(a.y) : 1;
    if (vertical) mesh.position.set(ax + aw / 2, 0.032, az + len / 2);
    else mesh.position.set(ax + len / 2, 0.032, az + aw / 2);
    root.add(mesh);
    disposables.push(geo, mat);
  }
  return { group: root, disposables };
}

function parseShelfColor(raw, faceA) {
  try {
    return new THREE.Color(raw?.color || faceA?.color || SCENE_COLORS.shelfDefault);
  } catch {
    return new THREE.Color(SCENE_COLORS.shelfDefault);
  }
}

/** Instanced shelf blocks for store overview (fast WebGL path). */
export function buildOverviewShelfInstances(layout, highlight = {}) {
  const shelves = shelvesForScene3D(
    layout.shelves?.length ? layout.shelves : layout.fixtures || []
  );
  const count = shelves.length;
  if (!count) {
    return { group: new THREE.Group(), disposables: [], highlightCenter: null, highlightFocus: null };
  }

  const unitGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitMat = new THREE.MeshStandardMaterial({
    roughness: 0.86,
    metalness: 0.04,
  });
  const mesh = new THREE.InstancedMesh(unitGeo, unitMat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let highlightCenter = null;
  let highlightFocus = null;

  shelves.forEach((raw, i) => {
    const f = normalizeShelfUI(raw);
    const box = shelf3dLocalBox(f, layout);
    const faceA = f.faces?.find((face) => face.id === "A");
    const blockH = Math.max(0.42, Math.min(box.heightMeters * 0.4, 1.15));
    const isHighlighted =
      highlight.shelfId &&
      (f.id === highlight.shelfId ||
        f.pairShelfIds?.front === highlight.shelfId ||
        f.pairShelfIds?.back === highlight.shelfId ||
        (highlight.pairId && f.pairId === highlight.pairId));

    dummy.position.set(box.originX, 0, box.originZ);
    dummy.rotation.y = -box.rotationRad;
    dummy.scale.set(box.widthMeters * 0.94, blockH, box.depthMeters * 0.94);
    dummy.updateMatrix();
    const local = new THREE.Matrix4().makeTranslation(box.widthMeters / 2, blockH / 2, box.depthMeters / 2);
    mesh.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(dummy.matrix, local));

    color.copy(parseShelfColor(f, faceA));
    if (isHighlighted) color.lerp(new THREE.Color(0xffffff), 0.15);
    mesh.setColorAt(i, color);

    if (isHighlighted && !highlightFocus) {
      const cx = box.originX + box.widthMeters / 2;
      const cz = box.originZ + box.depthMeters / 2;
      highlightCenter = { x: cx, z: cz };
      highlightFocus = {
        x: cx,
        z: cz,
        w: box.widthMeters,
        d: box.depthMeters,
        merchW: box.merchWidthMeters,
        h: box.heightMeters,
        rot: box.rotationRad,
        dual: Boolean(f.pairDisplay || (f.faces?.length > 1 && f.doubleSided !== false)),
      };
    }
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const group = new THREE.Group();
  group.add(mesh);
  return {
    group,
    disposables: [unitGeo, unitMat],
    highlightCenter,
    highlightFocus,
  };
}

export function createWebGLRenderer(mount) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  mount.innerHTML = "";
  mount.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.className = "layout-scene-webgl-canvas";
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  return renderer;
}

export function setupSceneLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.72));
  const key = new THREE.DirectionalLight(0xffffff, 0.78);
  key.position.set(12, 18, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.32);
  fill.position.set(-10, 12, -6);
  scene.add(fill);
}

export function disposeObject3D(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    child.geometry?.dispose?.();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose?.());
      else child.material.dispose?.();
    }
  });
}
