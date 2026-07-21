import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { pointInPolygon } from "./layout-editor/polygonCanvas.js";

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
  const avatar = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.75 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.65 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.72, 14), shirt);
  torso.position.y = 0.92;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), skin);
  head.position.y = 1.38;
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.82, 10), pants);
  legL.position.set(-0.11, 0.41, 0);
  const legR = legL.clone();
  legR.position.x = 0.11;
  avatar.add(torso, head, legL, legR);
  return avatar;
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
      if (url) productImages.set(p.id, url);
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
      const geo = new THREE.BoxGeometry(len, 0.04, aw);
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
      mesh.position.set(ax + len / 2, 0.03, az + aw / 2);
      scene.add(mesh);
      disposables.push(geo, mat);
    }

    const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
    let facingBudget = 0;
    const MAX_FACINGS = 500;

    for (const f of shelves) {
      const w = Number(f.usableWidthMeters ?? f.widthMeters) || 1.2;
      const d = Number(f.depthMeters) || 0.6;
      const h = Number(f.heightMeters) || 2;
      const rot = (((Number(f.rotationDeg) || 0) % 360) + 360) % 360 * (Math.PI / 180);
      let baseColor = new THREE.Color("#A30A2A");
      try {
        baseColor = new THREE.Color(f.color || "#A30A2A");
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

      const levels =
        Array.isArray(f.levels) && f.levels.length
          ? f.levels
          : [
              { levelIndex: 0, heightFromFloorMeters: 0.35 },
              { levelIndex: 1, heightFromFloorMeters: h * 0.55 },
            ];

      for (const lv of levels) {
        const y = Number(lv.heightFromFloorMeters) || 0.4;
        const boardGeo = new THREE.BoxGeometry(w * 0.96, 0.04, d * 0.92);
        const boardMat = new THREE.MeshStandardMaterial({ color: 0xf3f0eb, roughness: 0.85 });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.set(w / 2, y, d / 2);
        group.add(board);
        disposables.push(boardGeo, boardMat);
      }

      for (const p of f.planogram || []) {
        if (facingBudget >= MAX_FACINGS) break;
        const lv = levels.find((l) => l.levelIndex === p.levelIndex) || levels[0];
        const y = (Number(lv?.heightFromFloorMeters) || 0.4) + 0.12;
        const facings = Math.max(1, Number(p.facings) || 1);
        const boxW = Math.min(w / facings, 0.22);
        const imageUrl = productImages.get(p.productId);
        for (let i = 0; i < facings && facingBudget < MAX_FACINGS; i++) {
          const geo = new THREE.BoxGeometry(boxW * 0.9, 0.2, d * 0.35);
          const facingColor = productFacingColor(p.productId);
          const mat = new THREE.MeshStandardMaterial({ color: facingColor, roughness: 0.55 });
          if (imageUrl) applyTexture(mat, imageUrl, disposables);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(boxW * (i + 0.5) + (Number(p.positionX) || 0), y, d * 0.35);
          group.add(mesh);
          disposables.push(geo, mat);
          facingBudget += 1;
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
    let walker = { x: cx, z: Math.min(cz + 2, Math.max(0.5, (layout.depthMeters || 10) - 0.5)) };
    let lastWalker = { ...walker };

    if (walkMode) {
      avatar = buildWalkerAvatar();
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
        if (insideFloor(next.x, next.z, layout)) {
          walker = next;
          lastWalker = { ...walker };
        } else {
          walker = { ...lastWalker };
        }

        avatar.position.set(walker.x, 0, walker.z);
        avatar.rotation.y = yaw;

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
