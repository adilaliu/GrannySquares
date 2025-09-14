"use client";

// Helper functions to interact with the auth API routes

export interface SignInResponse {
  url?: string;
  message?: string;
  data?: any;
  error?: string;
}

export interface UserResponse {
  user?: any;
  error?: string;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(
  redirectTo?: string,
): Promise<SignInResponse> {
  try {
    const response = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "google",
        redirectTo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Sign in failed" };
    }

    // For OAuth, redirect to the provider URL
    if (data.url) {
      window.location.href = data.url;
    }

    return data;
  } catch (error) {
    console.error("Google sign-in error:", error);
    return { error: "Network error occurred" };
  }
}

/**
 * Sign in with magic link (email)
 */
export async function signInWithMagicLink(
  email: string,
  redirectTo?: string,
): Promise<SignInResponse> {
  try {
    const response = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "email",
        email,
        redirectTo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Sign in failed" };
    }

    return data;
  } catch (error) {
    console.error("Magic link sign-in error:", error);
    return { error: "Network error occurred" };
  }
}

/**
 * Sign in with phone number (SMS OTP)
 */
export async function signInWithPhone(
  phone: string,
): Promise<SignInResponse> {
  try {
    const response = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "phone",
        phone,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Sign in failed" };
    }

    return data;
  } catch (error) {
    console.error("Phone sign-in error:", error);
    return { error: "Network error occurred" };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ message?: string; error?: string }> {
  try {
    const response = await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Sign out failed" };
    }

    return data;
  } catch (error) {
    console.error("Sign out error:", error);
    return { error: "Network error occurred" };
  }
}

/**
 * Get the current user session
 * Always returns the default user (no authentication required)
 */
export async function getCurrentUser(): Promise<UserResponse> {
  // Return the default user without making any API calls
  return {
    user: {
      id: "8df050ee-e733-479f-83c8-b6a2efa0d95f",
      email: "default@example.com",
      user_metadata: {},
      app_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile: {
        id: "8df050ee-e733-479f-83c8-b6a2efa0d95f",
        handle: "default-user",
        display_name: "Default User",
      },
    },
  };
}

/**
 * Check if user is authenticated
 * Always returns true (no authentication required)
 */
export async function isAuthenticated(): Promise<boolean> {
  return true;
}
