"use client";

// Helper functions to interact with the profiles API

export interface ProfileData {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface CreateProfileRequest {
  handle: string;
  displayName: string;
}

export interface ProfileResponse {
  profile: ProfileData | null;
  hasProfile: boolean;
}

export interface CreateProfileResponse {
  success: boolean;
  profile?: ProfileData;
  error?: string;
}

/**
 * Create a new user profile
 */
export async function createProfile(
  data: CreateProfileRequest,
): Promise<CreateProfileResponse> {
  try {
    const response = await fetch("/api/profiles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to create profile",
      };
    }

    return {
      success: true,
      profile: result.data,
    };
  } catch (error) {
    console.error("Create profile error:", error);
    return {
      success: false,
      error: "Network error occurred",
    };
  }
}

/**
 * Get current user's profile
 */
export async function getCurrentProfile(): Promise<
  ProfileResponse | { error: string }
> {
  try {
    const response = await fetch("/api/profiles", {
      method: "GET",
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to fetch profile" };
    }

    return result.data;
  } catch (error) {
    console.error("Get profile error:", error);
    return { error: "Network error occurred" };
  }
}

/**
 * Check if handle is available (client-side validation)
 */
export function validateHandle(handle: string): string | null {
  if (!handle.trim()) return "Handle is required";
  if (handle.length < 3) return "Handle must be at least 3 characters";
  if (handle.length > 30) return "Handle must be less than 30 characters";
  if (!/^[a-zA-Z0-9_-]+$/.test(handle)) {
    return "Handle can only contain letters, numbers, hyphens, and underscores";
  }
  return null;
}

/**
 * Validate display name
 */
export function validateDisplayName(displayName: string): string | null {
  if (!displayName.trim()) return "Display name is required";
  if (displayName.length > 50) {
    return "Display name must be less than 50 characters";
  }
  return null;
}
