import { Router } from "express";
import { randomUUID } from "node:crypto";
import { repo, publicUser, audit } from "../store/sqlite.js";
import { authRequired } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/auth/login", (req, res) => {
  const { email, password, role } = req.body || {};
  const user = repo.findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  const allowed = ["Designer", "Approver", "Viewer", "Admin", "Customer"];
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: "invalid_role" });
  }
  const sessionUser = { ...publicUser(user), role };
  const token = randomUUID();
  repo.createSession(token, user.id, role);
  audit(email, "login", `role=${role}`);
  res.json({ token, user: sessionUser });
});

authRouter.get("/auth/me", authRequired, (req, res) => {
  res.json(req.user);
});

authRouter.post("/auth/logout", authRequired, (req, res) => {
  repo.deleteSession(req.token);
  audit(req.user.email, "logout", "session_revoked");
  res.status(204).end();
});
