/**
 * WebGL 3D layout scene — polygon floor, aisles, instanced overview shelves.
 * Mirrors the 2D floor plan WebGL module (`floorPlanWebGL.js`).
 */
import * as THREE from "three";
import {
  layoutCanvasBounds,
  layoutFixtureZoneRect,
  layoutStoreEnvelope,
  shelfCanvasAabb,
} from "./polygonCanvas.js";
import { normalizeShelfUI, shelvesForScene3D } from "./shelfFaces.js";
import { shelf3dLocalBox } from "../scene3dDimensions.js";
import { resolveAssetUrl } from "../assetUrl.js";
import { AISLE_ACTIVE, BRAND, FACE_A, FACE_B, hexToThree, NEUTRAL } from "../designTokens.js";

/** Default 3D tab zoom: 70% of fit-store distance (slightly zoomed in). */
export const DEFAULT_OVERVIEW_ZOOM = 0.7;

export const SCENE_COLORS = {
  background: hexToThree(NEUTRAL.canvas),
  storeFill: hexToThree(NEUTRAL.floor),
  storeBorder: 0x475569,
  fixtureFill: 0xfffbf8,
  fixtureBorder: hexToThree(BRAND.hex),
  aisleDefault: 0x94a3b8,
  grid: hexToThree(NEUTRAL.line),
  shelfDefault: hexToThree(BRAND.hex),
  faceA: hexToThree(FACE_A.hex),
  faceB: hexToThree(FACE_B.hex),
  aisleActive: hexToThree(AISLE_ACTIVE.hex),
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

/**
 * Structural obstacles as solid volumes. Columns run floor-to-ceiling so the
 * walkthrough shows the same blockers the 2D plan refuses to place fixtures on.
 */
export function buildObstacleMeshes(layout) {
  const root = new THREE.Group();
  const disposables = [];
  const ceiling = Number(layout?.heightMeters) || 3;

  for (const o of layout?.obstacles || []) {
    const w = Math.max(0.05, Number(o.widthMeters) || 0.4);
    const d = Math.max(0.05, Number(o.depthMeters) || 0.4);
    const h = Math.max(0.1, Number(o.heightMeters) || ceiling);
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(o.color || "#475569"),
      roughness: 0.92,
      metalness: 0.02,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((Number(o.x) || 0) + w / 2, h / 2, (Number(o.y) || 0) + d / 2);
    mesh.userData.obstacleId = o.id;
    root.add(mesh);
    disposables.push(geo, mat);
  }

  return { group: root, disposables };
}

/**
 * Uploaded floor-plan drawing laid flat on the store floor, using the same
 * metre calibration as the 2D underlay so both views agree.
 */
export function buildFloorPlanUnderlay(layout, texLoader) {
  const plan = layout?.floorPlan;
  if (!plan?.url || plan.visible === false) return null;

  const w = Math.max(0.5, Number(plan.widthMeters) || 10);
  const d = Math.max(0.5, Number(plan.depthMeters) || 8);
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: Math.min(1, Math.max(0.05, Number(plan.opacity ?? 0.5))),
    depthWrite: false,
    side: THREE.DoubleSide,
    color: 0xffffff,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = -((Number(plan.rotationDeg) || 0) * Math.PI) / 180;
  mesh.position.set((Number(plan.x) || 0) + w / 2, 0.03, (Number(plan.y) || 0) + d / 2);
  mesh.renderOrder = 1;

  const loader = texLoader || new THREE.TextureLoader();
  loader.load(
    resolveAssetUrl(plan.url),
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.needsUpdate = true;
    },
    undefined,
    () => {
      /* a missing underlay should never break the scene */
    }
  );

  return { mesh, disposables: [geo, mat] };
}

function rotationRad(shelf) {
  return ((((Number(shelf?.rotationDeg) || 0) % 360) + 360) % 360) * (Math.PI / 180);
}

/** Shopper-side corridor strip in front of each bound merchandising face (FR-AISLE-02). */
export function buildFaceAisleCorridors(layout, { highlightAisleId = null } = {}) {
  const root = new THREE.Group();
  const disposables = [];
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const hasFocus = Boolean(highlightAisleId);

  for (const shelf of shelves) {
    const aisleId = shelf?.aisleId;
    if (!aisleId || aisleId === "aisle-check") continue;

    const local = shelf3dLocalBox(normalizeShelfUI(shelf), layout);
    const w = Math.max(0.55, local.widthMeters * 0.94);
    const d = Math.max(0.15, local.depthMeters);
    const rot = rotationRad(shelf);
    const nx = -Math.sin(rot);
    const nz = -Math.cos(rot);
    const aabb = shelfCanvasAabb(shelf);
    const cx = aabb.x + aabb.w / 2;
    const cz = aabb.y + aabb.d / 2;
    const corridorDepth = 0.62;
    const offset = d / 2 + corridorDepth / 2 + 0.12;
    const wx = cx + nx * offset;
    const wz = cz + nz * offset;
    const isActive = hasFocus && aisleId === highlightAisleId;

    const geo = new THREE.BoxGeometry(w, isActive ? 0.055 : 0.038, corridorDepth);
    const mat = new THREE.MeshStandardMaterial({
      color: isActive ? SCENE_COLORS.aisleActive : SCENE_COLORS.aisleDefault,
      roughness: 0.82,
      transparent: true,
      opacity: isActive ? 0.78 : hasFocus ? 0.22 : 0.42,
      emissive: isActive ? new THREE.Color(SCENE_COLORS.aisleActive) : new THREE.Color(0x000000),
      emissiveIntensity: isActive ? 0.42 : 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(wx, isActive ? 0.05 : 0.036, wz);
    mesh.rotation.y = -rot;
    mesh.userData.aisleId = aisleId;
    mesh.userData.shelfId = shelf.id;
    root.add(mesh);
    disposables.push(geo, mat);
  }

  return { group: root, disposables };
}

/** Walk aisle strips. Optionally emphasize the aisle in front of the selected shelf. */
export function buildAisleMeshes(layout, { overview = true, highlightAisleId = null } = {}) {
  const root = new THREE.Group();
  const disposables = [];
  const hasFocus = Boolean(highlightAisleId);
  for (const a of layout.aisles || []) {
    const aw = Math.max(0.4, Number(a.widthMeters) || 1);
    const len =
      a.lengthMeters != null ? Number(a.lengthMeters) : Math.max(2, (layout.widthMeters || 10) * 0.35);
    const vertical = a.orientation === "vertical";
    const geo = vertical
      ? new THREE.BoxGeometry(aw, hasFocus && a.id === highlightAisleId ? 0.06 : 0.035, len)
      : new THREE.BoxGeometry(len, hasFocus && a.id === highlightAisleId ? 0.06 : 0.035, aw);
    let color = SCENE_COLORS.aisleDefault;
    try {
      if (a.color) color = new THREE.Color(a.color);
    } catch {
      /* keep */
    }
    const isActive = hasFocus && a.id === highlightAisleId;
    const mat = new THREE.MeshStandardMaterial({
      color: isActive ? SCENE_COLORS.aisleActive : color,
      roughness: 0.85,
      transparent: true,
      opacity: isActive ? 0.72 : hasFocus ? (overview ? 0.12 : 0.18) : overview ? 0.28 : 0.38,
      emissive: isActive ? new THREE.Color(SCENE_COLORS.aisleActive) : new THREE.Color(0x000000),
      emissiveIntensity: isActive ? 0.35 : 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const ax = a.x != null ? Number(a.x) : 1;
    const az = a.y != null ? Number(a.y) : 1;
    const y = isActive ? 0.045 : 0.032;
    if (vertical) mesh.position.set(ax + aw / 2, y, az + len / 2);
    else mesh.position.set(ax + len / 2, y, az + aw / 2);
    mesh.userData.aisleId = a.id;
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

/** Floor-level walk path for shopper kiosk — axis-aligned segments only. */
export function buildShopperRouteOverlay(routePoints, { y = 0.22 } = {}) {
  const group = new THREE.Group();
  const disposables = [];
  if (!routePoints || routePoints.length < 2) return { group, disposables };

  const routeMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    emissive: 0x16a34a,
    emissiveIntensity: 0.42,
    roughness: 0.35,
    metalness: 0.05,
  });
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0xa30a2a,
    emissive: 0xa30a2a,
    emissiveIntensity: 0.45,
    roughness: 0.4,
  });
  disposables.push(routeMat, nodeMat);

  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();

  for (let i = 0; i < routePoints.length - 1; i += 1) {
    const a = routePoints[i];
    const b = routePoints[i + 1];
    const dx = b.x - a.x;
    const dz = b.y - a.y;
    const len = Math.hypot(dx, dz);
    if (len < 0.04) continue;
    const geo = new THREE.CylinderGeometry(0.1, 0.1, len, 10);
    const mesh = new THREE.Mesh(geo, routeMat);
    mesh.position.set((a.x + b.x) / 2, y, (a.y + b.y) / 2);
    dir.set(dx / len, 0, dz / len);
    mesh.quaternion.setFromUnitVectors(up, dir);
    group.add(mesh);
    disposables.push(geo);
  }

  for (let i = 1; i < routePoints.length - 1; i += 1) {
    const p = routePoints[i];
    const geo = new THREE.SphereGeometry(0.14, 10, 10);
    const mesh = new THREE.Mesh(geo, nodeMat);
    mesh.position.set(p.x, y + 0.02, p.y);
    group.add(mesh);
    disposables.push(geo);
  }

  return { group, disposables };
}

/** Green ring at store entry for shopper kiosk. */
export function buildShopperEntryMarker(entryPoint, { y = 0.1 } = {}) {
  const group = new THREE.Group();
  const disposables = [];
  if (!entryPoint) return { group, disposables };

  const x = Number(entryPoint.x) || 0;
  const z = Number(entryPoint.y) || 0;
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    emissive: 0x16a34a,
    emissiveIntensity: 0.55,
    roughness: 0.35,
  });
  const ringGeo = new THREE.RingGeometry(0.35, 0.55, 24);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, y, z);
  group.add(ring);

  const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
  const post = new THREE.Mesh(postGeo, ringMat);
  post.position.set(x, 0.25, z);
  group.add(post);

  disposables.push(ringGeo, postGeo, ringMat);
  return { group, disposables };
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
