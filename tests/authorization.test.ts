import test from "node:test";
import assert from "node:assert/strict";
import { canManageRecords, canManageAdministrativeRecords, buildAccessibleProjectWhere } from "@/lib/authorization";

test("role guards allow manager/evaluator for records and admin/manager for admin records", () => {
  assert.equal(canManageRecords({ role: "MANAGER" }), true);
  assert.equal(canManageRecords({ role: "EVALUATOR" }), true);
  assert.equal(canManageRecords({ role: "VIEWER" }), false);

  assert.equal(canManageAdministrativeRecords({ role: "ADMIN" }), true);
  assert.equal(canManageAdministrativeRecords({ role: "MANAGER" }), true);
  assert.equal(canManageAdministrativeRecords({ role: "EVALUATOR" }), false);
});

test("project scope filters owner for non-admin roles", () => {
  assert.deepEqual(buildAccessibleProjectWhere({ id: "u1", role: "ADMIN" }), {});
  assert.deepEqual(buildAccessibleProjectWhere({ id: "u1", role: "VIEWER" }), { ownerUserId: "u1" });
});
