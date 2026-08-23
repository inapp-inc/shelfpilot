import { Router } from "express";
import { randomUUID } from "node:crypto";
import { repo, publicUser, audit } from "../store/sqlite.js";
import { authRequired } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/auth/login", (req, res) => {
  const { email, password, role: requestedRole } = req.body || {};
  const user = repo.findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  if (requestedRole && requestedRole !== user.role) {
    return res.status(403).json({ error: "role_mismatch" });
  }
  const sessionUser = publicUser(user);
  const token = randomUUID();
  repo.createSession(token, user.id, user.role);
  audit(email, "login", `role=${user.role}`);
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
