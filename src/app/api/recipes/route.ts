import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/utils/auth-server";
import {
  createRecipeWithChildren,
  FullRecipeDraft,
  getFeedPage,
  Recipe,
  searchRecipes,
} from "@/db/client";
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

    const result = await createRecipeWithChildren(draft);

    return successResponse({
      id: result.id,
      slug: result.slug,
    }, 201);
  } catch (error) {
    console.error("Error creating recipe:", error);
    return errorResponse("Failed to create recipe");
  }
}
