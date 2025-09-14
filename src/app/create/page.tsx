/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import GridBackgroundPattern from "../components/GridBackgroundPattern";
import RecipeCard from "../components/RecipeCard";
import {
  analyzeRecipe,
  createRecipe,
  generateRecipeImage,
} from "@/utils/recipes-api";
import { getCurrentUser } from "@/utils/auth-api";
import { getCurrentProfile, createProfile } from "@/utils/profiles-api";
import { FullRecipeDraft } from "@/db/client";
import ProfileOnboarding from "@/app/components/ProfileOnboarding";

// Extend Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const CreateRecipePage: React.FC = () => {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [interimTranscription, setInterimTranscription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [language] = useState("en-US");

  // Auth states
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisContent, setAnalysisContent] = useState("");
  const [analyzedRecipe, setAnalyzedRecipe] = useState<FullRecipeDraft | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Image generation states
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const checkAuthentication = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      const { user, error } = await getCurrentUser();
      if (error || !user) {
        // Redirect to sign-in page with return URL
        router.push(`/auth/signin?redirectTo=${encodeURIComponent("/create")}`);
        return;
      }

      // Check if user has a profile
      const profileResult = await getCurrentProfile();

      if ("error" in profileResult) {
        console.error("Error checking profile:", profileResult.error);
        // If there's an error, assume they need onboarding
        setShowOnboarding(true);
        setIsCheckingAuth(false);
        return;
      }

      if (profileResult.hasProfile) {
        // User has a profile, they can proceed
        setIsAuthenticated(true);
      } else {
        // User needs to create a profile
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      // Redirect to sign-in without exposing technical details
      router.push(`/auth/signin?redirectTo=${encodeURIComponent("/create")}`);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Check authentication on mount
  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  const handleProfileComplete = async (profileData: {
    handle: string;
    displayName: string;
  }) => {
    setIsCreatingProfile(true);
    setProfileError("");

    try {
      const result = await createProfile(profileData);

      if (result.success) {
        // Profile created successfully, allow access to create page
        setShowOnboarding(false);
        setIsAuthenticated(true);
      } else {
        setProfileError(result.error || "Failed to create profile");
      }
    } catch (err) {
      console.error("Error creating profile:", err);
      setProfileError("An unexpected error occurred");
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleSkipProfile = () => {
    // For now, redirect to home page if they skip
    router.push("/");
  };

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
    }
  }, []);

  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();

    // Configuration
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    // Event handlers
    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
      console.log("Speech recognition started");
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscription((prev) => prev + " " + finalTranscript);
      }

      setInterimTranscription(interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsRecording(false);
      setInterimTranscription("");
    };

    return recognition;
  }, [language]);

  const handleStartRecording = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition is not supported in your browser.");
      return;
    }

    try {
      setError(null);
      setInterimTranscription("");

      const recognition = initializeSpeechRecognition();
      if (!recognition) {
        setError("Failed to initialize speech recognition.");
        return;
      }

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setError("Failed to start speech recognition. Please try again.");
    }
  }, [isSupported, initializeSpeechRecognition]);

  const handleStopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Implement file upload and transcription logic
      console.log("File uploaded:", file.name);
    }
  };

  const handleTranscriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setTranscription(e.target.value);
  };

  const handleBack = () => {
    router.push("/");
  };

  const handleAnalyze = async () => {
    if (!transcription.trim()) {
      setError("Please provide some recipe text to analyze");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisContent("");
    // Don't reset analyzedRecipe to null - preserve any existing data
    setError(null);
    setShowPreview(true); // Show the recipe card immediately for streaming

    try {
      const { reader } = await analyzeRecipe(transcription);
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "status") {
                // Handle status updates
                console.log("Status:", data.message);
              } else if (data.type === "content") {
                setAnalysisContent(data.accumulated);
              } else if (data.type === "complete") {
                setAnalyzedRecipe(data.recipe);
                // Start image generation automatically after analysis completes
                handleGenerateImage(data.recipe);
                // Keep showing preview, let RecipeCard handle completion animation
                break;
              } else if (data.type === "error") {
                setError(data.error);
                setShowPreview(false); // Hide preview on error
                break;
              }
            } catch (e) {
              console.error("Failed to parse streaming data:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Failed to analyze recipe. Please try again.");
      setShowPreview(false); // Hide preview on error
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateImage = async (recipe: FullRecipeDraft) => {
    if (!recipe) return;

    setIsGeneratingImage(true);
    setError(null);

    try {
      const result = await generateRecipeImage(recipe);

      if (result.success && result.data?.imageUrl) {
        setGeneratedImageUrl(result.data.imageUrl);
        // Update the analyzed recipe to include the generated image
        setAnalyzedRecipe((prevRecipe) => {
          if (!prevRecipe) return prevRecipe;
          return {
            ...prevRecipe,
            recipe: {
              ...prevRecipe.recipe,
              hero_image_url: result.data.imageUrl,
            },
          };
        });
      } else {
        console.warn("Image generation failed:", result.error);
        // Don't show error to user, continue without image
      }
    } catch (err) {
      console.error("Image generation failed:", err);
      // Don't show error to user, continue without image
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!analyzedRecipe) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await createRecipe({
        title: analyzedRecipe.recipe.title,
        recipe: analyzedRecipe.recipe,
        ingredients: analyzedRecipe.ingredients,
        steps: analyzedRecipe.steps,
        substitutions: analyzedRecipe.substitutions,
        images: analyzedRecipe.images,
      });

      if (result.success && result.data) {
        // Redirect to the created recipe using slug (preferred) or fallback to ID
        const recipeRoute = result.data.slug
          ? result.data.slug
          : result.data.id;
        window.location.href = `/recipes/${recipeRoute}`;
      } else {
        setError(result.error || "Failed to save recipe");
      }
    } catch (err) {
      console.error("Save failed:", err);
      setError("Failed to save recipe. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (!showPreview) {
      handleAnalyze();
    } else {
      handleSaveRecipe();
    }
  };

  const handleRedo = () => {
    setShowPreview(false);
    setAnalyzedRecipe(null);
    setAnalysisContent("");
    setError(null);
    setTranscription(""); // Reset transcription box
    setIsGeneratingImage(false);
    setGeneratedImageUrl(null);
  };

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="h-screen relative overflow-hidden flex items-center justify-center">
        <GridBackgroundPattern />
        <div className="relative z-10 flex items-center gap-3 text-gray-600">
          <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg font-medium font-advent-pro">
            Checking authentication...
          </span>
        </div>
      </div>
    );
  }

  // Show profile onboarding if user needs to create a profile
  if (showOnboarding) {
    return (
      <ProfileOnboarding
        onComplete={handleProfileComplete}
        onSkip={handleSkipProfile}
        isSubmitting={isCreatingProfile}
        error={profileError}
      />
    );
  }

  // If not authenticated, the user will be redirected by useEffect
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen relative overflow-hidden flex flex-col">
      {/* Grid Background */}
      <GridBackgroundPattern />

      {/* Header */}
      <div className="relative z-10 py-6 flex-shrink-0">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-800 text-center font-advent-pro uppercase">
            Share Your Own Recipe
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 container mx-auto px-4 pb-24">
        <div
          className={`flex h-full gap-12 ${
            showPreview ? "justify-center items-center" : "items-center"
          }`}
        >
          {/* Left Panel - 1/3 width */}
          {!showPreview && (
            <div className="w-1/3 flex flex-col items-center justify-center space-y-6">
              {/* Mic Button with Recording Waves */}
              <div className="relative">
                {/* Recording Waves */}
                {isRecording && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping"></div>
                    <div
                      className="absolute inset-0 rounded-full border-2 border-red-300 animate-ping"
                      style={{ animationDelay: "0.5s" }}
                    ></div>
                    <div
                      className="absolute inset-0 rounded-full border-2 border-red-200 animate-ping"
                      style={{ animationDelay: "1s" }}
                    ></div>
                  </>
                )}

                {/* Mic Button */}
                <button
                  onClick={
                    isRecording ? handleStopRecording : handleStartRecording
                  }
                  disabled={!isSupported}
                  className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-orange hover:bg-orange/80"
                  }`}
                >
                  {isRecording ? (
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <rect x="6" y="6" width="8" height="8" rx="1" />
                    </svg>
                  ) : (
                    <svg
                      className="w-12 h-12"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Upload Button */}
              <div className="w-full max-w-xs">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-orange hover:bg-orange/80 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-advent-pro font-bold"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm">Upload Audio File</span>
                </button>
              </div>
            </div>
          )}

          {/* Right Panel - 2/3 width when input, full width when showing recipe */}
          <div
            className={`flex flex-col ${
              showPreview ? "w-full max-w-6xl" : "w-2/3"
            }`}
          >
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {!showPreview ? (
              <>
                {/* Transcription Text Area */}
                <div className="flex-1 relative">
                  <textarea
                    value={
                      transcription +
                      (isRecording && interimTranscription
                        ? " " + interimTranscription
                        : "")
                    }
                    onChange={handleTranscriptionChange}
                    placeholder={
                      !isSupported
                        ? "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari."
                        : "Click the microphone to start recording, or your transcribed text will appear here..."
                    }
                    className="w-full h-96 resize-none border border-gray-300 focus:ring-2 focus:ring-orange focus:border-orange rounded-lg p-4 bg-white text-lg leading-relaxed font-sans"
                    disabled={!isSupported || isAnalyzing}
                    readOnly={isRecording || isAnalyzing}
                  />
                  {/* Recording indicator */}
                  {isRecording && (
                    <div className="absolute bottom-4 right-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  {/* Analysis indicator */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange mx-auto mb-2"></div>
                        <p className="text-gray-600 text-sm">
                          Analyzing recipe with GPT-4o...
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Analysis Progress */}
                {isAnalyzing && analysisContent && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      AI Analysis Progress:
                    </h3>
                    <div className="text-sm text-gray-600 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {analysisContent}
                    </div>
                  </div>
                )}

                {/* Image Generation Progress */}
                {isGeneratingImage && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-orange-700 mb-2">
                      Generating Recipe Image:
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-orange-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange"></div>
                      <span>
                        Creating a beautiful pixel-art granny square image of
                        your dish...
                      </span>
                    </div>
                  </div>
                )}

                {/* Image Generation Complete */}
                {generatedImageUrl && !isGeneratingImage && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-green-700 mb-2">
                      Recipe Image Generated! ✨
                    </h3>
                    <div className="text-sm text-green-600">
                      Your cozy granny square image has been added to the
                      recipe.
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Recipe Card and Image Preview */
              <div className="w-full h-full flex items-center justify-center gap-8">
                {/* Recipe Card */}
                <div className="flex-shrink-0">
                  <RecipeCard
                    recipe={analyzedRecipe}
                    partialContent={analysisContent}
                    isStreaming={isAnalyzing || isGeneratingImage}
                    isComplete={
                      !isAnalyzing && !isGeneratingImage && !!analyzedRecipe
                    }
                    showActions={true}
                    onSave={handleSaveRecipe}
                    isSaving={isSaving}
                  />
                </div>

                {/* Image Display Area */}
                <div className="flex-shrink-0 w-80 h-80">
                  <div className="w-full h-full bg-[#FFFAF3] rounded-2xl shadow-2xl border-4 border-orange/20 flex items-center justify-center overflow-hidden">
                    {isGeneratingImage ? (
                      /* Loading State */
                      <div className="text-center p-6">
                        <div className="relative mb-4">
                          {/* Animated granny square pattern */}
                          <div className="w-24 h-24 mx-auto relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange to-pink rounded-lg animate-pulse"></div>
                            <div
                              className="absolute inset-2 bg-gradient-to-br from-green to-blue rounded-lg animate-pulse"
                              style={{ animationDelay: "0.5s" }}
                            ></div>
                            <div
                              className="absolute inset-4 bg-gradient-to-br from-purple to-yellow rounded-lg animate-pulse"
                              style={{ animationDelay: "1s" }}
                            ></div>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-brown font-advent-pro mb-2">
                          Crafting Your Granny Square...
                        </h3>
                        <p className="text-sm text-gray-600">
                          Creating a cozy pixel-art image of your delicious dish
                        </p>
                      </div>
                    ) : generatedImageUrl ? (
                      /* Generated Image */
                      <div className="w-full h-full relative">
                        <img
                          src={generatedImageUrl}
                          alt="Generated recipe image"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error("Failed to load generated image");
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      /* Placeholder */
                      <div className="text-center p-6">
                        <div className="w-16 h-16 mx-auto mb-4 bg-orange/10 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-orange"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-500">
                          Recipe image will appear here
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="relative z-10 px-4 py-4">
        <div className="container mx-auto relative">
          {/* Back button - left corner */}
          <div className="absolute left-0 bottom-0">
            <button
              onClick={handleBack}
              className="bg-pink hover:bg-pink/80 px-4 py-3 rounded-lg transition-colors flex items-center gap-2 text-black font-advent-pro font-bold"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm">BACK</span>
            </button>
          </div>

          {/* Redo button - center */}
          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0">
            <button
              onClick={handleRedo}
              className="bg-green hover:bg-green/80 px-4 py-3 rounded-lg transition-colors flex items-center gap-2 text-black font-advent-pro font-bold"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm">REDO</span>
            </button>
          </div>

          {/* Next button - right corner */}
          <div className="absolute right-0 bottom-0">
            <button
              onClick={handleNext}
              disabled={
                isAnalyzing ||
                isGeneratingImage ||
                isSaving ||
                (!transcription.trim() && !showPreview)
              }
              className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 text-black font-advent-pro font-bold ${
                isAnalyzing ||
                isGeneratingImage ||
                isSaving ||
                (!transcription.trim() && !showPreview)
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-pink hover:bg-pink/80"
              }`}
            >
              <span className="text-sm">
                {isSaving
                  ? "SAVING..."
                  : showPreview
                  ? "SAVE RECIPE"
                  : isGeneratingImage
                  ? "GENERATING IMAGE..."
                  : isAnalyzing
                  ? "ANALYZING..."
                  : "ANALYZE"}
              </span>
              {!isAnalyzing && !isGeneratingImage && !isSaving && (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRecipePage;
