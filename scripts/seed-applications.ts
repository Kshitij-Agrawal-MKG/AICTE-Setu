import { db } from "../server/db";
import { institutions, applications, documents, evaluatorAssignments, evaluations, timelineStages, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedApplications() {
  try {
    const institutionUser = await db.query.users.findFirst({
      where: eq(users.email, "institution@example.com"),
    });

    const evaluatorUser = await db.query.users.findFirst({
      where: eq(users.email, "evaluator@example.com"),
    });

    if (!institutionUser || !evaluatorUser) {
      console.error("❌ Users not found. Please run seed-users.ts first");
      process.exit(1);
    }

    let institution = await db.query.institutions.findFirst({
      where: eq(institutions.userId, institutionUser.id),
    });

    if (!institution) {
      const [newInstitution] = await db.insert(institutions).values({
        userId: institutionUser.id,
        name: "Delhi Institute of Technology",
        address: "123 Tech Street, New Delhi",
        state: "Delhi",
        contactEmail: "contact@dit.edu.in",
        contactPhone: "+91-11-12345678",
      }).returning();
      institution = newInstitution;
      console.log("✓ Created institution: Delhi Institute of Technology");
    }

    const sampleApplications = [
      {
        applicationNumber: "AICTE/2025/001",
        institutionId: institution.id,
        applicationType: "new-course" as const,
        status: "under_evaluation" as const,
        institutionName: "Delhi Institute of Technology",
        address: "123 Tech Street, New Delhi",
        state: "Delhi",
        courseName: "B.Tech in Artificial Intelligence",
        intake: 60,
        description: "New undergraduate program in AI and Machine Learning",
        submittedAt: new Date("2025-01-15"),
      },
      {
        applicationNumber: "AICTE/2025/002",
        institutionId: institution.id,
        applicationType: "intake-increase" as const,
        status: "document_verification" as const,
        institutionName: "Delhi Institute of Technology",
        address: "123 Tech Street, New Delhi",
        state: "Delhi",
        courseName: "M.Tech in Computer Science",
        intake: 30,
        description: "Increase intake from 30 to 60 students",
        submittedAt: new Date("2025-02-01"),
      },
      {
        applicationNumber: "AICTE/2025/003",
        institutionId: institution.id,
        applicationType: "new-institution" as const,
        status: "submitted" as const,
        institutionName: "Delhi Institute of Technology - South Campus",
        address: "456 Innovation Park, South Delhi",
        state: "Delhi",
        courseName: null,
        intake: null,
        description: "New campus in South Delhi for engineering programs",
        submittedAt: new Date("2025-03-01"),
      },
      {
        applicationNumber: "AICTE/2025/004",
        institutionId: institution.id,
        applicationType: "eoa" as const,
        status: "approved" as const,
        institutionName: "Delhi Institute of Technology",
        address: "123 Tech Street, New Delhi",
        state: "Delhi",
        courseName: "B.Tech in Mechanical Engineering",
        intake: 120,
        description: "Extension of Approval for existing programs",
        submittedAt: new Date("2024-12-15"),
      },
      {
        applicationNumber: "AICTE/2024/089",
        institutionId: institution.id,
        applicationType: "new-course" as const,
        status: "rejected" as const,
        institutionName: "Delhi Institute of Technology",
        address: "123 Tech Street, New Delhi",
        state: "Delhi",
        courseName: "MBA in Digital Marketing",
        intake: 40,
        description: "New management program specializing in digital marketing",
        submittedAt: new Date("2024-11-10"),
      },
    ];

    for (const app of sampleApplications) {
      const existing = await db.query.applications.findFirst({
        where: eq(applications.applicationNumber, app.applicationNumber),
      });

      if (!existing) {
        const [newApp] = await db.insert(applications).values(app).returning();
        console.log(`✓ Created application: ${app.applicationNumber}`);

        const documentCategories = [
          { category: "Institution Registration", status: app.status === "approved" ? "approved" : app.status === "rejected" ? "rejected" : "approved" },
          { category: "Building Plan", status: app.status === "under_evaluation" ? "approved" : app.status === "document_verification" ? "pending" : "approved" },
          { category: "Faculty Details", status: app.status === "under_evaluation" ? "pending" : app.status === "rejected" ? "rejected" : "approved" },
          { category: "Infrastructure Report", status: app.status === "document_verification" ? "pending" : app.status === "submitted" ? "pending" : "approved" },
          { category: "Financial Statements", status: app.status === "rejected" ? "rejected" : app.status === "submitted" ? "pending" : "approved" },
        ];

        for (const doc of documentCategories) {
          await db.insert(documents).values({
            applicationId: newApp.id,
            category: doc.category,
            fileName: `${doc.category.toLowerCase().replace(/\s+/g, '-')}.pdf`,
            fileSize: "2.5 MB",
            fileUrl: `/documents/${doc.category.toLowerCase().replace(/\s+/g, '-')}.pdf`,
            status: doc.status,
          });
        }

        if (app.status !== "submitted" && app.status !== "draft") {
          const [assignment] = await db.insert(evaluatorAssignments).values({
            applicationId: newApp.id,
            evaluatorId: evaluatorUser.id,
            priority: app.status === "approved" || app.status === "rejected" ? "low" : "high",
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            completedAt: app.status === "approved" || app.status === "rejected" ? new Date() : null,
          }).returning();

          if (app.status === "approved" || app.status === "rejected" || app.status === "under_evaluation") {
            await db.insert(evaluations).values({
              assignmentId: assignment.id,
              applicationId: newApp.id,
              evaluatorId: evaluatorUser.id,
              score: app.status === "approved" ? 85 : app.status === "rejected" ? 45 : 70,
              comments: app.status === "approved" 
                ? "Excellent infrastructure and qualified faculty. All requirements met."
                : app.status === "rejected"
                ? "Insufficient infrastructure and faculty qualifications. Major gaps in compliance."
                : "Application is progressing well. Some documents need clarification.",
              recommendation: app.status === "approved" ? "Approve" : app.status === "rejected" ? "Reject" : "Under Review",
            });
          }
        }

        const stages = [
          { title: "Application Submitted", status: "completed" as const },
          { title: "Initial Scrutiny", status: app.status === "submitted" ? "current" as const : "completed" as const },
          { title: "Document Verification", status: app.status === "document_verification" ? "current" as const : (app.status === "submitted" ? "pending" as const : "completed" as const) },
          { title: "Evaluation", status: app.status === "under_evaluation" ? "current" as const : (["approved", "rejected"].includes(app.status) ? "completed" as const : "pending" as const) },
          { title: "Final Decision", status: ["approved", "rejected"].includes(app.status) ? "completed" as const : "pending" as const },
        ];

        for (const stage of stages) {
          await db.insert(timelineStages).values({
            applicationId: newApp.id,
            title: stage.title,
            description: `${stage.title} stage`,
            status: stage.status,
            assignedTo: stage.status === "current" ? "Evaluator Team" : null,
            completedAt: stage.status === "completed" ? new Date() : null,
          });
        }
      } else {
        console.log(`- Application already exists: ${app.applicationNumber}`);
      }
    }

    console.log("\n✅ Application seeding completed!");
    console.log(`\nCreated ${sampleApplications.length} sample applications with documents and evaluation data.`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding applications:", error);
    process.exit(1);
  }
}

seedApplications();
