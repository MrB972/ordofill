import {
  type Profile,
  type InsertProfile,
  type Patient,
  type InsertPatient,
  type FormTemplate,
  type InsertFormTemplate,
  type FilledForm,
  type InsertFilledForm,
  type FieldCorrection,
  type InsertFieldCorrection,
  type SmartSuggestion,
  type InsertSmartSuggestion,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Profiles
  getProfile(id: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  getAllProfiles(): Promise<Profile[]>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, data: Partial<InsertProfile>): Promise<Profile | undefined>;

  // Patients
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientsByUser(userId: string): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, data: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<boolean>;

  // Form Templates
  getFormTemplate(id: string): Promise<FormTemplate | undefined>;
  getFormTemplatesByUser(userId: string): Promise<FormTemplate[]>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: string, data: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined>;

  // Filled Forms
  getFilledForm(id: string): Promise<FilledForm | undefined>;
  getFilledFormsByUser(userId: string): Promise<FilledForm[]>;
  createFilledForm(form: InsertFilledForm): Promise<FilledForm>;
  updateFilledForm(id: string, data: Partial<InsertFilledForm>): Promise<FilledForm | undefined>;

  // Field Corrections
  getFieldCorrection(id: string): Promise<FieldCorrection | undefined>;
  createFieldCorrection(correction: InsertFieldCorrection): Promise<FieldCorrection>;

  // Smart Suggestions
  getSuggestionsByTemplate(templateId: string): Promise<SmartSuggestion[]>;
  createSmartSuggestion(suggestion: InsertSmartSuggestion): Promise<SmartSuggestion>;
}

export class MemStorage implements IStorage {
  private profiles: Map<string, Profile>;
  private patients: Map<string, Patient>;
  private formTemplates: Map<string, FormTemplate>;
  private filledForms: Map<string, FilledForm>;
  private fieldCorrections: Map<string, FieldCorrection>;
  private smartSuggestions: Map<string, SmartSuggestion>;

  constructor() {
    this.profiles = new Map();
    this.patients = new Map();
    this.formTemplates = new Map();
    this.filledForms = new Map();
    this.fieldCorrections = new Map();
    this.smartSuggestions = new Map();

    this.seed();
  }

  // --- Profiles ---

  async getProfile(id: string): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find((p) => p.email === email);
  }

  async getAllProfiles(): Promise<Profile[]> {
    return Array.from(this.profiles.values());
  }

  async createProfile(data: InsertProfile): Promise<Profile> {
    const id = randomUUID();
    const now = new Date();
    const profile: Profile = {
      id,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone ?? null,
      cabinetName: data.cabinetName ?? null,
      cabinetAddress: data.cabinetAddress ?? null,
      numeroRpps: data.numeroRpps ?? null,
      numeroAdeli: data.numeroAdeli ?? null,
      signatureUrl: data.signatureUrl ?? null,
      onboardingCompleted: data.onboardingCompleted ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.profiles.set(id, profile);
    return profile;
  }

  async updateProfile(id: string, data: Partial<InsertProfile>): Promise<Profile | undefined> {
    const existing = this.profiles.get(id);
    if (!existing) return undefined;
    const updated: Profile = { ...existing, ...data, id, updatedAt: new Date() };
    this.profiles.set(id, updated);
    return updated;
  }

  // --- Patients ---

  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async getPatientsByUser(userId: string): Promise<Patient[]> {
    return Array.from(this.patients.values()).filter((p) => p.userId === userId);
  }

  async createPatient(data: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const now = new Date();
    const patient: Patient = {
      id,
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth ?? null,
      gender: data.gender ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      postalCode: data.postalCode ?? null,
      numeroSecuriteSociale: data.numeroSecuriteSociale ?? null,
      medecinTraitant: data.medecinTraitant ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(id: string, data: Partial<InsertPatient>): Promise<Patient | undefined> {
    const existing = this.patients.get(id);
    if (!existing) return undefined;
    const updated: Patient = { ...existing, ...data, id, updatedAt: new Date() };
    this.patients.set(id, updated);
    return updated;
  }

  async deletePatient(id: string): Promise<boolean> {
    return this.patients.delete(id);
  }

  // --- Form Templates ---

  async getFormTemplate(id: string): Promise<FormTemplate | undefined> {
    return this.formTemplates.get(id);
  }

  async getFormTemplatesByUser(userId: string): Promise<FormTemplate[]> {
    return Array.from(this.formTemplates.values()).filter((t) => t.userId === userId);
  }

  async createFormTemplate(data: InsertFormTemplate): Promise<FormTemplate> {
    const id = randomUUID();
    const now = new Date();
    const template: FormTemplate = {
      id,
      userId: data.userId,
      name: data.name,
      description: data.description ?? null,
      originalFileUrl: data.originalFileUrl ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
      detectedFields: data.detectedFields ?? null,
      fieldMappings: data.fieldMappings ?? null,
      category: data.category ?? "Autre",
      isPublic: data.isPublic ?? false,
      uploadCount: data.uploadCount ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    this.formTemplates.set(id, template);
    return template;
  }

  async updateFormTemplate(id: string, data: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    const existing = this.formTemplates.get(id);
    if (!existing) return undefined;
    const updated: FormTemplate = { ...existing, ...data, id, updatedAt: new Date() };
    this.formTemplates.set(id, updated);
    return updated;
  }

  // --- Filled Forms ---

  async getFilledForm(id: string): Promise<FilledForm | undefined> {
    return this.filledForms.get(id);
  }

  async getFilledFormsByUser(userId: string): Promise<FilledForm[]> {
    return Array.from(this.filledForms.values()).filter((f) => f.userId === userId);
  }

  async createFilledForm(data: InsertFilledForm): Promise<FilledForm> {
    const id = randomUUID();
    const now = new Date();
    const form: FilledForm = {
      id,
      userId: data.userId,
      templateId: data.templateId,
      patientId: data.patientId,
      filledData: data.filledData ?? null,
      status: data.status ?? "draft",
      generatedPdfUrl: data.generatedPdfUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.filledForms.set(id, form);
    return form;
  }

  async updateFilledForm(id: string, data: Partial<InsertFilledForm>): Promise<FilledForm | undefined> {
    const existing = this.filledForms.get(id);
    if (!existing) return undefined;
    const updated: FilledForm = { ...existing, ...data, id, updatedAt: new Date() };
    this.filledForms.set(id, updated);
    return updated;
  }

  // --- Field Corrections ---

  async getFieldCorrection(id: string): Promise<FieldCorrection | undefined> {
    return this.fieldCorrections.get(id);
  }

  async createFieldCorrection(data: InsertFieldCorrection): Promise<FieldCorrection> {
    const id = randomUUID();
    const correction: FieldCorrection = {
      id,
      userId: data.userId,
      templateId: data.templateId,
      fieldName: data.fieldName,
      originalMapping: data.originalMapping ?? null,
      correctedMapping: data.correctedMapping ?? null,
      correctionType: data.correctionType,
      createdAt: new Date(),
    };
    this.fieldCorrections.set(id, correction);
    return correction;
  }

  // --- Smart Suggestions ---

  async getSuggestionsByTemplate(templateId: string): Promise<SmartSuggestion[]> {
    return Array.from(this.smartSuggestions.values()).filter((s) => s.templateId === templateId);
  }

  async createSmartSuggestion(data: InsertSmartSuggestion): Promise<SmartSuggestion> {
    const id = randomUUID();
    const suggestion: SmartSuggestion = {
      id,
      userId: data.userId,
      templateId: data.templateId,
      fieldName: data.fieldName,
      suggestedValue: data.suggestedValue,
      frequency: data.frequency ?? 1,
      lastUsedAt: data.lastUsedAt ?? new Date(),
    };
    this.smartSuggestions.set(id, suggestion);
    return suggestion;
  }

  // --- Seed Mock Data ---

  private seed() {
    const now = new Date();

    // Profile
    const profileId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    this.profiles.set(profileId, {
      id: profileId,
      fullName: "Marie Dupont",
      email: "marie@cabinet-dupont.fr",
      phone: "06 12 34 56 78",
      cabinetName: "Cabinet Infirmier Dupont",
      cabinetAddress: "15 Rue de la Sant\u00e9, 75013 Paris",
      numeroRpps: "12345678901",
      numeroAdeli: "123456789",
      signatureUrl: null,
      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now,
    });

    // Form Templates — only Cerballiance
    const templateId = "c1000001-0000-0000-0000-000000000005";

    const templatesData: Omit<FormTemplate, "createdAt" | "updatedAt">[] = [
      {
        id: templateId,
        userId: profileId,
        name: "Fiche de transmission Cerballiance",
        description: "Fiche de transmission de prelevements sanguins \u2014 MAR FO 023. V4. Formulaire officiel du reseau Cerballiance Martinique.",
        originalFileUrl: null,
        thumbnailUrl: null,
        category: "Laboratoire",
        isPublic: false,
        uploadCount: 0,
        fieldMappings: { type: "cerballiance_labo", route: "/fiche-labo" },
        detectedFields: [
          { name: "nom_usuel", type: "text", label: "Nom usuel", x: 30, y: 18, width: 25, height: 3, page: 0 },
          { name: "prenoms", type: "text", label: "Prenoms", x: 58, y: 18, width: 25, height: 3, page: 0 },
          { name: "date_naissance", type: "date", label: "Date de naissance", x: 30, y: 21, width: 15, height: 3, page: 0 },
          { name: "adresse", type: "text", label: "Adresse", x: 30, y: 24, width: 50, height: 3, page: 0 },
          { name: "sexe", type: "checkbox", label: "Sexe H/F", x: 82, y: 18, width: 10, height: 3, page: 0 },
          { name: "telephone", type: "text", label: "Telephone", x: 82, y: 21, width: 15, height: 3, page: 0 },
          { name: "numero_secu", type: "text", label: "N\u00b0 Securite Sociale", x: 30, y: 27, width: 30, height: 3, page: 0 },
          { name: "medecin_traitant", type: "text", label: "Medecin traitant", x: 55, y: 9, width: 25, height: 3, page: 0 },
          { name: "prescripteur", type: "text", label: "Prescripteur", x: 30, y: 9, width: 25, height: 3, page: 0 },
          { name: "etablissement", type: "text", label: "Etablissement de soins", x: 5, y: 9, width: 25, height: 3, page: 0 },
        ],
      },
    ];

    for (const t of templatesData) {
      this.formTemplates.set(t.id, { ...t, createdAt: now, updatedAt: now });
    }

    // No filled forms seed data

    // No smart suggestions seed data
  }
}

export const storage = new MemStorage();
