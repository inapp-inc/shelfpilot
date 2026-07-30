import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { pointInPolygon, shelfCanvasAabb, gondolaCanvasAabb } from "./layout-editor/polygonCanvas.js";
import { isDoubleSided, normalizeShelfUI, shelvesForScene3D } from "./layout-editor/shelfFaces.js";
import {
  buildProductLookup,
  productDimensions,
  productImageUrl,
  resolveCatalogProduct,
} from "./productCatalog.js";

function insideFloor(x, z, layout) {
  if (layout.shape === "polygon" && layout.polygon?.length >= 3) {
    return pointInPolygon(x, z, layout.polygon);
  }
  const w = layout.widthMeters || 10;
  const d = layout.depthMeters || 10;
  return x >= 0.35 && x <= w - 0.35 && z >= 0.35 && z <= d - 0.35;
}

function clampOrbitTarget(target, layout) {
  const w = layout.widthMeters || 10;
  const d = layout.depthMeters || 10;
  target.x = Math.max(0.5, Math.min(w - 0.5, target.x));
  target.z = Math.max(0.5, Math.min(d - 0.5, target.z));
  target.y = Math.max(0.2, Math.min(2.5, target.y));
}

function clampOrbitCamera(camera, target, layout, maxDim) {
  const margin = maxDim * 0.12;
  const w = layout.widthMeters || 10;
  const d = layout.depthMeters || 10;
  camera.position.x = Math.max(-margin, Math.min(w + margin, camera.position.x));
  camera.position.z = Math.max(-margin, Math.min(d + margin, camera.position.z));
  camera.position.y = Math.max(0.6, Math.min(maxDim * 1.8, camera.position.y));
  const dist = camera.position.distanceTo(target);
  if (dist < 1.5) {
    camera.position.copy(target).add(
      camera.position.clone().sub(target).normalize().multiplyScalar(1.5)
    );
  }
}

function buildWalkerAvatar() {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b796, roughness: 0.62 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.72 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 });
  const shoes = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.55 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.85 });

  const body = new THREE.Group();
  body.position.y = 0;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skin);
  head.position.y = 1.62;
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.145, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    hair
  );
  hairCap.position.y = 1.64;

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), skin);
  neck.position.y = 1.48;

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 14), shirt);
  torso.position.y = 1.15;

  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.18, 12), pants);
  hips.position.y = 0.82;

  function makeLeg(side) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.1, 0.74, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.42, 10), pants);
    thigh.position.y = -0.21;
    const lower = new THREE.Group();
    lower.position.y = -0.42;
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.38, 10), pants);
    calf.position.y = -0.19;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.24), shoes);
    foot.position.set(0, -0.4, 0.05);
    lower.add(calf, foot);
    leg.add(thigh, lower);
    return { leg, lower };
  }

  function makeArm(side) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.26, 1.32, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.32, 8), shirt);
    upper.position.y = -0.16;
    const lower = new THREE.Group();
    lower.position.y = -0.32;
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.28, 8), skin);
    fore.position.y = -0.14;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), skin);
    hand.position.y = -0.3;
    lower.add(fore, hand);
    arm.add(upper, lower);
    return { arm, lower };
  }

  const legL = makeLeg(-1);
  const legR = makeLeg(1);
  const armL = makeArm(-1);
  const armR = makeArm(1);

  body.add(head, hairCap, neck, torso, hips, legL.leg, legR.leg, armL.arm, armR.arm);
  group.add(body);

  return {
    group,
    body,
    legL: legL.leg,
    legR: legR.leg,
    lowerLegL: legL.lower,
    lowerLegR: legR.lower,
    armL: armL.arm,
    armR: armR.arm,
    lowerArmL: armL.lower,
    lowerArmR: armR.lower,
  };
}

function loadProductTexture(texLoader, texCache, url, mat, disposables, alive) {
  const cached = texCache.get(url);
  if (cached) {
    mat.map = cached;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;
    return;
  }
  texLoader.load(
    url,
    (tex) => {
      if (!alive()) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      texCache.set(url, tex);
      disposables.push(tex);
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    },
    undefined,
    () => {
      if (!alive()) return;
      mat.color.set(0xe5e7eb);
      mat.needsUpdate = true;
    }
  );
}

function addProductFacing(group, opts) {
  const {
    x,
    y,
    z,
    rotY,
    width,
    height,
    product,
    imageUrl,
    texLoader,
    texCache,
    disposables,
    alive,
  } = opts;
  const geo = new THREE.PlaneGeometry(Math.max(0.08, width), Math.max(0.1, height));
  const mat = new THREE.MeshStandardMaterial({
    color: imageUrl ? 0xffffff : 0xe5e7eb,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  if (imageUrl) loadProductTexture(texLoader, texCache, imageUrl, mat, disposables, alive);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.userData.productId = product?.id || null;
  mesh.userData.productName = product?.name || null;
  group.add(mesh);
  disposables.push(geo, mat);
}

/** Immersive Three.js: Orbit (zoom/pan) or Walk; shelves, levels, planogram facings. */
export default function Scene3D({
  layout,
  products = [],
  walkMode = false,
  highlightShelfId = null,
  highlightPairId = null,
  focusRequest = 0,
  contentRevision = 0,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !layout) return undefined;

    let alive = true;
    const isAlive = () => alive;

    const productLookup = buildProductLookup(products);
    const texLoader = new THREE.TextureLoader();
    const texCache = new Map();

    const width = el.clientWidth || 640;
    const height = el.clientHeight || 420;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9e5e0);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 400);
    const cx = (layout.widthMeters || 10) / 2;
    const cz = (layout.depthMeters || 10) / 2;
    const maxDim = Math.max(layout.widthMeters || 10, layout.depthMeters || 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(10, 22, 12);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(layout.widthMeters, layout.depthMeters),
      new THREE.MeshStandardMaterial({ color: 0xfbfaf8, roughness: 0.92 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    scene.add(floor);

    const grid = new THREE.GridHelper(
      Math.max(layout.widthMeters, layout.depthMeters),
      Math.max(8, Math.floor(Math.max(layout.widthMeters, layout.depthMeters))),
      0xd8d8d8,
      0xe5e7eb
    );
    grid.position.set(cx, 0.01, cz);
    scene.add(grid);

    const disposables = [floor.geometry, floor.material, grid.geometry];

    if (layout.shape === "polygon" && layout.polygon?.length >= 3) {
      const shape = new THREE.Shape();
      layout.polygon.forEach((p, i) => {
        if (i === 0) shape.moveTo(p.x, p.y);
        else shape.lineTo(p.x, p.y);
      });
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xa30a2a,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.02;
      scene.add(mesh);
      disposables.push(geo, mat);
    }

    for (const a of layout.aisles || []) {
      const aw = Math.max(0.4, Number(a.widthMeters) || 1);
      const len =
        a.lengthMeters != null ? Number(a.lengthMeters) : Math.max(2, (layout.widthMeters || 10) * 0.35);
      const vertical = a.orientation === "vertical";
      const geo = vertical
        ? new THREE.BoxGeometry(aw, 0.04, len)
        : new THREE.BoxGeometry(len, 0.04, aw);
      let color = 0x9aa1ab;
      try {
        if (a.color) color = new THREE.Color(a.color);
      } catch {
        /* keep */
      }
      const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.35 });
      const mesh = new THREE.Mesh(geo, mat);
      const ax = a.x != null ? Number(a.x) : 1;
      const az = a.y != null ? Number(a.y) : 1;
      if (vertical) {
        mesh.position.set(ax + aw / 2, 0.03, az + len / 2);
      } else {
        mesh.position.set(ax + len / 2, 0.03, az + aw / 2);
      }
      scene.add(mesh);
      disposables.push(geo, mat);
    }

    const shelves = shelvesForScene3D(
      layout.shelves?.length ? layout.shelves : layout.fixtures || []
    );
    let facingBudget = 0;
    const MAX_FACINGS = 800;

    let highlightCenter = null;

    for (const raw of shelves) {
      const f = normalizeShelfUI(raw);
      const w = Number(f.usableWidthMeters ?? f.widthMeters) || 1.2;
      const d = Number(f.depthMeters) || 0.6;
      const h = Number(f.heightMeters) || 2;
      const rot = (((Number(f.rotationDeg) || 0) % 360) + 360) % 360 * (Math.PI / 180);
      const dual = isDoubleSided(f);
      const faceA = f.faces?.find((face) => face.id === "A");
      const faceB = f.faces?.find((face) => face.id === "B");

      const isHighlighted =
        highlightShelfId &&
        (f.id === highlightShelfId ||
          f.pairShelfIds?.front === highlightShelfId ||
          f.pairShelfIds?.back === highlightShelfId ||
          (highlightPairId && f.pairId === highlightPairId));

      let baseColor = new THREE.Color("#A30A2A");
      try {
        baseColor = new THREE.Color(f.color || faceA?.color || "#A30A2A");
      } catch {
        /* keep */
      }

      const group = new THREE.Group();
      group.position.set(Number(f.x) || 0, 0, Number(f.y) || 0);
      group.rotation.y = -rot;
      group.userData.shelfId = f.id;
      group.userData.pairId = f.pairId || null;

      const frameGeo = new THREE.BoxGeometry(w, 0.08, d);
      const frameMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.7,
        transparent: Boolean(highlightShelfId && !isHighlighted),
        opacity: highlightShelfId && !isHighlighted ? 0.72 : 1,
      });
      if (isHighlighted) {
        frameMat.emissive = new THREE.Color(0xa30a2a);
        frameMat.emissiveIntensity = 0.45;
      }
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(w / 2, 0.04, d / 2);
      group.add(frame);
      disposables.push(frameGeo, frameMat);

      if (isHighlighted) {
        let aabb = shelfCanvasAabb(f);
        if (f.pairShelfIds?.front && f.pairShelfIds?.back) {
          const shelfList = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
          const front = shelfList.find((s) => s.id === f.pairShelfIds.front) || f;
          const back = shelfList.find((s) => s.id === f.pairShelfIds.back);
          if (back) aabb = gondolaCanvasAabb(front, back);
        } else if (f.pairId && highlightPairId) {
          const shelfList = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
          const mate = shelfList.find((s) => s.pairId === f.pairId && s.id !== f.id);
          if (mate) {
            const front = f.pairRole === "back" ? mate : f;
            const back = f.pairRole === "back" ? f : mate;
            aabb = gondolaCanvasAabb(front, back);
          }
        }
        highlightCenter = { x: aabb.x + aabb.w / 2, z: aabb.y + aabb.d / 2 };
      }

      if (dual) {
        const spineGeo = new THREE.BoxGeometry(w * 0.96, h * 0.92, Math.max(0.06, d * 0.1));
        const spineMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });
        const spine = new THREE.Mesh(spineGeo, spineMat);
        spine.position.set(w / 2, h * 0.46, d / 2);
        group.add(spine);
        disposables.push(spineGeo, spineMat);

        const halfBoardGeo = new THREE.BoxGeometry(w * 0.94, 0.03, d * 0.42);
        const boardA = new THREE.Mesh(
          halfBoardGeo,
          new THREE.MeshStandardMaterial({
            color: faceA?.color ? new THREE.Color(faceA.color) : 0xf3f0eb,
            roughness: 0.85,
          })
        );
        boardA.position.set(w / 2, 0.35, d * 0.21);
        group.add(boardA);
        disposables.push(halfBoardGeo, boardA.material);

        const boardB = new THREE.Mesh(
          halfBoardGeo.clone(),
          new THREE.MeshStandardMaterial({
            color: faceB?.color ? new THREE.Color(faceB.color) : 0xe8eef5,
            roughness: 0.85,
          })
        );
        boardB.position.set(w / 2, 0.35, d * 0.79);
        group.add(boardB);
        disposables.push(boardB.geometry, boardB.material);
      }

      const levels =
        Array.isArray(f.levels) && f.levels.length
          ? f.levels
          : [
              { levelIndex: 0, heightFromFloorMeters: 0.35 },
              { levelIndex: 1, heightFromFloorMeters: h * 0.55 },
            ];

      if (!dual) {
        for (const lv of levels) {
          const y = Number(lv.heightFromFloorMeters) || 0.4;
          const boardGeo = new THREE.BoxGeometry(w * 0.96, 0.04, d * 0.92);
          const boardMat = new THREE.MeshStandardMaterial({ color: 0xf3f0eb, roughness: 0.85 });
          const board = new THREE.Mesh(boardGeo, boardMat);
          board.position.set(w / 2, y, d / 2);
          group.add(board);
          disposables.push(boardGeo, boardMat);
        }
      } else {
        for (const lv of levels) {
          const y = Number(lv.heightFromFloorMeters) || 0.4;
          const shelfGeo = new THREE.BoxGeometry(w * 0.94, 0.03, d * 0.4);
          const shelfAMat = new THREE.MeshStandardMaterial({ color: 0xf3f0eb, roughness: 0.85 });
          const shelfA = new THREE.Mesh(shelfGeo, shelfAMat);
          shelfA.position.set(w / 2, y, d * 0.2);
          group.add(shelfA);
          disposables.push(shelfGeo, shelfAMat);

          const shelfBGeo = shelfGeo.clone();
          const shelfBMat = new THREE.MeshStandardMaterial({ color: 0xe8eef5, roughness: 0.85 });
          const shelfB = new THREE.Mesh(shelfBGeo, shelfBMat);
          shelfB.position.set(w / 2, y, d * 0.8);
          group.add(shelfB);
          disposables.push(shelfBGeo, shelfBMat);
        }
      }

      const facePlanograms = dual
        ? [
            { id: "A", planogram: faceA?.planogram || f.planogram || [], z: d * 0.1, rotY: Math.PI },
            { id: "B", planogram: faceB?.planogram || [], z: d * 0.9, rotY: 0 },
          ]
        : [{ id: "A", planogram: f.planogram || faceA?.planogram || [], z: d * 0.5, rotY: Math.PI }];

      for (const face of facePlanograms) {
        for (const placement of face.planogram || []) {
          if (facingBudget >= MAX_FACINGS) break;
          const lv = levels.find((l) => l.levelIndex === placement.levelIndex) || levels[0];
          const y = (Number(lv?.heightFromFloorMeters) || 0.4) + 0.1;
          const facings = Math.max(1, Number(placement.facings) || 1);
          const product = resolveCatalogProduct(productLookup, placement.productId);
          const imageUrl = productImageUrl(product);
          const dims = productDimensions(product);
          const slotW = w / facings;
          const facingW = Math.min(slotW * 0.88, dims.w);
          const facingH = Math.min(Math.max(dims.h, 0.18), h * 0.35);
          const startX = Number(placement.positionX) || 0;

          for (let i = 0; i < facings && facingBudget < MAX_FACINGS; i += 1) {
            addProductFacing(group, {
              x: startX + slotW * (i + 0.5),
              y: y + facingH / 2,
              z: face.z,
              rotY: face.rotY,
              width: facingW,
              height: facingH,
              product,
              imageUrl,
              texLoader,
              texCache,
              disposables,
              alive: isAlive,
            });
            facingBudget += 1;
          }
        }
      }

      scene.add(group);
    }

    let controls = null;
    const keys = new Set();
    let yaw = 0;
    let pitch = 0.2;
    let pointerLocked = false;
    let cleanupWalk = null;
    let cleanupOrbit = null;
    let avatar = null;
    let avatarRig = null;
    let walker = { x: cx, z: Math.min(cz + 2, Math.max(0.5, (layout.depthMeters || 10) - 0.5)) };
    let lastWalker = { ...walker };

    if (walkMode) {
      avatarRig = buildWalkerAvatar();
      avatar = avatarRig.group;
      scene.add(avatar);

      camera.rotation.order = "YXZ";
      const onKey = (e) => {
        if (e.type === "keydown") keys.add(e.code);
        else keys.delete(e.code);
      };
      const onMove = (e) => {
        if (!pointerLocked) return;
        yaw -= e.movementX * 0.0022;
        pitch -= e.movementY * 0.0016;
        pitch = Math.max(-0.35, Math.min(0.65, pitch));
      };
      const onClick = () => {
        renderer.domElement.requestPointerLock?.();
      };
      const onLockChange = () => {
        pointerLocked = document.pointerLockElement === renderer.domElement;
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
      window.addEventListener("mousemove", onMove);
      renderer.domElement.addEventListener("click", onClick);
      document.addEventListener("pointerlockchange", onLockChange);

      cleanupWalk = () => {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
        window.removeEventListener("mousemove", onMove);
        renderer.domElement.removeEventListener("click", onClick);
        document.removeEventListener("pointerlockchange", onLockChange);
        if (document.pointerLockElement === renderer.domElement) document.exitPointerLock?.();
      };
    } else {
      const lookX = highlightCenter?.x ?? cx;
      const lookZ = highlightCenter?.z ?? cz;
      const camDist = highlightCenter ? Math.max(4, maxDim * 0.35) : maxDim * 0.55;
      camera.position.set(lookX + camDist * 0.6, maxDim * 0.45, lookZ + camDist * 0.6);
      camera.lookAt(lookX, 0.5, lookZ);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(lookX, 0.5, lookZ);
      controls.enableDamping = true;
      controls.maxPolarAngle = Math.PI / 2.05;
      controls.minPolarAngle = 0.12;
      controls.minDistance = 2;
      controls.maxDistance = maxDim * 2.2;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      const onOrbitChange = () => {
        clampOrbitTarget(controls.target, layout);
        clampOrbitCamera(camera, controls.target, layout, maxDim);
      };
      controls.addEventListener("change", onOrbitChange);
      cleanupOrbit = () => controls.removeEventListener("change", onOrbitChange);
    }

    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (walkMode && avatar) {
        const speed = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 4 : 2.2) * dt;
        const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const next = { x: walker.x, z: walker.z };
        const moving =
          keys.has("KeyW") ||
          keys.has("KeyS") ||
          keys.has("KeyA") ||
          keys.has("KeyD") ||
          keys.has("ArrowUp") ||
          keys.has("ArrowDown") ||
          keys.has("ArrowLeft") ||
          keys.has("ArrowRight");
        if (keys.has("KeyW") || keys.has("ArrowUp")) {
          next.x += forward.x * speed;
          next.z += forward.z * speed;
        }
        if (keys.has("KeyS") || keys.has("ArrowDown")) {
          next.x -= forward.x * speed;
          next.z -= forward.z * speed;
        }
        if (keys.has("KeyA") || keys.has("ArrowLeft")) {
          next.x -= right.x * speed;
          next.z -= right.z * speed;
        }
        if (keys.has("KeyD") || keys.has("ArrowRight")) {
          next.x += right.x * speed;
          next.z += right.z * speed;
        }
        const didMove = next.x !== walker.x || next.z !== walker.z;
        if (insideFloor(next.x, next.z, layout)) {
          walker = next;
          lastWalker = { ...walker };
        } else {
          walker = { ...lastWalker };
        }

        avatar.position.set(walker.x, 0, walker.z);
        avatar.rotation.y = yaw;

        if (avatarRig && moving && didMove) {
          const phase = clock.elapsedTime * 9;
          const swing = Math.sin(phase) * 0.55;
          avatarRig.legL.rotation.x = swing;
          avatarRig.legR.rotation.x = -swing;
          avatarRig.lowerLegL.rotation.x = Math.max(0, swing) * 0.35;
          avatarRig.lowerLegR.rotation.x = Math.max(0, -swing) * 0.35;
          avatarRig.armL.rotation.x = -swing * 0.45;
          avatarRig.armR.rotation.x = swing * 0.45;
          avatarRig.body.position.y = Math.abs(Math.sin(phase * 2)) * 0.025;
        } else if (avatarRig) {
          avatarRig.legL.rotation.x *= 0.85;
          avatarRig.legR.rotation.x *= 0.85;
          avatarRig.lowerLegL.rotation.x *= 0.85;
          avatarRig.lowerLegR.rotation.x *= 0.85;
          avatarRig.armL.rotation.x *= 0.85;
          avatarRig.armR.rotation.x *= 0.85;
          avatarRig.body.position.y *= 0.85;
        }

        const followDist = 3.4;
        const camHeight = 1.85 + pitch * 1.2;
        camera.position.set(
          walker.x - Math.sin(yaw) * followDist,
          camHeight,
          walker.z - Math.cos(yaw) * followDist
        );
        camera.lookAt(walker.x, 1.25, walker.z);
      } else {
        controls?.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      cleanupWalk?.();
      cleanupOrbit?.();
      controls?.dispose();
      for (const d of disposables) {
        try {
          d.dispose?.();
        } catch {
          /* ignore */
        }
      }
      texCache.forEach((tex) => tex.dispose?.());
      renderer.dispose();
      el.innerHTML = "";
    };
  }, [layout, products, walkMode, highlightShelfId, highlightPairId, focusRequest, contentRevision]);

  return (
    <div
      ref={ref}
      style={{ width: "100%", height: "100%", minHeight: 420, borderRadius: 8, overflow: "hidden", cursor: walkMode ? "pointer" : "grab" }}
    />
  );
}
