import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, date, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Profiles ---
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  cabinetName: text("cabinet_name"),
  cabinetAddress: text("cabinet_address"),
  numeroRpps: text("numero_rpps"),
  numeroAdeli: text("numero_adeli"),
  signatureUrl: text("signature_url"),
  ordocalUserId: uuid("ordocal_user_id"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// --- Patients ---
export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"), // M or F
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  numeroSecuriteSociale: text("numero_securite_sociale"),
  medecinTraitant: text("medecin_traitant"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

// --- Form Templates ---
export const formTemplates = pgTable("form_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  originalFileUrl: text("original_file_url"),
  thumbnailUrl: text("thumbnail_url"),
  detectedFields: jsonb("detected_fields"),
  fieldMappings: jsonb("field_mappings"),
  category: text("category").notNull().default("Autre"),
  isPublic: boolean("is_public").default(false),
  uploadCount: integer("upload_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;

// --- Filled Forms ---
export const filledForms = pgTable("filled_forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  templateId: uuid("template_id").notNull(),
  patientId: uuid("patient_id").notNull(),
  filledData: jsonb("filled_data"),
  status: text("status").notNull().default("draft"),
  generatedPdfUrl: text("generated_pdf_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFilledFormSchema = createInsertSchema(filledForms).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFilledForm = z.infer<typeof insertFilledFormSchema>;
export type FilledForm = typeof filledForms.$inferSelect;

// --- Field Corrections ---
export const fieldCorrections = pgTable("field_corrections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  templateId: uuid("template_id").notNull(),
  fieldName: text("field_name").notNull(),
  originalMapping: text("original_mapping"),
  correctedMapping: text("corrected_mapping"),
  correctionType: text("correction_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFieldCorrectionSchema = createInsertSchema(fieldCorrections).omit({ id: true, createdAt: true });
export type InsertFieldCorrection = z.infer<typeof insertFieldCorrectionSchema>;
export type FieldCorrection = typeof fieldCorrections.$inferSelect;

// --- Smart Suggestions ---
export const smartSuggestions = pgTable("smart_suggestions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  templateId: uuid("template_id").notNull(),
  fieldName: text("field_name").notNull(),
  suggestedValue: text("suggested_value").notNull(),
  frequency: integer("frequency").default(1),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
});

export const insertSmartSuggestionSchema = createInsertSchema(smartSuggestions).omit({ id: true });
export type InsertSmartSuggestion = z.infer<typeof insertSmartSuggestionSchema>;
export type SmartSuggestion = typeof smartSuggestions.$inferSelect;

// --- Detected Field type ---
export const detectedFieldSchema = z.object({
  name: z.string(),
  type: z.enum(["text", "checkbox", "date", "signature", "number"]),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  page: z.number().default(0),
});

export type DetectedField = z.infer<typeof detectedFieldSchema>;
