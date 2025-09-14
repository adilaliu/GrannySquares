import OpenAI from "openai";
import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/utils/auth-server";
import {
  authenticationRequiredResponse,
  badRequestResponse,
  errorResponse,
  successResponse,
} from "@/utils/api-responses";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize S3/R2 client
const s3Client = new S3Client({
  region: "auto", // Cloudflare R2 uses "auto"
  endpoint: process.env.S3_API, // R2 S3-compatible endpoint
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return authenticationRequiredResponse();
    }

    const body = await request.json();
    const { analyzedRecipe } = body;

    if (!analyzedRecipe || !analyzedRecipe.recipe) {
      return badRequestResponse("Analyzed recipe data is required");
    }

    // Extract recipe details for the prompt
    const { recipe, ingredients } = analyzedRecipe;
    const dishDescription = `${recipe.title}${
      recipe.description_md ? `: ${recipe.description_md}` : ""
    }`;

    // Create a detailed description of the dish for the image prompt
    const mainIngredients = ingredients
      .slice(0, 5) // Take first 5 ingredients
      .map((ing: any) => ing.item)
      .join(", ");

    const imagePrompt =
      `Generate a 16x16 pixel-art image in the style of crocheted granny squares, with bright, saturated yet slightly pastel colors, as if each pixel were a small crocheted stitch. The scene should depict ${dishDescription} with simple, blocky shapes that clearly show the main ingredients (${mainIngredients}) while keeping a cozy, handmade aesthetic. Maintain a balanced color palette with clear contrast between ingredients. The background should be soft and unobtrusive, often a solid or subtly checkered pastel color, to highlight the food. The final look should be cute, vibrant, and highly stylized, prioritizing charm and recognizability over realism. Every pixel should feel like a piece of crochet yarn, creating a soft, tactile feel.`;

    // Generate the image using DALL-E
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = imageResponse.data?.[0]?.url;
    if (!imageUrl) {
      return errorResponse("Failed to generate image");
    }

    // Download the generated image
    const imageData = await fetch(imageUrl);
    if (!imageData.ok) {
      return errorResponse("Failed to download generated image");
    }

    const imageBuffer = await imageData.arrayBuffer();

    // Generate a unique filename
    const timestamp = Date.now();
    const fileName = `recipe-images/${
      recipe.title.toLowerCase().replace(/[^a-z0-9]/g, "-")
    }-${timestamp}.png`;

    // Upload to S3/R2
    const bucketName = process.env.S3_BUCKET_NAME;
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName, // Use the actual bucket name, not the token
      Key: fileName,
      Body: new Uint8Array(imageBuffer),
      ContentType: "image/png",
      ACL: "public-read", // Make the image publicly accessible
    });

    await s3Client.send(uploadCommand);

    // Construct the public URL
    const publicUrl = `${process.env.S3_PUBLIC}/${bucketName}/${fileName}`;

    return successResponse({
      imageUrl: publicUrl,
      prompt: imagePrompt,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return errorResponse("Failed to generate and upload image");
  }
}
