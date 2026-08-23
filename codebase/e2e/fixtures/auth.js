import { DEMO_USERS } from "./env.js";
import { LoginPage } from "../pages/LoginPage.js";

/** UI login as a demo role. */
export async function loginAs(page, role = "Designer") {
  const creds = DEMO_USERS[role];
  if (!creds) throw new Error(`Unknown role: ${role}`);
  const login = new LoginPage(page);
  await login.goto();
  await login.login(creds.email, creds.password);
  await login.expectLoggedIn(role);
  return login;
}
