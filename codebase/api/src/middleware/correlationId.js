import { randomUUID } from "node:crypto";

/** Propagate or mint a correlation ID on every request. */
export function correlationId(req, res, next) {
  const id = req.header("x-correlation-id") || randomUUID();
  req.correlationId = id;
  res.setHeader("x-correlation-id", id);
  next();
}
