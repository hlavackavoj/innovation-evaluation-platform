import {
  ActivityType,
  BusinessReadiness,
  OrganizationType,
  PipelineStage,
  PrismaClient,
  ProjectPotentialLevel,
  ProjectPriority,
  TaskStatus,
  TeamStrength,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.projectContact.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Eva Novak",
        email: "eva@innovation.local",
        role: UserRole.MANAGER
      }
    }),
    prisma.user.create({
      data: {
        name: "Martin Svoboda",
        email: "martin@innovation.local",
        role: UserRole.EVALUATOR
      }
    })
  ]);

  const organizations = await Promise.all([
    prisma.organization.create({
      data: {
        name: "Charles University Innovation Center",
        type: OrganizationType.INNOVATION_CENTER,
        website: "https://innovation.example.edu",
        notes: "Lead innovation office for translational research."
      }
    }),
    prisma.organization.create({
      data: {
        name: "Faculty of Biomedical Engineering",
        type: OrganizationType.FACULTY,
        website: "https://biomed.example.edu",
        notes: "Faculty partner with active spin-off pipeline."
      }
    }),
    prisma.organization.create({
      data: {
        name: "Prague AI Labs",
        type: OrganizationType.COMPANY,
        website: "https://prague-ai-labs.example.com",
        notes: "External mentoring partner."
      }
    })
  ]);

  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        name: "Dr. Jana Kolarova",
        email: "jana.kolarova@example.edu",
        phone: "+420 777 111 222",
        role: "researcher",
        organizationId: organizations[1].id,
        notes: "Principal investigator for diagnostics platform."
      }
    }),
    prisma.contact.create({
      data: {
        name: "Petr Dvorak",
        email: "petr.dvorak@example.edu",
        phone: "+420 777 333 444",
        role: "student",
        organizationId: organizations[1].id,
        notes: "Technical lead on robotics project."
      }
    }),
    prisma.contact.create({
      data: {
        name: "Lucie Benesova",
        email: "lucie.benesova@example.com",
        phone: "+420 777 555 666",
        role: "mentor",
        organizationId: organizations[2].id,
        notes: "Startup mentor focused on GTM planning."
      }
    })
  ]);

  const projectA = await prisma.project.create({
    data: {
      title: "BioSignal Early Diagnostics",
      description:
        "A university research project commercializing a rapid biosignal analysis workflow for early detection in outpatient care.",
      field: "Digital Health",
      stage: PipelineStage.VALIDATION,
      priority: ProjectPriority.HIGH,
      potentialLevel: ProjectPotentialLevel.HIGH,
      ipStatus: null,
      teamStrength: TeamStrength.BALANCED,
      businessReadiness: BusinessReadiness.WEAK,
      nextStep: "Validate pilot hospitals and clarify IP ownership",
      nextStepDueDate: new Date("2026-05-12"),
      lastContactAt: new Date("2026-04-20"),
      ownerUserId: users[0].id,
      organizationId: organizations[0].id
    }
  });

  const projectB = await prisma.project.create({
    data: {
      title: "Autonomous Lab Robotics",
      description:
        "A spin-off candidate building modular robotics for repetitive laboratory workflows with strong technical differentiation.",
      field: "Robotics",
      stage: PipelineStage.SCALING,
      priority: ProjectPriority.MEDIUM,
      potentialLevel: ProjectPotentialLevel.HIGH,
      ipStatus: "provisional patent filed",
      teamStrength: TeamStrength.TECHNICAL_ONLY,
      businessReadiness: BusinessReadiness.EMERGING,
      nextStep: "Prepare customer discovery sprint",
      nextStepDueDate: new Date("2026-05-19"),
      lastContactAt: new Date("2026-04-11"),
      ownerUserId: users[1].id,
      organizationId: organizations[1].id
    }
  });

  await prisma.projectContact.createMany({
    data: [
      { projectId: projectA.id, contactId: contacts[0].id },
      { projectId: projectA.id, contactId: contacts[2].id },
      { projectId: projectB.id, contactId: contacts[1].id },
      { projectId: projectB.id, contactId: contacts[2].id }
    ]
  });

  await prisma.activity.createMany({
    data: [
      {
        projectId: projectA.id,
        userId: users[0].id,
        type: ActivityType.MEETING,
        note: "Discovery meeting with principal investigator and TTO representative.",
        activityDate: new Date("2026-04-18")
      },
      {
        projectId: projectA.id,
        userId: users[1].id,
        type: ActivityType.EVALUATION,
        note: "Initial validation highlighted missing customer evidence and unclear IP ownership.",
        activityDate: new Date("2026-04-22")
      },
      {
        projectId: projectB.id,
        userId: users[1].id,
        type: ActivityType.WORKSHOP,
        note: "Ran support workshop on early customer segments and pricing experiments.",
        activityDate: new Date("2026-04-15")
      }
    ]
  });

  await prisma.task.createMany({
    data: [
      {
        projectId: projectA.id,
        assignedToUserId: users[0].id,
        title: "Schedule customer interviews",
        description: "Line up five conversations with potential pilot hospitals.",
        status: TaskStatus.TODO,
        priority: ProjectPriority.HIGH,
        dueDate: new Date("2026-05-09")
      },
      {
        projectId: projectA.id,
        assignedToUserId: users[1].id,
        title: "Confirm IP ownership path",
        description: "Meet university IP office and confirm inventor and employer claims.",
        status: TaskStatus.IN_PROGRESS,
        priority: ProjectPriority.URGENT,
        dueDate: new Date("2026-05-05")
      },
      {
        projectId: projectB.id,
        assignedToUserId: users[1].id,
        title: "Draft customer discovery brief",
        description: "Prepare interview guide for biotech lab managers.",
        status: TaskStatus.TODO,
        priority: ProjectPriority.MEDIUM,
        dueDate: new Date("2026-05-14")
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
