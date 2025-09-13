// lib/dbClient.ts — Supabase DB client (full helpers)
// Drop this file into your Next.js app. Requires:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ========= Types (lightweight, hand-written to match your schema) =========
export type Profile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Recipe = {
  id: string;
  user_id: string | null;
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
};

export type Ingredient = {
  recipe_id: string;
  idx: number;
  quantity: number | null;
  unit: string | null;
  item: string;
  notes: string | null;
};

export type Step = {
  recipe_id: string;
  idx: number;
  instruction: string;
  timer_seconds: number | null;
  temperature_c: number | null;
  tool: string | null;
  tip: string | null;
  image_url: string | null;
};

export type Substitution = {
  recipe_id: string;
  ingredient_idx: number;
  suggestion: string;
};

export type ImageRow = {
  id: string;
  recipe_id: string | null;
  url: string;
  caption: string | null;
  created_at: string;
};

export type CommentRow = {
  id: string;
  recipe_id: string;
  user_id: string | null;
  body_md: string;
  created_at: string;
};

export type LikeRow = {
  user_id: string;
  recipe_id: string;
  created_at: string;
};

export type FeedRow = {
  id: string;
  slug: string | null;
  title: string;
  hero_image_url: string | null;
  minutes: number | null;
  diet_tags: string[] | null;
  created_at: string;
  author_handle: string | null;
};

// Insert/Update DTOs
export type RecipeInsert =
  & Partial<Omit<Recipe, "id" | "created_at" | "updated_at">>
  & { title: string };
export type RecipeUpdate = Partial<
  Omit<Recipe, "id" | "created_at" | "updated_at" | "user_id">
>;

export type FullRecipeDraft = {
  recipe: RecipeInsert & { user_id: string | null };
  ingredients?: Omit<Ingredient, "recipe_id">[];
  steps?: Omit<Step, "recipe_id">[];
  substitutions?: Omit<Substitution, "recipe_id">[];
  images?: Omit<ImageRow, "id" | "recipe_id" | "created_at">[];
};

export type FullRecipe = Recipe & {
  ingredients: Ingredient[];
  steps: Step[];
  substitutions: Substitution[];
  images: ImageRow[];
  comments: (CommentRow & { profiles: Profile | null })[];
  like_count: number;
  liked_by_me: boolean;
};

// ========= Client factory =========
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: { persistSession: true, autoRefreshToken: true },
  },
);

// ========= Auth Helpers =========
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider: "google" });
}

export async function signInWithMagicLink(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// ========= Storage Helper (images) =========
// Ensure you have a public bucket named 'recipes' with appropriate policies.
export async function uploadRecipeImage(file: File, userId: string) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("recipes").upload(path, file, {
    upsert: false,
  });
  if (up.error) throw up.error;
  const { data } = supabase.storage.from("recipes").getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

// ========= Feed & Search =========
export async function getFeedPage(
  { page = 1, pageSize = 24 }: { page?: number; pageSize?: number } = {},
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const q = supabase.from("feed").select("*", { count: "exact" }).order(
    "created_at",
    { ascending: false },
  ).range(from, to);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data || []) as FeedRow[], count: count || 0 };
}

export async function searchRecipes(
  q: string,
  { page = 1, pageSize = 24 } = {},
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from("recipes")
    .select(
      "id, slug, title, hero_image_url, total_time_min, active_time_min, diet_tags, created_at",
      { count: "exact" },
    )
    .or(`title.ilike.%${q}%,description_md.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  const rows = (data || []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    hero_image_url: (r as any).hero_image_url as string | null,
    minutes: (r as any).total_time_min ?? (r as any).active_time_min ?? null,
    diet_tags: (r as any).diet_tags as string[] | null,
    created_at: (r as any).created_at as string,
    author_handle: null,
  })) as FeedRow[];
  return { rows, count: count || 0 };
}

// ========= Full Recipe Fetch =========
export async function getFullRecipeBySlug(
  slug: string,
): Promise<FullRecipe | null> {
  // Aggregate nested relations via PostgREST
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
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }

  const recipe = data as any;

  // Like count and whether current user liked
  const [{ data: likeAgg, error: likeErr }, { data: me }] = await Promise.all([
    supabase.from("likes").select("recipe_id", { count: "exact", head: true })
      .eq("recipe_id", recipe.id),
    supabase.auth.getUser(),
  ]);
  if (likeErr) throw likeErr;
  const userId = me.user?.id;
  let liked_by_me = false;
  if (userId) {
    const { data: myLike } = await supabase.from("likes").select("recipe_id")
      .eq("recipe_id", recipe.id).eq("user_id", userId).maybeSingle();
    liked_by_me = !!myLike;
  }

  return {
    ...(recipe as Recipe),
    ingredients: (recipe.ingredients ?? []) as Ingredient[],
    steps: (recipe.steps ?? []) as Step[],
    substitutions: (recipe.substitutions ?? []) as Substitution[],
    images: (recipe.images ?? []) as ImageRow[],
    comments:
      (recipe.comments ?? []) as (CommentRow & { profiles: Profile | null })[],
    like_count: (likeAgg?.length ?? 0) as unknown as number, // count returned on head=true; supabase-js sets count on response object
    liked_by_me,
  };
}

// ========= Create / Update with children =========
export async function createRecipeWithChildren(
  draft: FullRecipeDraft,
): Promise<{ slug: string | null; id: string }> {
  // 1) Insert recipe
  const { data: recipe, error: recErr } = await supabase.from("recipes").insert(
    draft.recipe,
  ).select("*").single();
  if (recErr) throw recErr;

  const rid = recipe.id as string;

  // helper to batch insert child rows
  const batch = async <T>(table: string, rows?: T[]) => {
    if (!rows || rows.length === 0) return;
    const payload = rows.map((r: any) => ({ ...r, recipe_id: rid }));
    const { error } = await supabase.from(table).insert(payload as any);
    if (error) throw error;
  };

  try {
    await batch("ingredients", draft.ingredients);
    await batch("steps", draft.steps);
    await batch("substitutions", draft.substitutions);
    await batch("images", draft.images);
  } catch (e) {
    // best-effort rollback
    await supabase.from("recipes").delete().eq("id", rid);
    throw e;
  }

  return { slug: recipe.slug as string | null, id: rid };
}

export async function updateRecipeWithChildren(
  id: string,
  draft: FullRecipeDraft,
): Promise<void> {
  // 1) Update recipe
  const base: RecipeUpdate = { ...draft.recipe };
  delete (base as any).user_id;
  const { error: recErr } = await supabase.from("recipes").update(base).eq(
    "id",
    id,
  );
  if (recErr) throw recErr;

  // 2) Replace children (simple & safe for hackathon)
  const wipe = async (table: string) => {
    const { error } = await supabase.from(table).delete().eq("recipe_id", id);
    if (error) throw error;
  };
  const insert = async <T>(table: string, rows?: T[]) => {
    if (!rows || rows.length === 0) return;
    const payload = rows.map((r: any) => ({ ...r, recipe_id: id }));
    const { error } = await supabase.from(table).insert(payload as any);
    if (error) throw error;
  };

  await wipe("ingredients");
  await insert("ingredients", draft.ingredients);
  await wipe("steps");
  await insert("steps", draft.steps);
  await wipe("substitutions");
  await insert("substitutions", draft.substitutions);
  await wipe("images");
  await insert("images", draft.images);
}

export async function deleteRecipe(id: string) {
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw error;
}

// ========= Likes & Comments =========
export async function toggleLike(recipeId: string) {
  const me = await supabase.auth.getUser();
  const uid = me.data.user?.id;
  if (!uid) throw new Error("Not signed in");

  const { data: exists } = await supabase
    .from("likes")
    .select("user_id, recipe_id")
    .eq("user_id", uid)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (exists) {
    const { error } = await supabase.from("likes").delete().eq("user_id", uid)
      .eq("recipe_id", recipeId);
    if (error) throw error;
    return { liked: false };
  } else {
    const { error } = await supabase.from("likes").insert({
      user_id: uid,
      recipe_id: recipeId,
    });
    if (error) throw error;
    return { liked: true };
  }
}

export async function addComment(recipeId: string, body_md: string) {
  const me = await supabase.auth.getUser();
  const uid = me.data.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await supabase.from("comments").insert({
    recipe_id: recipeId,
    user_id: uid,
    body_md,
  }).select("*").single();
  if (error) throw error;
  return data as CommentRow;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from("comments").delete().eq(
    "id",
    commentId,
  );
  if (error) throw error;
}

// ========= Publish guard =========
export async function requireAuthOrThrow() {
  const u = await getCurrentUser();
  if (!u) throw new Error("Sign-in required");
  return u;
}

// ========= Example: publish flow =========
// Call after LLM structuring; pass arrays in proper idx order
export async function publishStructuredRecipe(structured: FullRecipeDraft) {
  const u = await getCurrentUser();
  if (!structured.recipe.user_id) structured.recipe.user_id = u?.id ?? null;
  return createRecipeWithChildren(structured);
}

// ========= Utility =========
export function minutesOf(r: Recipe): number | null {
  return r.total_time_min ?? r.active_time_min ?? null;
}
