import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { resolveAssetUrl } from "./assetUrl.js";
import { pointInPolygon } from "./layout-editor/polygonCanvas.js";
import { isDoubleSided, normalizeShelfUI, shelvesForScene3D } from "./layout-editor/shelfFaces.js";

function productFacingColor(productId) {
  let hash = 0;
  const s = String(productId || "x");
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return new THREE.Color(`hsl(${hue}, 62%, 48%)`);
}

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

/** Immersive Three.js: Orbit (zoom/pan) or Walk; shelves, levels, planogram facings. */
export default function Scene3D({ layout, products = [], walkMode = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !layout) return undefined;

    const productImages = new Map();
    for (const p of products || []) {
      const url = p.imageUrl || p.attributes?.imageUrl;
      if (url) productImages.set(p.id, resolveAssetUrl(url));
    }
    const texLoader = new THREE.TextureLoader();
    const texCache = new Map();
    const applyTexture = (mat, url, disposables) => {
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
          tex.colorSpace = THREE.SRGBColorSpace;
          texCache.set(url, tex);
          disposables.push(tex);
          mat.map = tex;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
        },
        undefined,
        () => {
          /* broken/CORS image → keep color fallback */
        }
      );
    };

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
    const MAX_FACINGS = 500;

    for (const raw of shelves) {
      const f = normalizeShelfUI(raw);
      const w = Number(f.usableWidthMeters ?? f.widthMeters) || 1.2;
      const d = Number(f.depthMeters) || 0.6;
      const h = Number(f.heightMeters) || 2;
      const rot = (((Number(f.rotationDeg) || 0) % 360) + 360) % 360 * (Math.PI / 180);
      const dual = isDoubleSided(f);
      const faceA = f.faces?.find((face) => face.id === "A");
      const faceB = f.faces?.find((face) => face.id === "B");
      let baseColor = new THREE.Color("#A30A2A");
      try {
        baseColor = new THREE.Color(f.color || faceA?.color || "#A30A2A");
      } catch {
        /* keep */
      }

      const group = new THREE.Group();
      group.position.set(Number(f.x) || 0, 0, Number(f.y) || 0);
      group.rotation.y = -rot;

      const frameGeo = new THREE.BoxGeometry(w, 0.08, d);
      const frameMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.7 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(w / 2, 0.04, d / 2);
      group.add(frame);
      disposables.push(frameGeo, frameMat);

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
            { id: "A", planogram: faceA?.planogram || f.planogram || [], z: d * 0.12 },
            { id: "B", planogram: faceB?.planogram || [], z: d * 0.88 },
          ]
        : [{ id: "A", planogram: f.planogram || [], z: d * 0.35 }];

      for (const face of facePlanograms) {
        for (const p of face.planogram || []) {
          if (facingBudget >= MAX_FACINGS) break;
          const lv = levels.find((l) => l.levelIndex === p.levelIndex) || levels[0];
          const y = (Number(lv?.heightFromFloorMeters) || 0.4) + 0.12;
          const facings = Math.max(1, Number(p.facings) || 1);
          const boxW = Math.min(w / facings, 0.22);
          const imageUrl = productImages.get(p.productId);
          for (let i = 0; i < facings && facingBudget < MAX_FACINGS; i++) {
            const geo = new THREE.BoxGeometry(boxW * 0.9, 0.2, d * 0.22);
            const facingColor = productFacingColor(p.productId);
            const mat = new THREE.MeshStandardMaterial({ color: facingColor, roughness: 0.55 });
            if (imageUrl) applyTexture(mat, imageUrl, disposables);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(boxW * (i + 0.5) + (Number(p.positionX) || 0), y, face.z);
            group.add(mesh);
            disposables.push(geo, mat);
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
      camera.position.set(cx + maxDim * 0.55, maxDim * 0.75, cz + maxDim * 0.55);
      camera.lookAt(cx, 0.5, cz);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(cx, 0.5, cz);
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
      renderer.dispose();
      el.innerHTML = "";
    };
  }, [layout, products, walkMode]);

  return (
    <div
      ref={ref}
      style={{ width: "100%", height: "100%", minHeight: 420, borderRadius: 8, overflow: "hidden", cursor: walkMode ? "pointer" : "grab" }}
    />
  );
}
