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
  isDuplicate?: boolean;
  duplicateData?: {
    videoId: string;
    subtitleId?: string;
    videoData?: any;
    subtitleData?: any;
  };
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
 * Maps technical error messages to user-friendly ones.
 * @param error The original error object or message string.
 * @returns A user-friendly error string.
 */
const mapErrorToUserMessage = (error: unknown): string => {
  let message = 'An unexpected error occurred during upload. Please try again.'; // Default message

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
      message = 'Network connection issue. Please check your internet connection and try again.';
    }
    // Abort errors
    else if (error.message.includes('abort') || error.message.includes('cancel')) {
      message = 'Upload canceled.';
    }
    // Server-side validation errors (look for common patterns)
    else if (error.message.includes('exceeds the maximum limit')) {
      message = 'File is too large. Maximum size is 4GB.';
    } else if (error.message.includes('Invalid file type')) {
      message = 'Invalid file type. Only MP4, WebM, and MOV formats are supported.';
    } else if (error.message.includes('Failed to initialize upload')) {
      message = 'Could not start the upload process. Please try again later.';
    } else if (error.message.includes('Missing required attribute "videoId"')) {
      message = 'Server error: Could not process the video ID. Please try again or contact support.';
    } else if (error.message.includes('Invalid document structure')) {
      message = 'Server error: Invalid response format. Please try again or contact support.';
    }
    // Generic server errors
    else if (error.message.includes('status 500') || error.message.includes('Internal Server Error')) {
      message = 'A server error occurred during upload. Please try again later.';
    }
    // Specific known issues
    else if (error.message.includes('Upload failed with status')) {
      // Extract status code if possible
      const match = error.message.match(/status (\d+)/);
      if (match && match[1]) {
        const status = parseInt(match[1], 10);
        if (status === 400) message = 'There was a problem with the uploaded file data. Please check the file and try again.';
        else if (status === 404) message = 'The upload destination could not be found. Please contact support.';
        else if (status === 409) message = 'There was a conflict processing the upload. Please try again.';
        else if (status >= 500) message = 'A server error occurred during upload. Please try again later.';
      } else {
        message = 'The upload failed unexpectedly. Please try again.';
      }
    }
  } else if (typeof error === 'string') {
    // Handle plain string errors if any occur
    message = error;
  }

  return message;
};

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

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || 'Failed to initialize upload';
        throw new Error(errorMessage);
      }

      // Debug log to see the actual response structure
      console.log('Server response for video initialization:', data);

      // Validate the response structure
      if (!data || !data.status || data.status !== 'success' || !data.data) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      // Validate that the video ID exists in the response
      if (!data.data.id) {
        console.error('Missing video ID in response data:', data.data);
        throw new Error('Invalid document structure: Missing required attribute "videoId"');
      }

      console.log('Successfully retrieved video ID:', data.data.id);
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

              // Validate the response structure
              if (!response || !response.status || response.status !== 'success' || !response.data) {
                console.error("Invalid response structure:", xhr.responseText);
                reject(new Error('Invalid response format from server.'));
                return;
              }

              const responseData = response.data;

              // Check if this is a duplicate detection response
              if (responseData.isDuplicate === true) {
                console.log('Duplicate file detected:', responseData);

                resolve({
                  file,
                  id: responseData.videoId,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  isDuplicate: true,
                  duplicateData: {
                    videoId: responseData.videoId,
                    subtitleId: responseData.subtitleId,
                    videoData: responseData.videoData,
                    subtitleData: responseData.subtitleData
                  }
                });
                return;
              }

              // Handle normal upload response
              const videoData = responseData;

              // Validate that the video data contains the required fields
              if (!videoData || !videoData.id) {
                console.error("Missing required fields in video data:", videoData);
                reject(new Error('Invalid document structure: Missing required attribute "videoId"'));
                return;
              }

              resolve({
                file,
                id: videoData.id,
                name: videoData.name || file.name,
                size: videoData.fileSize || file.size,
                type: videoData.mimeType || file.type,
                uploadedAt: new Date(videoData.updatedAt || Date.now()),
                isDuplicate: false
              });
            } catch (parseError) {
              console.error("Error parsing upload response:", parseError, xhr.responseText);
              reject(new Error('Received an invalid response from the server.'));
            }
          } else {
            let serverErrorMessage = `Upload failed with status ${xhr.status}`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              if (errorResponse && errorResponse.message) {
                serverErrorMessage = errorResponse.message;
              }
            } catch {
              // Ignore parsing error, use default status message
            }
            reject(new Error(serverErrorMessage));
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
      const userMessage = mapErrorToUserMessage(err);
      setError(userMessage);
      console.error("Upload Error:", err);

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