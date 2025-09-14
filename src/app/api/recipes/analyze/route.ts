import OpenAI from "openai";
import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/utils/auth-server";
import {
  authenticationRequiredResponse,
  badRequestResponse,
  errorResponse,
} from "@/utils/api-responses";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for analyzing natural language recipes
const SYSTEM_PROMPT =
  `You are an expert recipe analyzer. Your task is to convert natural language recipe descriptions into well-structured recipe data in JSON format.

IMPORTANT INSTRUCTIONS:
1. Return ONLY valid JSON - no markdown, no explanations, no additional text
2. Use the exact field names and structure specified below
3. Extract all possible information from the input text
4. If information is missing or unclear, use reasonable defaults or null
5. Be thorough in extracting ingredients, steps, and metadata
6. Preserve cooking tips, temperatures, and timing information
7. Infer difficulty level based on complexity of techniques and time required

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
      "suggestion": "string (substitution suggestion)"
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
- Look for substitution suggestions in the text
- Set difficulty: easy (30min, basic techniques), medium (30-60min, some skill), hard (60min+, advanced techniques)
- Extract dietary information (vegetarian, vegan, gluten-free, dairy-free, etc.)
- Common allergens: nuts, dairy, eggs, soy, shellfish, fish, wheat, sesame

Example input: "Make chocolate chip cookies. Mix 2 cups flour, 1 tsp baking soda. Cream 1 cup butter with 3/4 cup sugar. Bake at 375F for 10 minutes."

Remember: Return ONLY the JSON object, nothing else.`;

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

          // Try to parse the final JSON
          try {
            const parsedRecipe = JSON.parse(accumulatedContent.trim());

            // Validate the structure
            if (!parsedRecipe.recipe || !parsedRecipe.recipe.title) {
              throw new Error("Invalid recipe structure");
            }

            // Send final complete result
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
            controller.enqueue(
              encoder.encode(`data: ${
                JSON.stringify({
                  type: "error",
                  error: "Failed to generate valid recipe structure",
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
