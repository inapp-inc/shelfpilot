/** Role hierarchy and user-management rules. */

export const ROLES = {
  SuperAdmin: "SuperAdmin",
  Admin: "Admin",
  Designer: "Designer",
  Approver: "Approver",
  Viewer: "Viewer",
  Customer: "Customer",
};

const TENANT_STAFF = [ROLES.Designer, ROLES.Approver, ROLES.Viewer, ROLES.Customer];

export function isSuperAdmin(role) {
  return role === ROLES.SuperAdmin;
}

export function isTenantAdmin(role) {
  return role === ROLES.Admin;
}

export function canManageUsers(role) {
  return isSuperAdmin(role) || isTenantAdmin(role);
}

/** Roles the signed-in operator may assign when creating users. */
export function creatableRolesFor(actorRole) {
  if (isSuperAdmin(actorRole)) return [ROLES.Admin];
  if (isTenantAdmin(actorRole)) return [...TENANT_STAFF];
  return [];
}

export function canActorManageTarget(actorRole, targetRole) {
  if (!canManageUsers(actorRole)) return false;
  if (isSuperAdmin(targetRole)) return false;
  if (isSuperAdmin(actorRole)) return targetRole === ROLES.Admin;
  if (isTenantAdmin(actorRole)) return TENANT_STAFF.includes(targetRole);
  return false;
}

export function filterUsersForActor(actorRole, users) {
  if (isSuperAdmin(actorRole)) return users;
  if (isTenantAdmin(actorRole)) {
    return users.filter((u) => u.role !== ROLES.SuperAdmin);
  }
  return [];
}
