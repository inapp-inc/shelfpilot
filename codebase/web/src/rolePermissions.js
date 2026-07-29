/** Client-side RBAC — mirrors API requireRoles; hide nav/pages the role cannot use. */
import { NAV_MODULES } from "./storeTypes.js";

const ALL = ["Designer", "Approver", "Viewer", "Admin"];

/** Top-level modules visible in header nav. */
const MODULE_ROLES = {
  dashboard: ALL,
  layouts: ALL,
  catalog: ALL,
  analytics: ALL,
  admin: ["Admin", "Approver"],
};

export function canAccessModule(role, moduleId) {
  if (!role) return false;
  return (MODULE_ROLES[moduleId] || []).includes(role);
}

export function navModulesForRole(role) {
  if (!role) return [];
  return NAV_MODULES.filter((n) => canAccessModule(role, n.id));
}

export function defaultModuleForRole(role) {
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
  return role === "Admin";
}

export function canEditAdminConfig(role) {
  return role === "Admin";
}

export function canViewAuditLog(role) {
  return ["Admin", "Approver"].includes(role);
}

/** Admin section tabs — Approver sees audit only. */
export function adminTabsForRole(role) {
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
