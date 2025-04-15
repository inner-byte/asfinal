import fetch from 'node-fetch';
import { Readable } from 'stream';
import videoService from '../services/videoService'; // Assuming videoService handles Appwrite interactions for video metadata
import { AppError } from '../middleware/errorHandler';
import { Video } from '../types'; // Assuming a Video type exists
import AUDIO_PROCESSING from '../config/audioProcessing';

/**
 * Maximum allowed video size (4GB as per project requirements).
 * Using centralized configuration from audioProcessing.ts
 */
const MAX_VIDEO_SIZE_BYTES = AUDIO_PROCESSING.MAX_VIDEO_SIZE_BYTES;

/**
 * Fetches video metadata, validates it, and returns the video object and a readable stream.
 *
 * @param videoId The ID of the video to process.
 * @returns An object containing the video metadata and a readable stream of the video content.
 * @throws AppError if the video is not found, exceeds size limits, or fails to fetch.
 */
export async function prepareVideoForProcessing(videoId: string): Promise<{ video: Video; videoStream: Readable }> {
    console.log(`[VideoProcessingUtils] Preparing video ${videoId}`);

    // 1. Get video metadata
    const video = await videoService.getVideoById(videoId);
    if (!video) {
        throw new AppError(`Video with ID ${videoId} not found`, 404);
    }

    // 2. Validate video size
    if (video.fileSize > MAX_VIDEO_SIZE_BYTES) {
        throw new AppError(`Video file size (${Math.round(video.fileSize / (1024 * 1024))}MB) exceeds maximum allowed size of 4GB`, 413);
    }
    console.log(`[VideoProcessingUtils] Video validated: ${video.name}, Size: ${Math.round(video.fileSize / (1024 * 1024))}MB`);

    // 3. Get video download URL
    const videoUrl = await videoService.getVideoDownloadUrl(videoId);
    if (!videoUrl) {
        throw new AppError(`Failed to get video download URL for ${videoId}`, 500);
    }
    console.log(`[VideoProcessingUtils] Got video download URL, fetching stream...`);

    // 4. Fetch video stream
    const fetchOptions = {
        timeout: AUDIO_PROCESSING.FETCH_TIMEOUT, // Using centralized configuration
    };
    let response;
    try {
        console.log(`[VideoProcessingUtils] Fetching video from URL: ${videoUrl}`);

        // Try to validate the URL before fetching
        try {
            new URL(videoUrl.toString());
        } catch (urlError: any) {
            console.error(`[VideoProcessingUtils] Invalid URL format: ${videoUrl}`);
            throw new AppError(`Invalid video URL format: ${urlError.message || 'Invalid URL'}`, 500);
        }

        // Add authentication headers if needed - only if URL is from Appwrite
        const headers: Record<string, string> = {};
        if (videoUrl.toString().includes(process.env.APPWRITE_ENDPOINT || '')) {
            headers['X-Appwrite-Project'] = process.env.APPWRITE_PROJECT_ID || '';
            headers['X-Appwrite-Key'] = process.env.APPWRITE_API_KEY || '';
        }

        // Create an AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), fetchOptions.timeout);

        try {
            console.log(`[VideoProcessingUtils] Attempting to fetch video from URL: ${videoUrl}`);
            response = await fetch(videoUrl.toString(), {
                headers,
                signal: controller.signal
            });

            console.log(`[VideoProcessingUtils] Fetch response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                throw new AppError(`Failed to fetch video stream: ${response.statusText} (${response.status})`, response.status);
            }
            if (!response.body) {
                throw new AppError('Video response body is null or undefined', 500);
            }
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error: any) {
        console.error(`[VideoProcessingUtils] Fetch error details:`, error);

        if (error instanceof AppError) {
            throw error;
        }

        if (error.name === 'AbortError') {
            throw new AppError(`Fetch timeout after ${fetchOptions.timeout}ms while fetching video`, 408);
        }

        // Wrap other fetch errors
        throw new AppError(`Network error while fetching video: ${error.message}`, 500);
    }

    // 5. Create readable stream
    const videoStream = Readable.from(response.body as any);
    console.log(`[VideoProcessingUtils] Video stream ready for processing.`);

    return { video, videoStream };
}
