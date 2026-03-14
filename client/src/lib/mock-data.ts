// Client-side mock data — replaces the Express backend for static deployment

const now = new Date().toISOString();

const profileId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const patientIds = [
  "b1000001-0000-0000-0000-000000000001",
  "b1000001-0000-0000-0000-000000000002",
  "b1000001-0000-0000-0000-000000000003",
  "b1000001-0000-0000-0000-000000000004",
  "b1000001-0000-0000-0000-000000000005",
];

const templateIds = [
  "c1000001-0000-0000-0000-000000000001",
  "c1000001-0000-0000-0000-000000000002",
  "c1000001-0000-0000-0000-000000000003",
  "c1000001-0000-0000-0000-000000000004",
];

export const mockProfile = {
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
};

export const mockPatients = [
  {
    id: patientIds[0], userId: profileId, firstName: "Jean", lastName: "Martin",
    dateOfBirth: "1985-03-15", gender: "M", address: "12 Rue de Rivoli", city: "Paris",
    postalCode: "75001", numeroSecuriteSociale: "1 85 03 75 123 456 78",
    medecinTraitant: "Dr. Bernard", phone: "06 11 22 33 44", email: "jean.martin@email.fr",
    notes: null, createdAt: now, updatedAt: now,
  },
  {
    id: patientIds[1], userId: profileId, firstName: "Sophie", lastName: "Leclerc",
    dateOfBirth: "1972-07-22", gender: "F", address: "8 Avenue des Champs-Elysees", city: "Paris",
    postalCode: "75008", numeroSecuriteSociale: "2 72 07 75 234 567 89",
    medecinTraitant: "Dr. Moreau", phone: "06 22 33 44 55", email: "sophie.leclerc@email.fr",
    notes: "Allergie penicilline", createdAt: now, updatedAt: now,
  },
  {
    id: patientIds[2], userId: profileId, firstName: "Pierre", lastName: "Dubois",
    dateOfBirth: "1990-11-08", gender: "M", address: "45 Boulevard Saint-Germain", city: "Paris",
    postalCode: "75005", numeroSecuriteSociale: "1 90 11 75 345 678 90",
    medecinTraitant: "Dr. Petit", phone: "06 33 44 55 66", email: "pierre.dubois@email.fr",
    notes: null, createdAt: now, updatedAt: now,
  },
  {
    id: patientIds[3], userId: profileId, firstName: "Isabelle", lastName: "Moreau",
    dateOfBirth: "1968-01-30", gender: "F", address: "23 Rue du Faubourg Saint-Antoine", city: "Paris",
    postalCode: "75011", numeroSecuriteSociale: "2 68 01 75 456 789 01",
    medecinTraitant: "Dr. Leroy", phone: "06 44 55 66 77", email: "isabelle.moreau@email.fr",
    notes: "Diabete type 2", createdAt: now, updatedAt: now,
  },
  {
    id: patientIds[4], userId: profileId, firstName: "Lucas", lastName: "Roux",
    dateOfBirth: "1995-06-12", gender: "M", address: "7 Place de la Bastille", city: "Paris",
    postalCode: "75004", numeroSecuriteSociale: "1 95 06 75 567 890 12",
    medecinTraitant: "Dr. Simon", phone: "06 55 66 77 88", email: "lucas.roux@email.fr",
    notes: null, createdAt: now, updatedAt: now,
  },
];

export const mockTemplates = [
  {
    id: templateIds[0], userId: profileId, name: "Feuille de soins CPAM",
    description: "Formulaire standard de feuille de soins pour remboursement CPAM",
    originalFileUrl: null, thumbnailUrl: null, category: "CPAM", isPublic: false, uploadCount: 24,
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
    createdAt: now, updatedAt: now,
  },
  {
    id: templateIds[1], userId: profileId, name: "Demande d'entente prealable",
    description: "Formulaire de demande d'entente prealable pour actes speciaux",
    originalFileUrl: null, thumbnailUrl: null, category: "Mutuelle", isPublic: false, uploadCount: 12,
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
    createdAt: now, updatedAt: now,
  },
  {
    id: templateIds[2], userId: profileId, name: "Ordonnance de soins infirmiers",
    description: "Ordonnance pour prescription de soins infirmiers a domicile",
    originalFileUrl: null, thumbnailUrl: null, category: "Prescription", isPublic: false, uploadCount: 36,
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
    createdAt: now, updatedAt: now,
  },
  {
    id: templateIds[3], userId: profileId, name: "Bon de transport",
    description: "Bon de transport sanitaire pour deplacement medical",
    originalFileUrl: null, thumbnailUrl: null, category: "Autre", isPublic: false, uploadCount: 8,
    fieldMappings: null,
    detectedFields: [
      { name: "nom_patient", type: "text", label: "Nom du patient", x: 50, y: 100, width: 200, height: 30, page: 0 },
      { name: "prenom_patient", type: "text", label: "Prenom du patient", x: 260, y: 100, width: 200, height: 30, page: 0 },
      { name: "adresse_depart", type: "text", label: "Adresse de depart", x: 50, y: 150, width: 400, height: 30, page: 0 },
      { name: "adresse_arrivee", type: "text", label: "Adresse d'arrivee", x: 50, y: 200, width: 400, height: 30, page: 0 },
      { name: "date_transport", type: "date", label: "Date du transport", x: 50, y: 250, width: 150, height: 30, page: 0 },
      { name: "motif_transport", type: "text", label: "Motif du transport", x: 50, y: 300, width: 400, height: 60, page: 0 },
    ],
    createdAt: now, updatedAt: now,
  },
];

export const mockFilledForms = [
  {
    id: "d1000001-0000-0000-0000-000000000001", userId: profileId,
    templateId: templateIds[0], patientId: patientIds[0], status: "completed",
    generatedPdfUrl: null,
    filledData: { nom_patient: "Martin", prenom_patient: "Jean", numero_secu: "1 85 03 75 123 456 78", date_soins: "2026-03-10", code_acte: "AMI 4", montant: "12.60" },
    createdAt: now, updatedAt: now,
  },
  {
    id: "d1000001-0000-0000-0000-000000000002", userId: profileId,
    templateId: templateIds[0], patientId: patientIds[1], status: "completed",
    generatedPdfUrl: null,
    filledData: { nom_patient: "Leclerc", prenom_patient: "Sophie", numero_secu: "2 72 07 75 234 567 89", date_soins: "2026-03-11", code_acte: "AMI 3", montant: "9.45" },
    createdAt: now, updatedAt: now,
  },
  {
    id: "d1000001-0000-0000-0000-000000000003", userId: profileId,
    templateId: templateIds[1], patientId: patientIds[2], status: "draft",
    generatedPdfUrl: null,
    filledData: { nom_assure: "Dubois", prenom_assure: "Pierre", numero_adherent: "ADH-2024-003" },
    createdAt: now, updatedAt: now,
  },
  {
    id: "d1000001-0000-0000-0000-000000000004", userId: profileId,
    templateId: templateIds[2], patientId: patientIds[0], status: "completed",
    generatedPdfUrl: null,
    filledData: { nom_patient: "Martin", prenom_patient: "Jean", date_naissance: "1985-03-15", soins_prescrits: "Injection insuline quotidienne", frequence: "1x/jour", duree_traitement: "3 mois" },
    createdAt: now, updatedAt: now,
  },
  {
    id: "d1000001-0000-0000-0000-000000000005", userId: profileId,
    templateId: templateIds[2], patientId: patientIds[3], status: "downloaded",
    generatedPdfUrl: "/generated/ordonnance-moreau.pdf",
    filledData: { nom_patient: "Moreau", prenom_patient: "Isabelle", date_naissance: "1968-01-30", soins_prescrits: "Pansement plaie chronique", frequence: "3x/semaine", duree_traitement: "6 semaines" },
    createdAt: now, updatedAt: now,
  },
  {
    id: "d1000001-0000-0000-0000-000000000006", userId: profileId,
    templateId: templateIds[3], patientId: patientIds[4], status: "completed",
    generatedPdfUrl: null,
    filledData: { nom_patient: "Roux", prenom_patient: "Lucas", adresse_depart: "7 Place de la Bastille, 75004 Paris", adresse_arrivee: "Hopital Saint-Antoine, 75012 Paris", date_transport: "2026-03-12", motif_transport: "Consultation specialiste" },
    createdAt: now, updatedAt: now,
  },
  {
    id: "d1000001-0000-0000-0000-000000000007", userId: profileId,
    templateId: templateIds[0], patientId: patientIds[3], status: "draft",
    generatedPdfUrl: null,
    filledData: { nom_patient: "Moreau", prenom_patient: "Isabelle" },
    createdAt: now, updatedAt: now,
  },
  {
    id: "d1000001-0000-0000-0000-000000000008", userId: profileId,
    templateId: templateIds[1], patientId: patientIds[1], status: "downloaded",
    generatedPdfUrl: "/generated/entente-leclerc.pdf",
    filledData: { nom_assure: "Leclerc", prenom_assure: "Sophie", numero_adherent: "ADH-2024-008", date_demande: "2026-03-08", motif: "Soins infirmiers prolonges" },
    createdAt: now, updatedAt: now,
  },
];

export const mockSuggestions = [
  { id: "e1000001-0000-0000-0000-000000000001", userId: profileId, templateId: templateIds[0], fieldName: "code_acte", suggestedValue: "AMI 4", frequency: 15, lastUsedAt: now },
  { id: "e1000001-0000-0000-0000-000000000002", userId: profileId, templateId: templateIds[0], fieldName: "code_acte", suggestedValue: "AMI 3", frequency: 8, lastUsedAt: now },
  { id: "e1000001-0000-0000-0000-000000000003", userId: profileId, templateId: templateIds[2], fieldName: "frequence", suggestedValue: "1x/jour", frequency: 10, lastUsedAt: now },
  { id: "e1000001-0000-0000-0000-000000000004", userId: profileId, templateId: templateIds[2], fieldName: "frequence", suggestedValue: "3x/semaine", frequency: 6, lastUsedAt: now },
];

// Simple UUID generator for the browser
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Mutable state for the session
let currentProfile = { ...mockProfile };
let patients = [...mockPatients];
let templates = [...mockTemplates];
let filledForms = [...mockFilledForms];
let suggestions = [...mockSuggestions];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

/**
 * Handle mock API requests. Returns the response data or throws.
 */
export function handleMockRequest(method: string, url: string, body?: AnyData): unknown {
  // AUTH
  if (url === "/api/auth/me" && method === "GET") {
    return currentProfile;
  }
  if (url === "/api/auth/login" && method === "POST") {
    if (body?.email === mockProfile.email) {
      return currentProfile;
    }
    throw new Error("401: Invalid credentials");
  }
  if (url === "/api/auth/register" && method === "POST") {
    currentProfile = { ...currentProfile, email: body?.email ?? currentProfile.email, fullName: body?.fullName ?? currentProfile.fullName };
    return currentProfile;
  }

  // STATS
  if (url === "/api/stats" && method === "GET") {
    return {
      templateCount: templates.length,
      filledThisMonth: filledForms.length,
      patientCount: patients.length,
      timeSaved: "40m",
    };
  }

  // TEMPLATES
  if (url === "/api/templates" && method === "GET") {
    return templates;
  }
  if (url === "/api/templates" && method === "POST") {
    const newTemplate = {
      id: generateId(),
      userId: profileId,
      name: body?.name ?? "Nouveau template",
      description: body?.description ?? null,
      originalFileUrl: null,
      thumbnailUrl: null,
      category: body?.category ?? "Autre",
      isPublic: false,
      uploadCount: 0,
      fieldMappings: null,
      detectedFields: body?.detectedFields ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    templates = [...templates, newTemplate];
    return newTemplate;
  }

  // PATIENTS
  if (url === "/api/patients" && method === "GET") {
    return patients;
  }
  if (url === "/api/patients" && method === "POST") {
    const newPatient = {
      id: generateId(),
      userId: profileId,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    patients = [...patients, newPatient];
    return newPatient;
  }
  const patientMatch = url.match(/^\/api\/patients\/(.+)$/);
  if (patientMatch) {
    const id = patientMatch[1];
    if (method === "PATCH") {
      patients = patients.map((p) => p.id === id ? { ...p, ...body, updatedAt: new Date().toISOString() } : p);
      return patients.find((p) => p.id === id);
    }
    if (method === "DELETE") {
      patients = patients.filter((p) => p.id !== id);
      return { success: true };
    }
  }

  // FILLED FORMS
  if (url === "/api/filled-forms" && method === "GET") {
    return filledForms;
  }
  if (url === "/api/filled-forms" && method === "POST") {
    const newForm = {
      id: generateId(),
      userId: profileId,
      ...body,
      status: body?.status ?? "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    filledForms = [...filledForms, newForm];
    return newForm;
  }

  // PROFILES
  const profileMatch = url.match(/^\/api\/profiles\/(.+)$/);
  if (profileMatch && method === "PATCH") {
    currentProfile = { ...currentProfile, ...body, updatedAt: new Date().toISOString() };
    return currentProfile;
  }

  // SUGGESTIONS
  const suggestionsMatch = url.match(/^\/api\/suggestions\?templateId=(.+)$/);
  if (suggestionsMatch) {
    const templateId = suggestionsMatch[1];
    return suggestions.filter((s) => s.templateId === templateId);
  }
  if (url.startsWith("/api/suggestions") && method === "GET") {
    const params = new URLSearchParams(url.split("?")[1]);
    const templateId = params.get("templateId");
    if (templateId) {
      return suggestions.filter((s) => s.templateId === templateId);
    }
    return suggestions;
  }

  console.warn(`[Mock] Unhandled: ${method} ${url}`);
  return {};
}
