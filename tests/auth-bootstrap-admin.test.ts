import test from "node:test";
import assert from "node:assert/strict";
import { resolveBootstrapAdminRole } from "@/lib/auth";

const ORIGINAL_ENV = {
  AUTH_FORCE_ADMIN_EMAIL: process.env.AUTH_FORCE_ADMIN_EMAIL,
  AUTH_EMERGENCY_ADMIN_EMAILS: process.env.AUTH_EMERGENCY_ADMIN_EMAILS,
  BOOTSTRAP_ADMIN_EMAILS: process.env.BOOTSTRAP_ADMIN_EMAILS
};

function resetAdminEnv() {
  process.env.AUTH_FORCE_ADMIN_EMAIL = ORIGINAL_ENV.AUTH_FORCE_ADMIN_EMAIL;
  process.env.AUTH_EMERGENCY_ADMIN_EMAILS = ORIGINAL_ENV.AUTH_EMERGENCY_ADMIN_EMAILS;
  process.env.BOOTSTRAP_ADMIN_EMAILS = ORIGINAL_ENV.BOOTSTRAP_ADMIN_EMAILS;
}

test.afterEach(() => {
  resetAdminEnv();
});

test("email in allowlist is escalated to ADMIN", () => {
  process.env.AUTH_FORCE_ADMIN_EMAIL = "admin@example.com";
  process.env.AUTH_EMERGENCY_ADMIN_EMAILS = "";
  process.env.BOOTSTRAP_ADMIN_EMAILS = "";

  const resolved = resolveBootstrapAdminRole("admin@example.com", "VIEWER");
  assert.equal(resolved, "ADMIN");
});

test("email outside allowlist keeps current role", () => {
  process.env.AUTH_FORCE_ADMIN_EMAIL = "admin@example.com";
  process.env.AUTH_EMERGENCY_ADMIN_EMAILS = "";
  process.env.BOOTSTRAP_ADMIN_EMAILS = "";

  const resolved = resolveBootstrapAdminRole("outsider@example.com", "MANAGER");
  assert.equal(resolved, "MANAGER");
});

test("existing ADMIN role remains ADMIN", () => {
  process.env.AUTH_FORCE_ADMIN_EMAIL = "";
  process.env.AUTH_EMERGENCY_ADMIN_EMAILS = "";
  process.env.BOOTSTRAP_ADMIN_EMAILS = "";

  const resolved = resolveBootstrapAdminRole("anyone@example.com", "ADMIN");
  assert.equal(resolved, "ADMIN");
});

test("CSV allowlist parsing normalizes whitespace and case", () => {
  process.env.AUTH_FORCE_ADMIN_EMAIL = "  FORCE@Example.com  ";
  process.env.AUTH_EMERGENCY_ADMIN_EMAILS = "  First@Example.com, second@example.COM ";
  process.env.BOOTSTRAP_ADMIN_EMAILS = " third@example.com ";

  assert.equal(resolveBootstrapAdminRole("force@example.com", "VIEWER"), "ADMIN");
  assert.equal(resolveBootstrapAdminRole("FIRST@example.com", "VIEWER"), "ADMIN");
  assert.equal(resolveBootstrapAdminRole("Second@Example.com", "VIEWER"), "ADMIN");
  assert.equal(resolveBootstrapAdminRole("THIRD@EXAMPLE.COM", "VIEWER"), "ADMIN");
});
