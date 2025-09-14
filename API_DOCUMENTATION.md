# Recipe API Documentation

This API provides comprehensive recipe management with proper authentication and authorization. Recipes can be viewed globally but only managed by their authors.

## Authentication

The API uses Supabase authentication via cookies. Users must be authenticated to create, update, or delete recipes.

## Base URL

All endpoints are relative to your Next.js app's base URL: `/api/recipes`

## Endpoints

### Public Access (No Authentication Required)

#### GET /api/recipes

Get all public recipes with optional search and pagination.

**Query Parameters:**

- `search` (optional): Search term to filter recipes by title and description
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Number of recipes per page (default: 24)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "recipe-slug",
      "title": "Recipe Title",
      "hero_image_url": "https://...",
      "minutes": 30,
      "diet_tags": ["vegetarian"],
      "created_at": "2025-01-01T00:00:00Z",
      "author_handle": "username"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 24,
    "total": 100,
    "totalPages": 5
  }
}
```

#### GET /api/recipes/[id]

Get a specific recipe by ID or slug. Returns full recipe details if public or if user is the author.

**Parameters:**

- `id`: Recipe UUID or slug

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Recipe Title",
    "description_md": "Recipe description...",
    "ingredients": [...],
    "steps": [...],
    "public": true,
    "created_at": "2025-01-01T00:00:00Z"
  },
  "isOwner": false
}
```

### Authenticated Access (Authentication Required)

#### POST /api/recipes

Create a new recipe. User must be authenticated.

**Request Body:**

```json
{
  "title": "Recipe Title",
  "recipe": {
    "description_md": "Recipe description",
    "yield_text": "4 servings",
    "total_time_min": 30,
    "difficulty": "easy",
    "diet_tags": ["vegetarian"],
    "public": true
  },
  "ingredients": [
    {
      "idx": 0,
      "quantity": 2,
      "unit": "cups",
      "item": "flour",
      "notes": "all-purpose"
    }
  ],
  "steps": [
    {
      "idx": 0,
      "instruction": "Mix ingredients together",
      "timer_seconds": 300,
      "temperature_c": 180
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "recipe-slug"
  }
}
```

#### PUT /api/recipes/[id]

Update an existing recipe. Only the recipe author can update their recipes.

**Parameters:**

- `id`: Recipe UUID or slug

**Request Body:** Same format as POST (only include fields you want to update)

**Response:**

```json
{
  "success": true,
  "message": "Recipe updated successfully"
}
```

#### DELETE /api/recipes/[id]

Delete a recipe. Only the recipe author can delete their recipes.

**Parameters:**

- `id`: Recipe UUID or slug

**Response:**

```json
{
  "success": true,
  "message": "Recipe deleted successfully"
}
```

#### GET /api/recipes/me

Get the current user's recipes (both public and private).

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Number of recipes per page (default: 24)
- `includePrivate` (optional): Include private recipes (default: true)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "My Recipe",
      "public": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common HTTP status codes:

- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Client-side Usage

Use the provided utility functions in `/src/utils/recipes-api.ts`:

```typescript
import {
  getRecipes,
  createRecipe,
  formatRecipeForAPI,
} from "@/utils/recipes-api";

// Get public recipes
const result = await getRecipes({ search: "pasta", page: 1 });

// Create a recipe
const recipeData = formatRecipeForAPI({
  title: "My Recipe",
  description: "A delicious recipe",
  ingredients: [{ idx: 0, item: "flour", quantity: 2, unit: "cups" }],
  steps: [{ idx: 0, instruction: "Mix ingredients" }],
});
const createResult = await createRecipe(recipeData);
```

## Authorization Rules

- **Public recipes**: Anyone can view
- **Private recipes**: Only the author can view
- **Recipe management**: Only the author can create, update, or delete their recipes
- **Authentication**: Required for all write operations and viewing private recipes

## Database Schema

The API uses Supabase with Row Level Security (RLS) policies that automatically enforce authorization rules at the database level. This ensures data security even if application-level checks are bypassed.

Key tables:

- `recipes`: Main recipe data
- `ingredients`: Recipe ingredients (linked to recipes)
- `steps`: Recipe instructions (linked to recipes)
- `substitutions`: Ingredient substitutions (linked to recipes)
- `images`: Recipe images (linked to recipes)
- `profiles`: User profiles (linked to auth.users)
