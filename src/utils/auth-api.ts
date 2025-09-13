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
 */
export async function getCurrentUser(): Promise<UserResponse> {
  try {
    const response = await fetch("/api/auth/user", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok && response.status !== 401) {
      return { error: data.error || "Failed to fetch user" };
    }

    return data;
  } catch (error) {
    console.error("Get user error:", error);
    return { error: "Network error occurred" };
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { user, error } = await getCurrentUser();
  return !error && !!user;
}
