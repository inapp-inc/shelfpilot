import { Router } from "express";
import { randomUUID } from "node:crypto";
import { repo, audit, getConfig } from "../store/sqlite.js";
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
  };
  repo.putConfig(next);
  audit(req.user.email, "config.put", vertical);
  res.json(next);
});

adminRouter.get("/admin/users", authRequired, requireRoles("Admin"), (req, res) => {
  res.json({ items: repo.listUsers() });
});

adminRouter.post("/admin/users", authRequired, requireRoles("Admin"), (req, res) => {
  const { email, name, role, password } = req.body || {};
  const allowed = ["Designer", "Approver", "Viewer", "Admin"];
  if (!email || !name || !role || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: "invalid_role" });
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
  });
  audit(req.user.email, "user.create", user.id);
  res.status(201).json(user);
});

adminRouter.patch("/admin/users/:userId", authRequired, requireRoles("Admin"), (req, res) => {
  if (req.body?.role) {
    const allowed = ["Designer", "Approver", "Viewer", "Admin"];
    if (!allowed.includes(req.body.role)) {
      return res.status(400).json({ error: "invalid_role" });
    }
  }
  const user = repo.updateUser(req.params.userId, req.body || {});
  if (!user) return res.status(404).json({ error: "not_found" });
  audit(req.user.email, "user.update", user.id);
  res.json(user);
});

adminRouter.get("/admin/audit", authRequired, requireRoles("Admin", "Approver"), (req, res) => {
  res.json({ items: repo.listAudit(100) });
});
