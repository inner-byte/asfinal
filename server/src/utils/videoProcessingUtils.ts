import fetch from 'node-fetch';
import { Readable } from 'stream';
import videoService from '../services/videoService'; // Assuming videoService handles Appwrite interactions for video metadata
import { AppError } from '../middleware/errorHandler';
import { Video } from '../types'; // Assuming a Video type exists

/**
 * Maximum allowed video size (4GB as per project requirements).
 */
const MAX_VIDEO_SIZE_BYTES = 4 * 1024 * 1024 * 1024; // 4GB

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
        timeout: 60000, // Increased timeout to 60 seconds for potentially large files
    };
    let response;
    try {
        response = await fetch(videoUrl.toString(), fetchOptions);
        if (!response.ok) {
            throw new AppError(`Failed to fetch video stream: ${response.statusText} (${response.status})`, response.status);
        }
        if (!response.body) {
            throw new AppError('Video response body is null or undefined', 500);
        }
    } catch (error: any) {
        if (error.type === 'request-timeout') {
            throw new AppError(`Fetch timeout after ${fetchOptions.timeout}ms while fetching video: ${error.message}`, 408);
        }
        // Wrap other fetch errors
        throw new AppError(`Network error while fetching video: ${error.message}`, 500);
    }

    // 5. Create readable stream
    const videoStream = Readable.from(response.body as any);
    console.log(`[VideoProcessingUtils] Video stream ready for processing.`);

    return { video, videoStream };
}
