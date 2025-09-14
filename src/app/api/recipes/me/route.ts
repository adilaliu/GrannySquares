import { NextRequest } from "next/server";
import {
  createAuthenticatedClient,
  getAuthenticatedUser,
} from "@/utils/auth-server";
import {
  authenticationRequiredResponse,
  errorResponse,
  paginatedResponse,
} from "@/utils/api-responses";

// GET /api/recipes/me - Get current user's recipes (both public and private)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return authenticationRequiredResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "24");
    const includePrivate = searchParams.get("includePrivate") !== "false";

    const supabase = await createAuthenticatedClient();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("recipes")
      .select(
        `
        id,
        slug,
        title,
        description_md,
        hero_image_url,
        total_time_min,
        active_time_min,
        diet_tags,
        public,
        created_at,
        updated_at
      `,
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    // If not including private, filter to public only
    if (!includePrivate) {
      query = query.eq("public", true);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return paginatedResponse(data || [], {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error("Error fetching user recipes:", error);
    return errorResponse("Failed to fetch your recipes");
  }
}
