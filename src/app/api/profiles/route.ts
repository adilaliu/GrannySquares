import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/utils/auth-server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import {
  authenticationRequiredResponse,
  badRequestResponse,
  errorResponse,
  successResponse,
} from "@/utils/api-responses";

// POST /api/profiles - Create user profile (auth required)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return authenticationRequiredResponse();
    }

    const body = await request.json();
    const { handle, displayName } = body;

    // Validate required fields
    if (!handle || !displayName) {
      return badRequestResponse("Handle and display name are required");
    }

    // Validate handle format
    if (!/^[a-zA-Z0-9_-]+$/.test(handle)) {
      return badRequestResponse(
        "Handle can only contain letters, numbers, hyphens, and underscores",
      );
    }

    if (handle.length < 3 || handle.length > 30) {
      return badRequestResponse("Handle must be between 3 and 30 characters");
    }

    if (displayName.length > 50) {
      return badRequestResponse("Display name must be less than 50 characters");
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if user already has a profile
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing profile:", checkError);
      return errorResponse("Failed to check existing profile");
    }

    if (existingProfile) {
      return badRequestResponse("User already has a profile");
    }

    // Check if handle is already taken
    const { data: handleCheck, error: handleError } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", handle.toLowerCase())
      .maybeSingle();

    if (handleError && handleError.code !== "PGRST116") {
      console.error("Error checking handle availability:", handleError);
      return errorResponse("Failed to check handle availability");
    }

    if (handleCheck) {
      return badRequestResponse("Handle is already taken");
    }

    // Create the profile
    const { data: profile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        handle: handle.toLowerCase(),
        display_name: displayName.trim(),
        avatar_url: null,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error creating profile:", insertError);
      if (insertError.code === "23505") {
        // Unique constraint violation
        return badRequestResponse("Handle is already taken");
      }
      return errorResponse("Failed to create profile");
    }

    return successResponse({
      id: profile.id,
      handle: profile.handle,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
    }, 201);
  } catch (error) {
    console.error("Error in profile creation:", error);
    return errorResponse("Failed to create profile");
  }
}

// GET /api/profiles - Get current user's profile (auth required)
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return authenticationRequiredResponse();
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching profile:", error);
      return errorResponse("Failed to fetch profile");
    }

    return successResponse({
      profile: profile || null,
      hasProfile: !!profile,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return errorResponse("Failed to fetch profile");
  }
}
