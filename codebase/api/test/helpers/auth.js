import assert from "node:assert/strict";

const ROLE_EMAIL = {
  SuperAdmin: "superadmin@shelfpilot.local",
  Admin: "admin@shelfpilot.local",
  Designer: "designer@shelfpilot.local",
  Approver: "approver@shelfpilot.local",
  Viewer: "viewer@shelfpilot.local",
  Customer: "customer@shelfpilot.local",
};

const ROLE_PASSWORD = {
  SuperAdmin: "changeme",
};

/** Login against a test server; role picks the default demo email when email is omitted. */
export async function login(port, role = "Designer", email) {
  const resolvedEmail = email || ROLE_EMAIL[role];
  const password = ROLE_PASSWORD[role] || "password";
  const res = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: resolvedEmail, password }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  return body.token;
}

export async function loginBody(port, role = "Designer", email) {
  const resolvedEmail = email || ROLE_EMAIL[role];
  const password = ROLE_PASSWORD[role] || "password";
  const res = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: resolvedEmail, password }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  return body;
}
