import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import type { Profile } from "@shared/schema";

async function getCurrentUser(): Promise<Profile | undefined> {
  const all = await storage.getAllProfiles();
  return all[0];
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // --- Auth ---

  app.get("/api/auth/me", async (_req, res) => {
    try {
      const profile = await getCurrentUser();
      if (!profile) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      return res.json(profile);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const profile = await storage.getProfileByEmail(email);
      if (!profile) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      return res.json(profile);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName } = req.body;
      if (!email || !fullName) {
        return res.status(400).json({ message: "Email and fullName are required" });
      }
      const existing = await storage.getProfileByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }
      const profile = await storage.createProfile({
        email,
        fullName,
        onboardingCompleted: false,
      });
      return res.status(201).json(profile);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Profiles ---

  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const profile = await storage.getProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      return res.json(profile);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/profiles/:id", async (req, res) => {
    try {
      const profile = await storage.updateProfile(req.params.id, req.body);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      return res.json(profile);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Patients ---

  app.get("/api/patients", async (_req, res) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return res.json([]);
      }
      const patients = await storage.getPatientsByUser(user.id);
      return res.json(patients);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      return res.json(patient);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const patient = await storage.createPatient({
        ...req.body,
        userId: user.id,
      });
      return res.status(201).json(patient);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/patients/:id", async (req, res) => {
    try {
      const patient = await storage.updatePatient(req.params.id, req.body);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      return res.json(patient);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/patients/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePatient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Patient not found" });
      }
      return res.json({ message: "Patient deleted" });
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Templates ---

  app.get("/api/templates", async (_req, res) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return res.json([]);
      }
      const templates = await storage.getFormTemplatesByUser(user.id);
      return res.json(templates);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getFormTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      return res.json(template);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const template = await storage.createFormTemplate({
        ...req.body,
        userId: user.id,
      });
      return res.status(201).json(template);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.updateFormTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      return res.json(template);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Filled Forms ---

  app.get("/api/filled-forms", async (_req, res) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return res.json([]);
      }
      const forms = await storage.getFilledFormsByUser(user.id);
      return res.json(forms);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/filled-forms/:id", async (req, res) => {
    try {
      const form = await storage.getFilledForm(req.params.id);
      if (!form) {
        return res.status(404).json({ message: "Filled form not found" });
      }
      return res.json(form);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/filled-forms", async (req, res) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const form = await storage.createFilledForm({
        ...req.body,
        userId: user.id,
      });
      return res.status(201).json(form);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/filled-forms/:id", async (req, res) => {
    try {
      const form = await storage.updateFilledForm(req.params.id, req.body);
      if (!form) {
        return res.status(404).json({ message: "Filled form not found" });
      }
      return res.json(form);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Suggestions ---

  app.get("/api/suggestions/:templateId", async (req, res) => {
    try {
      const suggestions = await storage.getSuggestionsByTemplate(req.params.templateId);
      return res.json(suggestions);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Field Corrections ---

  app.post("/api/corrections", async (req, res) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const correction = await storage.createFieldCorrection({
        ...req.body,
        userId: user.id,
      });
      return res.status(201).json(correction);
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Stats ---

  app.get("/api/stats", async (_req, res) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return res.json({ templateCount: 0, filledThisMonth: 0, patientCount: 0, timeSaved: "0m" });
      }

      const templates = await storage.getFormTemplatesByUser(user.id);
      const filledForms = await storage.getFilledFormsByUser(user.id);
      const patients = await storage.getPatientsByUser(user.id);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const filledThisMonth = filledForms.filter(
        (f) => f.createdAt && new Date(f.createdAt) >= startOfMonth
      ).length;

      const totalMinutes = filledForms.length * 5;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const timeSaved = hours > 0 ? `${hours}h${minutes > 0 ? `${minutes}m` : ""}` : `${minutes}m`;

      return res.json({
        templateCount: templates.length,
        filledThisMonth,
        patientCount: patients.length,
        timeSaved,
      });
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
