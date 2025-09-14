import OpenAI from "openai";
import { NextRequest } from "next/server";
import {
  badRequestResponse,
  errorResponse,
  successResponse,
} from "@/utils/api-responses";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File;

    if (!file) {
      return badRequestResponse("No audio file provided");
    }

    // Convert File to Buffer for OpenAI API
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a File-like object for OpenAI
    const audioFile = new File([buffer], file.name, {
      type: file.type || "audio/wav",
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    return successResponse({
      text: transcription.text,
      words: transcription.words,
      duration: transcription.duration,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return errorResponse("Failed to transcribe audio");
  }
}
