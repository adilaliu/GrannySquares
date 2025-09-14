import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * Get authenticated user for server-side API routes
 * Returns null if user is not authenticated
 */
export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

/**
 * Require authentication for API routes
 * Throws error if user is not authenticated
 */
export async function requireAuthentication() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

/**
 * Create authenticated Supabase client for server-side API routes
 */
export async function createAuthenticatedClient() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}
