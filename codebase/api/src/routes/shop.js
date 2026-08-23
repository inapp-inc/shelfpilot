import { Router } from "express";
import { authRequired, requireRoles } from "../middleware/auth.js";
import {
  resolveCustomerKiosk,
  permittedStoresFor,
} from "../services/shopperExperience.js";

export const shopRouter = Router();

function denyPublic(_req, res) {
  res.status(401).json({ error: "unauthorized" });
}

/** Permitted stores for the signed-in Customer (FR-KIOSK-01). */
shopRouter.get("/shopper/stores", authRequired, requireRoles("Customer"), (req, res) => {
  const stores = permittedStoresFor(req.user);
  res.json({
    items: stores,
    defaultStoreId: req.user?.shopperLayoutId || stores[0]?.id || null,
  });
});

/** Customer kiosk metadata — login required; scoped to permitted stores. */
shopRouter.get("/shopper/kiosk", authRequired, requireRoles("Customer"), (req, res) => {
  const requestedLayoutId = req.query.layoutId ? String(req.query.layoutId) : null;
  res.json(resolveCustomerKiosk(req.user, requestedLayoutId));
});

/** Legacy public shop routes — disabled; kiosk requires Customer login. */
shopRouter.get("/shop/experience", denyPublic);
shopRouter.get("/shop/:layoutId/experience", denyPublic);
shopRouter.get("/shop/layout", denyPublic);
shopRouter.get("/shop/:layoutId/layout", denyPublic);
shopRouter.get("/shop/products", denyPublic);
shopRouter.get("/shop/:layoutId/products", denyPublic);
