import { describe, expect, it } from "vitest";
import {
  adminTabsForRole,
  canAccessModule,
  canDeleteUser,
  canManageUsers,
  creatableUserRoles,
  defaultModuleForRole,
  isCustomerRole,
  permittedShopLayoutIds,
  shopPathForUser,
} from "./rolePermissions.js";

describe("canAccessModule", () => {
  it("denies access with no role", () => {
    expect(canAccessModule(null, "dashboard")).toBe(false);
  });
  it("Customer can only access shop", () => {
    expect(canAccessModule("Customer", "shop")).toBe(true);
    expect(canAccessModule("Customer", "dashboard")).toBe(false);
    expect(canAccessModule("Customer", "layouts")).toBe(false);
  });
  it("Designer can access layouts/catalog/analytics but not admin", () => {
    expect(canAccessModule("Designer", "layouts")).toBe(true);
    expect(canAccessModule("Designer", "admin")).toBe(false);
  });
  it("Admin can access admin", () => {
    expect(canAccessModule("Admin", "admin")).toBe(true);
  });
  it("SuperAdmin cannot access layouts/catalog/analytics", () => {
    expect(canAccessModule("SuperAdmin", "layouts")).toBe(false);
    expect(canAccessModule("SuperAdmin", "admin")).toBe(true);
  });
});

describe("defaultModuleForRole", () => {
  it("routes Customer to shop", () => {
    expect(defaultModuleForRole("Customer")).toBe("shop");
  });
  it("routes Designer to dashboard (first accessible nav module)", () => {
    expect(defaultModuleForRole("Designer")).toBe("dashboard");
  });
});

describe("creatableUserRoles / canManageUsers / canDeleteUser", () => {
  it("SuperAdmin can only create Admins", () => {
    expect(creatableUserRoles("SuperAdmin")).toEqual(["Admin"]);
  });
  it("Admin can create everything except Admin/SuperAdmin", () => {
    expect(creatableUserRoles("Admin")).toEqual(["Designer", "Approver", "Viewer", "Customer"]);
  });
  it("non-managers cannot create users", () => {
    expect(creatableUserRoles("Designer")).toEqual([]);
  });
  it("canManageUsers is Admin/SuperAdmin only", () => {
    expect(canManageUsers("Admin")).toBe(true);
    expect(canManageUsers("SuperAdmin")).toBe(true);
    expect(canManageUsers("Approver")).toBe(false);
  });
  it("cannot delete yourself, or a SuperAdmin at all", () => {
    expect(canDeleteUser("Admin", "u1", { id: "u1", role: "Designer" })).toBe(false);
    expect(canDeleteUser("Admin", "u1", { id: "u2", role: "SuperAdmin" })).toBe(false);
  });
  it("SuperAdmin may only delete Admins; Admin may delete non-privileged roles", () => {
    expect(canDeleteUser("SuperAdmin", "u1", { id: "u2", role: "Admin" })).toBe(true);
    expect(canDeleteUser("SuperAdmin", "u1", { id: "u2", role: "Designer" })).toBe(false);
    expect(canDeleteUser("Admin", "u1", { id: "u2", role: "Viewer" })).toBe(true);
  });
});

describe("adminTabsForRole", () => {
  it("Approver sees audit only", () => {
    expect(adminTabsForRole("Approver")).toEqual(["audit"]);
  });
  it("SuperAdmin sees users + audit only (no store/approval/config)", () => {
    expect(adminTabsForRole("SuperAdmin")).toEqual(["users", "audit"]);
  });
  it("Admin sees the full tab set", () => {
    expect(adminTabsForRole("Admin")).toEqual(["users", "stores", "approval", "audit"]);
  });
  it("unprivileged roles see no admin tabs", () => {
    expect(adminTabsForRole("Viewer")).toEqual([]);
  });
});

describe("isCustomerRole / permittedShopLayoutIds / shopPathForUser", () => {
  it("isCustomerRole matches only the Customer role", () => {
    expect(isCustomerRole("Customer")).toBe(true);
    expect(isCustomerRole("Designer")).toBe(false);
  });
  it("permittedShopLayoutIds merges shopperLayoutId and storeAccess without duplicates", () => {
    const ids = permittedShopLayoutIds({ shopperLayoutId: "lay-1", storeAccess: ["lay-1", "lay-2"] });
    expect(ids).toEqual(["lay-1", "lay-2"]);
  });
  it("permittedShopLayoutIds returns [] for a user with no grants", () => {
    expect(permittedShopLayoutIds({})).toEqual([]);
  });
  it("shopPathForUser prefers shopperLayoutId, falls back to first storeAccess grant, else null", () => {
    expect(shopPathForUser({ shopperLayoutId: "lay-1" })).toContain("lay-1");
    expect(shopPathForUser({ storeAccess: ["lay-2"] })).toContain("lay-2");
    expect(shopPathForUser({})).toBeNull();
  });
});
