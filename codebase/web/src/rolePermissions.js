/** Client-side RBAC — mirrors API requireRoles; hide nav/pages the role cannot use. */
import { NAV_MODULES } from "./storeTypes.js";
import { pathForModule } from "./routes.js";

const ALL = ["Designer", "Approver", "Viewer", "Admin", "SuperAdmin", "Customer"];

/** Top-level modules visible in header nav. */
const MODULE_ROLES = {
  dashboard: ALL.filter((r) => r !== "Customer"),
  layouts: ALL.filter((r) => r !== "Customer" && r !== "SuperAdmin"),
  catalog: ALL.filter((r) => r !== "Customer" && r !== "SuperAdmin"),
  analytics: ALL.filter((r) => r !== "Customer" && r !== "SuperAdmin"),
  admin: ["Admin", "SuperAdmin", "Approver"],
  shop: ["Customer"],
};

export function isCustomerRole(role) {
  return role === "Customer";
}

export function canAccessModule(role, moduleId) {
  if (!role) return false;
  return (MODULE_ROLES[moduleId] || []).includes(role);
}

export function navModulesForRole(role) {
  if (!role) return [];
  return NAV_MODULES.filter((n) => canAccessModule(role, n.id));
}

export function shopPathForUser(user) {
  if (user?.shopperLayoutId) return pathForModule("shop", user.shopperLayoutId);
  const firstGrant = user?.storeAccess?.[0];
  if (firstGrant) return pathForModule("shop", firstGrant);
  return null;
}

export function permittedShopLayoutIds(user) {
  const ids = new Set();
  if (user?.shopperLayoutId) ids.add(user.shopperLayoutId);
  for (const id of user?.storeAccess || []) ids.add(id);
  return [...ids];
}

export function defaultModuleForRole(role) {
  if (role === "Customer") return "shop";
  return navModulesForRole(role)[0]?.id || "dashboard";
}

export function canEditLayouts(role) {
  return ["Designer", "Admin"].includes(role);
}

export function canEditCatalog(role) {
  return ["Designer", "Admin"].includes(role);
}

export function canApproveLayouts(role) {
  return ["Approver", "Admin"].includes(role);
}

export function canManageUsers(role) {
  return role === "Admin" || role === "SuperAdmin";
}

export function creatableUserRoles(role) {
  if (role === "SuperAdmin") return ["Admin"];
  if (role === "Admin") return ["Designer", "Approver", "Viewer", "Customer"];
  return [];
}

export function canDeleteUser(actorRole, actorId, targetUser) {
  if (!canManageUsers(actorRole) || !targetUser || targetUser.id === actorId) return false;
  if (targetUser.role === "SuperAdmin") return false;
  if (actorRole === "SuperAdmin") return targetUser.role === "Admin";
  if (actorRole === "Admin") {
    return ["Designer", "Approver", "Viewer", "Customer"].includes(targetUser.role);
  }
  return false;
}

export function canEditAdminConfig(role) {
  return role === "Admin" || role === "SuperAdmin";
}

export function canViewAuditLog(role) {
  return ["Admin", "SuperAdmin", "Approver"].includes(role);
}

/** Admin section tabs — Approver sees audit only. */
export function adminTabsForRole(role) {
  if (role === "SuperAdmin") return ["users", "audit"];
  if (role === "Admin") return ["users", "stores", "approval", "configuration", "audit"];
  if (role === "Approver") return ["audit"];
  return [];
}

export function adminTabLabel(tab) {
  if (tab === "users") return "Users & Roles";
  if (tab === "stores") return "Store Master";
  if (tab === "approval") return "Approval Workflow";
  if (tab === "configuration") return "Configuration";
  if (tab === "audit") return "Audit Log";
  return tab;
}

/** Widgets restricted by role — omitted roles see all non-listed widgets. */
export const ANALYTICS_WIDGET_ROLES = {
  "audit-activity": ["Admin", "SuperAdmin", "Approver"],
  "layout-standardization": ["Admin", "SuperAdmin", "Approver"],
  "store-benchmarking": ["Admin", "SuperAdmin", "Approver"],
};

export function canViewAnalyticsWidget(role, widgetId) {
  if (!role) return true;
  const allowed = ANALYTICS_WIDGET_ROLES[widgetId];
  if (!allowed) return true;
  return allowed.includes(role);
}

export function canCustomizeDashboard(role) {
  if (!role) return true;
  return role !== "Viewer" && role !== "Customer";
}

export function canUseDashboardDrillDown(role) {
  return Boolean(role) && role !== "Customer";
}
