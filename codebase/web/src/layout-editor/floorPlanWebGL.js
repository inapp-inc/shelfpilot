/**
 * WebGL background: gray store envelope + inner fixture zone with grid.
 */
import * as THREE from "three";
import { layoutFixtureZoneRect, layoutStoreEnvelope } from "./polygonCanvas.js";

const COLORS = {
  storeFill: 0x94a3b8,
  storeBorder: 0x475569,
  fixtureFill: 0xfffbf8,
  fixtureBorder: 0xa30a2a,
  grid: 0xe5e7eb,
};

function addFlatRect(group, sx, sy, w, h, color, y) {
  const shape = new THREE.Shape();
  shape.moveTo(sx, sy);
  shape.lineTo(sx + w, sy);
  shape.lineTo(sx + w, sy + h);
  shape.lineTo(sx, sy + h);
  shape.closePath();
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  group.add(mesh);
}

function addRectGrid(group, sx, sy, w, h, step, y) {
  const mat = new THREE.LineBasicMaterial({ color: COLORS.grid, transparent: true, opacity: 0.85 });
  const lines = [];
  for (let x = 0; x <= w; x += step) {
    lines.push(sx + x, y, sy, sx + x, y, sy + h);
  }
  for (let z = 0; z <= h; z += step) {
    lines.push(sx, y, sy + z, sx + w, y, sy + z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
  group.add(new THREE.LineSegments(geo, mat));
}

function addRectOutline(group, sx, sy, w, h, color, y) {
  const points = [
    new THREE.Vector3(sx, y, sy),
    new THREE.Vector3(sx + w, y, sy),
    new THREE.Vector3(sx + w, y, sy + h),
    new THREE.Vector3(sx, y, sy + h),
    new THREE.Vector3(sx, y, sy),
  ];
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color })));
}

function buildFloorBackground(layout, bounds, previewPoly) {
  const envelope = layoutStoreEnvelope(layout);
  const fixture = layoutFixtureZoneRect(layout, previewPoly);
  const root = new THREE.Group();

  const storeSx = envelope.x - bounds.minX;
  const storeSy = envelope.y - bounds.minY;
  const fixSx = fixture.x - bounds.minX;
  const fixSy = fixture.y - bounds.minY;

  addFlatRect(root, storeSx, storeSy, envelope.widthMeters, envelope.depthMeters, COLORS.storeFill, 0.02);
  addRectOutline(root, storeSx, storeSy, envelope.widthMeters, envelope.depthMeters, COLORS.storeBorder, 0.03);
  addFlatRect(root, fixSx, fixSy, fixture.widthMeters, fixture.depthMeters, COLORS.fixtureFill, 0.04);
  addRectGrid(root, fixSx, fixSy, fixture.widthMeters, fixture.depthMeters, 1, 0.035);
  addRectOutline(root, fixSx, fixSy, fixture.widthMeters, fixture.depthMeters, COLORS.fixtureBorder, 0.055);

  return root;
}

function disposeObject3D(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else child.material.dispose();
    }
  });
}

export function createFloorPlanRenderer(mount, bounds, scale) {
  if (!mount || !bounds) return null;

  const widthPx = Math.max(1, Math.round(bounds.width * scale));
  const heightPx = Math.max(1, Math.round(bounds.height * scale));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.storeFill);

  const camera = new THREE.OrthographicCamera(0, bounds.width, 0, bounds.height, 0.1, 50);
  camera.position.set(bounds.width / 2, 10, bounds.height / 2);
  camera.up.set(0, 0, -1);
  camera.lookAt(bounds.width / 2, 0, bounds.height / 2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(widthPx, heightPx, false);
  mount.innerHTML = "";
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  let contentRoot = null;
  let layoutRef = null;
  let previewRef = null;

  function render(layout, previewPoly = null) {
    layoutRef = layout;
    previewRef = previewPoly;
    if (contentRoot) {
      scene.remove(contentRoot);
      disposeObject3D(contentRoot);
    }
    contentRoot = buildFloorBackground(layout, bounds, previewPoly);
    scene.add(contentRoot);
    renderer.render(scene, camera);
  }

  function dispose() {
    if (contentRoot) disposeObject3D(contentRoot);
    renderer.dispose();
    mount.innerHTML = "";
  }

  return { render, dispose };
}

export function mountSyncedFloorBackground(mount, layout, bounds, scale, previewPoly = null) {
  if (!mount || !layout || !bounds) return () => {};
  const api = createFloorPlanRenderer(mount, bounds, scale);
  if (!api) return () => {};
  api.render(layout, previewPoly);
  return () => api.dispose();
}
