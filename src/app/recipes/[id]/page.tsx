"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getRecipe } from "@/utils/recipes-api";
import { getCurrentUser } from "@/utils/auth-api";
import RecipeCard from "@/app/components/RecipeCard";
import Link from "next/link";
import GridBackgroundPattern from "@/app/components/GridBackgroundPattern";

interface FullRecipe {
  id: string;
  title: string;
  slug: string | null;
  description_md: string | null;
  yield_text: string | null;
  total_time_min: number | null;
  active_time_min: number | null;
  cuisine: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  diet_tags: string[] | null;
  allergen_tags: string[] | null;
  hero_image_url: string | null;
  nutrition_json: any | null;
  public: boolean;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  ingredients: Array<{
    recipe_id: string;
    idx: number;
    quantity: number | null;
    unit: string | null;
    item: string;
    notes: string | null;
  }>;
  steps: Array<{
    recipe_id: string;
    idx: number;
    instruction: string;
    timer_seconds: number | null;
    temperature_c: number | null;
    tool: string | null;
    tip: string | null;
    image_url: string | null;
  }>;
  substitutions: Array<{
    recipe_id: string;
    ingredient_idx: number;
    suggestion: string;
  }>;
  images: Array<{
    id: string;
    recipe_id: string;
    url: string;
    caption: string | null;
    created_at: string;
  }>;
  comments: Array<{
    id: string;
    recipe_id: string;
    user_id: string | null;
    body_md: string;
    created_at: string;
    profiles: {
      id: string;
      handle: string | null;
      display_name: string | null;
      avatar_url: string | null;
      created_at: string;
    } | null;
  }>;
  like_count: number;
  liked_by_me: boolean;
}

export default function RecipePage() {
  const params = useParams();
  const id = params.id as string;

  const [recipe, setRecipe] = useState<FullRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    // Get current user - used for ownership determination elsewhere
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!id) return;

    const loadRecipe = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getRecipe(id);

        if (result.success && result.data) {
          setRecipe(result.data);
          setIsOwner(result.isOwner || false);
        } else {
          // Set a sample recipe if none found
          setRecipe({
            id: "sample-1",
            title: "Sample Recipe",
            slug: "sample-recipe",
            description_md:
              "This is a sample recipe to demonstrate the interface when no recipe is found.",
            yield_text: "1 serving",
            total_time_min: 10,
            active_time_min: 5,
            cuisine: "American",
            difficulty: "easy",
            diet_tags: ["vegetarian"],
            allergen_tags: ["gluten-free"],
            hero_image_url: null,
            nutrition_json: null,
            public: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: "sample-user",
            ingredients: [
              {
                recipe_id: "sample-1",
                idx: 0,
                quantity: 1,
                unit: "cup",
                item: "Sample ingredient",
                notes: "This is a sample note",
              },
              {
                recipe_id: "sample-1",
                idx: 1,
                quantity: 2,
                unit: "cups",
                item: "Sample ingredient 2",
                notes: null,
              },
              {
                recipe_id: "sample-1",
                idx: 2,
                quantity: 3,
                unit: "cups",
                item: "Sample ingredient 3",
                notes: null,
              },
            ],
            steps: [
              {
                recipe_id: "sample-1",
                idx: 0,
                instruction: "This is a sample cooking step",
                timer_seconds: null,
                temperature_c: null,
                tool: null,
                tip: null,
                image_url: null,
              },
              {
                recipe_id: "sample-1",
                idx: 1,
                instruction: "This is a sample cooking step 2",
                timer_seconds: null,
                temperature_c: null,
                tool: null,
                tip: null,
                image_url: null,
              },
              {
                recipe_id: "sample-1",
                idx: 2,
                instruction: "This is a sample cooking step 3",
                timer_seconds: null,
                temperature_c: null,
                tool: null,
                tip: "Sample tip for cooking",
                image_url: null,
              },
            ],
            substitutions: [
              {
                recipe_id: "sample-1",
                ingredient_idx: 0,
                suggestion: "Sample substitution",
              },
            ],
            images: [],
            comments: [],
            like_count: 0,
            liked_by_me: false,
          });
          setError(null); // Clear error since we're showing sample recipe
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Error loading recipe:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [id]);

  // Convert FullRecipe to FullRecipeDraft format for RecipeCard
  const convertToRecipeDraft = (recipe: FullRecipe) => {
    return {
      recipe: {
        title: recipe.title,
        description_md: recipe.description_md,
        yield_text: recipe.yield_text,
        total_time_min: recipe.total_time_min,
        active_time_min: recipe.active_time_min,
        cuisine: recipe.cuisine,
        difficulty: recipe.difficulty,
        diet_tags: recipe.diet_tags,
        allergen_tags: recipe.allergen_tags,
        hero_image_url: recipe.hero_image_url,
        user_id: recipe.user_id,
      },
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      substitutions: recipe.substitutions,
      images: recipe.images,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GridBackgroundPattern />

        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GridBackgroundPattern />

        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GridBackgroundPattern />

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">
            Recipe Not Found
          </h1>
          <p className="text-gray-500 mb-4">
            The recipe you're looking for doesn't exist or is private.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-orange/80 text-white rounded hover:bg-orange/60"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <GridBackgroundPattern />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 relative">
          <Link
            href="/"
            className="text-brown hover:text-brown/80 mb-4 inline-block font-advent-pro font-semibold uppercase"
          >
            ← Back to recipes
          </Link>

          {isOwner && (
            <div className="bg-blue-50 border border-brown/50 rounded-lg p-3 mb-4">
              <p className="text-brown text-sm font-advent-pro">
                You are the author of this recipe
              </p>
            </div>
          )}
        </div>

        {/* Hero Image */}
        {/* {recipe.hero_image_url && (
          <div className="mb-8">
            <img
              src={recipe.hero_image_url}
              alt={recipe.title}
              className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
        )} */}

        {/* Recipe Card */}
        <div className="relative h-full w-full flex items-center justify-center">
          <RecipeCard
            recipe={convertToRecipeDraft(recipe)}
            isComplete={false}
            className="h-full w-auto aspect-square"
          />
        </div>

        {/* Additional Images */}
        {/* {recipe.images.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 font-advent-pro">
              Gallery
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipe.images.map((image) => (
                <div key={image.id}>
                  <img
                    src={image.url}
                    alt={image.caption || "Recipe image"}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {image.caption && (
                    <p className="text-sm text-gray-600 mt-2">
                      {image.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )} */}

        {/* Recipe Info */}
        {/* <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 font-advent-pro">
            Recipe Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Visibility:</span>
              <span className="ml-2 font-medium">
                {recipe.public ? "Public" : "Private"}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Created:</span>
              <span className="ml-2 font-medium">
                {new Date(recipe.created_at).toLocaleDateString()}
              </span>
            </div>
            {recipe.updated_at !== recipe.created_at && (
              <div>
                <span className="text-gray-600">Updated:</span>
                <span className="ml-2 font-medium">
                  {new Date(recipe.updated_at).toLocaleDateString()}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Recipe ID:</span>
              <span className="ml-2 font-mono text-xs">{recipe.id}</span>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}
