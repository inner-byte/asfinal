import retry from 'async-retry';
import { getGeminiModel } from '../config/vertex'; // Import the getter function
import { AppError } from '../middleware/errorHandler';
// Import the necessary types from the Vertex AI SDK
import { FileDataPart } from '@google-cloud/vertexai/build/src/types/content';
import AUDIO_PROCESSING from '../config/audioProcessing';

// Centralized retry configuration
const RETRY_CONFIG = {
    retries: 7,
    minTimeout: 3000,
    maxTimeout: 60000,
    factor: 2,
    randomize: true,
};

/**
 * Generates a transcription from an audio file stored in GCS using the Gemini API.
 * Includes retry logic and detailed error handling.
 *
 * @param gcsUri The Google Cloud Storage URI of the audio file (e.g., gs://bucket-name/audio.flac).
 * @param language The language code of the audio (e.g., 'en').
 * @param mimeType The MIME type of the audio file (e.g., 'audio/flac', 'audio/mp3'). Defaults to 'audio/flac'.
 * @returns The raw transcription text from the Gemini API.
 * @throws AppError if the transcription fails after retries or encounters client errors.
 */
export async function generateTranscriptionViaGemini(gcsUri: string, language: string, mimeType: string = 'audio/flac'): Promise<string> {
    console.log(`[GeminiUtils] Calling Gemini API for transcription of ${gcsUri}`);

    // Define the prompt for Gemini, requesting specific timestamp format and accuracy
    const prompt = [
        "Generate a COMPLETE and ACCURATE transcription of the ENTIRE audio file from beginning to end.",
        "It is CRITICAL that you transcribe the FULL audio file, including all content from start to finish.",
        "Include timestamps in the format [MM:SS.mmm] every 3-5 seconds and for all speaker changes.",
        "Timestamps should have accuracy within ±0.1 to ±3 seconds of the actual audio timing.",
        "Format timestamps consistently throughout and preserve ALL spoken content without omissions.",
        "If there are multiple speakers, indicate them as 'Speaker 1', 'Speaker 2', etc.",
        `The audio is in ${language} language.`,
        "Include proper punctuation and paragraph breaks for readability.",
        "Do not truncate or summarize any part of the audio - transcribe everything completely."
    ].join(' ');

    // Use retry with exponential backoff for API calls
    try {
        const rawTranscription = await retry(
            async (bail, attempt) => {
                console.log(`[GeminiUtils] Attempt ${attempt} to generate transcription...`);
                try {
                    // Get the Gemini model instance and generate content
                    const model = getGeminiModel();

                    // Format the audio part according to Vertex AI Gemini API requirements
                    // Using the correct type definition from the Vertex AI SDK
                    const audioPart: FileDataPart = {
                        fileData: {
                            fileUri: gcsUri,
                            mimeType: mimeType
                        }
                    };

                    console.log(`[GeminiUtils] Using fileData format with mimeType: ${mimeType}`);

                    const result = await model.generateContent({
                        contents: [
                            { role: 'user', parts: [{ text: prompt }, audioPart] }
                        ]
                    });

                    const response = result.response;
                    // Use optional chaining for safer access
                    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

                    if (!text) {
                        // Throw an error for empty response to trigger retry or bail
                        throw new Error('Empty response received from Gemini API');
                    }

                    // Check if the transcription seems incomplete (less than expected or missing end markers)
                    const textLengthKB = Math.round(text.length / 1024);
                    console.log(`[GeminiUtils] Received transcription text (${textLengthKB}KB)`);

                    // Basic quality check - if text is suspiciously short, retry
                    if (textLengthKB < 1) {
                        throw new Error('Transcription seems too short, possibly incomplete');
                    }

                    // Check if the text has a reasonable number of timestamps
                    const timestampCount = (text.match(/\[\d+:\d+\.\d+\]/g) || []).length;
                    console.log(`[GeminiUtils] Transcription contains ${timestampCount} timestamps`);

                    if (timestampCount < 5) {
                        throw new Error('Transcription has too few timestamps, possibly incomplete');
                    }

                    return text;

                } catch (error: any) {
                    console.error(`[GeminiUtils] Gemini API error on attempt ${attempt}: ${error.message}`, error.stack);

                    // Bail on 4xx client errors (except 429 Too Many Requests, which should be retried)
                    if (error.status && Math.floor(error.status / 100) === 4 && error.status !== 429) {
                        console.error(`[GeminiUtils] Unrecoverable client error (${error.status}). Bailing out.`);
                        bail(new AppError(`Gemini API client error (${error.status}): ${error.message}`, error.status));
                        return ''; // Should not be reached due to bail
                    }

                    // For server errors (5xx), rate limits (429), or network issues, throw to retry
                    console.warn(`[GeminiUtils] Retrying after error: ${error.message}`);
                    throw error; // Throw error to trigger retry
                }
            },
            {
                ...RETRY_CONFIG,
                onRetry: (error: any, attempt) => {
                    console.warn(`[GeminiUtils] Retrying Gemini API call (${attempt}/${RETRY_CONFIG.retries}) due to: ${error.message || 'Unknown error'}`);
                }
            }
        );
        return rawTranscription;
    } catch (error: any) {
        // Handle final error after all retries
        console.error(`[GeminiUtils] Failed to generate transcription after multiple retries: ${error.message}`);
        if (error instanceof AppError) {
            throw error;
        }
        // Wrap unexpected errors
        throw new AppError(`Failed to generate transcription via Gemini: ${error.message}`, 503); // 503 Service Unavailable seems appropriate
    }
}
