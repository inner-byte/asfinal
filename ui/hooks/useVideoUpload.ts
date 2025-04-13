'use client';

import { useState, useCallback } from 'react';

/**
 * Video Upload Hook
 *
 * This hook handles the video upload functionality, providing:
 * - File selection and validation
 * - Upload progress tracking
 * - Error handling
 * - Upload cancellation
 *
 * It connects to the backend API for uploading videos to Appwrite storage
 * and supports files up to 4GB as specified in project_goals.md.
 *
 * References:
 * - Video Upload and Storage requirements from project_goals.md
 * - Appwrite storage integration for secure and scalable video storage
 */

export interface UploadProgress {
  percentage: number;
  bytesUploaded: number;
  bytesTotal: number;
}

export interface VideoFile {
  file: File;
  id?: string;
  name: string;
  size: number;
  type: string;
  uploadedAt?: Date;
  url?: string;
}

export interface UseVideoUploadResult {
  selectedFile: VideoFile | null;
  progress: UploadProgress | null;
  isUploading: boolean;
  error: string | null;
  uploadVideo: (file: File) => Promise<VideoFile | null>;
  selectFile: (file: File | null) => void;
  cancelUpload: () => void;
  resetState: () => void;
  validateFile: (file: File) => { valid: boolean; error?: string };
}

// Maximum file size: 4GB (as specified in project requirements)
const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB in bytes
const ALLOWED_FILE_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Hook for handling video uploads
 * @returns Methods and state for video upload functionality
 */
export function useVideoUpload(): UseVideoUploadResult {
  // State for upload process
  const [selectedFile, setSelectedFile] = useState<VideoFile | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  /**
   * Validates a file to ensure it meets requirements
   */
  const validateFile = useCallback((file: File) => {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Only MP4, WebM, and MOV formats are supported.'
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'File is too large. Maximum size is 4GB.'
      };
    }

    return { valid: true };
  }, []);

  /**
   * Sets the currently selected file
   */
  const selectFile = useCallback((file: File | null) => {
    setError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setSelectedFile(null);
      return;
    }

    setSelectedFile({
      file,
      name: file.name,
      size: file.size,
      type: file.type
    });
  }, [validateFile]);

  /**
   * Initializes a video upload by requesting an upload ID from the server
   * @returns The video ID for the subsequent upload
   */
  const initializeUpload = useCallback(async (fileName: string, fileSize: number, fileType: string): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileName,
          fileSize: fileSize,
          mimeType: fileType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initialize upload');
      }

      const data = await response.json();
      // Fix: Extract the video ID from the data.data object (the API returns a nested structure)
      return data.data.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize upload';
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Uploads the selected video to the server with progress tracking
   */
  const uploadVideo = useCallback(async (file: File): Promise<VideoFile | null> => {
    if (!file) {
      setError('No file selected for upload');
      return null;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return null;
    }

    // Reset states
    setError(null);
    setProgress({ percentage: 0, bytesUploaded: 0, bytesTotal: file.size });
    setIsUploading(true);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Step 1: Initialize the upload and get a video ID
      const videoId = await initializeUpload(file.name, file.size, file.type);

      // Step 2: Upload the file with progress tracking
      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();

      // Set up progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setProgress({
            percentage,
            bytesUploaded: event.loaded,
            bytesTotal: event.total
          });
        }
      });

      // Create a Promise to handle the XHR request
      const uploadPromise = new Promise<VideoFile>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({
                file,
                id: response.id || videoId,
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date(),
                url: response.url
              });
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            } catch {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });
      });

      // Set up abort controller link
      controller.signal.addEventListener('abort', () => {
        xhr.abort();
      });

      // Open and send the request
      xhr.open('POST', `${API_BASE_URL}/videos/${videoId}/upload`);
      xhr.send(formData);

      // Wait for upload to complete
      const uploadedVideo = await uploadPromise;

      setIsUploading(false);
      setProgress({ percentage: 100, bytesUploaded: file.size, bytesTotal: file.size });

      return uploadedVideo;
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'An unknown error occurred during upload';

      // Handle abort case differently
      if (errorMessage.includes('abort')) {
        setError('Upload canceled');
      } else {
        setError(`Upload failed: ${errorMessage}`);

        // Try to cleanup on the server if we had a video ID
        try {
          // If we've created a video ID but the upload failed, attempt to delete it
          const possibleVideoId = errorMessage.match(/videoId:(\w+)/)?.[1];
          if (possibleVideoId) {
            await fetch(`${API_BASE_URL}/videos/${possibleVideoId}`, {
              method: 'DELETE',
            }).catch(() => {
              // Silently fail cleanup - already in error handler
            });
          }
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        } catch {
          // Ignore cleanup errors as we're already handling the main error
        }
      }

      setIsUploading(false);
      setProgress(null);
      return null;
    } finally {
      setAbortController(null);
    }
  }, [validateFile, initializeUpload]);

  /**
   * Cancels an in-progress upload
   */
  const cancelUpload = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setIsUploading(false);
      setError('Upload canceled');
      setProgress(null);
    }
  }, [abortController]);

  /**
   * Resets the upload state
   */
  const resetState = useCallback(() => {
    setSelectedFile(null);
    setProgress(null);
    setIsUploading(false);
    setError(null);
    setAbortController(null);
  }, []);

  return {
    selectedFile,
    progress,
    isUploading,
    error,
    uploadVideo,
    selectFile,
    cancelUpload,
    resetState,
    validateFile
  };
}

export default useVideoUpload;