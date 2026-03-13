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
      cabinetAddress: "15 Rue de la Santé, 75013 Paris",
      numeroRpps: "12345678901",
      numeroAdeli: "123456789",
      signatureUrl: null,
      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now,
    });

    // Patients
    const patientIds = [
      "b1000001-0000-0000-0000-000000000001",
      "b1000001-0000-0000-0000-000000000002",
      "b1000001-0000-0000-0000-000000000003",
      "b1000001-0000-0000-0000-000000000004",
      "b1000001-0000-0000-0000-000000000005",
    ];

    const patientsData: Omit<Patient, "createdAt" | "updatedAt">[] = [
      {
        id: patientIds[0],
        userId: profileId,
        firstName: "Jean",
        lastName: "Martin",
        dateOfBirth: "1985-03-15",
        gender: "M",
        address: "12 Rue de Rivoli",
        city: "Paris",
        postalCode: "75001",
        numeroSecuriteSociale: "1 85 03 75 123 456 78",
        medecinTraitant: "Dr. Bernard",
        phone: "06 11 22 33 44",
        email: "jean.martin@email.fr",
        notes: null,
      },
      {
        id: patientIds[1],
        userId: profileId,
        firstName: "Sophie",
        lastName: "Leclerc",
        dateOfBirth: "1972-07-22",
        gender: "F",
        address: "8 Avenue des Champs-Elysees",
        city: "Paris",
        postalCode: "75008",
        numeroSecuriteSociale: "2 72 07 75 234 567 89",
        medecinTraitant: "Dr. Moreau",
        phone: "06 22 33 44 55",
        email: "sophie.leclerc@email.fr",
        notes: "Allergie penicilline",
      },
      {
        id: patientIds[2],
        userId: profileId,
        firstName: "Pierre",
        lastName: "Dubois",
        dateOfBirth: "1990-11-08",
        gender: "M",
        address: "45 Boulevard Saint-Germain",
        city: "Paris",
        postalCode: "75005",
        numeroSecuriteSociale: "1 90 11 75 345 678 90",
        medecinTraitant: "Dr. Petit",
        phone: "06 33 44 55 66",
        email: "pierre.dubois@email.fr",
        notes: null,
      },
      {
        id: patientIds[3],
        userId: profileId,
        firstName: "Isabelle",
        lastName: "Moreau",
        dateOfBirth: "1968-01-30",
        gender: "F",
        address: "23 Rue du Faubourg Saint-Antoine",
        city: "Paris",
        postalCode: "75011",
        numeroSecuriteSociale: "2 68 01 75 456 789 01",
        medecinTraitant: "Dr. Leroy",
        phone: "06 44 55 66 77",
        email: "isabelle.moreau@email.fr",
        notes: "Diabete type 2",
      },
      {
        id: patientIds[4],
        userId: profileId,
        firstName: "Lucas",
        lastName: "Roux",
        dateOfBirth: "1995-06-12",
        gender: "M",
        address: "7 Place de la Bastille",
        city: "Paris",
        postalCode: "75004",
        numeroSecuriteSociale: "1 95 06 75 567 890 12",
        medecinTraitant: "Dr. Simon",
        phone: "06 55 66 77 88",
        email: "lucas.roux@email.fr",
        notes: null,
      },
    ];

    for (const p of patientsData) {
      this.patients.set(p.id, { ...p, createdAt: now, updatedAt: now });
    }

    // Form Templates
    const templateIds = [
      "c1000001-0000-0000-0000-000000000001",
      "c1000001-0000-0000-0000-000000000002",
      "c1000001-0000-0000-0000-000000000003",
      "c1000001-0000-0000-0000-000000000004",
    ];

    const templatesData: Omit<FormTemplate, "createdAt" | "updatedAt">[] = [
      {
        id: templateIds[0],
        userId: profileId,
        name: "Feuille de soins CPAM",
        description: "Formulaire standard de feuille de soins pour remboursement CPAM",
        originalFileUrl: null,
        thumbnailUrl: null,
        category: "CPAM",
        isPublic: false,
        uploadCount: 24,
        fieldMappings: null,
        detectedFields: [
          { name: "nom_patient", type: "text", label: "Nom du patient", x: 50, y: 120, width: 200, height: 30, page: 0 },
          { name: "prenom_patient", type: "text", label: "Prenom du patient", x: 260, y: 120, width: 200, height: 30, page: 0 },
          { name: "numero_secu", type: "text", label: "N° Securite Sociale", x: 50, y: 170, width: 300, height: 30, page: 0 },
          { name: "date_soins", type: "date", label: "Date des soins", x: 50, y: 220, width: 150, height: 30, page: 0 },
          { name: "code_acte", type: "text", label: "Code acte", x: 50, y: 270, width: 100, height: 30, page: 0 },
          { name: "montant", type: "number", label: "Montant", x: 200, y: 270, width: 100, height: 30, page: 0 },
          { name: "signature_praticien", type: "signature", label: "Signature du praticien", x: 50, y: 350, width: 200, height: 60, page: 0 },
        ],
      },
      {
        id: templateIds[1],
        userId: profileId,
        name: "Demande d'entente prealable",
        description: "Formulaire de demande d'entente prealable pour actes speciaux",
        originalFileUrl: null,
        thumbnailUrl: null,
        category: "Mutuelle",
        isPublic: false,
        uploadCount: 12,
        fieldMappings: null,
        detectedFields: [
          { name: "nom_assure", type: "text", label: "Nom de l'assure", x: 50, y: 100, width: 200, height: 30, page: 0 },
          { name: "prenom_assure", type: "text", label: "Prenom de l'assure", x: 260, y: 100, width: 200, height: 30, page: 0 },
          { name: "numero_adherent", type: "text", label: "N° Adherent", x: 50, y: 150, width: 250, height: 30, page: 0 },
          { name: "date_demande", type: "date", label: "Date de la demande", x: 50, y: 200, width: 150, height: 30, page: 0 },
          { name: "motif", type: "text", label: "Motif de la demande", x: 50, y: 250, width: 400, height: 60, page: 0 },
          { name: "accord_mutuelle", type: "checkbox", label: "Accord mutuelle", x: 50, y: 330, width: 20, height: 20, page: 0 },
          { name: "signature_medecin", type: "signature", label: "Signature du medecin", x: 50, y: 370, width: 200, height: 60, page: 0 },
          { name: "date_signature", type: "date", label: "Date de signature", x: 270, y: 370, width: 150, height: 30, page: 0 },
        ],
      },
      {
        id: templateIds[2],
        userId: profileId,
        name: "Ordonnance de soins infirmiers",
        description: "Ordonnance pour prescription de soins infirmiers a domicile",
        originalFileUrl: null,
        thumbnailUrl: null,
        category: "Prescription",
        isPublic: false,
        uploadCount: 36,
        fieldMappings: null,
        detectedFields: [
          { name: "nom_patient", type: "text", label: "Nom du patient", x: 50, y: 110, width: 200, height: 30, page: 0 },
          { name: "prenom_patient", type: "text", label: "Prenom du patient", x: 260, y: 110, width: 200, height: 30, page: 0 },
          { name: "date_naissance", type: "date", label: "Date de naissance", x: 50, y: 160, width: 150, height: 30, page: 0 },
          { name: "soins_prescrits", type: "text", label: "Soins prescrits", x: 50, y: 210, width: 400, height: 80, page: 0 },
          { name: "frequence", type: "text", label: "Frequence", x: 50, y: 310, width: 200, height: 30, page: 0 },
          { name: "duree_traitement", type: "text", label: "Duree du traitement", x: 260, y: 310, width: 200, height: 30, page: 0 },
          { name: "signature_prescripteur", type: "signature", label: "Signature du prescripteur", x: 50, y: 380, width: 200, height: 60, page: 0 },
        ],
      },
      {
        id: templateIds[3],
        userId: profileId,
        name: "Bon de transport",
        description: "Bon de transport sanitaire pour deplacement medical",
        originalFileUrl: null,
        thumbnailUrl: null,
        category: "Autre",
        isPublic: false,
        uploadCount: 8,
        fieldMappings: null,
        detectedFields: [
          { name: "nom_patient", type: "text", label: "Nom du patient", x: 50, y: 100, width: 200, height: 30, page: 0 },
          { name: "prenom_patient", type: "text", label: "Prenom du patient", x: 260, y: 100, width: 200, height: 30, page: 0 },
          { name: "adresse_depart", type: "text", label: "Adresse de depart", x: 50, y: 150, width: 400, height: 30, page: 0 },
          { name: "adresse_arrivee", type: "text", label: "Adresse d'arrivee", x: 50, y: 200, width: 400, height: 30, page: 0 },
          { name: "date_transport", type: "date", label: "Date du transport", x: 50, y: 250, width: 150, height: 30, page: 0 },
          { name: "motif_transport", type: "text", label: "Motif du transport", x: 50, y: 300, width: 400, height: 60, page: 0 },
        ],
      },
    ];

    for (const t of templatesData) {
      this.formTemplates.set(t.id, { ...t, createdAt: now, updatedAt: now });
    }

    // Filled Forms (8 total: 2 draft, 4 completed, 2 downloaded)
    const filledFormsData: Omit<FilledForm, "createdAt" | "updatedAt">[] = [
      {
        id: "d1000001-0000-0000-0000-000000000001",
        userId: profileId,
        templateId: templateIds[0],
        patientId: patientIds[0],
        status: "completed",
        generatedPdfUrl: null,
        filledData: { nom_patient: "Martin", prenom_patient: "Jean", numero_secu: "1 85 03 75 123 456 78", date_soins: "2026-03-10", code_acte: "AMI 4", montant: "12.60" },
      },
      {
        id: "d1000001-0000-0000-0000-000000000002",
        userId: profileId,
        templateId: templateIds[0],
        patientId: patientIds[1],
        status: "completed",
        generatedPdfUrl: null,
        filledData: { nom_patient: "Leclerc", prenom_patient: "Sophie", numero_secu: "2 72 07 75 234 567 89", date_soins: "2026-03-11", code_acte: "AMI 3", montant: "9.45" },
      },
      {
        id: "d1000001-0000-0000-0000-000000000003",
        userId: profileId,
        templateId: templateIds[1],
        patientId: patientIds[2],
        status: "draft",
        generatedPdfUrl: null,
        filledData: { nom_assure: "Dubois", prenom_assure: "Pierre", numero_adherent: "ADH-2024-003" },
      },
      {
        id: "d1000001-0000-0000-0000-000000000004",
        userId: profileId,
        templateId: templateIds[2],
        patientId: patientIds[0],
        status: "completed",
        generatedPdfUrl: null,
        filledData: { nom_patient: "Martin", prenom_patient: "Jean", date_naissance: "1985-03-15", soins_prescrits: "Injection insuline quotidienne", frequence: "1x/jour", duree_traitement: "3 mois" },
      },
      {
        id: "d1000001-0000-0000-0000-000000000005",
        userId: profileId,
        templateId: templateIds[2],
        patientId: patientIds[3],
        status: "downloaded",
        generatedPdfUrl: "/generated/ordonnance-moreau.pdf",
        filledData: { nom_patient: "Moreau", prenom_patient: "Isabelle", date_naissance: "1968-01-30", soins_prescrits: "Pansement plaie chronique", frequence: "3x/semaine", duree_traitement: "6 semaines" },
      },
      {
        id: "d1000001-0000-0000-0000-000000000006",
        userId: profileId,
        templateId: templateIds[3],
        patientId: patientIds[4],
        status: "completed",
        generatedPdfUrl: null,
        filledData: { nom_patient: "Roux", prenom_patient: "Lucas", adresse_depart: "7 Place de la Bastille, 75004 Paris", adresse_arrivee: "Hopital Saint-Antoine, 75012 Paris", date_transport: "2026-03-12", motif_transport: "Consultation specialiste" },
      },
      {
        id: "d1000001-0000-0000-0000-000000000007",
        userId: profileId,
        templateId: templateIds[0],
        patientId: patientIds[3],
        status: "draft",
        generatedPdfUrl: null,
        filledData: { nom_patient: "Moreau", prenom_patient: "Isabelle" },
      },
      {
        id: "d1000001-0000-0000-0000-000000000008",
        userId: profileId,
        templateId: templateIds[1],
        patientId: patientIds[1],
        status: "downloaded",
        generatedPdfUrl: "/generated/entente-leclerc.pdf",
        filledData: { nom_assure: "Leclerc", prenom_assure: "Sophie", numero_adherent: "ADH-2024-008", date_demande: "2026-03-08", motif: "Soins infirmiers prolonges" },
      },
    ];

    for (const f of filledFormsData) {
      this.filledForms.set(f.id, { ...f, createdAt: now, updatedAt: now });
    }

    // Smart Suggestions
    const suggestionsData: SmartSuggestion[] = [
      {
        id: "e1000001-0000-0000-0000-000000000001",
        userId: profileId,
        templateId: templateIds[0],
        fieldName: "code_acte",
        suggestedValue: "AMI 4",
        frequency: 15,
        lastUsedAt: now,
      },
      {
        id: "e1000001-0000-0000-0000-000000000002",
        userId: profileId,
        templateId: templateIds[0],
        fieldName: "code_acte",
        suggestedValue: "AMI 3",
        frequency: 8,
        lastUsedAt: now,
      },
      {
        id: "e1000001-0000-0000-0000-000000000003",
        userId: profileId,
        templateId: templateIds[2],
        fieldName: "frequence",
        suggestedValue: "1x/jour",
        frequency: 10,
        lastUsedAt: now,
      },
      {
        id: "e1000001-0000-0000-0000-000000000004",
        userId: profileId,
        templateId: templateIds[2],
        fieldName: "frequence",
        suggestedValue: "3x/semaine",
        frequency: 6,
        lastUsedAt: now,
      },
    ];

    for (const s of suggestionsData) {
      this.smartSuggestions.set(s.id, s);
    }
  }
}

export const storage = new MemStorage();
