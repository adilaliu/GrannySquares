import OpenAI from "openai";
import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/utils/auth-server";
import {
  authenticationRequiredResponse,
  badRequestResponse,
  errorResponse,
} from "@/utils/api-responses";

// Enhanced function to extract and fix JSON from AI responses
function extractJsonFromResponse(content: string): any {
  // Remove any leading/trailing whitespace
  content = content.trim();

  // Try parsing as-is first
  try {
    return JSON.parse(content);
  } catch {
    // If that fails, try to extract and fix JSON
    let extracted = content;

    // Try to extract JSON from markdown code blocks first
    const jsonBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/i);
    if (jsonBlockMatch) {
      extracted = jsonBlockMatch[1].trim();
    } else {
      // Look for JSON object pattern anywhere in the text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = jsonMatch[0];
      } else {
        // Clean up common prefixes
        extracted = content
          .replace(/^[^{]*/, "") // Remove everything before first {
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .replace(/^\s*["']?json["']?\s*:?\s*/i, "")
          .trim();
      }
    }

    // Now try to fix common JSON issues
    let fixed = extracted;

    // Fix incomplete strings (missing closing quotes)
    fixed = fixIncompleteStrings(fixed);

    // Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

    // Try to balance braces and brackets
    fixed = balanceBrackets(fixed);

    // Try parsing the fixed version
    try {
      return JSON.parse(fixed);
    } catch {
      // If still failing, try more aggressive fixes
      return attemptPartialParse(fixed);
    }
  }
}

// Fix incomplete strings by adding missing quotes
function fixIncompleteStrings(json: string): string {
  // Pattern to find string values that might be missing closing quotes
  // This is a simple heuristic - look for quote followed by content until newline or other structural chars
  const lines = json.split("\n");
  const fixedLines = lines.map((line) => {
    // Match patterns like: "key": "unclosed string value
    const unclosedStringMatch = line.match(/^(\s*"[^"]*":\s*"[^"]*)$/);
    if (unclosedStringMatch) {
      return unclosedStringMatch[1] + '"';
    }

    // Match patterns like: "key": "unclosed string value,
    const unclosedWithCommaMatch = line.match(/^(\s*"[^"]*":\s*"[^"]*),?\s*$/);
    if (
      unclosedWithCommaMatch &&
      !line.includes('"', unclosedWithCommaMatch[1].lastIndexOf('"') + 1)
    ) {
      return unclosedWithCommaMatch[1] + '"' + (line.endsWith(",") ? "," : "");
    }

    return line;
  });

  return fixedLines.join("\n");
}

// Balance brackets and braces
function balanceBrackets(json: string): string {
  const openBraces = (json.match(/{/g) || []).length;
  const closeBraces = (json.match(/}/g) || []).length;
  const openBrackets = (json.match(/\[/g) || []).length;
  const closeBrackets = (json.match(/]/g) || []).length;

  let result = json;

  // Add missing closing braces
  for (let i = 0; i < openBraces - closeBraces; i++) {
    result += "}";
  }

  // Add missing closing brackets
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    result += "]";
  }

  return result;
}

// Attempt to parse what we can from partial JSON
function attemptPartialParse(json: string): any {
  // Try to extract at least the recipe object structure
  const result: any = {};

  // Look for recipe object
  const recipeMatch = json.match(
    /"recipe"\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/,
  );
  if (recipeMatch) {
    try {
      const recipeJson = `{${recipeMatch[1]}}`;
      result.recipe = JSON.parse(recipeJson);
    } catch {
      // Extract what we can from recipe
      result.recipe = extractSimpleFields(recipeMatch[1]);
    }
  }

  // Look for ingredients array
  const ingredientsMatch = json.match(/"ingredients"\s*:\s*\[([\s\S]*?)\]/);
  if (ingredientsMatch) {
    try {
      result.ingredients = JSON.parse(`[${ingredientsMatch[1]}]`);
    } catch {
      result.ingredients = [];
    }
  }

  // Look for steps array
  const stepsMatch = json.match(/"steps"\s*:\s*\[([\s\S]*?)\]/);
  if (stepsMatch) {
    try {
      result.steps = JSON.parse(`[${stepsMatch[1]}]`);
    } catch {
      result.steps = [];
    }
  }

  // Ensure we have at least basic structure
  if (!result.recipe) {
    result.recipe = { title: "Recipe in Progress", public: true };
  }
  if (!result.ingredients) {
    result.ingredients = [];
  }
  if (!result.steps) {
    result.steps = [];
  }
  if (!result.substitutions) {
    result.substitutions = [];
  }
  if (!result.images) {
    result.images = [];
  }

  return result;
}

// Extract simple key-value pairs from partial JSON
function extractSimpleFields(content: string): any {
  const result: any = { public: true };

  // Extract title
  const titleMatch = content.match(/"title"\s*:\s*"([^"]*)"/);
  if (titleMatch) {
    result.title = titleMatch[1];
  } else {
    result.title = "Recipe in Progress";
  }

  // Extract description
  const descMatch = content.match(/"description_md"\s*:\s*"([^"]*)"/);
  if (descMatch) {
    result.description_md = descMatch[1];
  }

  // Extract other simple fields
  const fieldsToExtract = ["yield_text", "cuisine", "difficulty"];
  fieldsToExtract.forEach((field) => {
    const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, "i");
    const match = content.match(regex);
    if (match) {
      result[field] = match[1];
    }
  });

  // Extract numeric fields
  const numericFields = ["total_time_min", "active_time_min"];
  numericFields.forEach((field) => {
    const regex = new RegExp(`"${field}"\\s*:\\s*(\\d+)`, "i");
    const match = content.match(regex);
    if (match) {
      result[field] = parseInt(match[1]);
    }
  });

  return result;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for analyzing natural language recipes
const SYSTEM_PROMPT =
  `You are an expert recipe analyzer. Your task is to convert natural language recipe descriptions into well-structured recipe data in JSON format.

CRITICAL INSTRUCTIONS:
1. Return ONLY the JSON object - NO markdown formatting, NO code blocks, NO explanations, NO additional text
2. Do NOT wrap the response in \`\`\`json or \`\`\` - return pure JSON only
3. Do NOT include any conversational text like "I'm sorry" or "Here's the recipe"
4. Start your response directly with { and end with }
5. Use the exact field names and structure specified below
6. Extract all possible information from the input text
7. If information is missing or unclear, use reasonable defaults or null
8. Be thorough in extracting ingredients, steps, and metadata
9. Preserve cooking tips, temperatures, and timing information
10. Infer difficulty level based on complexity of techniques and time required

Required JSON structure:
{
  "recipe": {
    "title": "string (required - recipe name)",
    "description_md": "string or null (brief description)",
    "yield_text": "string or null (e.g., 'Serves 4', '12 cookies')",
    "total_time_min": "number or null (total time in minutes)",
    "active_time_min": "number or null (active cooking time in minutes)",
    "cuisine": "string or null (e.g., 'Italian', 'Mexican')",
    "difficulty": "easy|medium|hard or null",
    "diet_tags": "array of strings or null (e.g., ['vegetarian', 'gluten-free'])",
    "allergen_tags": "array of strings or null (e.g., ['nuts', 'dairy', 'eggs'])",
    "hero_image_url": "string or null",
    "nutrition_json": "object or null",
    "public": true
  },
  "ingredients": [
    {
      "idx": "number (0-based index)",
      "quantity": "number or null (amount)",
      "unit": "string or null (cup, tbsp, lb, etc.)",
      "item": "string (ingredient name)",
      "notes": "string or null (preparation notes)"
    }
  ],
  "steps": [
    {
      "idx": "number (0-based index)",
      "instruction": "string (detailed step instruction)",
      "timer_seconds": "number or null (timing for this step)",
      "temperature_c": "number or null (temperature in Celsius)",
      "tool": "string or null (equipment needed)",
      "tip": "string or null (helpful tip for this step)",
      "image_url": "string or null"
    }
  ],
  "substitutions": [
    {
      "ingredient_idx": "number (index of ingredient to substitute)",
      "suggestion": "string (substitution suggestion - ONLY include if explicitly mentioned in original text)"
    }
  ],
  "images": []
}

PARSING GUIDELINES:
- Extract quantities as numbers when possible (convert fractions: 1/2 = 0.5, 1/4 = 0.25, etc.)
- Common units: cup, tbsp, tsp, lb, oz, g, kg, ml, l, clove, pinch, dash
- For temperatures, convert to Celsius if given in Fahrenheit
- For times, convert everything to minutes for consistency
- Infer cooking methods and tools from the instructions
- ONLY include substitutions that are explicitly mentioned in the original recipe text or when you are absolutely certain they would be appropriate
- DO NOT automatically suggest substitutions unless they were mentioned or clearly implied in the original text
- Set difficulty: easy (30min, basic techniques), medium (30-60min, some skill), hard (60min+, advanced techniques)
- Extract dietary information (vegetarian, vegan, gluten-free, dairy-free, etc.)
- Common allergens: nuts, dairy, eggs, soy, shellfish, fish, wheat, sesame

Example input: "Make chocolate chip cookies. Mix 2 cups flour, 1 tsp baking soda. Cream 1 cup butter with 3/4 cup sugar. Bake at 375F for 10 minutes."

FINAL REMINDER: 
- Your response must be valid JSON that can be parsed with JSON.parse()
- Do NOT use markdown formatting
- Do NOT include any text before or after the JSON
- Start with { and end with }`;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return authenticationRequiredResponse();
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return badRequestResponse(
        "Recipe text must be at least 10 characters long",
      );
    }

    // For streaming, we'll use Server-Sent Events
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(
            encoder.encode(`data: ${
              JSON.stringify({
                type: "status",
                message: "Analyzing recipe with GPT-4o...",
              })
            }\n\n`),
          );

          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: SYSTEM_PROMPT,
              },
              {
                role: "user",
                content:
                  `Please analyze this recipe and convert it to structured JSON format:\n\n${text}`,
              },
            ],
            temperature: 0.1, // Low temperature for consistent structured output
            stream: true,
          });

          let accumulatedContent = "";

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              accumulatedContent += content;

              // Send streaming content
              controller.enqueue(
                encoder.encode(`data: ${
                  JSON.stringify({
                    type: "content",
                    content: content,
                    accumulated: accumulatedContent,
                  })
                }\n\n`),
              );
            }
          }

          // Try to extract and parse the final JSON
          try {
            const parsedRecipe = extractJsonFromResponse(accumulatedContent);

            // The new parsing function should always return something valid
            // but let's add some final safety checks
            if (!parsedRecipe.recipe) {
              parsedRecipe.recipe = {
                title: "Recipe in Progress",
                public: true,
              };
            }
            if (!parsedRecipe.recipe.title) {
              parsedRecipe.recipe.title = "Recipe in Progress";
            }
            if (!Array.isArray(parsedRecipe.ingredients)) {
              parsedRecipe.ingredients = [];
            }
            if (!Array.isArray(parsedRecipe.steps)) {
              parsedRecipe.steps = [];
            }
            if (!Array.isArray(parsedRecipe.substitutions)) {
              parsedRecipe.substitutions = [];
            }
            if (!Array.isArray(parsedRecipe.images)) {
              parsedRecipe.images = [];
            }

            // Send final complete result - should always succeed now
            controller.enqueue(
              encoder.encode(`data: ${
                JSON.stringify({
                  type: "complete",
                  recipe: parsedRecipe,
                })
              }\n\n`),
            );
          } catch (parseError) {
            console.error("Failed to parse generated recipe JSON:", parseError);
            console.error(
              "Raw content:",
              accumulatedContent.substring(0, 500) + "...",
            );

            // Fallback: send a minimal valid recipe instead of erroring
            const fallbackRecipe = {
              recipe: {
                title: "Recipe Analysis Failed",
                description_md:
                  "There was an issue parsing the recipe. Please try again.",
                public: true,
              },
              ingredients: [],
              steps: [],
              substitutions: [],
              images: [],
            };

            controller.enqueue(
              encoder.encode(`data: ${
                JSON.stringify({
                  type: "complete",
                  recipe: fallbackRecipe,
                })
              }\n\n`),
            );
          }

          controller.close();
        } catch (error) {
          console.error("Recipe analysis error:", error);
          controller.enqueue(
            encoder.encode(`data: ${
              JSON.stringify({
                type: "error",
                error: "Failed to analyze recipe",
              })
            }\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Stream setup error:", error);
    return errorResponse("Failed to setup recipe analysis stream");
  }
}
