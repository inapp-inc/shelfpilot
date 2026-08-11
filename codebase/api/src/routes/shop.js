import { Router } from "express";
import {
  publicLayoutPayload,
  publicProductsForLayout,
  resolveShopperLayout,
} from "../services/shopperExperience.js";

export const shopRouter = Router();

function sendExperience(res, layoutId) {
  const { exp, layout, entry } = resolveShopperLayout(layoutId);
  if (!exp.enabled || !layout) {
    return res.json({ enabled: false });
  }
  res.json({
    enabled: true,
    displayName: exp.displayName || layout.name,
    layoutId: layout.id,
    entryPoint: entry
      ? { id: entry.id, label: entry.label || "Entrance", x: entry.x, y: entry.y }
      : null,
    layoutSize: {
      widthMeters: layout.widthMeters,
      depthMeters: layout.depthMeters,
    },
  });
}

function sendLayout(res, layoutId) {
  const { exp, layout } = resolveShopperLayout(layoutId);
  if (!exp.enabled || !layout) return res.status(404).json({ error: "shopper_disabled" });
  res.json({ layout: publicLayoutPayload(layout) });
}

function sendProducts(res, layoutId) {
  const { exp, layout } = resolveShopperLayout(layoutId);
  if (!exp.enabled || !layout) return res.status(404).json({ error: "shopper_disabled" });
  res.json({ items: publicProductsForLayout(layout) });
}

/** Public kiosk metadata — no auth; only the admin-configured store. */
shopRouter.get("/shop/experience", (_req, res) => sendExperience(res));
shopRouter.get("/shop/:layoutId/experience", (req, res) => sendExperience(res, req.params.layoutId));

/** Public read-only floor plan for the configured shopper layout only. */
shopRouter.get("/shop/layout", (_req, res) => sendLayout(res));
shopRouter.get("/shop/:layoutId/layout", (req, res) => sendLayout(res, req.params.layoutId));

/** Public product list for search — scoped to the shopper layout vertical. */
shopRouter.get("/shop/products", (_req, res) => sendProducts(res));
shopRouter.get("/shop/:layoutId/products", (req, res) => sendProducts(res, req.params.layoutId));
