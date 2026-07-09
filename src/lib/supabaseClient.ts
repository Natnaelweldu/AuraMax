import { createClient } from "@supabase/supabase-js";

// Use placeholder credentials during build/prerendering when env variables are not present.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase credentials are not fully configured in your environment. Using placeholders for compilation safety."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
