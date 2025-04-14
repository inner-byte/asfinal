import retry from 'async-retry';
import { getGeminiModel } from '../config/vertex'; // Import the getter function
import { AppError } from '../middleware/errorHandler';

/**
 * Generates a transcription from an audio file stored in GCS using the Gemini API.
 * Includes retry logic and detailed error handling.
 *
 * @param gcsUri The Google Cloud Storage URI of the audio file (e.g., gs://bucket-name/audio.flac).
 * @param language The language code of the audio (e.g., 'en').
 * @returns The raw transcription text from the Gemini API.
 * @throws AppError if the transcription fails after retries or encounters client errors.
 */
export async function generateTranscriptionViaGemini(gcsUri: string, language: string): Promise<string> {
    console.log(`[GeminiUtils] Calling Gemini API for transcription of ${gcsUri}`);

    // Define the prompt for Gemini, requesting specific timestamp format and accuracy
    const prompt = [
        "Generate a complete and accurate transcription of the provided audio file.",
        "Include timestamps in the format [MM:SS.mmm] every 3-5 seconds and for all speaker changes.",
        "Timestamps should have accuracy within ±0.1 to ±3 seconds of the actual audio timing.",
        "Format timestamps consistently throughout and preserve all spoken content.",
        "If there are multiple speakers, indicate them as 'Speaker 1', 'Speaker 2', etc.",
        `The audio is in ${language} language.`,
        "Include proper punctuation and paragraph breaks for readability."
    ].join(' ');

    // Use retry with exponential backoff for API calls
    try {
        const rawTranscription = await retry(
            async (bail, attempt) => {
                console.log(`[GeminiUtils] Attempt ${attempt} to generate transcription...`);
                try {
                    // Get the Gemini model instance and generate content
                    const model = getGeminiModel();

                    // Use type assertion for the audio part since the type definition might be incomplete
                    const audioPart = { audio: { gcsUri } } as any;

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

                    console.log(`[GeminiUtils] Received transcription text (${Math.round(text.length / 1024)}KB)`);
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
                retries: 5,
                minTimeout: 2000,
                maxTimeout: 30000,
                factor: 2,
                randomize: true,
                onRetry: (error: any, attempt) => {
                    console.warn(`[GeminiUtils] Retrying Gemini API call (${attempt}/5) due to: ${error.message || 'Unknown error'}`);
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
