import { RecommendationStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pipelineStages } from "@/lib/constants";
import { syncProjectRecommendations } from "@/lib/recommendations";

export async function getDashboardData() {
  const [totalProjects, pendingTasks, projectsByStageRaw, recentActivities] = await Promise.all([
    prisma.project.count(),
    prisma.task.count({
      where: {
        status: {
          in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        }
      }
    }),
    prisma.project.groupBy({
      by: ["stage"],
      _count: {
        stage: true
      },
      orderBy: {
        stage: "asc"
      }
    }),
    prisma.activity.findMany({
      orderBy: {
        activityDate: "desc"
      },
      take: 5,
      include: {
        project: true,
        user: true
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
    recentActivities
  };
}

export async function getProjects() {
  return prisma.project.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      organization: true,
      owner: true,
      tasks: true
    }
  });
}

export async function getProjectById(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
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
        include: {
          user: true
        }
      },
      tasks: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        include: {
          assignedTo: true
        }
      },
      recommendations: {
        orderBy: [{ createdAt: "asc" }]
      }
    }
  });

  if (!project) {
    return null;
  }

  await syncProjectRecommendations(project);

  return prisma.project.findUnique({
    where: { id: projectId },
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
        include: {
          user: true
        }
      },
      tasks: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        include: {
          assignedTo: true
        }
      },
      recommendations: {
        where: {
          status: RecommendationStatus.PENDING
        },
        orderBy: [{ createdAt: "asc" }]
      }
    }
  });
}

export async function getContacts() {
  return prisma.contact.findMany({
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
  return prisma.organization.findMany({
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
  return prisma.task.findMany({
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      project: true,
      assignedTo: true
    }
  });
}

export async function getProjectFormData() {
  const [organizations, users] = await Promise.all([
    prisma.organization.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    prisma.user.findMany({
      orderBy: {
        name: "asc"
      }
    })
  ]);

  return { organizations, users };
}
