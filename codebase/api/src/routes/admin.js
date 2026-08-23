import { Router } from "express";
import { randomUUID } from "node:crypto";
import { repo, audit, getConfig } from "../store/sqlite.js";
import { putShopperExperience, getShopperLayoutForAdmin } from "../services/shopperExperience.js";
import {
  creatableRolesFor,
  canActorManageTarget,
  filterUsersForActor,
  isSuperAdmin,
  ROLES,
} from "../services/roles.js";
import { authRequired, requireRoles } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.get("/admin/config", authRequired, (req, res) => {
  res.json(getConfig(req.query.vertical));
});

adminRouter.put("/admin/config", authRequired, requireRoles("Admin"), (req, res) => {
  const vertical = String(req.body?.vertical || "retail").toLowerCase();
  const next = {
    vertical,
    units: req.body?.units || "metric",
    minAisleWidthMeters: Number(req.body?.minAisleWidthMeters ?? 1.2),
    fixtureTemplates: req.body?.fixtureTemplates || [],
    complianceRules: req.body?.complianceRules || [],
    approvalWorkflowEnabled: req.body?.approvalWorkflowEnabled !== false,
    namingConvention: req.body?.namingConvention || null,
  };
  repo.putConfig(next);
  audit(req.user.email, "config.put", vertical);
  res.json(next);
});

adminRouter.get("/admin/users", authRequired, requireRoles("Admin"), (req, res) => {
  res.json({ items: filterUsersForActor(req.user.role, repo.listUsers()) });
});

adminRouter.post("/admin/users", authRequired, requireRoles("Admin"), (req, res) => {
  const { email, name, role, password, shopperLayoutId, storeAccess, kioskAllApproved } = req.body || {};
  if (!email || !name || !role || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }
  if (!creatableRolesFor(req.user.role).includes(role)) {
    return res.status(403).json({ error: "forbidden_role" });
  }
  const grants = Array.isArray(storeAccess) ? storeAccess.filter(Boolean) : [];
  const defaultStoreId = shopperLayoutId || grants[0] || null;
  if (role === ROLES.Customer) {
    if (!defaultStoreId && !grants.length) {
      return res.status(400).json({ error: "shopper_layout_required" });
    }
    for (const layoutId of grants.length ? grants : [defaultStoreId]) {
      if (!repo.getLayout(layoutId)) {
        return res.status(400).json({ error: "invalid_layout" });
      }
    }
    if (defaultStoreId && !repo.getLayout(defaultStoreId)) {
      return res.status(400).json({ error: "invalid_layout" });
    }
  }
  if (repo.findUserByEmail(email)) {
    return res.status(400).json({ error: "email_exists" });
  }
  const user = repo.createUser({
    id: `u-${randomUUID().slice(0, 8)}`,
    email,
    name,
    role,
    password,
    shopperLayoutId: role === ROLES.Customer ? defaultStoreId : null,
    storeAccess: role === ROLES.Customer ? (grants.length ? grants : [defaultStoreId]) : [],
    kioskAllApproved: role === ROLES.Customer ? Boolean(kioskAllApproved) : false,
  });
  audit(req.user.email, "user.create", user.id);
  res.status(201).json(user);
});

adminRouter.patch("/admin/users/:userId", authRequired, requireRoles("Admin"), (req, res) => {
  const existing = repo.findUserById(req.params.userId);
  if (!existing) return res.status(404).json({ error: "not_found" });
  if (isSuperAdmin(existing.role)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!canActorManageTarget(req.user.role, existing.role)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (req.body?.role) {
    if (!creatableRolesFor(req.user.role).includes(req.body.role)) {
      return res.status(403).json({ error: "forbidden_role" });
    }
  }
  const nextRole = req.body?.role ?? existing.role;
  const grants =
    req.body?.storeAccess !== undefined && Array.isArray(req.body.storeAccess)
      ? req.body.storeAccess.filter(Boolean)
      : undefined;
  const nextLayoutId =
    req.body?.shopperLayoutId !== undefined ? req.body.shopperLayoutId : existing.shopper_layout_id;
  const defaultStoreId = nextLayoutId || grants?.[0] || null;
  if (nextRole === ROLES.Customer) {
    if (!defaultStoreId && !(grants?.length)) {
      return res.status(400).json({ error: "shopper_layout_required" });
    }
    for (const layoutId of grants?.length ? grants : [defaultStoreId]) {
      if (!repo.getLayout(layoutId)) {
        return res.status(400).json({ error: "invalid_layout" });
      }
    }
    if (defaultStoreId && !repo.getLayout(defaultStoreId)) {
      return res.status(400).json({ error: "invalid_layout" });
    }
  }
  const user = repo.updateUser(req.params.userId, {
    ...(req.body || {}),
    storeAccess: grants,
    shopperLayoutId: nextRole === ROLES.Customer ? defaultStoreId : null,
  });
  if (!user) return res.status(404).json({ error: "not_found" });
  audit(req.user.email, "user.update", user.id);
  res.json(user);
});

adminRouter.delete("/admin/users/:userId", authRequired, requireRoles("Admin"), (req, res) => {
  const existing = repo.findUserById(req.params.userId);
  if (!existing) return res.status(404).json({ error: "not_found" });
  if (existing.id === req.user.id) {
    return res.status(403).json({ error: "cannot_delete_self" });
  }
  if (isSuperAdmin(existing.role)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!canActorManageTarget(req.user.role, existing.role)) {
    return res.status(403).json({ error: "forbidden" });
  }
  repo.deleteUser(existing.id);
  audit(req.user.email, "user.delete", existing.id);
  res.status(204).end();
});

adminRouter.get("/admin/audit", authRequired, requireRoles("Admin", "Approver"), (req, res) => {
  res.json({ items: repo.listAudit(100) });
});

adminRouter.get("/admin/shopper-experience", authRequired, requireRoles("Admin"), (req, res) => {
  const { exp, layout } = getShopperLayoutForAdmin();
  res.json({
    ...exp,
    entryPoints: layout?.entryPoints?.map((e) => ({ id: e.id, label: e.label || "Entrance" })) || [],
    layoutName: layout?.name || null,
  });
});

adminRouter.put("/admin/shopper-experience", authRequired, requireRoles("Admin"), (req, res) => {
  try {
    const next = putShopperExperience(req.body || {});
    audit(req.user.email, "shopper.put", next.layoutId || "none");
    const { layout } = getShopperLayoutForAdmin(next.layoutId);
    res.json({
      ...next,
      entryPoints: layout?.entryPoints?.map((e) => ({ id: e.id, label: e.label || "Entrance" })) || [],
      layoutName: layout?.name || null,
    });
  } catch (err) {
    if (err.code === "shopper_layout_required") {
      return res.status(400).json({ error: "shopper_layout_required" });
    }
    throw err;
  }
});
