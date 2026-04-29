import type { Prisma, User } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { ensureUserInDb } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class AuthorizationError extends Error {}

type UserRoleContext = Pick<User, "role">;
type ProjectScopeContext = Pick<User, "id" | "role">;

export async function requireCurrentUser() {
  const user = await ensureUserInDb();

  if (!user) {
    throw new AuthorizationError("You must be signed in to continue.");
  }

  return user;
}

export function canManageRecords(user: UserRoleContext) {
  return user.role === UserRole.ADMIN || user.role === UserRole.MANAGER || user.role === UserRole.EVALUATOR;
}

export function canManageAdministrativeRecords(user: UserRoleContext) {
  return user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
}

export function canAccessAllProjects(user: UserRoleContext) {
  return user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
}

export function buildAccessibleProjectWhere(user: ProjectScopeContext): Prisma.ProjectWhereInput {
  if (canAccessAllProjects(user)) {
    return {};
  }

  return {
    ownerUserId: user.id
  };
}

export async function requireProjectAccess(projectId: string, options?: { write?: boolean }) {
  const user = await requireCurrentUser();

  if (options?.write && !canManageRecords(user)) {
    throw new AuthorizationError("You do not have permission to modify CRM records.");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...buildAccessibleProjectWhere(user)
    }
  });

  if (!project) {
    throw new AuthorizationError("Project not found or access denied.");
  }

  return { user, project };
}

export function assertCanManageRecords(user: UserRoleContext) {
  if (!canManageRecords(user)) {
    throw new AuthorizationError("You do not have permission to modify CRM records.");
  }
}

export function assertCanManageAdministrativeRecords(user: UserRoleContext) {
  if (!canManageAdministrativeRecords(user)) {
    throw new AuthorizationError("You do not have permission to manage templates.");
  }
}
