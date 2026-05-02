import { RecommendationStatus, TaskStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import {
  buildAccessibleProjectWhere,
  canAccessAllProjects,
  requireCurrentUser
} from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { pipelineStages } from "@/lib/constants";
import {
  attachTemplatesToRecommendations,
  getStageTemplates,
  syncProjectRecommendations
} from "@/lib/recommendations";
import { createSignedFileUrl } from "@/lib/supabase-storage";

function isMissingActivityAnalysisMetadataColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybe = error as { code?: unknown; meta?: { column?: unknown } };
  return maybe.code === "P2022" && maybe.meta?.column === "Activity.analysisMetadata";
}

function isMissingTaskContactIdColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybe = error as { code?: unknown; meta?: { column?: unknown } };
  return maybe.code === "P2022" && maybe.meta?.column === "Task.contactId";
}

async function getRecentActivitiesForDashboard(activityWhere: Record<string, unknown>) {
  try {
    return await prisma.activity.findMany({
      where: activityWhere,
      orderBy: {
        activityDate: "desc"
      },
      take: 5,
      select: {
        id: true,
        type: true,
        note: true,
        activityDate: true,
        analysisMetadata: true,
        project: {
          select: {
            id: true,
            title: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      }
    });
  } catch (error) {
    if (!isMissingActivityAnalysisMetadataColumn(error)) {
      throw error;
    }

    const fallbackRows = await prisma.activity.findMany({
      where: activityWhere,
      orderBy: {
        activityDate: "desc"
      },
      take: 5,
      select: {
        id: true,
        type: true,
        note: true,
        activityDate: true,
        project: {
          select: {
            id: true,
            title: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      }
    });

    return fallbackRows.map((row) => ({
      ...row,
      analysisMetadata: null
    }));
  }
}

export async function getDashboardData() {
  const user = await requireCurrentUser();
  const projectWhere = buildAccessibleProjectWhere(user);
  const taskWhere = canAccessAllProjects(user) ? {} : { project: projectWhere };
  const activityWhere = canAccessAllProjects(user) ? {} : { project: projectWhere };
  const [totalProjects, pendingTasks, projectsByStageRaw, recentActivities, assignableProjects] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.task.count({
      where: {
        ...taskWhere,
        status: {
          in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        }
      }
    }),
    prisma.project.groupBy({
      where: projectWhere,
      by: ["stage"],
      _count: {
        stage: true
      },
      orderBy: {
        stage: "asc"
      }
    }),
    getRecentActivitiesForDashboard(activityWhere),
    prisma.project.findMany({
      where: projectWhere,
      orderBy: {
        title: "asc"
      },
      select: {
        id: true,
        title: true
      }
    })
  ]);

  const projectsByStage = pipelineStages.map((stage) => {
    const match = projectsByStageRaw.find((item) => item.stage === stage);

    return {
      stage,
      count: match?._count.stage ?? 0,
      share: totalProjects > 0 ? Math.round(((match?._count.stage ?? 0) / totalProjects) * 100) : 0
    };
  });

  return {
    stats: [
      { label: "Total Projects", value: totalProjects, accent: "bg-teal-100 text-teal-800" },
      { label: "Pending Tasks", value: pendingTasks, accent: "bg-rose-100 text-rose-700" }
    ],
    projectsByStage,
    recentActivities,
    assignableProjects
  };
}

export async function getProjects() {
  const user = await requireCurrentUser();

  return prisma.project.findMany({
    where: buildAccessibleProjectWhere(user),
    orderBy: [{ updatedAt: "desc" }],
    include: {
      organization: true,
      owner: true,
      tasks: true
    }
  });
}

export async function getProjectById(projectId: string) {
  const user = await requireCurrentUser();
  const projectWhere = {
    id: projectId,
    ...buildAccessibleProjectWhere(user)
  };

  const project = await prisma.project.findFirst({
    where: projectWhere,
    include: {
      organization: true,
      owner: true,
      contacts: {
        include: {
          contact: {
            include: {
              organization: true
            }
          }
        }
      },
      activities: {
        orderBy: {
          activityDate: "desc"
        },
        select: {
          id: true,
          type: true,
          note: true,
          activityDate: true,
          emailMessageId: true,
          emailParentId: true,
          aiAnalysis: true,
          user: {
            select: {
              name: true
            }
          }
        }
      },
      tasks: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        include: {
          assignedTo: true
        }
      },
      documents: {
        orderBy: [{ createdAt: "desc" }],
        include: {
          template: true
        }
      },
      recommendations: {
        orderBy: [{ createdAt: "asc" }]
      },
      emailAutomationSetting: {
        include: {
          contacts: {
            include: {
              contact: true
            }
          },
          domains: true
        }
      },
      emailLinks: {
        include: {
          emailMessage: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 25
      }
    }
  });

  if (!project) {
    return null;
  }

  await syncProjectRecommendations(project);

  const hydratedProject = await prisma.project.findFirst({
    where: projectWhere,
    include: {
      organization: true,
      owner: true,
      contacts: {
        include: {
          contact: {
            include: {
              organization: true
            }
          }
        }
      },
      activities: {
        orderBy: {
          activityDate: "desc"
        },
        select: {
          id: true,
          type: true,
          note: true,
          activityDate: true,
          emailMessageId: true,
          emailParentId: true,
          aiAnalysis: true,
          user: {
            select: {
              name: true
            }
          }
        }
      },
      tasks: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        include: {
          assignedTo: true
        }
      },
      documents: {
        orderBy: [{ createdAt: "desc" }],
        include: {
          template: true
        }
      },
      recommendations: {
        where: {
          status: RecommendationStatus.PENDING
        },
        orderBy: [{ createdAt: "asc" }]
      },
      emailAutomationSetting: {
        include: {
          contacts: {
            include: {
              contact: true
            }
          },
          domains: true
        }
      },
      emailLinks: {
        include: {
          emailMessage: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 25
      }
    }
  });

  if (!hydratedProject) {
    return null;
  }

  const stageTemplates = await getStageTemplates(hydratedProject.stage);
  const documents = await Promise.all(
    hydratedProject.documents.map(async (document) => ({
      ...document,
      fileUrl: await createSignedFileUrl(document.storagePath)
    }))
  );

  return {
    ...hydratedProject,
    documents,
    stageTemplates,
    recommendations: attachTemplatesToRecommendations(hydratedProject.recommendations, stageTemplates)
  };
}

export async function getContacts() {
  const user = await requireCurrentUser();

  return prisma.contact.findMany({
    where: canAccessAllProjects(user)
      ? undefined
      : {
          projectLinks: {
            some: {
              project: buildAccessibleProjectWhere(user)
            }
          }
        },
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      organization: true,
      projectLinks: {
        include: {
          project: true
        }
      }
    }
  });
}

export async function getOrganizations() {
  const user = await requireCurrentUser();

  return prisma.organization.findMany({
    where: canAccessAllProjects(user)
      ? undefined
      : {
          projects: {
            some: buildAccessibleProjectWhere(user)
          }
        },
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      contacts: true,
      projects: true
    }
  });
}

export async function getTasks() {
  const user = await requireCurrentUser();
  const where = canAccessAllProjects(user)
    ? undefined
    : {
        project: buildAccessibleProjectWhere(user)
      };

  try {
    return await prisma.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        project: true,
        contact: true,
        assignedTo: true
      }
    });
  } catch (error) {
    if (!isMissingTaskContactIdColumn(error)) {
      throw error;
    }

    const ownerFilter = canAccessAllProjects(user) ? "" : `WHERE p."ownerUserId" = ${JSON.stringify(user.id)}`;
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      dueDate: Date | null;
      createdAt: Date;
      updatedAt: Date;
      projectId: string;
      projectTitle: string;
      assignedToUserId: string | null;
      assignedToName: string | null;
    }>>(
      `SELECT
        t."id",
        t."title",
        t."description",
        t."status",
        t."priority",
        t."dueDate",
        t."createdAt",
        t."updatedAt",
        p."id" AS "projectId",
        p."title" AS "projectTitle",
        u."id" AS "assignedToUserId",
        u."name" AS "assignedToName"
      FROM "Task" t
      JOIN "Project" p ON p."id" = t."projectId"
      LEFT JOIN "User" u ON u."id" = t."assignedToUserId"
      ${ownerFilter}
      ORDER BY t."dueDate" ASC NULLS LAST, t."createdAt" DESC`
    );

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as never,
      priority: row.priority as never,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      projectId: row.projectId,
      contactId: null,
      assignedToUserId: row.assignedToUserId,
      sourceActivityId: null,
      suggestionStatus: "ACCEPTED",
      project: { id: row.projectId, title: row.projectTitle } as never,
      contact: null,
      assignedTo: row.assignedToUserId ? ({ id: row.assignedToUserId, name: row.assignedToName } as never) : null
    }));
  }
}

export async function getProjectFormData() {
  const user = await requireCurrentUser();

  const [organizations, users] = await Promise.all([
    prisma.organization.findMany({
      where: canAccessAllProjects(user)
        ? undefined
        : {
            projects: {
              some: buildAccessibleProjectWhere(user)
            }
          },
      orderBy: {
        name: "asc"
      }
    }),
    prisma.user.findMany({
      where: canAccessAllProjects(user) ? undefined : { id: user.id },
      orderBy: {
        name: "asc"
      }
    })
  ]);

  return { organizations, users };
}

export async function getTemplates() {
  await requireCurrentUser();

  const templates = await prisma.template.findMany({
    orderBy: [{ targetStage: "asc" }, { createdAt: "desc" }]
  });

  return Promise.all(
    templates.map(async (template) => ({
      ...template,
      fileUrl: await createSignedFileUrl(template.storagePath)
    }))
  );
}

export async function getContactById(contactId: string) {
  const user = await requireCurrentUser();
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      ...(canAccessAllProjects(user)
        ? {}
        : {
            projectLinks: {
              some: {
                project: buildAccessibleProjectWhere(user)
              }
            }
          })
    }
  });

  if (!contact) {
    notFound();
  }

  return contact;
}

export async function getOrganizationById(organizationId: string) {
  const user = await requireCurrentUser();
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ...(canAccessAllProjects(user)
        ? {}
        : {
            projects: {
              some: buildAccessibleProjectWhere(user)
            }
          })
    }
  });

  if (!organization) {
    notFound();
  }

  return organization;
}
