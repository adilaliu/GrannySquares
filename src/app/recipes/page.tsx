"use client";

import { useState, useEffect } from "react";
import { getRecipes } from "@/utils/recipes-api";
import Link from "next/link";

interface RecipeCard {
  id: string;
  slug: string | null;
  title: string;
  hero_image_url: string | null;
  minutes: number | null;
  diet_tags: string[] | null;
  created_at: string;
  author_handle: string | null;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    pageSize: 12,
  });

  const loadRecipes = async (searchTerm = "", pageNum = 1) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getRecipes({
        search: searchTerm || undefined,
        page: pageNum,
        pageSize: pagination.pageSize,
      });

      if (result.success) {
        setRecipes(result.data || []);
        setPagination(result.pagination || pagination);
      } else {
        setError(result.error || "Failed to load recipes");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error loading recipes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadRecipes(search, 1);
  };

  const formatTime = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getRecipeUrl = (recipe: RecipeCard) => {
    return `/recipes/${recipe.slug || recipe.id}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Recipe Collection
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover delicious recipes from our community. Search by name,
            ingredient, or browse all recipes.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Search
            </button>
          </div>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading recipes...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => loadRecipes(search, page)}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Results Info */}
        {!loading && !error && (
          <div className="mb-6">
            <p className="text-gray-600 text-center">
              {search
                ? `Found ${pagination.total} recipe${
                    pagination.total !== 1 ? "s" : ""
                  } for "${search}"`
                : `Showing ${pagination.total} recipe${
                    pagination.total !== 1 ? "s" : ""
                  }`}
            </p>
          </div>
        )}

        {/* Recipe Grid */}
        {!loading && !error && recipes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {recipes.map((recipe) => (
              <Link key={recipe.id} href={getRecipeUrl(recipe)}>
                <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  {/* Image */}
                  <div className="h-48 bg-gray-200 relative">
                    {/* {recipe.hero_image_url ? (
                      <img
                        src={recipe.hero_image_url}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-4xl">🍳</span>
                      </div>
                    )} */}

                    {/* Time overlay */}
                    {recipe.minutes && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                        {formatTime(recipe.minutes)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                      {recipe.title}
                    </h3>

                    {/* Tags */}
                    {recipe.diet_tags && recipe.diet_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {recipe.diet_tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {recipe.diet_tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{recipe.diet_tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="text-sm text-gray-500">
                      {recipe.author_handle && <p>by {recipe.author_handle}</p>}
                      <p>{new Date(recipe.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && recipes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {search ? "No recipes found" : "No recipes available"}
            </h3>
            <p className="text-gray-600 mb-4">
              {search
                ? `Try searching for something else or browse all recipes.`
                : "Check back later for new recipes."}
            </p>
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  loadRecipes("", 1);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Show All Recipes
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex space-x-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((pageNum) => {
                  if (pagination.totalPages <= 7) return true;
                  if (pageNum === 1 || pageNum === pagination.totalPages)
                    return true;
                  if (Math.abs(pageNum - page) <= 2) return true;
                  return false;
                })
                .map((pageNum, index, array) => {
                  const prevPageNum = index > 0 ? array[index - 1] : 0;
                  const showEllipsis = pageNum - prevPageNum > 1;

                  return (
                    <div key={pageNum} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-2 py-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-2 border rounded ${
                          page === pageNum
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    </div>
                  );
                })}
            </div>

            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= pagination.totalPages}
              className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
