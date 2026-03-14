import { supabase } from "./supabase";

// ---- Helper to convert snake_case DB rows to camelCase for the frontend ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCamel(row: any): any {
  if (!row || typeof row !== "object") return row;
  if (Array.isArray(row)) return row.map(toCamel);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSnake(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
    out[snake] = v;
  }
  return out;
}

// ---- Profiles ----

export async function getProfileByEmail(email: string) {
  const { data, error } = await supabase
    .from("ordofill_profiles")
    .select("*")
    .eq("email", email)
    .single();
  if (error) throw new Error(error.message);
  return toCamel(data);
}

export async function getProfile(id: string) {
  const { data, error } = await supabase
    .from("ordofill_profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return toCamel(data);
}

export async function createProfile(profile: { email: string; fullName: string }) {
  const { data, error } = await supabase
    .from("ordofill_profiles")
    .insert({ email: profile.email, full_name: profile.fullName })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamel(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateProfile(id: string, updates: any) {
  const snaked = toSnake(updates);
  snaked.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("ordofill_profiles")
    .update(snaked)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamel(data);
}

// ---- Patients ----

export async function getPatients() {
  const { data, error } = await supabase
    .from("ordofill_patients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toCamel);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createPatient(patient: any) {
  const snaked = toSnake(patient);
  const { data, error } = await supabase
    .from("ordofill_patients")
    .insert(snaked)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamel(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updatePatient(id: string, updates: any) {
  const snaked = toSnake(updates);
  snaked.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("ordofill_patients")
    .update(snaked)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamel(data);
}

export async function deletePatient(id: string) {
  const { error } = await supabase
    .from("ordofill_patients")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ---- Form Templates ----

export async function getTemplates() {
  const { data, error } = await supabase
    .from("ordofill_form_templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toCamel);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createTemplate(template: any) {
  const snaked = toSnake(template);
  const { data, error } = await supabase
    .from("ordofill_form_templates")
    .insert(snaked)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamel(data);
}

// ---- Filled Forms ----

export async function getFilledForms() {
  const { data, error } = await supabase
    .from("ordofill_filled_forms")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toCamel);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createFilledForm(form: any) {
  const snaked = toSnake(form);
  const { data, error } = await supabase
    .from("ordofill_filled_forms")
    .insert(snaked)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamel(data);
}

// ---- Smart Suggestions ----

export async function getSuggestions(templateId: string) {
  const { data, error } = await supabase
    .from("ordofill_smart_suggestions")
    .select("*")
    .eq("template_id", templateId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toCamel);
}

// ---- OrdoCAL Cross-App ----

// Auto-resolve: find the OrdoCAL user_id by email (via Supabase Auth)
// Called once at login — stores the result in ordofill_profiles.ordocal_user_id
export async function resolveAndLinkOrdocalUser(profileId: string, email: string) {
  // Call the SECURITY DEFINER function that reads auth.users
  const { data: ordocalUserId, error } = await supabase
    .rpc("resolve_ordocal_user_id", { p_email: email });
  if (error) {
    console.warn("[OrdoCAL] resolve_ordocal_user_id failed:", error.message);
    return null;
  }
  if (!ordocalUserId) return null; // No OrdoCAL account with this email

  // Persist the link in the profile so we don't have to resolve every time
  await supabase
    .from("ordofill_profiles")
    .update({ ordocal_user_id: ordocalUserId, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  return ordocalUserId as string;
}

// Read OrdoCAL patients via SECURITY DEFINER RPC (private per account)
export async function getOrdocalPatients(ordocalUserId: string | null) {
  if (!ordocalUserId) return [];
  const { data, error } = await supabase
    .rpc("get_ordocal_patients_for_user", { p_owner_user_id: ordocalUserId });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ---- OrdoCAL Patient Update ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateOrdocalPatient(patientId: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from("patients")
    .update(updates)
    .eq("id", patientId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ---- Stats ----

export async function getStats() {
  // Current month range for filledThisMonth
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const [templates, patients, filledForms, filledThisMonth] = await Promise.all([
    supabase.from("ordofill_form_templates").select("id", { count: "exact", head: true }),
    supabase.from("ordofill_patients").select("id", { count: "exact", head: true }),
    supabase.from("ordofill_filled_forms").select("id", { count: "exact", head: true }),
    supabase.from("ordofill_filled_forms").select("id", { count: "exact", head: true })
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd),
  ]);

  const totalForms = filledForms.count ?? 0;
  const totalMinutes = totalForms * 5;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeSaved = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}` : `${minutes}m`;

  return {
    templateCount: templates.count ?? 0,
    patientCount: patients.count ?? 0,
    filledThisMonth: filledThisMonth.count ?? 0,
    timeSaved,
  };
}
