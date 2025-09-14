import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const DEFAULT_USER_ID = "8df050ee-e733-479f-83c8-b6a2efa0d95f";

/**
 * Get authenticated user for server-side API routes
 * Returns the default user (no authentication required)
 */
export async function getAuthenticatedUser() {
  // Return a mock user object with the default user ID
  return {
    id: DEFAULT_USER_ID,
    email: "default@example.com",
    user_metadata: {},
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Require authentication for API routes
 * Always returns the default user (no authentication required)
 */
export async function requireAuthentication() {
  return await getAuthenticatedUser();
}

/**
 * Create authenticated Supabase client for server-side API routes
 * Returns a standard Supabase client (no authentication required)
 */
export async function createAuthenticatedClient() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}
