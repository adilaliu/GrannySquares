"use client";

import React, { useState, useEffect } from "react";
import { FullRecipeDraft } from "@/db/client";

// Extended interface for streaming partial data
interface PartialRecipe {
  recipe?: {
    title?: string;
    description_md?: string | null;
    yield_text?: string | null;
    total_time_min?: number | null;
    active_time_min?: number | null;
    cuisine?: string | null;
    difficulty?: "easy" | "medium" | "hard" | null;
    diet_tags?: string[] | null;
    allergen_tags?: string[] | null;
    hero_image_url?: string | null;
    user_id?: string | null;
  };
  ingredients?: Array<{
    idx: number;
    quantity?: number | null;
    unit?: string | null;
    item?: string;
    notes?: string | null;
  }>;
  steps?: Array<{
    idx: number;
    instruction?: string;
    timer_seconds?: number | null;
    temperature_c?: number | null;
    tool?: string | null;
    tip?: string | null;
  }>;
  substitutions?: Array<{
    ingredient_idx: number;
    suggestion: string;
  }>;
}

interface RecipeCardProps {
  recipe?: FullRecipeDraft | null;
  partialContent?: string;
  isStreaming?: boolean;
  isComplete?: boolean;
  onComplete?: () => void;
  className?: string;
  showActions?: boolean;
  onSave?: () => void;
  onEdit?: () => void;
  isSaving?: boolean;
}

// Utility function to parse partial JSON safely
const parsePartialJSON = (content: string): PartialRecipe => {
  try {
    // Try to parse complete JSON first
    return JSON.parse(content);
  } catch {
    // If that fails, try to fix common incomplete JSON patterns
    let fixedContent = content;

    // Remove trailing commas and incomplete objects/arrays
    fixedContent = fixedContent
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/,\s*$/, "");

    // Try to close incomplete objects
    const openBraces = (fixedContent.match(/{/g) || []).length;
    const closeBraces = (fixedContent.match(/}/g) || []).length;
    const openBrackets = (fixedContent.match(/\[/g) || []).length;
    const closeBrackets = (fixedContent.match(/]/g) || []).length;

    // Add missing closing braces/brackets
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixedContent += "}";
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixedContent += "]";
    }

    try {
      return JSON.parse(fixedContent);
    } catch {
      // If still can't parse, return empty object
      return {};
    }
  }
};

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  partialContent = "",
  isStreaming = false,
  isComplete = false,
  onComplete,
  className = "",
  showActions = false,
  onSave,
  onEdit,
  isSaving = false,
}) => {
  const [displayData, setDisplayData] = useState<PartialRecipe>({});
  const [isFlipping, setIsFlipping] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Parse streaming content
  useEffect(() => {
    if (isStreaming && partialContent) {
      const parsed = parsePartialJSON(partialContent);
      setDisplayData(parsed);
    } else if (recipe && !isStreaming) {
      // Convert FullRecipeDraft to PartialRecipe format
      setDisplayData({
        recipe: recipe.recipe,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        substitutions: recipe.substitutions,
      });
    }
  }, [partialContent, recipe, isStreaming]);

  // Handle completion animation
  useEffect(() => {
    if (isComplete && !hasCompleted && !isStreaming) {
      setHasCompleted(true);
      setIsFlipping(true);

      setTimeout(() => {
        setIsFlipping(false);
        onComplete?.();
      }, 600); // Animation duration
    }
  }, [isComplete, hasCompleted, isStreaming, onComplete]);

  const formatTime = (minutes: number | null | undefined) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatQuantity = (
    quantity: number | null | undefined,
    unit: string | null | undefined
  ) => {
    if (!quantity) return "";
    const quantityStr =
      quantity % 1 === 0 ? quantity.toString() : quantity.toString();
    return unit ? `${quantityStr} ${unit}` : quantityStr;
  };

  const data = displayData;
  const recipeData = data.recipe || {};

  return (
    <div
      className={`relative ${className}`}
      style={{
        transformStyle: "preserve-3d",
        transition: "transform 0.6s",
        transform: isFlipping ? "rotateX(360deg)" : "rotateX(0deg)",
      }}
    >
      <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 font-advent-pro">
                {recipeData.title ||
                  (isStreaming ? "Creating Recipe..." : "Untitled Recipe")}
              </h2>

              {recipeData.description_md && (
                <p className="text-gray-600 mb-4">
                  {recipeData.description_md}
                </p>
              )}
            </div>

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex-shrink-0 ml-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>

          {/* Recipe Meta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {recipeData.yield_text && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg mb-1">🍽</div>
                <div className="text-xs text-gray-600">Serves</div>
                <div className="font-semibold text-sm">
                  {recipeData.yield_text}
                </div>
              </div>
            )}

            {recipeData.total_time_min && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg mb-1">⏱</div>
                <div className="text-xs text-gray-600">Total Time</div>
                <div className="font-semibold text-sm">
                  {formatTime(recipeData.total_time_min)}
                </div>
              </div>
            )}

            {recipeData.difficulty && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg mb-1">📊</div>
                <div className="text-xs text-gray-600">Difficulty</div>
                <div className="font-semibold text-sm capitalize">
                  {recipeData.difficulty}
                </div>
              </div>
            )}

            {recipeData.cuisine && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg mb-1">🌍</div>
                <div className="text-xs text-gray-600">Cuisine</div>
                <div className="font-semibold text-sm">
                  {recipeData.cuisine}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {recipeData.diet_tags && recipeData.diet_tags.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {recipeData.diet_tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-3 gap-6 p-6">
            {/* Ingredients */}
            <div className="md:col-span-1">
              <h3 className="text-lg font-bold text-gray-900 mb-3 font-advent-pro">
                Ingredients
              </h3>
              {data.ingredients && data.ingredients.length > 0 ? (
                <ul className="space-y-2">
                  {data.ingredients
                    .sort((a, b) => a.idx - b.idx)
                    .map((ingredient) => (
                      <li
                        key={ingredient.idx}
                        className="flex items-start text-sm"
                      >
                        <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-2 mt-0.5">
                          {ingredient.idx + 1}
                        </span>
                        <div className="flex-1">
                          <span className="font-medium">
                            {formatQuantity(
                              ingredient.quantity,
                              ingredient.unit
                            )}{" "}
                            {ingredient.item || "..."}
                          </span>
                          {ingredient.notes && (
                            <div className="text-xs text-gray-600 mt-1">
                              {ingredient.notes}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic text-sm">
                  {isStreaming
                    ? "Loading ingredients..."
                    : "No ingredients listed"}
                </p>
              )}
            </div>

            {/* Instructions */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-bold text-gray-900 mb-3 font-advent-pro">
                Instructions
              </h3>
              {data.steps && data.steps.length > 0 ? (
                <div className="space-y-4">
                  {data.steps
                    .sort((a, b) => a.idx - b.idx)
                    .map((step) => (
                      <div key={step.idx} className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3 mt-0.5 text-xs">
                          {step.idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {step.instruction || "..."}
                          </p>

                          {/* Step meta info */}
                          {(step.timer_seconds ||
                            step.temperature_c ||
                            step.tool) && (
                            <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-1">
                              {step.timer_seconds && (
                                <span className="flex items-center">
                                  ⏱ {Math.round(step.timer_seconds / 60)} min
                                </span>
                              )}
                              {step.temperature_c && (
                                <span className="flex items-center">
                                  🌡 {step.temperature_c}°C
                                </span>
                              )}
                              {step.tool && (
                                <span className="flex items-center">
                                  🔧 {step.tool}
                                </span>
                              )}
                            </div>
                          )}

                          {step.tip && (
                            <div className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded text-xs">
                              <span className="text-yellow-800">
                                <strong>Tip:</strong> {step.tip}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 italic text-sm">
                  {isStreaming
                    ? "Loading instructions..."
                    : "No instructions provided"}
                </p>
              )}
            </div>
          </div>

          {/* Substitutions */}
          {data.substitutions && data.substitutions.length > 0 && (
            <div className="px-6 pb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 font-advent-pro">
                Substitutions
              </h3>
              <div className="space-y-2">
                {data.substitutions.map((sub, index) => (
                  <div key={index} className="text-sm p-2 bg-blue-50 rounded">
                    <span className="font-medium">
                      Ingredient #{sub.ingredient_idx + 1}:
                    </span>
                    <span className="text-gray-700 ml-1">{sub.suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3 justify-end">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-advent-pro font-semibold"
                >
                  Edit
                </button>
              )}
              {onSave && (
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-orange text-white rounded-lg hover:bg-orange/80 transition-colors font-advent-pro font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : "Save Recipe"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeCard;
