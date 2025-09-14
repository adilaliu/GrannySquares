"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPhone,
  getCurrentUser,
} from "@/utils/auth-api";
import GridBackgroundPattern from "@/app/components/GridBackgroundPattern";
import CafeBorder from "@/app/components/CafeBorder";

interface User {
  email: string;
  profile?: {
    handle?: string;
    display_name?: string;
  };
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // If user is already authenticated, redirect
    if (user && !loading) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const { user, error } = await getCurrentUser();
      if (error) {
        // Don't show technical errors to users
        console.error("Auth error:", error);
      } else {
        setUser(user);
      }
    } catch (err) {
      console.error("Failed to load user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const result = await signInWithGoogle(redirectTo);
      if (result.error) {
        setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    if (!email.trim()) {
      setError("Please enter your email");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signInWithMagicLink(email, redirectTo);
      if (result.error) {
        setError(result.error);
      } else {
        setMessage("✨ Check your email for the magic link!");
        setEmail("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    if (!phone.trim()) {
      setError("Please enter your phone number");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signInWithPhone(phone);
      if (result.error) {
        setError(result.error);
      } else {
        setMessage("📱 Check your phone for the verification code!");
        setPhone("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen relative overflow-hidden flex items-center justify-center">
        <GridBackgroundPattern />
        <div className="relative z-10 flex items-center gap-3 text-gray-600">
          <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg font-medium font-advent-pro">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  // If user is authenticated, they'll be redirected by useEffect
  if (user) {
    return null;
  }

  return (
    <div className="h-screen relative overflow-hidden flex flex-col">
      {/* Grid Background */}
      <GridBackgroundPattern />

      {/* Cafe Border */}
      <CafeBorder top={0} />

      {/* Header */}
      <div className="relative z-10 pt-32 pb-8 flex-shrink-0">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold text-gray-800 text-center font-advent-pro mb-4">
            WELCOME BACK
          </h1>
          <p className="text-gray-600 text-center text-lg font-advent-pro">
            Sign in to share your delicious recipes
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 container mx-auto px-4 flex items-center justify-center pb-24">
        <div className="w-full max-w-md">
          <div className="bg-background-secondary rounded-2xl shadow-2xl border border-brown/50 border-3 overflow-hidden">
            {/* Status Messages */}
            {message && (
              <div className="m-6 mb-0 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-medium">
                {message}
              </div>
            )}

            {error && (
              <div className="m-6 mb-0 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div className="p-8">
              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-900 font-semibold py-4 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 flex items-center justify-center gap-3 mb-6"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EB4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continue with Google
              </button>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-clear text-gray-500 font-medium">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Tab Selection */}
              <div className="flex rounded-lg bg-background p-1 mb-6">
                <button
                  onClick={() => setActiveTab("email")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === "email"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => setActiveTab("phone")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === "phone"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Phone
                </button>
              </div>

              {/* Email Form */}
              {activeTab === "email" && (
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-gray-900 mb-2"
                    >
                      Email address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition-all duration-200"
                      placeholder="Enter your email"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim()}
                    className="w-full bg-orange hover:bg-orange/80 disabled:bg-orange/30 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending magic link...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        Send magic link
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Phone Form */}
              {activeTab === "phone" && (
                <form onSubmit={handlePhoneSignIn} className="space-y-4">
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-semibold text-gray-900 mb-2"
                    >
                      Phone number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-white w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition-all duration-200"
                      placeholder="+1 (555) 123-4567"
                      required
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Include country code (e.g., +1 for US)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !phone.trim()}
                    className="w-full bg-orange hover:bg-orange/80 disabled:bg-orange/30 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending verification code...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        Send verification code
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="relative z-10 py-6 text-center">
        <p className="text-gray-600 text-sm font-advent-pro">
          New to Granny Squares? Sign in to start sharing your recipes!
        </p>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="h-screen relative overflow-hidden flex items-center justify-center">
      <GridBackgroundPattern />
      <div className="relative z-10 flex items-center gap-3 text-gray-600">
        <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin"></div>
        <span className="text-lg font-medium font-advent-pro">Loading...</span>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SignInContent />
    </Suspense>
  );
}
