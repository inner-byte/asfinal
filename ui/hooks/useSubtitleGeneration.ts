'use client';

import { useState, useCallback } from 'react';

/**
 * Subtitle Generation Hook
 *
 * This hook handles the subtitle generation functionality, providing:
 * - Generation status tracking
 * - Error handling
 * - Cancellation
 *
 * It connects to the backend API for generating subtitles from uploaded videos.
 */

export interface SubtitleGenerationResult {
  id: string;
  videoId: string;
  format: string;
  fileId: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UseSubtitleGenerationResult {
  isGenerating: boolean;
  error: string | null;
  result: SubtitleGenerationResult | null;
  generateSubtitles: (videoId: string, language?: string) => Promise<SubtitleGenerationResult | null>;
  cancelGeneration: () => void;
  resetState: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Maps technical error messages to user-friendly ones.
 * @param error The original error object or message string.
 * @returns A user-friendly error string.
 */
const mapErrorToUserMessage = (error: unknown): string => {
  let message = 'An unexpected error occurred during subtitle generation. Please try again.';

  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('connection')) {
      message = 'Network error. Please check your internet connection and try again.';
    } else if (error.message.includes('timeout')) {
      message = 'The request timed out. Please try again.';
    } else if (error.message.includes('not found') || error.message.includes('404')) {
      message = 'The video could not be found. It may have been deleted.';
    } else if (error.message.includes('permission') || error.message.includes('403')) {
      message = 'You do not have permission to generate subtitles for this video.';
    } else if (error.message.includes('server')) {
      message = 'Server error. Please try again later.';
    } else {
      message = error.message;
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  return message;
};

/**
 * Hook for handling subtitle generation
 * @returns Methods and state for subtitle generation functionality
 */
export function useSubtitleGeneration(): UseSubtitleGenerationResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubtitleGenerationResult | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  /**
   * Generates subtitles for a video
   * @param videoId The ID of the video to generate subtitles for
   * @param language The language to generate subtitles in (default: 'en')
   * @returns The generated subtitle data or null if generation failed
   */
  const generateSubtitles = useCallback(async (
    videoId: string,
    language: string = 'en'
  ): Promise<SubtitleGenerationResult | null> => {
    if (!videoId) {
      setError('Video ID is required');
      return null;
    }

    setError(null);
    setIsGenerating(true);
    setResult(null);

    // Create an abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch(`${API_BASE_URL}/subtitles/video/${videoId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate subtitles');
      }

      const data = await response.json();
      
      if (!data.data) {
        throw new Error('Invalid response format from server');
      }

      const subtitleData: SubtitleGenerationResult = {
        id: data.data.id,
        videoId: data.data.videoId,
        format: data.data.format,
        fileId: data.data.fileId,
        language: data.data.language,
        createdAt: new Date(data.data.createdAt),
        updatedAt: new Date(data.data.updatedAt)
      };

      setResult(subtitleData);
      setIsGenerating(false);
      return subtitleData;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Subtitle generation was cancelled');
      } else {
        const userMessage = mapErrorToUserMessage(err);
        setError(userMessage);
        console.error("Subtitle Generation Error:", err);
      }

      setIsGenerating(false);
      return null;
    } finally {
      setAbortController(null);
    }
  }, []);

  /**
   * Cancels an in-progress subtitle generation
   */
  const cancelGeneration = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setIsGenerating(false);
      setError('Subtitle generation cancelled');
    }
  }, [abortController]);

  /**
   * Resets the subtitle generation state
   */
  const resetState = useCallback(() => {
    setIsGenerating(false);
    setError(null);
    setResult(null);
    setAbortController(null);
  }, []);

  return {
    isGenerating,
    error,
    result,
    generateSubtitles,
    cancelGeneration,
    resetState
  };
}

export default useSubtitleGeneration;
