import test from "node:test";
import assert from "node:assert/strict";
import { resolveProjectAssignment } from "@/lib/email/project-resolution";

test("explicit projectId wins", () => {
  const result = resolveProjectAssignment({
    explicitProjectId: "p-explicit",
    contactProjectIds: ["p-contact"],
    organizationProjectId: "p-org",
    userOwnedProjectId: "p-user"
  });

  assert.equal(result.projectId, "p-explicit");
  assert.equal(result.resolution, "explicit");
});

test("contact mapping wins over organization and user-owned fallback", () => {
  const result = resolveProjectAssignment({
    contactProjectIds: ["p-contact"],
    organizationProjectId: "p-org",
    userOwnedProjectId: "p-user"
  });

  assert.equal(result.projectId, "p-contact");
  assert.equal(result.resolution, "contact");
});

test("organization mapping wins over user-owned fallback", () => {
  const result = resolveProjectAssignment({
    organizationProjectId: "p-org",
    userOwnedProjectId: "p-user"
  });

  assert.equal(result.projectId, "p-org");
  assert.equal(result.resolution, "organization");
});

test("user-owned fallback wins when no explicit/contact/org mapping exists", () => {
  const result = resolveProjectAssignment({
    userOwnedProjectId: "p-user"
  });

  assert.equal(result.projectId, "p-user");
  assert.equal(result.resolution, "user_owned");
});

test("no match returns unassigned and never arbitrary project", () => {
  const result = resolveProjectAssignment({});

  assert.equal(result.projectId, null);
  assert.equal(result.resolution, "unassigned");
});
