import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  buildAisleMeshes,
  buildFloorPlanUnderlay,
  buildObstacleMeshes,
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
  physicalShelfForMerchandisingFace,
  planogramForSceneFace,
  planogramForMerchandisingFace,
  storageFaceIdForScene3D,
  shelvesForScene3D,
  shelfDisplayLabel,
  shelfFaceDisplayLabel,
} from "./layout-editor/shelfFaces.js";
import { effectiveSegmentsForLevel, resolveSegmentId, shelfLevels } from "./layout-editor/planogramSegments.js";
import {
  buildProductLookup,
  productImageUrl,
  resolveCatalogProduct,
} from "./productCatalog.js";
import { colorForShelfFace } from "./categoryColors.js";
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

/** Compact canvas sprite for shelf numbers — stays small and readable, not oversized. */
function makeShelfNumberLabel(text, emphasized = false) {
  const label = String(text || "—").slice(0, 10);
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `700 28px "Segoe UI", system-ui, sans-serif`;
  const metrics = ctx.measureText(label);
  const padX = 10;
  const boxW = Math.min(canvas.width - 8, metrics.width + padX * 2);
  const boxH = 34;
  const bx = (canvas.width - boxW) / 2;
  const by = (canvas.height - boxH) / 2;
  ctx.fillStyle = emphasized ? "rgba(163, 10, 42, 0.92)" : "rgba(15, 23, 42, 0.82)";
  ctx.beginPath();
  const r = 8;
  ctx.moveTo(bx + r, by);
  ctx.arcTo(bx + boxW, by, bx + boxW, by + boxH, r);
  ctx.arcTo(bx + boxW, by + boxH, bx, by + boxH, r);
  ctx.arcTo(bx, by + boxH, bx, by, r);
  ctx.arcTo(bx, by, bx + boxW, by, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const sprite = new THREE.Sprite(mat);
  // Centered on the shelf top so the tag sits on the unit, not floating away.
  sprite.center.set(0.5, 0.5);
  // ~32 cm wide × 13 cm tall in world space — readable when zoomed, not huge.
  sprite.scale.set(0.32, 0.13, 1);
  sprite.renderOrder = 12;
  sprite.userData.isShelfLabel = true;
  sprite.userData.baseScale = { x: 0.32, y: 0.13 };
  return { sprite, disposables: [tex, mat] };
}

function scene3dShelfNumber(raw, layout) {
  const aisles = layout?.aisles || [];
  const all = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  if (raw?.pairDisplay && raw?.pairShelfIds) {
    const front = all.find((s) => s.id === raw.pairShelfIds.front);
    const back = all.find((s) => s.id === raw.pairShelfIds.back);
    const a = front ? shelfFaceDisplayLabel(front, aisles) : null;
    const b = back ? shelfFaceDisplayLabel(back, aisles) : null;
    if (a && b && a !== b) return `${a}/${b}`;
    return a || b || shelfDisplayLabel(raw, aisles);
  }
  const label = shelfDisplayLabel(raw, aisles);
  if (label && label !== "—") return label;
  if (raw?.displayNumber != null) return String(raw.displayNumber);
  return raw?.label || null;
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

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const MAX_FACINGS = 16000;
/** In store overview, limit depth rows so every shelf still gets visible facings. */
const OVERVIEW_MAX_DEPTH = 2;

function facingVisualSize(unitW, unitH, unitD, overviewBoost) {
  return {
    w: Math.max(overviewBoost ? 0.1 : 0.08, unitW),
    h: Math.max(overviewBoost ? 0.14 : 0.12, unitH),
    d: Math.max(overviewBoost ? 0.08 : 0.06, unitD),
  };
}

function productHue(product) {
  return product?.id ? (product.id.charCodeAt(0) * 17) % 360 : 30;
}

function createBoxMaterial(inst, matCache, disposables, texture = null) {
  const texKey = texture ? ":tex" : "";
  const dimKey = inst.dimmed ? ":dim" : "";
  const key = `${inst.product?.id || "none"}:${inst.emphasized}:${inst.overviewBoost}:${inst.shelfFocus}${texKey}${dimKey}`;
  const cached = matCache.get(key);
  if (cached) return cached;

  const hue = productHue(inst.product);
  const baseColor = texture
    ? new THREE.Color(0xffffff)
    : new THREE.Color().setHSL(
        hue / 360,
        inst.emphasized ? 0.55 : 0.48,
        inst.emphasized ? 0.58 : 0.62
      );
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    map: texture || null,
    roughness: 0.55,
    metalness: 0.02,
    transparent: Boolean(inst.dimmed),
    opacity: inst.dimmed ? 0.28 : 1,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  if (inst.emphasized) {
    mat.emissive = new THREE.Color(0xa30a2a);
    mat.emissiveIntensity = inst.shelfFocus ? 0.14 : 0.22;
  } else if (inst.overviewBoost && !inst.dimmed) {
    mat.emissive = texture ? new THREE.Color(0x222222) : baseColor.clone();
    mat.emissiveIntensity = texture ? 0.08 : 0.28;
  }
  matCache.set(key, mat);
  disposables.push(mat);
  return mat;
}

function createPlaneMaterial(imageUrl, texCache, disposables) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cached = texCache.get(imageUrl);
  if (cached) {
    mat.map = cached;
    return mat;
  }
  mat.color.set(0xe5e7eb);
  return mat;
}

function preloadProductTextures(texLoader, texCache, urls, disposables) {
  const unique = [...new Set((urls || []).filter(Boolean))];
  if (!unique.length) return Promise.resolve();
  return Promise.all(
    unique.map(
      (url) =>
        new Promise((resolve) => {
          if (texCache.has(url)) {
            resolve();
            return;
          }
          texLoader.load(
            url,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.minFilter = THREE.LinearFilter;
              tex.magFilter = THREE.LinearFilter;
              tex.generateMipmaps = false;
              texCache.set(url, tex);
              disposables.push(tex);
              resolve();
            },
            undefined,
            () => resolve()
          );
        })
    )
  );
}

function collectShelfFacingInstances({
  f,
  layout,
  activeFace,
  focusPhysicalShelfId,
  shelfFocusMode,
  isHighlighted,
  d,
  dual,
  merchW,
  h,
  overviewProductBoost,
  faceDepthMeters,
}) {
  const instances = [];
  const facePlanograms = resolveFacePlanograms(
    f,
    layout,
    activeFace,
    focusPhysicalShelfId,
    shelfFocusMode,
    isHighlighted
  ).map((face) => ({
    ...face,
    z: faceShoppersideZ(d, dual, face.id, faceDepthMeters),
    rotY: faceShopperRotY(dual, face.id),
  }));

  // Always draw products. In single-shelf focus, non-focused shelves stay visible but quieter.
  for (const face of facePlanograms) {
    if (!face.planogram?.length) continue;
    const physRaw = physicalShelfForMerchandisingFace(f, layout, face.id);
    const physShelf = normalizeShelfUI(physRaw);
    const storageFaceId = storageFaceIdForScene3D(f, face.id);
    const levels = shelfLevels(physShelf);
    const faceDepth = Math.max(0.12, Number(faceDepthMeters) || (dual ? d * 0.45 : d * 0.85));

    for (const placement of face.planogram) {
      if (!placement?.productId) continue;
      const lv =
        levels.find((l) => Number(l.levelIndex) === Number(placement.levelIndex)) ||
        levels[Number(placement.levelIndex)] ||
        levels[0];
      if (!lv) continue;

      const boardY = Number(lv.heightFromFloorMeters) || 0.4;
      const segId = resolveSegmentId(placement, physShelf, storageFaceId);
      const segList = effectiveSegmentsForLevel(physShelf, storageFaceId, placement.levelIndex);
      const seg = segList.find((s) => s.id === segId) || segList[0];
      const segW = Math.max(0.1, Number(seg?.widthMeters) || merchW);
      // Cap facings so a bad catalog size can't flood the shelf with hundreds of units.
      const maxByWidth = Math.max(1, Math.floor(segW / 0.055 + 1e-9));
      const facingsCount = Math.min(
        maxByWidth,
        Math.max(1, Math.round(Number(placement.facings) || 1))
      );
      const depthCount = Math.max(1, Math.round(Number(placement.depthFacings) || 1));
      const slotW = segW / facingsCount;
      const clearance = levelClearanceMeters(lv, levels, h);
      const depthSign = face.id === "B" ? -1 : 1;

      instances.push({
        placement,
        productId: placement.productId,
        boardY,
        slotW,
        clearance,
        facingsCount,
        depthCount,
        depthSign,
        faceZ: face.z,
        rotY: face.rotY,
        physShelf,
        storageFaceId,
        merchW: segW,
        segmentOffset: Number(seg?.offsetMeters) || 0,
        overviewProductBoost,
        emphasized: isHighlighted,
        dimmed: Boolean(shelfFocusMode && !isHighlighted),
        shelfFocus: shelfFocusMode && isHighlighted,
        shelfDepth: faceDepth,
      });
    }
  }
  return instances;
}

function expandFacingInstances(rawInstances, productLookup, maxDim, facingBudgetRef, { overview = false, shelfCap = Infinity } = {}) {
  const out = [];
  let shelfCount = 0;
  for (const raw of rawInstances) {
    if (facingBudgetRef.count >= MAX_FACINGS || shelfCount >= shelfCap) break;
    const product = resolveCatalogProduct(productLookup, raw.productId);
    const imageUrl = productImageUrl(product);
    let facing = productFacingSize(product, raw.slotW, raw.clearance, raw.shelfDepth);
    if (raw.overviewProductBoost) {
      facing = overviewFacingSize(facing, raw.slotW);
    }

    // Keep the depth stack inside the face — never spill into the aisle.
    const maxStack = Math.max(0.1, raw.shelfDepth * 0.88);
    const depthLimit = Math.max(
      1,
      Math.min(
        raw.depthCount,
        overview ? OVERVIEW_MAX_DEPTH : raw.depthCount,
        Math.max(1, Math.floor(maxStack / Math.max(0.05, facing.d) + 1e-9))
      )
    );
    const unitDFit = Math.min(facing.d, maxStack / depthLimit - 0.008);
    const unitWFit = Math.min(facing.w, raw.slotW * 0.92);

    for (let depthIdx = 0; depthIdx < depthLimit; depthIdx += 1) {
      for (let faceIdx = 0; faceIdx < raw.facingsCount; faceIdx += 1) {
        if (facingBudgetRef.count >= MAX_FACINGS || shelfCount >= shelfCap) break;
        let unitW = unitWFit;
        let unitH = facing.h;
        let unitD = Math.max(0.04, unitDFit);
        if (raw.overviewProductBoost) {
          const boosted = overviewBlockSize({ w: unitW, h: unitH, d: unitD }, raw.slotW, maxDim);
          unitW = Math.min(boosted.w, raw.slotW * 0.92);
          unitH = boosted.h;
          unitD = Math.min(boosted.d, unitDFit);
        }
        const xLocal = (raw.segmentOffset || 0) + raw.slotW * (faceIdx + 0.5);
        const z = raw.faceZ + raw.depthSign * (unitD * 0.5 + depthIdx * (unitD + 0.01));
        const vis = facingVisualSize(unitW, unitH, unitD, raw.overviewProductBoost);
        out.push({
          x: xLocal,
          y: raw.boardY + 0.028 + vis.h / 2,
          z,
          rotY: raw.rotY,
          unitW: vis.w,
          unitH: vis.h,
          unitD: vis.d,
          product,
          imageUrl,
          emphasized: raw.emphasized,
          dimmed: raw.dimmed,
          overviewBoost: raw.overviewProductBoost,
          shelfFocus: raw.shelfFocus,
        });
        facingBudgetRef.count += 1;
        shelfCount += 1;
      }
      if (facingBudgetRef.count >= MAX_FACINGS || shelfCount >= shelfCap) break;
    }
  }
  return out;
}

function finalizeInstancedMesh(mesh) {
  // InstancedMesh culling uses the base 1×1×1 geometry bounds, not instance positions.
  // Products sit up to ~2 m above the group origin — disable culling so facings stay visible.
  mesh.frustumCulled = false;
}

function clearProductMeshes(group) {
  const remove = [];
  group.traverse((obj) => {
    if (obj.isInstancedMesh && obj.userData?.shelfpilotProduct) remove.push(obj);
  });
  for (const mesh of remove) {
    group.remove(mesh);
    mesh.dispose?.();
  }
}

function addInstancedFacings(parentGroup, instances, { texCache, matCache, disposables, showImages }) {
  if (!instances.length) return;

  const boxBuckets = new Map();
  const planeBuckets = new Map();

  for (const inst of instances) {
    const hasImage = showImages && inst.imageUrl && texCache.has(inst.imageUrl);
    const matKey = hasImage
      ? `tex:${inst.imageUrl}:${inst.emphasized}:${inst.overviewBoost}:${inst.shelfFocus}:${inst.dimmed}`
      : `${inst.product?.id || "none"}:${inst.emphasized}:${inst.overviewBoost}:${inst.shelfFocus}:${inst.dimmed}`;
    if (hasImage) {
      if (!boxBuckets.has(matKey)) boxBuckets.set(matKey, { list: [], texture: texCache.get(inst.imageUrl) });
      boxBuckets.get(matKey).list.push(inst);
      if (!inst.dimmed) {
        if (!planeBuckets.has(inst.imageUrl)) planeBuckets.set(inst.imageUrl, []);
        planeBuckets.get(inst.imageUrl).push(inst);
      }
    } else {
      if (!boxBuckets.has(matKey)) boxBuckets.set(matKey, { list: [], texture: null });
      boxBuckets.get(matKey).list.push(inst);
    }
  }

  const dummy = new THREE.Object3D();
  for (const [, bucket] of boxBuckets) {
    const list = bucket.list;
    const mat = createBoxMaterial(list[0], matCache, disposables, bucket.texture);
    const mesh = new THREE.InstancedMesh(UNIT_BOX, mat, list.length);
    mesh.renderOrder = 10;
    mesh.userData.shelfpilotProduct = true;
    list.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.rotation.set(0, inst.rotY, 0);
      dummy.scale.set(inst.unitW, inst.unitH, inst.unitD);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    finalizeInstancedMesh(mesh);
    parentGroup.add(mesh);
    disposables.push(mesh);
  }

  for (const [imageUrl, list] of planeBuckets) {
    const mat = createPlaneMaterial(imageUrl, texCache, disposables);
    mat.map = texCache.get(imageUrl);
    mat.color.set(0xffffff);
    disposables.push(mat);
    const mesh = new THREE.InstancedMesh(UNIT_PLANE, mat, list.length);
    mesh.renderOrder = 11;
    mesh.userData.shelfpilotProduct = true;
    list.forEach((inst, i) => {
      const planeZ = inst.z + (inst.rotY === 0 ? inst.unitD * 0.52 : -inst.unitD * 0.52);
      dummy.position.set(inst.x, inst.y, planeZ);
      dummy.rotation.set(0, inst.rotY, 0);
      dummy.scale.set(inst.unitW * 0.96, inst.unitH * 0.96, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    finalizeInstancedMesh(mesh);
    parentGroup.add(mesh);
    disposables.push(mesh);
  }
}

function planogramFromPhysicalShelf(layout, shelfId, merchandisingFaceId = "A") {
  if (!shelfId || !layout) return [];
  const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
  const phys = shelves.find((s) => s.id === shelfId);
  if (!phys) return [];
  return planogramForSceneFace(phys, merchandisingFaceId, layout);
}

function overviewFacingSize(facing, slotW) {
  return {
    w: Math.min(facing.w, slotW * 0.96),
    h: facing.h,
    d: facing.d,
  };
}

function overviewBlockSize(block, segW, maxDim) {
  const minH = Math.max(0.12, maxDim * 0.007);
  const minW = Math.max(0.08, Math.min(segW * 0.45, maxDim * 0.005));
  return {
    w: Math.max(block.w, minW),
    h: Math.max(block.h, minH),
    d: Math.max(block.d, 0.06),
  };
}

function planogramRowsForFace(f, layout, faceId, focusPhysicalShelfId, shelfFocusMode, isHighlighted, activeFace) {
  if (shelfFocusMode && isHighlighted && focusPhysicalShelfId) {
    return planogramFromPhysicalShelf(layout, focusPhysicalShelfId, activeFace);
  }
  const id = faceId === "B" ? "B" : "A";
  const norm = normalizeShelfUI(f);
  const mergedFace = norm.faces?.find((face) => face.id === id);
  if (mergedFace?.planogram?.length) return mergedFace.planogram;
  if (id === "A" && norm.planogram?.length) return norm.planogram;
  const rows = planogramForSceneFace(f, faceId, layout);
  if (rows.length) return rows;
  return planogramForMerchandisingFace(f, faceId, layout);
}

function resolveFacePlanograms(f, layout, faceId, focusPhysicalShelfId, shelfFocusMode, isHighlighted) {
  const dual = isDoubleSided(f);
  const activeFace = faceId === "B" ? "B" : "A";

  if (dual) {
    return [
      { id: "A", planogram: planogramRowsForFace(f, layout, "A", focusPhysicalShelfId, shelfFocusMode, isHighlighted, activeFace) },
      { id: "B", planogram: planogramRowsForFace(f, layout, "B", focusPhysicalShelfId, shelfFocusMode, isHighlighted, activeFace) },
    ];
  }
  return [{ id: "A", planogram: planogramRowsForFace(f, layout, "A", focusPhysicalShelfId, shelfFocusMode, isHighlighted, activeFace) }];
}

function facingCenterX(placement, shelf, storageFaceId, facingIndex, facingsCount, merchWidth) {
  const levelIndex = Number(placement.levelIndex) || 0;
  const segments = effectiveSegmentsForLevel(shelf, storageFaceId, levelIndex);
  const segId = resolveSegmentId(placement, shelf, storageFaceId);
  const seg = segments.find((s) => s.id === segId) || segments[0];
  if (!seg) return merchWidth / 2;
  const startX = seg.offsetMeters ?? 0;
  const segW = seg.widthMeters ?? merchWidth;
  const count = Math.max(1, Number(facingsCount) || 1);
  const slotW = segW / count;
  const positionX = Number(placement.positionX) || 0;
  const idx = Math.max(0, Math.min(count - 1, Number(facingIndex) || 0));
  return startX + positionX + slotW * (idx + 0.5);
}

function faceShoppersideZ(totalDepth, dual, faceId, faceDepth = null) {
  const d = Number(totalDepth) || 0.6;
  if (!dual) return Math.max(d * 0.12, 0.06);
  const half = Math.max(0.15, Number(faceDepth) || d / 2);
  // Face A sits on the near aisle; Face B on the opposite aisle of the gondola.
  return faceId === "B" ? d - Math.min(half * 0.18, 0.12) : Math.min(half * 0.18, 0.12);
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
  categories = [],
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
  const [productsLoading, setProductsLoading] = useState(false);

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

    setProductsLoading(true);
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

    const planUnderlay = buildFloorPlanUnderlay(layout, texLoader);
    if (planUnderlay) {
      scene.add(planUnderlay.mesh);
      disposables.push(...planUnderlay.disposables);
    }

    const obstacleLayer = buildObstacleMeshes(layout);
    scene.add(obstacleLayer.group);
    disposables.push(...obstacleLayer.disposables);

    let highlightCenter = null;
    let highlightFocus = null;

    const shelves = shelvesForScene3D(
      layout.shelves?.length ? layout.shelves : layout.fixtures || []
    );
    const productBuildJobs = [];
    const shelfLabelSprites = [];

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
      const faceDepth = Math.max(0.15, Number(box.faceDepthMeters) || (dual ? d / 2 : d));
      const faceA = f.faces?.find((face) => face.id === "A");
      const faceB = f.faces?.find((face) => face.id === "B");

      const isHighlighted =
        highlightShelfId &&
        (f.id === highlightShelfId ||
          f.pairShelfIds?.front === highlightShelfId ||
          f.pairShelfIds?.back === highlightShelfId ||
          (highlightPairId && f.pairId === highlightPairId));

      const dimOthers = false;

      // Category colour coding: the base frame takes face A's category hue, and
      // each merchandising board takes its own face colour on double-sided units.
      const faceColorA = colorForShelfFace(f, "A", categories);
      const faceColorB = colorForShelfFace(f, "B", categories);
      let baseColor = new THREE.Color("#A30A2A");
      try {
        baseColor = new THREE.Color(faceColorA || faceColorB || "#A30A2A");
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

        const halfBoardGeo = new THREE.BoxGeometry(w * 0.94, 0.03, faceDepth * 0.88);
        const boardA = new THREE.Mesh(
          halfBoardGeo,
          new THREE.MeshStandardMaterial({
            color: faceColorA ? new THREE.Color(faceColorA) : 0xf3f0eb,
            roughness: 0.85,
          })
        );
        boardA.position.set(w / 2, 0.35, faceDepth * 0.5);
        group.add(boardA);
        disposables.push(halfBoardGeo, boardA.material);

        const boardB = new THREE.Mesh(
          halfBoardGeo.clone(),
          new THREE.MeshStandardMaterial({
            color: faceColorB ? new THREE.Color(faceColorB) : 0xe8eef5,
            roughness: 0.85,
          })
        );
        boardB.position.set(w / 2, 0.35, d - faceDepth * 0.5);
        group.add(boardB);
        disposables.push(boardB.geometry, boardB.material);
      }

      const levels = shelfLevels(f);
      // Boards stay near-white so products read clearly; the category hue is a wash.
      const boardTint = (hex, fallback) =>
        hex ? new THREE.Color(fallback).lerp(new THREE.Color(hex), 0.22) : new THREE.Color(fallback);

      if (!dual) {
        for (const lv of levels) {
          const y = Number(lv.heightFromFloorMeters) || 0.4;
          const boardGeo = new THREE.BoxGeometry(w * 0.96, 0.04, d * 0.92);
          const boardMat = new THREE.MeshStandardMaterial({
            color: boardTint(faceColorA, 0xf3f0eb),
            roughness: 0.85,
          });
          const board = new THREE.Mesh(boardGeo, boardMat);
          board.position.set(w / 2, y, d / 2);
          group.add(board);
          disposables.push(boardGeo, boardMat);
        }
      } else {
        for (const lv of levels) {
          const y = Number(lv.heightFromFloorMeters) || 0.4;
          const shelfGeo = new THREE.BoxGeometry(w * 0.94, 0.03, faceDepth * 0.88);
          const shelfAMat = new THREE.MeshStandardMaterial({
            color: boardTint(faceColorA, 0xf3f0eb),
            roughness: 0.85,
          });
          const shelfA = new THREE.Mesh(shelfGeo, shelfAMat);
          shelfA.position.set(w / 2, y, faceDepth * 0.5);
          group.add(shelfA);
          disposables.push(shelfGeo, shelfAMat);

          const shelfBGeo = shelfGeo.clone();
          const shelfBMat = new THREE.MeshStandardMaterial({
            color: boardTint(faceColorB, 0xe8eef5),
            roughness: 0.85,
          });
          const shelfB = new THREE.Mesh(shelfBGeo, shelfBMat);
          shelfB.position.set(w / 2, y, d - faceDepth * 0.5);
          group.add(shelfB);
          disposables.push(shelfBGeo, shelfBMat);
        }
      }

      const activeFace = highlightFaceId === "B" ? "B" : "A";
      const overviewProductBoost = storeOverview && (!shelfFocusMode || isHighlighted);
      const rawPlacements = collectShelfFacingInstances({
        f,
        layout,
        activeFace,
        focusPhysicalShelfId,
        shelfFocusMode,
        isHighlighted,
        d,
        dual,
        merchW,
        h,
        overviewProductBoost,
        faceDepthMeters: faceDepth,
      });
      if (rawPlacements.length) {
        productBuildJobs.push({ group, rawPlacements });
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

      const shelfLabelText = scene3dShelfNumber(raw, layout);
      if (shelfLabelText && shelfLabelText !== "—") {
        const { sprite, disposables: labelDisp } = makeShelfNumberLabel(shelfLabelText, Boolean(isHighlighted));
        // Sit just above the fixture top, centered on the unit (or on the focused face).
        let labelZ = d / 2;
        if (dual) {
          const faceInset = Math.min(0.18, faceDepth * 0.45);
          if (shelfFocusMode && isHighlighted) {
            labelZ = highlightFaceId === "B" ? d - faceInset : faceInset;
          }
        } else {
          labelZ = Math.min(0.16, d * 0.35);
        }
        sprite.position.set(w / 2, h + 0.06, labelZ);
        sprite.userData.shelfFocus = Boolean(shelfFocusMode && isHighlighted);
        group.add(sprite);
        disposables.push(...labelDisp);
        shelfLabelSprites.push(sprite);
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

      // Keep shelf numbers small and readable — never blow up when zoomed in.
      if (shelfLabelSprites.length) {
        const camPos = camera.position;
        const tmp = new THREE.Vector3();
        for (const sprite of shelfLabelSprites) {
          sprite.getWorldPosition(tmp);
          const dist = camPos.distanceTo(tmp);
          const base = sprite.userData.baseScale || { x: 0.32, y: 0.13 };
          // Mild distance compensation; hard-capped so close-up never looks huge.
          const zoom = THREE.MathUtils.clamp(dist * 0.035, 0.85, 1.35);
          const focused = sprite.userData.shelfFocus;
          const scaleMul = focused ? Math.min(zoom, 1.15) : zoom;
          sprite.scale.set(base.x * scaleMul, base.y * scaleMul, 1);
          // Always visible in shelf focus; soft-fade only in far overview.
          const fade = focused ? 1 : dist > 28 ? THREE.MathUtils.clamp(1 - (dist - 28) / 16, 0.2, 1) : 1;
          if (sprite.material) {
            sprite.material.opacity = fade;
            sprite.material.depthTest = !focused;
          }
          sprite.visible = fade > 0.15;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const matCache = new Map();
    const facingBudget = { count: 0 };
    const shelfCap = Math.max(
      48,
      Math.floor(MAX_FACINGS / Math.max(1, productBuildJobs.length))
    );
    const expandedJobs = productBuildJobs.map((job) => ({
      group: job.group,
      instances: expandFacingInstances(job.rawPlacements, productLookup, maxDim, facingBudget, {
        overview: storeOverview,
        shelfCap,
      }),
    }));
    const totalInstances = expandedJobs.reduce((n, job) => n + job.instances.length, 0);

    // Draw coloured product blocks immediately — do not wait on texture preload.
    for (const job of expandedJobs) {
      if (!job.instances.length) continue;
      addInstancedFacings(job.group, job.instances, {
        texCache,
        matCache,
        disposables,
        showImages: false,
      });
    }
    if (alive) setProductsLoading(totalInstances > 0);

    const loadProductImagesAsync = async () => {
      if (!totalInstances) {
        if (alive) setProductsLoading(false);
        return;
      }

      const imageUrls = expandedJobs.flatMap((job) =>
        job.instances.map((inst) => inst.imageUrl).filter(Boolean)
      );
      if (imageUrls.length) {
        await preloadProductTextures(texLoader, texCache, imageUrls, disposables);
      }
      if (!isAlive()) return;

      // Rebuild product meshes with textures once images are ready.
      for (let i = 0; i < expandedJobs.length; i += 1) {
        const job = expandedJobs[i];
        if (!job.instances.length) continue;
        const anyLoaded = job.instances.some((inst) => inst.imageUrl && texCache.has(inst.imageUrl));
        if (!anyLoaded) continue;
        clearProductMeshes(job.group);
        addInstancedFacings(job.group, job.instances, {
          texCache,
          matCache,
          disposables,
          showImages: true,
        });
        if (i % 3 === 2) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          if (!isAlive()) return;
        }
      }
      if (alive) setProductsLoading(false);
    };

    loadProductImagesAsync();

    return () => {
      alive = false;
      setProductsLoading(false);
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
    categories,
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
      {productsLoading ? (
        <div className="scene3d-loading" aria-live="polite">
          <div className="scene3d-loading-spinner" aria-hidden />
          <span>Loading product images…</span>
        </div>
      ) : null}
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
              ? "Single-shelf focus — other shelves stay visible but dimmed. Click 3D again for full store view."
              : "Products sit on their shelf boards · scroll to zoom · 0 = fit store"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
