import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  buildAisleMeshes,
  buildStoreFloor,
  createWebGLRenderer,
  DEFAULT_OVERVIEW_ZOOM,
  layoutOverviewCameraFromBounds,
  layoutSceneBounds,
  SCENE_COLORS,
  setupSceneLighting,
} from "./layout-editor/layoutSceneWebGL.js";
import { pointInPolygon } from "./layout-editor/polygonCanvas.js";
import {
  isDoubleSided,
  normalizeShelfUI,
  segmentFaceIdForShelf,
  shelvesForScene3D,
} from "./layout-editor/shelfFaces.js";
import { effectiveSegmentsForLevel, resolveSegmentId, shelfLevels } from "./layout-editor/planogramSegments.js";
import {
  buildProductLookup,
  productImageUrl,
  resolveCatalogProduct,
} from "./productCatalog.js";
import {
  layoutBounds,
  levelClearanceMeters,
  productFacingSize,
  shelf3dLocalBox,
  shelfWorldFocus,
} from "./scene3dDimensions.js";

function insideFloor(x, z, layout) {
  if (layout.shape === "polygon" && layout.polygon?.length >= 3) {
    return pointInPolygon(x, z, layout.polygon);
  }
  const { widthMeters: w, depthMeters: d } = layoutBounds(layout);
  return x >= 0.35 && x <= w - 0.35 && z >= 0.35 && z <= d - 0.35;
}

function softClampOrbitTarget(target, layout, maxDim, anchor = null) {
  if (anchor) {
    const span = Math.max(anchor.merchW || 1.2, anchor.d || 0.6, 0.8);
    const radius = span * 1.35;
    target.x = Math.max(anchor.x - radius, Math.min(anchor.x + radius, target.x));
    target.z = Math.max(anchor.z - radius, Math.min(anchor.z + radius, target.z));
    target.y = Math.max(0.15, Math.min((anchor.h || 2.5) * 0.85, target.y));
    return;
  }
  const margin = Math.max(4, maxDim * 0.85);
  const { widthMeters: w, depthMeters: d } = layoutBounds(layout);
  target.x = Math.max(-margin, Math.min(w + margin, target.x));
  target.z = Math.max(-margin, Math.min(d + margin, target.z));
  target.y = Math.max(0.05, Math.min(maxDim * 2.5, target.y));
}

function layoutOverviewCamera(layout) {
  return layoutOverviewCameraFromBounds(layoutSceneBounds(layout));
}

function dollyCamera(camera, target, factor) {
  const offset = camera.position.clone().sub(target);
  if (offset.lengthSq() < 1e-6) {
    offset.set(0, 0, 1);
  }
  offset.multiplyScalar(factor);
  camera.position.copy(target).add(offset);
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
    depth = 0.08,
    product,
    imageUrl,
    texLoader,
    texCache,
    disposables,
    alive,
    emphasized = false,
    shelfFocus = false,
  } = opts;
  const facingW = Math.max(0.1, width);
  const facingH = Math.max(0.16, height);
  const facingD = Math.max(0.08, depth);
  const hue = product?.id ? (product.id.charCodeAt(0) * 17) % 360 : 30;
  const baseColor = new THREE.Color().setHSL(
    hue / 360,
    emphasized ? 0.55 : 0.42,
    emphasized ? 0.58 : 0.68
  );

  const boxGeo = new THREE.BoxGeometry(facingW, facingH, facingD);
  const boxMat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.58,
    metalness: 0.02,
  });
  if (emphasized) {
    boxMat.emissive = new THREE.Color(0xa30a2a);
    boxMat.emissiveIntensity = 0.1;
  }
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(x, y, z);
  box.rotation.y = rotY;
  box.userData.productId = product?.id || null;
  box.userData.productName = product?.name || null;
  group.add(box);
  disposables.push(boxGeo, boxMat);

  if (imageUrl) {
    const planeGeo = new THREE.PlaneGeometry(facingW * 0.94, facingH * 0.94);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    loadProductTexture(texLoader, texCache, imageUrl, planeMat, disposables, alive);
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.set(x, y, z + (rotY === 0 ? facingD * 0.52 : -facingD * 0.52));
    plane.rotation.y = rotY;
    plane.renderOrder = shelfFocus ? 2 : 1;
    plane.userData.productId = product?.id || null;
    group.add(plane);
    disposables.push(planeGeo, planeMat);
  }
}

function planogramFromPhysicalShelf(layout, shelfId, merchandisingFaceId = "A") {
  if (!shelfId || !layout) return [];
  const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
  const phys = shelves.find((s) => s.id === shelfId);
  if (!phys) return [];
  const norm = normalizeShelfUI(phys);
  const dataFaceId = segmentFaceIdForShelf(phys, merchandisingFaceId);
  const face = norm.faces?.find((f) => f.id === dataFaceId) || norm.faces?.[0];
  return face?.planogram || phys.planogram || [];
}

function resolveFacePlanograms(f, layout, faceId, focusPhysicalShelfId, shelfFocusMode, isHighlighted) {
  const dual = isDoubleSided(f);
  const faceA = f.faces?.find((face) => face.id === "A");
  const faceB = f.faces?.find((face) => face.id === "B");
  const activeFace = faceId === "B" ? "B" : "A";

  if (shelfFocusMode && isHighlighted && focusPhysicalShelfId) {
    const focused = planogramFromPhysicalShelf(layout, focusPhysicalShelfId, activeFace);
    return [{ id: activeFace, planogram: focused }];
  }

  if (dual) {
    return [
      { id: "A", planogram: faceA?.planogram || f.planogram || [] },
      { id: "B", planogram: faceB?.planogram || [] },
    ];
  }
  return [{ id: "A", planogram: f.planogram || faceA?.planogram || [] }];
}

function facingPositions(placement, shelf, faceId, merchWidth) {
  const levelIndex = Number(placement.levelIndex) || 0;
  const segments = effectiveSegmentsForLevel(shelf, faceId, levelIndex);
  const segId = resolveSegmentId(placement, shelf, faceId);
  const seg = segments.find((s) => s.id === segId) || segments[0];
  const facings = Math.max(1, Number(placement.facings) || 1);
  const segW = seg?.widthMeters ?? merchWidth;
  const startX = seg?.offsetMeters ?? 0;
  const slotW = segW / facings;
  const xs = [];
  for (let i = 0; i < facings; i += 1) {
    xs.push(startX + slotW * (i + 0.5));
  }
  return xs;
}

function faceShoppersideZ(d, dual, faceId) {
  if (!dual) return d * 0.38;
  return faceId === "B" ? d * 0.88 : d * 0.12;
}

function faceShopperRotY(dual, faceId) {
  if (!dual) return Math.PI;
  return faceId === "B" ? 0 : Math.PI;
}

function shelfFocusCamera(highlight, faceId = "A") {
  const cx = highlight.x;
  const cz = highlight.z;
  const h = highlight.h || 2;
  const rot = highlight.rot || 0;
  const dual = Boolean(highlight.dual);
  const merchW = highlight.merchW || highlight.w || 1.2;
  const span = Math.max(merchW, highlight.d || 0.6);
  const dist = Math.max(1.35, Math.min(2.6, span * 1.35));
  const eyeY = Math.max(1.05, h * 0.5);
  const lookY = Math.max(0.62, h * 0.46);
  const faceFlip = dual && faceId === "B" ? Math.PI : 0;
  const approach = rot + Math.PI + faceFlip;
  const lookOffset = dual ? (span * 0.08) * (faceId === "B" ? 1 : -1) : 0;
  const lookX = cx + Math.sin(approach + Math.PI / 2) * lookOffset;
  const lookZ = cz + Math.cos(approach + Math.PI / 2) * lookOffset;
  return {
    camX: lookX + Math.sin(approach) * dist,
    camY: eyeY,
    camZ: lookZ + Math.cos(approach) * dist,
    lookX,
    lookY,
    lookZ,
    minDist: 0.75,
    maxDist: Math.max(dist * 2.4, 8),
  };
}

/** Immersive Three.js: Orbit (zoom/pan) or Walk; shelves, levels, planogram facings. */
export default function Scene3D({
  layout,
  products = [],
  walkMode = false,
  highlightShelfId = null,
  highlightPairId = null,
  highlightFaceId = "A",
  focusPhysicalShelfId = null,
  shelfFocusMode = false,
  focusRequest = 0,
  contentRevision = 0,
}) {
  const ref = useRef(null);
  const orbitApiRef = useRef(null);
  const [navSeq, setNavSeq] = useState({ type: "", n: 0 });

  useEffect(() => {
    const api = orbitApiRef.current;
    if (!api?.controls || !navSeq.type) return;
    if (navSeq.type === "fitStore") api.fitStore();
    else if (navSeq.type === "focusShelf") api.focusShelf();
    else if (navSeq.type === "zoomIn") api.dolly(0.82);
    else if (navSeq.type === "zoomOut") api.dolly(1.18);
  }, [navSeq]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !layout) return undefined;

    let alive = true;
    const isAlive = () => alive;

    const productLookup = buildProductLookup(products);
    const texLoader = new THREE.TextureLoader();
    const texCache = new Map();

    const readSize = () => ({
      width: Math.max(320, el.clientWidth || 640),
      height: Math.max(360, el.clientHeight || 480),
    });
    let { width, height } = readSize();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_COLORS.background);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500);
    const sceneBounds = layoutSceneBounds(layout);
    const cx = sceneBounds.centerX;
    const cz = sceneBounds.centerZ;
    const maxDim = sceneBounds.maxDim;
    const floorW = sceneBounds.widthMeters;
    const floorD = sceneBounds.depthMeters;
    const storeH = sceneBounds.heightMeters;

    const renderer = createWebGLRenderer(el);
    renderer.setSize(width, height);

    setupSceneLighting(scene);

    const disposables = [];
    const storeOverview = !shelfFocusMode && !walkMode;

    const floorLayer = buildStoreFloor(layout, sceneBounds);
    scene.add(floorLayer.group);
    disposables.push(...floorLayer.disposables);

    const aisleLayer = buildAisleMeshes(layout, { overview: storeOverview });
    scene.add(aisleLayer.group);
    disposables.push(...aisleLayer.disposables);

    let highlightCenter = null;
    let highlightFocus = null;

    const shelves = shelvesForScene3D(
      layout.shelves?.length ? layout.shelves : layout.fixtures || []
    );
    let facingBudget = 0;
    const MAX_FACINGS = 1200;

    if (!shelfFocusMode) {
      const grid = new THREE.GridHelper(
        Math.max(floorW, floorD),
        Math.max(8, Math.floor(Math.max(floorW, floorD))),
        SCENE_COLORS.grid,
        SCENE_COLORS.grid
      );
      grid.position.set(cx, 0.01, cz);
      scene.add(grid);
      disposables.push(grid.geometry);
    }

    for (const raw of shelves) {
      const f = normalizeShelfUI(raw);
      const box = shelf3dLocalBox(f, layout);
      const w = box.widthMeters;
      const merchW = box.merchWidthMeters;
      const d = box.depthMeters;
      const h = box.heightMeters;
      const rot = box.rotationRad;
      const dual = isDoubleSided(f);
      const faceA = f.faces?.find((face) => face.id === "A");
      const faceB = f.faces?.find((face) => face.id === "B");

      const isHighlighted =
        highlightShelfId &&
        (f.id === highlightShelfId ||
          f.pairShelfIds?.front === highlightShelfId ||
          f.pairShelfIds?.back === highlightShelfId ||
          (highlightPairId && f.pairId === highlightPairId));

      const dimOthers = false;

      let baseColor = new THREE.Color("#A30A2A");
      try {
        baseColor = new THREE.Color(f.color || faceA?.color || "#A30A2A");
      } catch {
        /* keep */
      }

      const group = new THREE.Group();
      group.position.set(box.originX, 0, box.originZ);
      group.rotation.y = -rot;
      group.userData.shelfId = f.id;
      group.userData.pairId = f.pairId || null;

      const frameGeo = new THREE.BoxGeometry(w, 0.06, d);
      const frameMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.7,
        transparent: dimOthers,
        opacity: dimOthers ? 0.28 : 1,
      });
      if (isHighlighted) {
        frameMat.emissive = new THREE.Color(0xa30a2a);
        frameMat.emissiveIntensity = shelfFocusMode ? 0.55 : 0.45;
      }
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(w / 2, 0.03, d / 2);
      group.add(frame);
      disposables.push(frameGeo, frameMat);

      const uprightGeo = new THREE.BoxGeometry(0.04, h, 0.04);
      const uprightMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });
      for (const ux of [0.04, w - 0.04]) {
        for (const uz of [0.04, d - 0.04]) {
          const upright = new THREE.Mesh(uprightGeo, uprightMat);
          upright.position.set(ux, h / 2, uz);
          group.add(upright);
        }
      }
      disposables.push(uprightGeo, uprightMat);

      if (isHighlighted) {
        const focus = shelfWorldFocus(raw, layout, highlightPairId);
        highlightCenter = { x: focus.x, z: focus.z };
        highlightFocus = focus;
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

      const levels = shelfLevels(f);

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

      const activeFace = highlightFaceId === "B" ? "B" : "A";
      const segmentShelf =
        shelfFocusMode && isHighlighted && focusPhysicalShelfId
          ? normalizeShelfUI(
              (layout.shelves?.length ? layout.shelves : layout.fixtures || []).find(
                (s) => s.id === focusPhysicalShelfId
              ) || f
            )
          : f;
      const facePlanograms = resolveFacePlanograms(
        f,
        layout,
        activeFace,
        focusPhysicalShelfId,
        shelfFocusMode,
        isHighlighted
      ).map((face) => ({
        ...face,
        z: faceShoppersideZ(d, dual, face.id),
        rotY: faceShopperRotY(dual, face.id),
      }));

      const renderProducts = !shelfFocusMode || isHighlighted;
      if (renderProducts) {
        for (const face of facePlanograms) {
          if (!face.planogram?.length) continue;
          const segmentFaceId = segmentFaceIdForShelf(segmentShelf, face.id);
          for (const placement of face.planogram) {
            if (facingBudget >= MAX_FACINGS) break;
            const lv =
              levels.find((l) => Number(l.levelIndex) === Number(placement.levelIndex)) || levels[0];
            const boardY = Number(lv?.heightFromFloorMeters) || 0.4;
            const facings = Math.max(1, Number(placement.facings) || 1);
            const product = resolveCatalogProduct(productLookup, placement.productId);
            const imageUrl = productImageUrl(product);
            const xs = facingPositions(placement, segmentShelf, segmentFaceId, merchW);
            const slotW =
              (effectiveSegmentsForLevel(segmentShelf, segmentFaceId, placement.levelIndex).find(
                (s) => s.id === resolveSegmentId(placement, segmentShelf, segmentFaceId)
              )?.widthMeters || merchW) / facings;
            const clearance = levelClearanceMeters(lv, levels, h);
            const facing = productFacingSize(product, slotW, clearance, d);
            const depthFacings = Math.max(1, Number(placement.depthFacings) || 1);

            for (let i = 0; i < xs.length && facingBudget < MAX_FACINGS; i += 1) {
              for (let depthIdx = 0; depthIdx < depthFacings && facingBudget < MAX_FACINGS; depthIdx += 1) {
                const depthStep = facing.d * 1.05;
                const zPull = face.id === "B" ? -depthIdx * depthStep : depthIdx * depthStep;
                addProductFacing(group, {
                  x: xs[i],
                  y: boardY + facing.h / 2 + 0.02,
                  z: face.z + zPull,
                  rotY: face.rotY,
                  width: facing.w,
                  height: facing.h,
                  depth: facing.d,
                  product,
                  imageUrl,
                  texLoader,
                  texCache,
                  disposables,
                  alive: isAlive,
                  emphasized: isHighlighted,
                  shelfFocus: shelfFocusMode && isHighlighted,
                });
                facingBudget += 1;
              }
            }
          }
        }
      }

      if (isHighlighted && shelfFocusMode) {
        const ringGeo = new THREE.RingGeometry(Math.max(w, d) * 0.55, Math.max(w, d) * 0.62, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xa30a2a,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(w / 2, 0.05, d / 2);
        group.add(ring);
        disposables.push(ringGeo, ringMat);
      }

      scene.add(group);
    }

    let controls = null;
    let cleanupOrbitKeys = null;
    const keys = new Set();
    let yaw = 0;
    let pitch = 0.2;
    let pointerLocked = false;
    let cleanupWalk = null;
    let cleanupOrbit = null;
    let avatar = null;
    let avatarRig = null;
    let walker = { x: cx, z: Math.min(cz + 2, Math.max(0.5, floorD - 0.5)) };
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
      const focus = highlightFocus && shelfFocusMode ? shelfFocusCamera(highlightFocus, highlightFaceId) : null;
      const overview = layoutOverviewCamera(layout);
      const lookX = focus?.lookX ?? highlightCenter?.x ?? cx;
      const lookZ = focus?.lookZ ?? highlightCenter?.z ?? cz;
      const lookY = focus?.lookY ?? 0.5;

      const applyView = (view, zoomFactor = 1) => {
        camera.position.set(view.camX, view.camY, view.camZ);
        controls.target.set(view.lookX, view.lookY, view.lookZ);
        camera.lookAt(view.lookX, view.lookY, view.lookZ);
        if (zoomFactor !== 1) {
          dollyCamera(camera, controls.target, zoomFactor);
        }
        controls.update();
      };

      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(lookX, lookY, lookZ);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enableZoom = true;
      controls.zoomSpeed = 1.15;
      controls.zoomToCursor = true;
      controls.rotateSpeed = storeOverview ? 0.65 : 0.75;
      controls.panSpeed = storeOverview ? 1.1 : shelfFocusMode ? 0.65 : 0.95;
      controls.maxPolarAngle = storeOverview ? Math.PI / 2.5 : Math.PI / 2.02;
      controls.minPolarAngle = storeOverview ? 0.02 : 0.04;
      controls.minDistance = focus?.minDist ?? overview.minDist ?? 0.28;
      controls.maxDistance = focus?.maxDist ?? overview.maxDist ?? Math.max(maxDim * 5.5, 40);
      controls.enablePan = true;
      controls.screenSpacePanning = false;
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };

      const orbitAnchor =
        shelfFocusMode && highlightFocus
          ? {
              x: highlightFocus.x,
              z: highlightFocus.z,
              h: highlightFocus.h,
              merchW: highlightFocus.merchW,
              d: highlightFocus.d,
            }
          : null;

      if (focus) {
        applyView(focus);
      } else {
        applyView(overview, DEFAULT_OVERVIEW_ZOOM);
      }

      const onOrbitChange = () => {
        softClampOrbitTarget(controls.target, layout, maxDim, orbitAnchor);
        camera.position.y = Math.max(0.22, camera.position.y);
      };
      const onOrbitStart = () => {
        renderer.domElement.style.cursor = "grabbing";
      };
      const onOrbitEnd = () => {
        renderer.domElement.style.cursor = "grab";
      };
      controls.addEventListener("change", onOrbitChange);
      controls.addEventListener("start", onOrbitStart);
      controls.addEventListener("end", onOrbitEnd);

      const onOrbitKey = (e) => {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable) {
          return;
        }
        if (e.key === "+" || e.key === "=") {
          dollyCamera(camera, controls.target, 0.82);
          controls.update();
          e.preventDefault();
        } else if (e.key === "-" || e.key === "_") {
          dollyCamera(camera, controls.target, 1.18);
          controls.update();
          e.preventDefault();
        } else if (e.key === "0") {
          applyView(overview, DEFAULT_OVERVIEW_ZOOM);
          e.preventDefault();
        } else if ((e.key === "r" || e.key === "R") && focus) {
          applyView(focus);
          e.preventDefault();
        }
      };
      window.addEventListener("keydown", onOrbitKey);

      orbitApiRef.current = {
        controls,
        camera,
        fitStore: () => applyView(overview, DEFAULT_OVERVIEW_ZOOM),
        focusShelf: () => {
          if (focus) applyView(focus);
        },
        dolly: (factor) => {
          dollyCamera(camera, controls.target, factor);
          controls.update();
        },
      };

      cleanupOrbit = () => {
        controls.removeEventListener("change", onOrbitChange);
        controls.removeEventListener("start", onOrbitStart);
        controls.removeEventListener("end", onOrbitEnd);
        window.removeEventListener("keydown", onOrbitKey);
      };
      cleanupOrbitKeys = () => {
        orbitApiRef.current = null;
      };
    }

    const onResize = () => {
      if (!alive) return;
      const next = readSize();
      if (next.width === width && next.height === height) return;
      width = next.width;
      height = next.height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    resizeObserver?.observe(el);
    window.addEventListener("resize", onResize);

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
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onResize);
      cleanupWalk?.();
      cleanupOrbit?.();
      cleanupOrbitKeys?.();
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
  }, [
    layout,
    products,
    walkMode,
    highlightShelfId,
    highlightPairId,
    highlightFaceId,
    focusPhysicalShelfId,
    shelfFocusMode,
    contentRevision,
  ]);

  return (
    <div className="scene3d-root">
      <div
        ref={ref}
        className={`scene3d-canvas${shelfFocusMode ? " scene3d-canvas--focus" : ""}`}
        style={{ cursor: walkMode ? "pointer" : "grab" }}
      />
      {!walkMode ? (
        <div className="scene3d-nav scene3d-nav--compact" aria-label="3D navigation">
          <div className="scene3d-nav-row">
            <button
              type="button"
              className="scene3d-nav-btn scene3d-nav-btn--wide"
              title="Fit entire store (0)"
              onClick={() => setNavSeq({ type: "fitStore", n: Date.now() })}
            >
              Fit store
            </button>
            <button
              type="button"
              className="scene3d-nav-btn"
              title="Zoom out"
              onClick={() => setNavSeq({ type: "zoomOut", n: Date.now() })}
            >
              −
            </button>
            <button
              type="button"
              className="scene3d-nav-btn"
              title="Zoom in"
              onClick={() => setNavSeq({ type: "zoomIn", n: Date.now() })}
            >
              +
            </button>
          </div>
          {shelfFocusMode ? (
            <div className="scene3d-nav-row">
              <button
                type="button"
                className="scene3d-nav-btn scene3d-nav-btn--wide"
                title="Reset to shelf (R)"
                onClick={() => setNavSeq({ type: "focusShelf", n: Date.now() })}
              >
                Reset shelf
              </button>
            </div>
          ) : null}
          <p className="scene3d-nav-hint muted">
            {shelfFocusMode
              ? "Scroll · drag rotate · right-drag pan · 0 fit · R reset shelf"
              : "Racks + products · scroll · drag · right-drag pan · 0 fit store"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
