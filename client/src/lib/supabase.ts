import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://aduuckwsripxpebkieiz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdXVja3dzcmlweHBlYmtpZWl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODk0ODMsImV4cCI6MjA4NzE2NTQ4M30.2yxnenoVDyAQDndxhS8GVneYL_UfKTLaZ--qsQS5oyA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
