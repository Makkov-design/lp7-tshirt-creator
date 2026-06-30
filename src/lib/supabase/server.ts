import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type SupabaseServerClient = ReturnType<typeof createClient<Database, "public">>;

let serverClient: SupabaseServerClient | null = null;

export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getSupabaseServerClient() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase environment variables are missing.");
  }

  if (!serverClient) {
    serverClient = createClient<Database, "public">(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return serverClient;
}
