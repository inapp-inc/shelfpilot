/**
 * Architectural obstacles the store cannot merchandise around: structural
 * columns, walls, and permanently blocked floor. Mirrors the API's obstacles
 * service so the palette, canvas, and 3D scene agree on labels and defaults.
 */

export const OBSTACLE_TYPES = {
  column: {
    label: "Column",
    color: "#475569",
    icon: "▦",
    hint: "structural pillar",
    widthMeters: 0.4,
    depthMeters: 0.4,
  },
  wall: {
    label: "Wall",
    color: "#334155",
    icon: "▬",
    hint: "internal wall",
    widthMeters: 3,
    depthMeters: 0.2,
  },
  blocked: {
    label: "Blocked area",
    color: "#6b7280",
    icon: "▨",
    hint: "no fixtures allowed",
    widthMeters: 2,
    depthMeters: 2,
  },
  utility: {
    label: "Utility",
    color: "#0f766e",
    icon: "⚡",
    hint: "riser, panel, plant",
    widthMeters: 1,
    depthMeters: 1,
  },
};

export const OBSTACLE_TYPE_IDS = Object.keys(OBSTACLE_TYPES);

export function obstacleMeta(type) {
  return OBSTACLE_TYPES[type] || OBSTACLE_TYPES.column;
}

export function obstacleLabel(obstacle) {
  return obstacle?.name || obstacleMeta(obstacle?.type).label;
}
