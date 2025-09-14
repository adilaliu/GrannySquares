"use client";

// Client-side API utilities for recipes
import { FullRecipeDraft } from "@/db/client";
import {
  apiDelete,
  apiGet,
  ApiListResponse,
  apiPost,
  apiPut,
  ApiResponse,
} from "@/utils/api-client-helpers";

export interface RecipeResponse extends ApiResponse {
  isOwner?: boolean;
}

export interface RecipeListResponse extends ApiListResponse {}

/**
 * Get all public recipes with optional search
 */
export async function getRecipes(options: {
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<RecipeListResponse> {
  return apiGet("/api/recipes", options);
}

/**
 * Get a specific recipe by ID or slug
 */
export async function getRecipe(idOrSlug: string): Promise<RecipeResponse> {
  return apiGet(`/api/recipes/${idOrSlug}`);
}

/**
 * Create a new recipe
 */
export async function createRecipe(recipeData: {
  title: string;
  recipe?: Partial<FullRecipeDraft["recipe"]>;
  ingredients?: FullRecipeDraft["ingredients"];
  steps?: FullRecipeDraft["steps"];
  substitutions?: FullRecipeDraft["substitutions"];
  images?: FullRecipeDraft["images"];
}): Promise<RecipeResponse> {
  return apiPost("/api/recipes", recipeData);
}

/**
 * Update an existing recipe (author only)
 */
export async function updateRecipe(
  idOrSlug: string,
  recipeData: {
    recipe?: Partial<FullRecipeDraft["recipe"]>;
    ingredients?: FullRecipeDraft["ingredients"];
    steps?: FullRecipeDraft["steps"];
    substitutions?: FullRecipeDraft["substitutions"];
    images?: FullRecipeDraft["images"];
  },
): Promise<RecipeResponse> {
  return apiPut(`/api/recipes/${idOrSlug}`, recipeData);
}

/**
 * Delete a recipe (author only)
 */
export async function deleteRecipe(idOrSlug: string): Promise<RecipeResponse> {
  return apiDelete(`/api/recipes/${idOrSlug}`);
}

/**
 * Get current user's recipes (both public and private)
 */
export async function getMyRecipes(options: {
  page?: number;
  pageSize?: number;
  includePrivate?: boolean;
} = {}): Promise<RecipeListResponse> {
  return apiGet("/api/recipes/me", options);
}

/**
 * Analyze natural language recipe text into structured format (streaming)
 */
export async function analyzeRecipe(text: string): Promise<{
  stream: ReadableStream;
  reader: ReadableStreamDefaultReader;
}> {
  const response = await fetch("/api/recipes/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();

  return {
    stream: response.body,
    reader,
  };
}

/**
 * Generate an image for the analyzed recipe
 */
export async function generateRecipeImage(
  analyzedRecipe: FullRecipeDraft,
): Promise<ApiResponse & { imageUrl?: string }> {
  return apiPost("/api/recipes/generate-image", { analyzedRecipe });
}

/**
 * Utility to format recipe data for API calls
 */
export function formatRecipeForAPI(recipe: {
  title: string;
  description?: string;
  yieldText?: string;
  totalTimeMin?: number;
  activeTimeMin?: number;
  cuisine?: string;
  difficulty?: "easy" | "medium" | "hard";
  dietTags?: string[];
  allergenTags?: string[];
  heroImageUrl?: string;
  nutritionJson?: any;
  public?: boolean;
  ingredients?: Array<{
    idx: number;
    quantity?: number;
    unit?: string;
    item: string;
    notes?: string;
  }>;
  steps?: Array<{
    idx: number;
    instruction: string;
    timerSeconds?: number;
    temperatureC?: number;
    tool?: string;
    tip?: string;
    imageUrl?: string;
  }>;
  substitutions?: Array<{
    ingredientIdx: number;
    suggestion: string;
  }>;
  images?: Array<{
    url: string;
    caption?: string;
  }>;
}) {
  return {
    title: recipe.title,
    recipe: {
      title: recipe.title,
      description_md: recipe.description,
      yield_text: recipe.yieldText,
      total_time_min: recipe.totalTimeMin,
      active_time_min: recipe.activeTimeMin,
      cuisine: recipe.cuisine,
      difficulty: recipe.difficulty,
      diet_tags: recipe.dietTags,
      allergen_tags: recipe.allergenTags,
      hero_image_url: recipe.heroImageUrl,
      nutrition_json: recipe.nutritionJson,
      public: recipe.public ?? true,
    },
    ingredients: recipe.ingredients?.map((ing) => ({
      idx: ing.idx,
      quantity: ing.quantity,
      unit: ing.unit,
      item: ing.item,
      notes: ing.notes,
    })),
    steps: recipe.steps?.map((step) => ({
      idx: step.idx,
      instruction: step.instruction,
      timer_seconds: step.timerSeconds,
      temperature_c: step.temperatureC,
      tool: step.tool,
      tip: step.tip,
      image_url: step.imageUrl,
    })),
    substitutions: recipe.substitutions?.map((sub) => ({
      ingredient_idx: sub.ingredientIdx,
      suggestion: sub.suggestion,
    })),
    images: recipe.images,
  };
}
