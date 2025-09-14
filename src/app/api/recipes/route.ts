import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/utils/auth-server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { FullRecipeDraft, getFeedPage, searchRecipes } from "@/db/client";
import {
  authenticationRequiredResponse,
  badRequestResponse,
  errorResponse,
  paginatedResponse,
  successResponse,
} from "@/utils/api-responses";

// GET /api/recipes - Get all public recipes (with optional search)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "24");

    let result;
    if (search) {
      result = await searchRecipes(search, { page, pageSize });
    } else {
      result = await getFeedPage({ page, pageSize });
    }

    return paginatedResponse(result.rows, {
      page,
      pageSize,
      total: result.count,
      totalPages: Math.ceil(result.count / pageSize),
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return errorResponse("Failed to fetch recipes");
  }
}

// POST /api/recipes - Create a new recipe (auth required)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return authenticationRequiredResponse();
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return badRequestResponse("Title is required");
    }

    // Create recipe draft with user_id
    const draft: FullRecipeDraft = {
      recipe: {
        ...body.recipe,
        user_id: user.id,
        title: body.title || body.recipe?.title,
        public: body.recipe?.public ?? true,
      },
      ingredients: body.ingredients || [],
      steps: body.steps || [],
      substitutions: body.substitutions || [],
      images: body.images || [],
    };

    console.log("Creating recipe with user_id:", user.id);
    console.log("Recipe draft:", JSON.stringify(draft.recipe, null, 2));

    // Use server-side Supabase client with proper auth context
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const result = await createRecipeWithChildrenServer(supabase, draft);

    return successResponse({
      id: result.id,
      slug: result.slug,
    }, 201);
  } catch (error) {
    console.error("Error creating recipe:", error);
    return errorResponse("Failed to create recipe");
  }
}

// Server-side version of createRecipeWithChildren that uses authenticated Supabase client
async function createRecipeWithChildrenServer(
  supabase: any,
  draft: FullRecipeDraft,
): Promise<{ slug: string | null; id: string }> {
  // 1) Insert recipe
  const { data: recipe, error: recErr } = await supabase.from("recipes").insert(
    draft.recipe,
  ).select("*").single();

  if (recErr) {
    console.error("Recipe insert error:", recErr);
    throw recErr;
  }

  const rid = recipe.id as string;
  console.log("Recipe created successfully with ID:", rid);

  // helper to batch insert child rows
  const batch = async <T>(table: string, rows?: T[]) => {
    if (!rows || rows.length === 0) return;
    const payload = rows.map((r: any) => ({ ...r, recipe_id: rid }));
    const { error } = await supabase.from(table).insert(payload as any);
    if (error) {
      console.error(`Error inserting ${table}:`, error);
      throw error;
    }
  };

  try {
    await batch("ingredients", draft.ingredients);
    await batch("steps", draft.steps);
    await batch("substitutions", draft.substitutions);
    await batch("images", draft.images);
  } catch (e) {
    // best-effort rollback
    console.error("Error creating child records, attempting rollback:", e);
    await supabase.from("recipes").delete().eq("id", rid);
    throw e;
  }

  return { slug: recipe.slug as string | null, id: rid };
}
