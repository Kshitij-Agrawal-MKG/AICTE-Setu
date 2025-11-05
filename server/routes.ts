import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { 
  users, institutions, applications, documents, evaluatorAssignments, evaluations, messages, timelineStages,
  loginSchema, registerSchema, createUserSchema, createApplicationSchema, assignEvaluatorSchema, submitEvaluationSchema, sendMessageSchema, updateApplicationSchema, updateApplicationStatusSchema
} from "../shared/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import session from "express-session";
import MemoryStore from "memorystore";
import bcrypt from "bcrypt";
import { fromZodError } from "zod-validation-error";

const SessionStore = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
  }
}

interface AuthRequest extends Request {
  session: session.Session & Partial<session.SessionData>;
}

export async function registerRoutes(app: Express): Promise<Server> {
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable must be set in production");
  }

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000,
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  const requireAuth = (req: AuthRequest, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: Function) => {
      if (!req.session.userId || !roles.includes(req.session.userRole || "")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    };
  };

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: fromZodError(validationResult.error).message });
      }

      const { email, password, name, role, institutionDetails } = validationResult.data;
      
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [user] = await db
        .insert(users)
        .values({ email, password: hashedPassword, name, role: "institution" })
        .returning();

      if (institutionDetails) {
        await db.insert(institutions).values({
          userId: user.id,
          name: institutionDetails.name,
          address: institutionDetails.address,
          state: institutionDetails.state,
          contactEmail: email,
          contactPhone: institutionDetails.phone,
        });
      }

      res.json({ message: "Registration successful" });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/admin/create-user", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const validationResult = createUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: fromZodError(validationResult.error).message });
      }

      const { email, password, name, role } = validationResult.data;

      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [user] = await db
        .insert(users)
        .values({ email, password: hashedPassword, name, role })
        .returning();

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req: AuthRequest, res: Response) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: fromZodError(validationResult.error).message });
      }

      const { email, password } = validationResult.data;

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.userRole = user.role;

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: AuthRequest, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/session", (req: AuthRequest, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    db.query.users
      .findFirst({
        where: eq(users.id, req.session.userId),
      })
      .then((user) => {
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      })
      .catch(() => {
        res.status(500).json({ message: "Session check failed" });
      });
  });

  app.get("/api/institution/dashboard", requireAuth, requireRole("institution"), async (req: AuthRequest, res: Response) => {
    try {
      const institution = await db.query.institutions.findFirst({
        where: eq(institutions.userId, req.session.userId!),
      });

      if (!institution) {
        return res.status(404).json({ message: "Institution not found" });
      }

      const allApplications = await db.query.applications.findMany({
        where: eq(applications.institutionId, institution.id),
        orderBy: [desc(applications.createdAt)],
      });

      const stats = {
        total: allApplications.length,
        inProgress: allApplications.filter(a => ["submitted", "scrutiny", "document_verification", "under_evaluation"].includes(a.status)).length,
        approved: allApplications.filter(a => a.status === "approved").length,
        rejected: allApplications.filter(a => a.status === "rejected").length,
      };

      const recentApplications = allApplications.slice(0, 10).map(app => ({
        id: app.applicationNumber,
        institutionName: app.institutionName,
        applicationType: app.applicationType,
        status: app.status,
        submittedDate: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "Draft",
        location: `${app.address}, ${app.state}`,
        courseName: app.courseName,
      }));

      res.json({ stats, applications: recentApplications });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/institution/applications", requireAuth, requireRole("institution"), async (req: AuthRequest, res: Response) => {
    try {
      const institution = await db.query.institutions.findFirst({
        where: eq(institutions.userId, req.session.userId!),
      });

      if (!institution) {
        return res.status(404).json({ message: "Institution not found" });
      }

      const allApplications = await db.query.applications.findMany({
        where: eq(applications.institutionId, institution.id),
        orderBy: [desc(applications.createdAt)],
      });

      res.json(allApplications);
    } catch (error) {
      console.error("Get applications error:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get("/api/messages/:applicationId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { applicationId } = req.params;

      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const userRole = req.session.userRole;
      const userId = req.session.userId!;

      if (userRole === "institution") {
        const institution = await db.query.institutions.findFirst({
          where: eq(institutions.userId, userId),
        });

        if (!institution || institution.id !== application.institutionId) {
          return res.status(403).json({ message: "Access denied to this application's messages" });
        }
      } else if (userRole === "evaluator") {
        const assignment = await db.query.evaluatorAssignments.findFirst({
          where: and(
            eq(evaluatorAssignments.applicationId, applicationId),
            eq(evaluatorAssignments.evaluatorId, userId)
          ),
        });

        if (!assignment) {
          return res.status(403).json({ message: "Access denied to this application's messages" });
        }
      }

      const allMessages = await db
        .select({
          id: messages.id,
          applicationId: messages.applicationId,
          senderId: messages.senderId,
          senderName: users.name,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.applicationId, applicationId))
        .orderBy(messages.createdAt);

      res.json(allMessages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.put("/api/settings/profile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { name, email } = req.body;

      if (!name && !email) {
        return res.status(400).json({ message: "No updates provided" });
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) {
        const existingUser = await db.query.users.findFirst({
          where: and(
            eq(users.email, email),
            sql`${users.id} != ${req.session.userId}`
          ),
        });

        if (existingUser) {
          return res.status(400).json({ message: "Email already in use" });
        }
        updateData.email = email;
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, req.session.userId!))
        .returning();

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/settings/password", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId!),
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, req.session.userId!));

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.get("/api/evaluator/dashboard", requireAuth, requireRole("evaluator"), async (req: AuthRequest, res: Response) => {
    try {
      const assignments = await db
        .select({
          id: evaluatorAssignments.id,
          applicationId: evaluatorAssignments.applicationId,
          priority: evaluatorAssignments.priority,
          deadline: evaluatorAssignments.deadline,
          applicationNumber: applications.applicationNumber,
          institutionName: applications.institutionName,
          applicationType: applications.applicationType,
          state: applications.state,
          address: applications.address,
          courseName: applications.courseName,
        })
        .from(evaluatorAssignments)
        .innerJoin(applications, eq(evaluatorAssignments.applicationId, applications.id))
        .where(and(
          eq(evaluatorAssignments.evaluatorId, req.session.userId!),
          sql`${evaluatorAssignments.completedAt} IS NULL`
        ))
        .orderBy(desc(evaluatorAssignments.assignedAt));

      const stats = {
        assigned: assignments.length,
        pending: assignments.filter(a => !a.deadline || new Date(a.deadline) > new Date()).length,
        upcoming: assignments.filter(a => a.deadline && new Date(a.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length,
      };

      const formattedAssignments = assignments.map(a => ({
        id: a.applicationNumber,
        institutionName: a.institutionName,
        applicationType: a.applicationType,
        location: `${a.address}, ${a.state}`,
        deadline: a.deadline ? new Date(a.deadline).toLocaleDateString() : "Not set",
        priority: a.priority,
        courseName: a.courseName,
      }));

      res.json({ stats, assignments: formattedAssignments });
    } catch (error) {
      console.error("Evaluator dashboard error:", error);
      res.status(500).json({ message: "Failed to fetch evaluator dashboard data" });
    }
  });

  app.get("/api/evaluator/applications", requireAuth, requireRole("evaluator"), async (req: AuthRequest, res: Response) => {
    try {
      const assignedApps = await db
        .select({
          id: applications.id,
          applicationNumber: applications.applicationNumber,
          institutionId: applications.institutionId,
          applicationType: applications.applicationType,
          status: applications.status,
          institutionName: applications.institutionName,
          address: applications.address,
          state: applications.state,
          courseName: applications.courseName,
          intake: applications.intake,
          description: applications.description,
          submittedAt: applications.submittedAt,
          createdAt: applications.createdAt,
          updatedAt: applications.updatedAt,
        })
        .from(evaluatorAssignments)
        .innerJoin(applications, eq(evaluatorAssignments.applicationId, applications.id))
        .where(eq(evaluatorAssignments.evaluatorId, req.session.userId!))
        .orderBy(desc(applications.createdAt));

      res.json(assignedApps);
    } catch (error) {
      console.error("Get evaluator applications error:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get("/api/admin/dashboard", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [totalStats, activeEvaluators, monthlyChartData, workflowDistribution, avgProcessing] = await Promise.all([
        db.select({
          total: count(),
          approved: count(sql`CASE WHEN ${applications.status} = 'approved' THEN 1 END`)
        }).from(applications),
        db.select({ count: count() }).from(users).where(eq(users.role, "evaluator")),
        db.select({
          month: sql<string>`DATE_TRUNC('month', ${applications.createdAt})`,
          applications: count()
        })
          .from(applications)
          .groupBy(sql`DATE_TRUNC('month', ${applications.createdAt})`)
          .orderBy(desc(sql`DATE_TRUNC('month', ${applications.createdAt})`))
          .limit(12),
        db.select({
          status: applications.status,
          count: count()
        }).from(applications).groupBy(applications.status),
        db.select({
          avgDays: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${applications.updatedAt} - ${applications.submittedAt})) / 86400), 0)::int`
        })
          .from(applications)
          .where(and(
            eq(applications.status, "approved"),
            sql`${applications.submittedAt} IS NOT NULL`,
            sql`${applications.updatedAt} IS NOT NULL`
          )),
      ]);

      const totalCount = Number(totalStats[0]?.total || 0);
      const approvedCount = Number(totalStats[0]?.approved || 0);
      const avgDays = Number(avgProcessing[0]?.avgDays || 0);

      const stats = {
        totalApplications: totalCount,
        activeEvaluators: Number(activeEvaluators[0]?.count || 0),
        approvalRate: totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0,
        avgProcessingTime: `${avgDays} days`,
      };

      const chartData = monthlyChartData
        .reverse()
        .map(item => {
          const date = new Date(item.month);
          const monthName = date.toLocaleString('default', { month: 'short' });
          const year = date.getFullYear();
          return {
            name: `${monthName} ${year}`,
            applications: Number(item.applications),
          };
        });

      const workflow = workflowDistribution.map(w => ({
        stage: w.status,
        count: Number(w.count),
      }));

      res.json({ stats, chartData, workflowStages: workflow });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      res.status(500).json({ message: "Failed to fetch admin dashboard data" });
    }
  });

  app.get("/api/admin/alerts", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const alerts = [];
      
      const unassignedApps = await db.select({ count: count() })
        .from(applications)
        .where(and(
          eq(applications.status, "under_evaluation"),
          sql`NOT EXISTS (SELECT 1 FROM ${evaluatorAssignments} WHERE ${evaluatorAssignments.applicationId} = ${applications.id})`
        ));

      if (unassignedApps[0] && Number(unassignedApps[0].count) > 0) {
        alerts.push({
          type: "warning",
          message: `${unassignedApps[0].count} applications pending evaluator assignment`,
          action: "Assign Evaluators",
          actionUrl: "/admin/applications"
        });
      }

      const upcomingSiteVisits = await db.select({ count: count() })
        .from(evaluatorAssignments)
        .where(and(
          sql`${evaluatorAssignments.completedAt} IS NULL`,
          sql`${evaluatorAssignments.deadline} IS NOT NULL AND ${evaluatorAssignments.deadline} >= CURRENT_DATE AND ${evaluatorAssignments.deadline} <= CURRENT_DATE + INTERVAL '7 days'`
        ));

      if (upcomingSiteVisits[0] && Number(upcomingSiteVisits[0].count) > 0) {
        alerts.push({
          type: "info",
          message: `${upcomingSiteVisits[0].count} evaluations due in next week`,
          action: "View Schedule",
          actionUrl: "/admin/evaluations"
        });
      }

      const nearingDeadline = await db.select({ count: count() })
        .from(evaluatorAssignments)
        .where(and(
          sql`${evaluatorAssignments.completedAt} IS NULL`,
          sql`${evaluatorAssignments.deadline} IS NOT NULL AND ${evaluatorAssignments.deadline} <= CURRENT_DATE + INTERVAL '3 days'`
        ));

      if (nearingDeadline[0] && Number(nearingDeadline[0].count) > 0) {
        alerts.push({
          type: "warning",
          message: `${nearingDeadline[0].count} evaluations nearing deadline`,
          action: "Review",
          actionUrl: "/admin/applications"
        });
      }

      const pendingReview = await db.select({ count: count() })
        .from(applications)
        .where(eq(applications.status, "submitted"));

      if (pendingReview[0] && Number(pendingReview[0].count) > 0) {
        alerts.push({
          type: "info",
          message: `${pendingReview[0].count} new applications awaiting initial review`,
          action: "Review",
          actionUrl: "/admin/applications"
        });
      }

      res.json({ alerts });
    } catch (error) {
      console.error("Admin alerts error:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post("/api/applications", requireAuth, requireRole("institution"), async (req: AuthRequest, res: Response) => {
    try {
      const validationResult = createApplicationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: fromZodError(validationResult.error).message });
      }

      const { applicationType, institutionName, address, state, courseName, intake, description } = validationResult.data;

      const institution = await db.query.institutions.findFirst({
        where: eq(institutions.userId, req.session.userId!),
      });

      if (!institution) {
        return res.status(404).json({ message: "Institution not found" });
      }

      const appNumber = `APP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`;

      const [application] = await db
        .insert(applications)
        .values({
          institutionId: institution.id,
          applicationNumber: appNumber,
          applicationType,
          institutionName: institutionName || institution.name,
          address: address || institution.address,
          state: state || institution.state,
          courseName,
          intake,
          description,
          status: "draft",
        })
        .returning();

      const timelineStagesData = [
        { title: "Application Submitted", description: "Application created", status: "current" as const },
        { title: "Initial Scrutiny", description: "Awaiting scrutiny", status: "pending" as const },
        { title: "Document Verification", description: "Awaiting verification", status: "pending" as const },
        { title: "Evaluator Assignment", description: "Awaiting evaluator", status: "pending" as const },
        { title: "Site Visit & Evaluation", description: "Pending site visit", status: "pending" as const },
        { title: "Final Approval", description: "Pending final review", status: "pending" as const },
      ];

      await db.insert(timelineStages).values(
        timelineStagesData.map(stage => ({
          applicationId: application.id,
          title: stage.title,
          description: stage.description,
          status: stage.status,
        }))
      );

      res.json({ application });
    } catch (error) {
      console.error("Create application error:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  app.get("/api/applications/tracker", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      let allApplications;
      
      if (req.session.userRole === "institution") {
        const institution = await db.query.institutions.findFirst({
          where: eq(institutions.userId, req.session.userId!),
        });
        
        if (!institution) {
          return res.status(404).json({ message: "Institution not found" });
        }
        
        allApplications = await db.query.applications.findMany({
          where: eq(applications.institutionId, institution.id),
          orderBy: [desc(applications.createdAt)],
        });
      } else {
        allApplications = await db.query.applications.findMany({
          orderBy: [desc(applications.createdAt)],
        });
      }

      const applicationsWithDetails = await Promise.all(
        allApplications.map(async (app) => {
          const appDocuments = await db.query.documents.findMany({
            where: eq(documents.applicationId, app.id),
          });

          const approvedDocs = appDocuments.filter(doc => doc.status === "approved").length;
          const rejectedDocs = appDocuments.filter(doc => doc.status === "rejected").length;
          const pendingDocs = appDocuments.filter(doc => doc.status === "pending").length;
          const totalDocs = appDocuments.length;
          const evaluationProgress = totalDocs > 0 
            ? Math.round(((approvedDocs + rejectedDocs) / totalDocs) * 100)
            : 0;

          return {
            ...app,
            documents: appDocuments,
            approvedDocs,
            rejectedDocs,
            pendingDocs,
            evaluationProgress,
          };
        })
      );

      res.json(applicationsWithDetails);
    } catch (error) {
      console.error("Get tracker error:", error);
      res.status(500).json({ message: "Failed to fetch tracker data" });
    }
  });

  app.get("/api/applications/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const application = await db.query.applications.findFirst({
        where: eq(applications.applicationNumber, req.params.id),
      });

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const [appDocuments, appMessages, appTimeline] = await Promise.all([
        db.query.documents.findMany({
          where: eq(documents.applicationId, application.id),
        }),
        db.select({
          id: messages.id,
          content: messages.content,
          createdAt: messages.createdAt,
          senderName: users.name,
          senderRole: users.role,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.applicationId, application.id))
        .orderBy(messages.createdAt),
        db.query.timelineStages.findMany({
          where: eq(timelineStages.applicationId, application.id),
          orderBy: [timelineStages.createdAt],
        }),
      ]);

      res.json({
        application,
        documents: appDocuments,
        messages: appMessages,
        timeline: appTimeline,
      });
    } catch (error) {
      console.error("Get application error:", error);
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  app.put("/api/applications/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const application = await db.query.applications.findFirst({
        where: eq(applications.applicationNumber, req.params.id),
      });

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const institution = await db.query.institutions.findFirst({
        where: eq(institutions.userId, req.session.userId!),
      });

      if (req.session.userRole === "institution" && application.institutionId !== institution?.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validationResult = updateApplicationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: fromZodError(validationResult.error).message });
      }

      const [updated] = await db
        .update(applications)
        .set({
          ...validationResult.data,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, application.id))
        .returning();

      res.json({ application: updated });
    } catch (error) {
      console.error("Update application error:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  app.put("/api/admin/applications/:id/status", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const validationResult = updateApplicationStatusSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: fromZodError(validationResult.error).message });
      }

      const application = await db.query.applications.findFirst({
        where: eq(applications.applicationNumber, req.params.id),
      });

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const [updated] = await db
        .update(applications)
        .set({
          status: validationResult.data.status,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, application.id))
        .returning();

      res.json({ application: updated });
    } catch (error) {
      console.error("Update application status error:", error);
      res.status(500).json({ message: "Failed to update application status" });
    }
  });

  app.post("/api/applications/:id/submit", requireAuth, requireRole("institution"), async (req: AuthRequest, res: Response) => {
    try {
      const application = await db.query.applications.findFirst({
        where: eq(applications.applicationNumber, req.params.id),
      });

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const [updated] = await db
        .update(applications)
        .set({
          status: "submitted",
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(applications.id, application.id))
        .returning();

      await db
        .update(timelineStages)
        .set({ status: "completed", completedAt: new Date() })
        .where(and(
          eq(timelineStages.applicationId, application.id),
          eq(timelineStages.title, "Application Submitted")
        ));

      await db
        .update(timelineStages)
        .set({ status: "current" })
        .where(and(
          eq(timelineStages.applicationId, application.id),
          eq(timelineStages.title, "Initial Scrutiny")
        ));

      res.json({ application: updated });
    } catch (error) {
      console.error("Submit application error:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  app.post("/api/messages", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const validationResult = sendMessageSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: fromZodError(validationResult.error).message });
      }

      const { applicationId, content } = validationResult.data;

      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const userRole = req.session.userRole;
      const userId = req.session.userId!;

      if (userRole === "institution") {
        const institution = await db.query.institutions.findFirst({
          where: eq(institutions.userId, userId),
        });

        if (!institution || institution.id !== application.institutionId) {
          return res.status(403).json({ message: "Access denied to send messages for this application" });
        }
      } else if (userRole === "evaluator") {
        const assignment = await db.query.evaluatorAssignments.findFirst({
          where: and(
            eq(evaluatorAssignments.applicationId, applicationId),
            eq(evaluatorAssignments.evaluatorId, userId)
          ),
        });

        if (!assignment) {
          return res.status(403).json({ message: "Access denied to send messages for this application" });
        }
      }

      const [message] = await db
        .insert(messages)
        .values({
          applicationId,
          senderId: userId,
          content,
        })
        .returning();

      res.json({ message });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.post("/api/admin/assign-evaluator", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const validationResult = assignEvaluatorSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: fromZodError(validationResult.error).message });
      }

      const { applicationId, evaluatorId, priority, deadline } = validationResult.data;

      const [assignment] = await db
        .insert(evaluatorAssignments)
        .values({
          applicationId,
          evaluatorId,
          priority: priority || "medium",
          deadline: deadline ? new Date(deadline) : null,
        })
        .returning();

      await db
        .update(applications)
        .set({ status: "under_evaluation", updatedAt: new Date() })
        .where(eq(applications.id, applicationId));

      res.json({ assignment });
    } catch (error) {
      console.error("Assign evaluator error:", error);
      res.status(500).json({ message: "Failed to assign evaluator" });
    }
  });

  app.get("/api/admin/applications", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const allApplications = await db.query.applications.findMany({
        orderBy: [desc(applications.createdAt)],
      });

      res.json({ applications: allApplications });
    } catch (error) {
      console.error("Get all applications error:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post("/api/evaluations", requireAuth, requireRole("evaluator"), async (req: AuthRequest, res: Response) => {
    try {
      const validationResult = submitEvaluationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: fromZodError(validationResult.error).message });
      }

      const { assignmentId, applicationId, score, comments, recommendation, siteVisitNotes } = validationResult.data;

      const [evaluation] = await db
        .insert(evaluations)
        .values({
          assignmentId,
          applicationId,
          evaluatorId: req.session.userId!,
          score,
          comments,
          recommendation,
          siteVisitNotes,
        })
        .returning();

      await db
        .update(evaluatorAssignments)
        .set({ completedAt: new Date() })
        .where(eq(evaluatorAssignments.id, assignmentId));

      res.json({ evaluation });
    } catch (error) {
      console.error("Submit evaluation error:", error);
      res.status(500).json({ message: "Failed to submit evaluation" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
