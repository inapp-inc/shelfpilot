import { repo, publicUser } from "../store/sqlite.js";

export function authRequired(req, res, next) {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = token ? repo.getSession(token) : null;
  if (!session) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const user = repo.findUserById(session.user_id);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  req.user = { ...publicUser(user), role: session.role || user.role };
  req.token = token;
  next();
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  };
}
