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
      setError(validation.error || 'Invalid file'); // Fix for TypeScript error - providing fallback
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
   * Uploads the selected video to the server
   */
  const uploadVideo = useCallback(async (file: File): Promise<VideoFile | null> => {
    if (!file) {
      setError('No file selected for upload');
      return null;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file'); // Fix for TypeScript error - providing fallback
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
      // This will be replaced with actual API integration in a future implementation
      // For now, we're just simulating the upload process
      
      // Simulate upload with progress updates
      // In the actual implementation, we'll use fetch with a FormData object
      // and monitor upload progress via the Progress API
      
      // For a future implementation, we'll use this endpoint:
      // const uploadEndpoint = '/api/videos/upload';
      
      // In the actual implementation:
      // const formData = new FormData();
      // formData.append('video', file);
      // const response = await fetch(uploadEndpoint, {
      //   method: 'POST',
      //   body: formData,
      //   signal: controller.signal,
      // });
      
      // For now, simulate upload with a delay
      await simulateUploadProgress(file.size, (progressEvent) => {
        setProgress(progressEvent);
      }, controller.signal);

      // Create a placeholder response
      const uploadedVideo: VideoFile = {
        file,
        id: `video_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        url: URL.createObjectURL(file) // This would be the actual URL from Appwrite in production
      };

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
      }
      
      setIsUploading(false);
      setProgress(null);
      return null;
    } finally {
      setAbortController(null);
    }
  }, [validateFile]);

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

/**
 * Helper function to simulate upload progress for development purposes
 * This will be replaced with actual API calls in production
 */
async function simulateUploadProgress(
  fileSize: number, 
  onProgress: (progress: UploadProgress) => void,
  signal: AbortSignal
): Promise<void> {
  const totalChunks = 10;
  const chunkSize = fileSize / totalChunks;
  let uploadedSize = 0;

  for (let i = 0; i < totalChunks; i++) {
    // Check if upload was cancelled
    if (signal.aborted) {
      throw new Error('Upload aborted');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    
    uploadedSize += chunkSize;
    const percentage = Math.min(Math.round((uploadedSize / fileSize) * 100), 100);
    
    onProgress({
      percentage,
      bytesUploaded: uploadedSize,
      bytesTotal: fileSize
    });
  }
}

export default useVideoUpload;