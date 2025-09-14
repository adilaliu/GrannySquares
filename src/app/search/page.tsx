"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getRecipes } from "@/utils/recipes-api";
import GridBackgroundPattern from "../components/GridBackgroundPattern";
import CafeBorder from "../components/CafeBorder";
import SearchBar from "../components/SearchBar";

interface Recipe {
  id: string;
  slug: string;
  title: string;
  description_md?: string;
  hero_image_url?: string;
  total_time_min?: number;
  active_time_min?: number;
  diet_tags?: string[];
  created_at: string;
  updated_at: string;
}

interface SearchResponse {
  data: Recipe[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 24,
    total: 0,
    totalPages: 0,
  });

  // Get search query from URL parameters
  useEffect(() => {
    const query = searchParams.get("q") || "";
    setSearchQuery(query);
    if (query) {
      performSearch(query, 1);
    }
  }, [searchParams]);

  const performSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    // Reset results for new search
    if (page === 1) {
      setSearchResults([]);
    }

    try {
      const response = (await getRecipes({
        search: query,
        page,
        pageSize: 24,
      })) as SearchResponse;

      setSearchResults(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError("Failed to search recipes. Please try again.");
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Update URL with search query
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    router.push(`/search?${params.toString()}`);
  };

  const handleLoadMore = async () => {
    if (pagination.page < pagination.totalPages) {
      setLoading(true);
      try {
        const response = (await getRecipes({
          search: searchQuery,
          page: pagination.page + 1,
          pageSize: 24,
        })) as SearchResponse;

        // Append new results to existing ones
        setSearchResults((prev) => [...prev, ...response.data]);
        setPagination(response.pagination);
      } catch (err) {
        setError("Failed to load more recipes. Please try again.");
        console.error("Load more error:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRecipeClick = (recipe: Recipe) => {
    router.push(`/recipes/${recipe.slug}`);
  };

  return (
    <div className="relative min-h-screen">
      <GridBackgroundPattern />

      {/* Cafe Border */}
      <div className="absolute inset-0 w-full h-full">
        <CafeBorder top={0} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center text-brown hover:text-orange-600 font-advent-pro font-semibold transition-colors duration-200"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </button>
        </div>

        {/* Header with Search */}
        <div className="text-center mb-12">
          <h1 className="text-4xl mb-6 text-brown font-advent-pro font-extrabold">
            SEARCH RECIPES
          </h1>

          <div className="max-w-lg mx-auto">
            <SearchBar
              placeholder="Search by dish, flavour, or country..."
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
            />
          </div>

          {/* Search Info */}
          {searchQuery && (
            <div className="mt-4 text-orange font-advent-pro font-medium">
              {loading ? (
                "Searching..."
              ) : error ? (
                <span className="text-red-600">{error}</span>
              ) : (
                `Found ${pagination.total} recipes for "${searchQuery}"`
              )}
            </div>
          )}
        </div>

        {/* Results Grid */}
        {!loading && !error && searchResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {searchResults.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                onClick={() => handleRecipeClick(recipe)}
              >
                {/* Recipe Image */}
                <div className="aspect-square relative overflow-hidden">
                  {/* <img
                    src={
                      recipe.hero_image_url ||
                      `https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=400&h=400&fit=crop&crop=center`
                    }
                    alt={recipe.title}
                    className="w-full h-full object-cover transition-transform duration-200 hover:scale-110"
                  /> */}
                  {/* Time badges */}
                  {recipe.total_time_min && (
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      {recipe.total_time_min}m
                    </div>
                  )}
                </div>

                {/* Recipe Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-brown font-advent-pro text-lg mb-2 line-clamp-2">
                    {recipe.title}
                  </h3>

                  {recipe.description_md && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                      {recipe.description_md
                        .replace(/[#*_`]/g, "")
                        .substring(0, 120)}
                      ...
                    </p>
                  )}

                  {/* Diet Tags */}
                  {recipe.diet_tags && recipe.diet_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {recipe.diet_tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {recipe.diet_tags.length > 3 && (
                        <span className="text-gray-500 text-xs">
                          +{recipe.diet_tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Timing Info */}
                  <div className="flex items-center text-xs text-gray-500 mt-2">
                    {recipe.active_time_min && (
                      <span className="mr-4">
                        Active: {recipe.active_time_min}m
                      </span>
                    )}
                    {recipe.total_time_min && (
                      <span>Total: {recipe.total_time_min}m</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!loading &&
          !error &&
          searchResults.length > 0 &&
          pagination.page < pagination.totalPages && (
            <div className="text-center">
              <button
                onClick={handleLoadMore}
                className="inline-flex items-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold font-advent-pro rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Load More ({pagination.total - searchResults.length} remaining)
              </button>
            </div>
          )}

        {/* Empty State */}
        {!loading && !error && searchQuery && searchResults.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-advent-pro font-bold text-brown mb-2">
              No recipes found
            </h2>
            <p className="text-gray-600 font-advent-pro">
              Try searching with different keywords or browse our featured
              recipes.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 inline-flex items-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold font-advent-pro rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Browse Featured Recipes
            </button>
          </div>
        )}

        {/* Initial State */}
        {!searchQuery && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍳</div>
            <h2 className="text-2xl font-advent-pro font-bold text-brown mb-2">
              Ready to find your next favorite recipe?
            </h2>
            <p className="text-gray-600 font-advent-pro">
              Enter a search term above to discover delicious granny square
              recipes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen">
          <GridBackgroundPattern />
          <div className="absolute inset-0 w-full h-full">
            <CafeBorder top={0} />
          </div>
          <div className="relative z-10 container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-2xl font-advent-pro font-bold text-brown mb-2">
                Loading search...
              </h2>
            </div>
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
