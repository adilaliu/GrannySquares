"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Extend Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function TranscribePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [interimTranscription, setInterimTranscription] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [language, setLanguage] = useState("en-US");
  const [confidence, setConfidence] = useState<number>(0);

  const recognitionRef = useRef<any>(null);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
    }
  }, []);

  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();

    // Configuration
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    // Event handlers
    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
      console.log("Speech recognition started");
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          setConfidence(confidence || 0);
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscription((prev) => prev + " " + finalTranscript);
      }

      setInterimTranscription(interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsRecording(false);
      setInterimTranscription("");
    };

    return recognition;
  }, [language]);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition is not supported in your browser.");
      return;
    }

    try {
      setError(null);
      setTranscription("");
      setInterimTranscription("");
      setConfidence(0);

      const recognition = initializeSpeechRecognition();
      if (!recognition) {
        setError("Failed to initialize speech recognition.");
        return;
      }

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setError("Failed to start speech recognition. Please try again.");
    }
  }, [isSupported, initializeSpeechRecognition]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const clearTranscription = () => {
    setTranscription("");
    setInterimTranscription("");
    setConfidence(0);
    setError(null);
  };

  const languages = [
    { code: "en-US", name: "English (US)" },
    { code: "en-GB", name: "English (UK)" },
    { code: "es-ES", name: "Spanish" },
    { code: "fr-FR", name: "French" },
    { code: "de-DE", name: "German" },
    { code: "it-IT", name: "Italian" },
    { code: "pt-BR", name: "Portuguese (Brazil)" },
    { code: "ja-JP", name: "Japanese" },
    { code: "ko-KR", name: "Korean" },
    { code: "zh-CN", name: "Chinese (Mandarin)" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
            Live Speech Transcription
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Real-time speech-to-text using your browser's built-in speech
            recognition
          </p>

          {/* Language Selection */}
          <div className="mb-6 flex justify-center">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Language:
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isRecording}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isSupported}
              className={`px-8 py-4 rounded-full font-semibold text-white transition-all duration-200 transform hover:scale-105 ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "bg-blue-500 hover:bg-blue-600"
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {isRecording
                ? "🔴 Stop Recording"
                : "🎤 Start Live Transcription"}
            </button>

            <button
              onClick={clearTranscription}
              disabled={
                isRecording || (!transcription && !interimTranscription)
              }
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑️ Clear Text
            </button>
          </div>

          {/* Status */}
          {isRecording && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-full">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                Listening... Speak now!
              </div>
            </div>
          )}

          {/* Confidence indicator */}
          {confidence > 0 && (
            <div className="text-center mb-4">
              <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                Confidence: {Math.round(confidence * 100)}%
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Transcription Results */}
          {(transcription || interimTranscription) && (
            <div className="bg-gray-50 rounded-xl p-6 border">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Live Transcription
              </h2>

              {/* Real-time transcription display */}
              <div className="p-4 bg-white rounded-lg border min-h-[200px]">
                <div className="text-lg leading-relaxed">
                  {/* Final transcription (confirmed) */}
                  <span className="text-gray-800">{transcription}</span>

                  {/* Interim transcription (being processed) */}
                  {interimTranscription && (
                    <span className="text-gray-400 italic ml-1 border-l-2 border-blue-400 pl-2">
                      {interimTranscription}
                    </span>
                  )}

                  {/* Cursor indicator when recording */}
                  {isRecording && (
                    <span className="inline-block w-1 h-6 bg-blue-500 animate-pulse ml-1 align-text-bottom"></span>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                <div>
                  Words:{" "}
                  {
                    transcription.split(" ").filter((word) => word.length > 0)
                      .length
                  }
                </div>
                <div>Characters: {transcription.length}</div>
                {confidence > 0 && (
                  <div>Last confidence: {Math.round(confidence * 100)}%</div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          {!transcription &&
            !interimTranscription &&
            !isRecording &&
            !error && (
              <div className="text-center text-gray-500 py-12">
                <div className="text-6xl mb-4">🎙️</div>
                <p className="text-lg mb-2">
                  Ready for live speech transcription!
                </p>
                <p className="text-sm">
                  Click "Start Live Transcription" and speak clearly into your
                  microphone
                </p>
                {!isSupported && (
                  <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-lg">
                    <p className="font-semibold">Browser Not Supported</p>
                    <p className="text-sm">
                      Please use Chrome, Edge, or Safari for live speech
                      recognition.
                    </p>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
