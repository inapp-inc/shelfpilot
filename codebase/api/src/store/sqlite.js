/**
 * ShelfPilot SQLite store using Node.js built-in `node:sqlite` (DatabaseSync).
 * Requires Node.js >= 22.5. Local Docker image uses node:22.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { normalizeLayout } from "../services/layoutNormalize.js";

let dbInstance = null;

export function resolveSqlitePath() {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;
  if (process.env.NODE_ENV === "test") return ":memory:";
  return path.resolve(process.cwd(), "data", "shelfpilot.db");
}

export function getDb() {
  if (dbInstance) return dbInstance;
  const sqlitePath = resolveSqlitePath();
  if (sqlitePath !== ":memory:") {
    fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  }
  dbInstance = new DatabaseSync(sqlitePath);
  dbInstance.exec("PRAGMA journal_mode = WAL;");
  dbInstance.exec("PRAGMA foreign_keys = ON;");
  migrate(dbInstance);
  seedIfEmpty(dbInstance);
  return dbInstance;
}

export function resetDbForTests() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      /* ignore */
    }
  }
  dbInstance = null;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS configs (
      vertical TEXT PRIMARY KEY,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      vertical TEXT NOT NULL,
      parent_id TEXT,
      color TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT,
      category_id TEXT,
      attributes TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS layouts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      vertical TEXT NOT NULL,
      status TEXT NOT NULL,
      width_meters REAL NOT NULL,
      depth_meters REAL NOT NULL,
      height_meters REAL,
      shape TEXT,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit (
      id TEXT PRIMARY KEY,
      at TEXT NOT NULL,
      actor_email TEXT,
      action TEXT,
      detail TEXT
    );
    CREATE TABLE IF NOT EXISTS layout_versions (
      id TEXT PRIMARY KEY,
      layout_id TEXT NOT NULL,
      label TEXT,
      status TEXT,
      created_at TEXT NOT NULL,
      snapshot TEXT NOT NULL,
      FOREIGN KEY (layout_id) REFERENCES layouts(id)
    );
  `);
  try {
    db.exec("ALTER TABLE sessions ADD COLUMN expires_at TEXT");
  } catch {
    /* already present */
  }
}

const DEFAULT_CONFIGS = {
  retail: {
    vertical: "retail",
    units: "metric",
    minAisleWidthMeters: 1.2,
    fixtureTemplates: [
      { type: "shelf", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultLevels: 2 },
      { type: "gondola", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9, defaultLevels: 3 },
    ],
    complianceRules: ["Min aisle 1.2m"],
    approvalWorkflowEnabled: true,
  },
  pharmacy: {
    vertical: "pharmacy",
    units: "metric",
    minAisleWidthMeters: 1.5,
    fixtureTemplates: [
      { type: "shelf", defaultWidthMeters: 1.0, defaultDepthMeters: 0.5, defaultLevels: 2 },
      { type: "rack", defaultWidthMeters: 0.8, defaultDepthMeters: 0.4, defaultLevels: 4 },
    ],
    complianceRules: ["Min aisle 1.5m", "Controlled substances zone required"],
    approvalWorkflowEnabled: true,
  },
  beauty: {
    vertical: "beauty",
    units: "metric",
    minAisleWidthMeters: 1.2,
    fixtureTemplates: [{ type: "gondola", defaultWidthMeters: 1.5, defaultDepthMeters: 0.7, defaultLevels: 3 }],
    complianceRules: ["Min aisle 1.2m"],
    approvalWorkflowEnabled: true,
  },
  apparel: {
    vertical: "apparel",
    units: "metric",
    minAisleWidthMeters: 1.4,
    fixtureTemplates: [
      { type: "rack", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultLevels: 4 },
      { type: "storage", defaultWidthMeters: 2.0, defaultDepthMeters: 1.0, defaultLevels: 2 },
    ],
    complianceRules: ["Min aisle 1.4m", "Fitting room adjacency"],
    approvalWorkflowEnabled: true,
  },
  hypermarket: {
    vertical: "hypermarket",
    units: "metric",
    minAisleWidthMeters: 1.5,
    fixtureTemplates: [
      { type: "gondola", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9, defaultLevels: 3 },
      { type: "shelf", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultLevels: 2 },
    ],
    complianceRules: ["Min aisle 1.5m", "Chilled zone adjacency to back wall"],
    approvalWorkflowEnabled: true,
  },
  convenience: {
    vertical: "convenience",
    units: "metric",
    minAisleWidthMeters: 1.0,
    fixtureTemplates: [{ type: "shelf", defaultWidthMeters: 1.0, defaultDepthMeters: 0.5, defaultLevels: 2 }],
    complianceRules: ["Min aisle 1.0m"],
    approvalWorkflowEnabled: true,
  },
};

const DEFAULT_USERS = [
  { id: "u-admin", email: "admin@shelfpilot.local", name: "Alex Admin", role: "Admin", password: "password" },
  { id: "u-designer", email: "designer@shelfpilot.local", name: "Dana Designer", role: "Designer", password: "password" },
  { id: "u-approver", email: "approver@shelfpilot.local", name: "Pat Approver", role: "Approver", password: "password" },
  { id: "u-viewer", email: "viewer@shelfpilot.local", name: "Vera Viewer", role: "Viewer", password: "password" },
];

const DEFAULT_CATEGORIES = [
  { id: "otc", name: "OTC Medicines", vertical: "pharmacy", parentId: null, color: "#0ea5e9" },
  { id: "painrelief", name: "Pain Relief", vertical: "pharmacy", parentId: "otc", color: "#38bdf8" },
  { id: "rx", name: "Prescription", vertical: "pharmacy", parentId: null, color: "#a855f7" },
  { id: "electronics", name: "Electronics", vertical: "retail", parentId: null, color: "#3b82f6" },
  { id: "grocery", name: "Grocery", vertical: "retail", parentId: null, color: "#16a34a" },
  { id: "fresh-produce", name: "Fresh Produce", vertical: "retail", parentId: null, color: "#22c55e" },
  { id: "chilled", name: "Chilled", vertical: "retail", parentId: null, color: "#0ea5e9" },
  { id: "frozen", name: "Frozen", vertical: "retail", parentId: null, color: "#38bdf8" },
  { id: "hm-fresh", name: "Fresh Produce", vertical: "hypermarket", parentId: null, color: "#22c55e" },
  { id: "hm-grocery", name: "Grocery", vertical: "hypermarket", parentId: null, color: "#16a34a" },
  { id: "hm-chilled", name: "Chilled", vertical: "hypermarket", parentId: null, color: "#0ea5e9" },
  { id: "hm-frozen", name: "Frozen", vertical: "hypermarket", parentId: null, color: "#38bdf8" },
  { id: "hm-seasonal", name: "Seasonal", vertical: "hypermarket", parentId: null, color: "#ea580c" },
  { id: "ph-chilled", name: "Chilled", vertical: "pharmacy", parentId: null, color: "#0ea5e9" },
  { id: "cv-grocery", name: "Grocery", vertical: "convenience", parentId: null, color: "#16a34a" },
  { id: "cv-chilled", name: "Chilled", vertical: "convenience", parentId: null, color: "#0ea5e9" },
  { id: "cv-snacks", name: "Snacks", vertical: "convenience", parentId: null, color: "#ea580c" },
  { id: "cv-personal", name: "Personal Care", vertical: "convenience", parentId: null, color: "#16a34a" },
  { id: "womens", name: "Womenswear", vertical: "apparel", parentId: null, color: "#db2777" },
  { id: "mens", name: "Menswear", vertical: "apparel", parentId: null, color: "#A30A2A" },
  { id: "skincare", name: "Skincare", vertical: "beauty", parentId: null, color: "#f43f5e" },
];

const DEFAULT_PRODUCTS = [
  { id: "p1", name: "Ibuprofen 200mg", sku: "PH-2001", categoryId: "painrelief", attributes: { facing: 4, widthMeters: 0.08, heightMeters: 0.14 } },
  { id: "p2", name: "Oxford Shirt", sku: "AP-4002", categoryId: "mens", attributes: { size: "L", widthMeters: 0.25, heightMeters: 0.35 } },
  { id: "p3", name: "4K Living Room TV", sku: "RT-1001", categoryId: "electronics", attributes: { size: '55"', widthMeters: 0.4, heightMeters: 0.6 } },
];

function seedIfEmpty(db) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (count > 0) return;

  const insertUser = db.prepare(
    "INSERT INTO users (id, email, name, role, password) VALUES (?, ?, ?, ?, ?)"
  );
  const insertConfig = db.prepare("INSERT INTO configs (vertical, payload) VALUES (?, ?)");
  const insertCat = db.prepare(
    "INSERT INTO categories (id, name, vertical, parent_id, color) VALUES (?, ?, ?, ?, ?)"
  );
  const insertProd = db.prepare(
    "INSERT INTO products (id, name, sku, category_id, attributes) VALUES (?, ?, ?, ?, ?)"
  );

  db.exec("BEGIN");
  try {
    for (const u of DEFAULT_USERS) {
      insertUser.run(u.id, u.email, u.name, u.role, u.password);
    }
    for (const [vertical, payload] of Object.entries(DEFAULT_CONFIGS)) {
      insertConfig.run(vertical, JSON.stringify(payload));
    }
    for (const c of DEFAULT_CATEGORIES) {
      insertCat.run(c.id, c.name, c.vertical, c.parentId, c.color);
    }
    for (const p of DEFAULT_PRODUCTS) {
      insertProd.run(p.id, p.name, p.sku, p.categoryId, JSON.stringify(p.attributes || {}));
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function now() {
  return new Date().toISOString();
}

export function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

function rowToLayout(row) {
  if (!row) return null;
  const payload = JSON.parse(row.payload);
  return normalizeLayout({
    id: row.id,
    name: row.name,
    vertical: row.vertical,
    status: row.status,
    widthMeters: row.width_meters,
    depthMeters: row.depth_meters,
    heightMeters: row.height_meters,
    shape: row.shape,
    updatedAt: row.updated_at,
    ...payload,
  });
}

function layoutToPayload(layout) {
  const n = normalizeLayout({ ...layout });
  return JSON.stringify({
    polygon: n.polygon || [],
    aisles: n.aisles || [],
    shelves: n.shelves || [],
    fixtures: n.fixtures || [],
    mappings: n.mappings || [],
    aisleMappings: n.aisleMappings || [],
    shelfMappings: n.shelfMappings || [],
    validation: n.validation || { aisleViolations: [] },
    autoCalc: n.autoCalc || null,
  });
}

export const repo = {
  findUserByEmail(email) {
    return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) || null;
  },
  findUserById(id) {
    return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) || null;
  },
  listUsers() {
    return getDb().prepare("SELECT id, email, name, role FROM users").all();
  },
  createUser(user) {
    getDb()
      .prepare("INSERT INTO users (id, email, name, role, password) VALUES (?, ?, ?, ?, ?)")
      .run(user.id, user.email, user.name, user.role, user.password);
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },
  updateUser(id, patch) {
    const existing = this.findUserById(id);
    if (!existing) return null;
    const name = patch.name != null ? patch.name : existing.name;
    const role = patch.role != null ? patch.role : existing.role;
    const password = patch.password != null ? patch.password : existing.password;
    getDb()
      .prepare("UPDATE users SET name = ?, role = ?, password = ? WHERE id = ?")
      .run(name, role, password, id);
    return { id, email: existing.email, name, role };
  },
  /**
   * AUTH_SESSION_TTL — seconds. 0 or unset = long-lived demo sessions (no expiry).
   */
  sessionTtlSeconds() {
    const raw = process.env.AUTH_SESSION_TTL;
    if (raw == null || raw === "" || Number(raw) === 0) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  },
  createSession(token, userId, role) {
    const createdAt = now();
    const ttl = this.sessionTtlSeconds();
    const expiresAt =
      ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null;
    getDb()
      .prepare(
        "INSERT INTO sessions (token, user_id, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(token, userId, role, createdAt, expiresAt);
  },
  getSession(token) {
    const row = getDb().prepare("SELECT * FROM sessions WHERE token = ?").get(token);
    if (!row) return null;
    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
      this.deleteSession(token);
      return null;
    }
    return row;
  },
  deleteSession(token) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  },
  versioningEnabled() {
    const raw = process.env.LAYOUT_VERSIONING;
    if (raw == null || raw === "") return true;
    return raw !== "0" && raw.toLowerCase() !== "false";
  },
  saveLayoutVersion(layout, label) {
    if (!this.versioningEnabled()) return null;
    const id = `ver-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const snapshot = JSON.stringify(layout);
    getDb()
      .prepare(
        "INSERT INTO layout_versions (id, layout_id, label, status, created_at, snapshot) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(id, layout.id, label || layout.status, layout.status, now(), snapshot);
    return {
      id,
      layoutId: layout.id,
      label: label || layout.status,
      status: layout.status,
      createdAt: now(),
    };
  },
  listLayoutVersions(layoutId) {
    if (!this.versioningEnabled()) return [];
    return getDb()
      .prepare(
        `SELECT id, layout_id AS layoutId, label, status, created_at AS createdAt, snapshot
         FROM layout_versions WHERE layout_id = ? ORDER BY created_at DESC`
      )
      .all(layoutId)
      .map((r) => ({
        id: r.id,
        layoutId: r.layoutId,
        label: r.label,
        status: r.status,
        createdAt: r.createdAt,
        snapshot: JSON.parse(r.snapshot),
      }));
  },
  getLayoutVersion(versionId) {
    const r = getDb()
      .prepare(
        `SELECT id, layout_id AS layoutId, label, status, created_at AS createdAt, snapshot
         FROM layout_versions WHERE id = ?`
      )
      .get(versionId);
    if (!r) return null;
    return {
      id: r.id,
      layoutId: r.layoutId,
      label: r.label,
      status: r.status,
      createdAt: r.createdAt,
      snapshot: JSON.parse(r.snapshot),
    };
  },
  getConfig(vertical) {
    const key = String(vertical || "retail").toLowerCase();
    const row = getDb().prepare("SELECT payload FROM configs WHERE vertical = ?").get(key);
    if (row) return JSON.parse(row.payload);
    const retail = getDb().prepare("SELECT payload FROM configs WHERE vertical = 'retail'").get();
    return retail ? JSON.parse(retail.payload) : DEFAULT_CONFIGS.retail;
  },
  putConfig(config) {
    getDb()
      .prepare(
        `INSERT INTO configs (vertical, payload) VALUES (?, ?)
         ON CONFLICT(vertical) DO UPDATE SET payload = excluded.payload`
      )
      .run(config.vertical, JSON.stringify(config));
    return config;
  },
  listCategories(vertical) {
    if (vertical) {
      return getDb()
        .prepare(
          "SELECT id, name, vertical, parent_id AS parentId, color FROM categories WHERE vertical = ?"
        )
        .all(String(vertical).toLowerCase());
    }
    return getDb()
      .prepare("SELECT id, name, vertical, parent_id AS parentId, color FROM categories")
      .all();
  },
  insertCategory(cat) {
    getDb()
      .prepare(
        "INSERT INTO categories (id, name, vertical, parent_id, color) VALUES (?, ?, ?, ?, ?)"
      )
      .run(cat.id, cat.name, cat.vertical, cat.parentId || null, cat.color || "#A30A2A");
    return cat;
  },
  listProducts(categoryId) {
    const rows = categoryId
      ? getDb()
          .prepare(
            "SELECT id, name, sku, category_id AS categoryId, attributes FROM products WHERE category_id = ?"
          )
          .all(categoryId)
      : getDb()
          .prepare("SELECT id, name, sku, category_id AS categoryId, attributes FROM products")
          .all();
    return rows.map((p) => {
      const attributes = JSON.parse(p.attributes || "{}");
      return { ...p, attributes, imageUrl: attributes.imageUrl || null };
    });
  },
  insertProduct(product) {
    getDb()
      .prepare(
        "INSERT INTO products (id, name, sku, category_id, attributes) VALUES (?, ?, ?, ?, ?)"
      )
      .run(
        product.id,
        product.name,
        product.sku || "",
        product.categoryId,
        JSON.stringify(product.attributes || {})
      );
    return product;
  },
  listLayouts(status) {
    const sql = status
      ? `SELECT id, name, vertical, status,
                width_meters AS widthMeters, depth_meters AS depthMeters,
                updated_at AS updatedAt
         FROM layouts WHERE status = ? ORDER BY updated_at DESC`
      : `SELECT id, name, vertical, status,
                width_meters AS widthMeters, depth_meters AS depthMeters,
                updated_at AS updatedAt
         FROM layouts ORDER BY updated_at DESC`;
    return status ? getDb().prepare(sql).all(status) : getDb().prepare(sql).all();
  },
  upsertCategory(cat) {
    getDb()
      .prepare(
        `INSERT INTO categories (id, name, vertical, parent_id, color) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name,
           vertical=excluded.vertical,
           parent_id=excluded.parent_id,
           color=excluded.color`
      )
      .run(cat.id, cat.name, cat.vertical, cat.parentId || null, cat.color || "#A30A2A");
    return cat;
  },
  upsertProduct(product) {
    getDb()
      .prepare(
        `INSERT INTO products (id, name, sku, category_id, attributes) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name,
           sku=excluded.sku,
           category_id=excluded.category_id,
           attributes=excluded.attributes`
      )
      .run(
        product.id,
        product.name,
        product.sku || "",
        product.categoryId,
        JSON.stringify(product.attributes || {})
      );
    return product;
  },
  getLayout(id) {
    return rowToLayout(getDb().prepare("SELECT * FROM layouts WHERE id = ?").get(id));
  },
  saveLayout(layout) {
    getDb()
      .prepare(
        `INSERT INTO layouts (id, name, vertical, status, width_meters, depth_meters, height_meters, shape, payload, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name,
           vertical=excluded.vertical,
           status=excluded.status,
           width_meters=excluded.width_meters,
           depth_meters=excluded.depth_meters,
           height_meters=excluded.height_meters,
           shape=excluded.shape,
           payload=excluded.payload,
           updated_at=excluded.updated_at`
      )
      .run(
        layout.id,
        layout.name,
        layout.vertical,
        layout.status,
        layout.widthMeters,
        layout.depthMeters,
        layout.heightMeters ?? 3,
        layout.shape || "rectangle",
        layoutToPayload(layout),
        layout.updatedAt || now()
      );
    return layout;
  },
  deleteLayout(id) {
    const db = getDb();
    db.prepare("DELETE FROM layout_versions WHERE layout_id = ?").run(id);
    const info = db.prepare("DELETE FROM layouts WHERE id = ?").run(id);
    return info.changes > 0;
  },
  audit(actorEmail, action, detail) {
    const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    getDb()
      .prepare("INSERT INTO audit (id, at, actor_email, action, detail) VALUES (?, ?, ?, ?, ?)")
      .run(id, now(), actorEmail, action, detail);
  },
  listAudit(limit = 100) {
    return getDb()
      .prepare(
        "SELECT id, at, actor_email AS actorEmail, action, detail FROM audit ORDER BY at DESC LIMIT ?"
      )
      .all(limit);
  },
};

export function audit(actorEmail, action, detail) {
  repo.audit(actorEmail, action, detail);
}

export function getConfig(vertical) {
  return repo.getConfig(vertical);
}

export const db = {
  get users() {
    return getDb().prepare("SELECT * FROM users").all();
  },
  get categories() {
    return repo.listCategories();
  },
  get products() {
    return repo.listProducts();
  },
  get layouts() {
    return getDb()
      .prepare("SELECT * FROM layouts ORDER BY updated_at DESC")
      .all()
      .map(rowToLayout);
  },
  get audit() {
    return repo.listAudit(100);
  },
  get configs() {
    const rows = getDb().prepare("SELECT vertical, payload FROM configs").all();
    const out = {};
    for (const r of rows) out[r.vertical] = JSON.parse(r.payload);
    return out;
  },
  sessions: {
    get(token) {
      const s = repo.getSession(token);
      return s ? { userId: s.user_id, role: s.role } : undefined;
    },
    set(token, value) {
      repo.createSession(token, value.userId, value.role);
    },
  },
};
