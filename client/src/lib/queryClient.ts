import { QueryClient, QueryFunction } from "@tanstack/react-query";
import * as db from "./supabase-storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

/**
 * Route mock API calls to Supabase storage functions.
 */
async function handleRequest(method: string, url: string, body?: AnyData): Promise<unknown> {
  // AUTH
  if (url === "/api/auth/me") {
    // On initial load, try to restore session from localStorage
    try {
      const savedEmail = localStorage.getItem("ordofill_user_email");
      if (!savedEmail) return null;
      const profile = await db.getProfileByEmail(savedEmail);
      // Auto-resolve OrdoCAL link if not already done
      if (profile && !profile.ordocalUserId) {
        const linked = await db.resolveAndLinkOrdocalUser(profile.id, profile.email);
        if (linked) profile.ordocalUserId = linked;
      }
      return profile;
    } catch {
      return null;
    }
  }
  if (url === "/api/auth/login" && method === "POST") {
    const profile = await db.getProfileByEmail(body?.email);
    // Auto-resolve OrdoCAL link on login
    if (profile && !profile.ordocalUserId) {
      const linked = await db.resolveAndLinkOrdocalUser(profile.id, profile.email);
      if (linked) profile.ordocalUserId = linked;
    }
    // Persist session
    if (profile?.email) localStorage.setItem("ordofill_user_email", profile.email);
    return profile;
  }
  if (url === "/api/auth/register" && method === "POST") {
    const profile = await db.createProfile({ email: body?.email, fullName: body?.fullName });
    // Auto-resolve OrdoCAL link on registration
    if (profile) {
      const linked = await db.resolveAndLinkOrdocalUser(profile.id, profile.email ?? body?.email);
      if (linked) profile.ordocalUserId = linked;
    }
    // Persist session
    if (profile?.email) localStorage.setItem("ordofill_user_email", profile.email);
    return profile;
  }
  // LOGOUT
  if (url === "/api/auth/logout" && method === "POST") {
    localStorage.removeItem("ordofill_user_email");
    return { success: true };
  }

  // STATS
  if (url === "/api/stats") {
    return await db.getStats();
  }

  // TEMPLATES
  if (url === "/api/templates" && method === "GET") {
    return await db.getTemplates();
  }
  if (url === "/api/templates" && method === "POST") {
    return await db.createTemplate({ ...body, userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" });
  }

  // PATIENTS
  if (url === "/api/patients" && method === "GET") {
    return await db.getPatients();
  }
  if (url === "/api/patients" && method === "POST") {
    return await db.createPatient({ ...body, userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" });
  }
  const patientMatch = url.match(/^\/api\/patients\/(.+)$/);
  if (patientMatch) {
    const id = patientMatch[1];
    if (method === "PATCH") return await db.updatePatient(id, body);
    if (method === "DELETE") return await db.deletePatient(id);
  }

  // FILLED FORMS
  if (url === "/api/filled-forms" && method === "GET") {
    return await db.getFilledForms();
  }
  if (url === "/api/filled-forms" && method === "POST") {
    return await db.createFilledForm({ ...body, userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" });
  }

  // PROFILES
  const profileMatch = url.match(/^\/api\/profiles\/(.+)$/);
  if (profileMatch && method === "PATCH") {
    return await db.updateProfile(profileMatch[1], body);
  }

  // ORDOCAL PATIENTS (cross-app)
  const ordocalPatientMatch = url.match(/^\/api\/ordocal\/patients\/(.+)$/);
  if (ordocalPatientMatch && method === "PATCH") {
    return await db.updateOrdocalPatient(ordocalPatientMatch[1], body);
  }
  if (url.startsWith("/api/ordocal/patients") && method === "GET") {
    const params = new URLSearchParams(url.split("?")[1] ?? "");
    const ordocalUserId = params.get("ordocalUserId");
    return await db.getOrdocalPatients(ordocalUserId);
  }

  // SUGGESTIONS
  if (url.startsWith("/api/suggestions")) {
    const params = new URLSearchParams(url.split("?")[1] ?? "");
    const templateId = params.get("templateId");
    if (templateId) return await db.getSuggestions(templateId);
    return [];
  }

  console.warn(`[Supabase Router] Unhandled: ${method} ${url}`);
  return {};
}

// --- Public API used by components ---

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  try {
    const result = await handleRequest(method, url, data as AnyData);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg.includes("No rows") || msg.includes("not found") ? 401 : 500;
    return new Response(JSON.stringify({ message: msg }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    let fullUrl = url;
    if (queryKey.length > 1 && queryKey[1]) {
      // OrdoCAL patients pass ordocalUserId as 2nd key segment
      if (url.startsWith("/api/ordocal/patients")) {
        fullUrl = `${url}?ordocalUserId=${queryKey[1]}`;
      } else {
        fullUrl = `${url}?templateId=${queryKey[1]}`;
      }
    }
    try {
      return (await handleRequest("GET", fullUrl)) as T;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (unauthorizedBehavior === "returnNull" && (msg.includes("No rows") || msg.includes("not found"))) {
        return null as T;
      }
      throw err;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
