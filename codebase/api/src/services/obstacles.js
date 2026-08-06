/**
 * Architectural obstacles: structural columns, walls, and other permanently
 * blocked floor area.
 *
 * Unlike special zones (merchandising overlays), obstacles are physical: fixtures
 * may not overlap them, the packer routes around them, and their footprint is
 * removed from usable selling area.
 */
import { randomUUID } from "node:crypto";

export const OBSTACLE_TYPES = ["column", "wall", "blocked", "utility"];

export const OBSTACLE_DEFAULT_COLOR = {
  column: "#475569",
  wall: "#334155",
  blocked: "#6b7280",
  utility: "#0f766e",
};

export const OBSTACLE_LABEL = {
  column: "Column",
  wall: "Wall",
  blocked: "Blocked area",
  utility: "Utility",
};

/** Sensible starting footprint (m) per obstacle type. */
export const OBSTACLE_DEFAULT_SIZE = {
  column: { widthMeters: 0.4, depthMeters: 0.4 },
  wall: { widthMeters: 3, depthMeters: 0.2 },
  blocked: { widthMeters: 2, depthMeters: 2 },
  utility: { widthMeters: 1, depthMeters: 1 },
};

export function normalizeObstacleType(type) {
  const t = String(type || "column").toLowerCase();
  return OBSTACLE_TYPES.includes(t) ? t : "column";
}

export function normalizeObstacle(obstacle = {}) {
  const type = normalizeObstacleType(obstacle.type);
  const size = OBSTACLE_DEFAULT_SIZE[type];
  return {
    id: obstacle.id || `obs-${randomUUID().slice(0, 6)}`,
    type,
    name:
      obstacle.name != null && String(obstacle.name).trim() !== ""
        ? String(obstacle.name)
        : OBSTACLE_LABEL[type],
    color: obstacle.color || OBSTACLE_DEFAULT_COLOR[type],
    x: Number(obstacle.x) || 0,
    y: Number(obstacle.y) || 0,
    widthMeters: Math.max(0.1, Number(obstacle.widthMeters) || size.widthMeters),
    depthMeters: Math.max(0.1, Number(obstacle.depthMeters) || size.depthMeters),
    heightMeters: Math.max(0.1, Number(obstacle.heightMeters) || 3),
  };
}

export function obstacleFootprint(obstacle) {
  return {
    x: Number(obstacle?.x) || 0,
    y: Number(obstacle?.y) || 0,
    w: Math.max(0.1, Number(obstacle?.widthMeters) || 0),
    d: Math.max(0.1, Number(obstacle?.depthMeters) || 0),
  };
}

export function obstacleAreaSqm(obstacle) {
  const fp = obstacleFootprint(obstacle);
  return fp.w * fp.d;
}

export function totalObstacleAreaSqm(layout) {
  return (layout?.obstacles || []).reduce((sum, o) => sum + obstacleAreaSqm(o), 0);
}
