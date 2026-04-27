import { ProjectPotentialLevel, ProjectStage, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const [totalProjects, activeValidations, highPotentialProjects, pendingTasks, recentProjects] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({
      where: {
        stage: ProjectStage.VALIDATION
      }
    }),
    prisma.project.count({
      where: {
        potentialLevel: ProjectPotentialLevel.HIGH
      }
    }),
    prisma.task.count({
      where: {
        status: {
          in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        }
      }
    }),
    prisma.project.findMany({
      orderBy: {
        updatedAt: "desc"
      },
      take: 6,
      include: {
        contacts: {
          include: {
            contact: {
              include: {
                organization: true
              }
            }
          }
        }
      }
    })
  ]);

  return {
    stats: [
      { label: "Total Projects", value: totalProjects, accent: "bg-teal-100 text-teal-800" },
      { label: "Active Validations", value: activeValidations, accent: "bg-amber-100 text-amber-800" },
      { label: "High Potential Projects", value: highPotentialProjects, accent: "bg-violet-100 text-violet-700" },
      { label: "Pending Tasks", value: pendingTasks, accent: "bg-rose-100 text-rose-700" }
    ],
    recentProjects
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
