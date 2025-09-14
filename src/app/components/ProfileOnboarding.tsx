"use client";

import { useState } from "react";
import GridBackgroundPattern from "./GridBackgroundPattern";

interface ProfileOnboardingProps {
  onComplete: (profile: { handle: string; displayName: string }) => void;
  onSkip?: () => void;
  isSubmitting?: boolean;
  error?: string;
}

export default function ProfileOnboarding({
  onComplete,
  onSkip,
  isSubmitting = false,
  error: externalError,
}: ProfileOnboardingProps) {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errors, setErrors] = useState<{
    handle?: string;
    displayName?: string;
  }>({});

  const validateHandle = (value: string) => {
    if (!value.trim()) return "Handle is required";
    if (value.length < 3) return "Handle must be at least 3 characters";
    if (value.length > 30) return "Handle must be less than 30 characters";
    if (!/^[a-zA-Z0-9_-]+$/.test(value))
      return "Handle can only contain letters, numbers, hyphens, and underscores";
    return null;
  };

  const validateDisplayName = (value: string) => {
    if (!value.trim()) return "Display name is required";
    if (value.length > 50)
      return "Display name must be less than 50 characters";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const handleError = validateHandle(handle);
    const displayNameError = validateDisplayName(displayName);

    if (handleError || displayNameError) {
      setErrors({
        handle: handleError || undefined,
        displayName: displayNameError || undefined,
      });
      return;
    }

    setErrors({});
    onComplete({ handle: handle.trim(), displayName: displayName.trim() });
  };

  return (
    <div className="h-screen relative overflow-hidden flex flex-col">
      {/* Grid Background */}
      <GridBackgroundPattern />

      {/* Header */}
      <div className="relative z-10 pt-32 pb-8 flex-shrink-0">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-extrabold text-brown text-center font-advent-pro mb-4 uppercase">
            Let's get you started
          </h1>
          <p
            className="text-center text-xl font-inter font-medium"
            style={{ color: "#C56219" }}
          >
            Set up a new profile
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 container mx-auto px-4 flex items-center justify-center pb-24">
        <div className="w-full max-w-md">
          <div className="bg-background-secondary rounded-2xl shadow-2xl border border-brown/50 border-3 overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-brown font-advent-pro mb-2 uppercase">
                  Create Your Profile
                </h2>
                <p className="text-gray-600 text-sm">
                  This helps others find and recognize your recipes
                </p>
              </div>

              {/* External Error Display */}
              {externalError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
                  {externalError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Handle Field */}
                <div>
                  <label
                    htmlFor="handle"
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Handle <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      @
                    </span>
                    <input
                      type="text"
                      id="handle"
                      value={handle}
                      onChange={(e) => {
                        setHandle(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_-]/g, "")
                        );
                        if (errors.handle)
                          setErrors({ ...errors, handle: undefined });
                      }}
                      className={`bg-white w-full pl-8 pr-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition-all duration-200 ${
                        errors.handle ? "border-red-300" : "border-gray-200"
                      }`}
                      placeholder="yourhandle"
                      required
                      disabled={isSubmitting}
                      maxLength={30}
                    />
                  </div>
                  {errors.handle && (
                    <p className="text-red-600 text-xs mt-1">{errors.handle}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    Choose a unique handle others can use to find you
                  </p>
                </div>

                {/* Display Name Field */}
                <div>
                  <label
                    htmlFor="displayName"
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (errors.displayName)
                        setErrors({ ...errors, displayName: undefined });
                    }}
                    className={`bg-white w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition-all duration-200 ${
                      errors.displayName ? "border-red-300" : "border-gray-200"
                    }`}
                    placeholder="Your Full Name"
                    required
                    disabled={isSubmitting}
                    maxLength={50}
                  />
                  {errors.displayName && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.displayName}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    This is how your name will appear on recipes
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    isSubmitting || !handle.trim() || !displayName.trim()
                  }
                  className="w-full bg-orange hover:bg-orange/80 disabled:bg-orange/30 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating profile...
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Complete Profile
                    </>
                  )}
                </button>

                {/* Skip Button (Optional) */}
                {onSkip && (
                  <button
                    type="button"
                    onClick={onSkip}
                    disabled={isSubmitting}
                    className="w-full text-gray-600 hover:text-gray-800 disabled:text-gray-400 font-medium py-2 transition-colors duration-200"
                  >
                    Skip for now
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="relative z-10 py-6 text-center">
        <p className="text-gray-600 text-sm font-advent-pro">
          Your profile helps build our cooking community!
        </p>
      </div>
    </div>
  );
}
