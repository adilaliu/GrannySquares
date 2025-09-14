import { NextRequest } from "next/server";
import {
  createAuthenticatedClient,
  getAuthenticatedUser,
} from "@/utils/auth-server";
import {
  deleteRecipe,
  FullRecipeDraft,
  getFullRecipeBySlug,
  updateRecipeWithChildren,
} from "@/db/client";
import {
  authenticationRequiredResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  successResponseWithMessage,
} from "@/utils/api-responses";

// Helper to get recipe and check ownership
async function getRecipeWithOwnershipCheck(idOrSlug: string, userId?: string) {
  const supabase = await createAuthenticatedClient();

  // Try to get by ID first, then by slug
  let recipe;

  // Check if it's a UUID (ID) or slug
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug,
    );

  if (isUuid) {
    // Get full recipe data by ID (same as getFullRecipeBySlug but by ID)
    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        ingredients (*),
        steps (*),
        substitutions (*),
        images (*),
        comments (*, profiles:profiles!comments_user_id_fkey (*))
      `)
      .eq("id", idOrSlug)
      .single();

    if (error) return null;

    // Add like count and liked_by_me data (same as getFullRecipeBySlug)
    const [{ data: likeAgg, error: likeErr }, { data: me }] = await Promise.all(
      [
        supabase.from("likes").select("recipe_id", {
          count: "exact",
          head: true,
        })
          .eq("recipe_id", data.id),
        supabase.auth.getUser(),
      ],
    );
    if (likeErr) return null;

    const currentUserId = me.user?.id;
    let liked_by_me = false;
    if (currentUserId) {
      const { data: myLike } = await supabase.from("likes").select("recipe_id")
        .eq("recipe_id", data.id).eq("user_id", currentUserId).maybeSingle();
      liked_by_me = !!myLike;
    }

    recipe = {
      ...data,
      ingredients: data.ingredients ?? [],
      steps: data.steps ?? [],
      substitutions: data.substitutions ?? [],
      images: data.images ?? [],
      comments: data.comments ?? [],
      like_count: (likeAgg?.length ?? 0),
      liked_by_me,
    };
  } else {
    // Try to get by slug using the existing function
    recipe = await getFullRecipeBySlug(idOrSlug);
  }

  if (!recipe) return null;

  return {
    recipe,
    isOwner: userId ? recipe.user_id === userId : false,
    canView: recipe.public || (userId && recipe.user_id === userId),
  };
}

// GET /api/recipes/[id] - Get a specific recipe by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();

    const result = await getRecipeWithOwnershipCheck(id, user?.id);

    if (!result) {
      return notFoundResponse("Recipe");
    }

    if (!result.canView) {
      return forbiddenResponse("Recipe is private");
    }

    return successResponse({
      ...result.recipe,
      isOwner: result.isOwner,
    });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return errorResponse("Failed to fetch recipe");
  }
}

// PUT /api/recipes/[id] - Update a recipe (author only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();

    if (!user) {
      return authenticationRequiredResponse();
    }

    const result = await getRecipeWithOwnershipCheck(id, user.id);

    if (!result) {
      return notFoundResponse("Recipe");
    }

    if (!result.isOwner) {
      return forbiddenResponse("Only the recipe author can update this recipe");
    }

    const body = await request.json();

    // Create update draft (exclude user_id from updates)
    const draft: FullRecipeDraft = {
      recipe: {
        ...body.recipe,
        // Don't allow changing the owner
        user_id: result.recipe.user_id,
      },
      ingredients: body.ingredients || [],
      steps: body.steps || [],
      substitutions: body.substitutions || [],
      images: body.images || [],
    };

    // Use the recipe ID (not slug) for updates
    const recipeId = result.recipe.id;
    await updateRecipeWithChildren(recipeId, draft);

    return successResponseWithMessage("Recipe updated successfully");
  } catch (error) {
    console.error("Error updating recipe:", error);
    return errorResponse("Failed to update recipe");
  }
}

// DELETE /api/recipes/[id] - Delete a recipe (author only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();

    if (!user) {
      return authenticationRequiredResponse();
    }

    const result = await getRecipeWithOwnershipCheck(id, user.id);

    if (!result) {
      return notFoundResponse("Recipe");
    }

    if (!result.isOwner) {
      return forbiddenResponse("Only the recipe author can delete this recipe");
    }

    // Use the recipe ID (not slug) for deletion
    const recipeId = result.recipe.id;
    await deleteRecipe(recipeId);

    return successResponseWithMessage("Recipe deleted successfully");
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return errorResponse("Failed to delete recipe");
  }
}
