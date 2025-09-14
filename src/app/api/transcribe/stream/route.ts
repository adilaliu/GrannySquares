import OpenAI from "openai";
import { NextRequest } from "next/server";
import { badRequestResponse, errorResponse } from "@/utils/api-responses";

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

    // For streaming, we'll use Server-Sent Events
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            response_format: "verbose_json",
            timestamp_granularities: ["word"],
          });

          // Simulate streaming by sending words progressively
          if (transcription.words) {
            for (const word of transcription.words) {
              const data = {
                type: "word",
                word: word.word,
                start: word.start,
                end: word.end,
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
              );

              // Add a small delay to simulate real-time streaming
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }

          // Send final complete transcription
          const finalData = {
            type: "complete",
            text: transcription.text,
            duration: transcription.duration,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`),
          );

          controller.close();
        } catch (error) {
          console.error("Streaming transcription error:", error);
          const errorData = {
            type: "error",
            error: "Failed to transcribe audio",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`),
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
    return errorResponse("Failed to setup transcription stream");
  }
}
