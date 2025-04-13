'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useVideoUpload } from '@/hooks';
import { DragDrop } from './DragDrop';
import { ProgressBar } from './ProgressBar';
import { useNavigation } from '@/contexts/NavigationContext';

/**
 * VideoUpload Component
 * 
 * A component that allows users to upload video files either by drag and drop
 * or by selecting files through the file browser. Follows the "lipsync-2" design
 * with dark theme and subtle animations.
 * 
 * Requirements from project_goals.md:
 * - Support videos up to 4GB in size
 * - Create glowing drop zones for uploads
 * - Provide visual feedback during interactions
 */
const VideoUpload: React.FC = () => {
  const { goToNextStep, setVideoUploaded } = useNavigation();
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  
  // Use our custom hook for handling video uploads
  const {
    selectedFile,
    progress,
    isUploading,
    error,
    uploadVideo,
    selectFile,
    cancelUpload,
    resetState,
    validateFile
  } = useVideoUpload();
  
  // Handle file selection from DragDrop component
  const handleFileSelected = useCallback((file: File) => {
    selectFile(file);
  }, [selectFile]);
  
  // Handle the upload process
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      const result = await uploadVideo(selectedFile.file);
      
      if (result) {
        setUploadSuccess(true);
        // Update the navigation context to indicate video is uploaded
        setVideoUploaded(true);
        
        // Navigate to subtitle preview after a short delay
        setTimeout(() => {
          goToNextStep();
        }, 2000);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      // Error is already handled by the hook
    }
  }, [selectedFile, uploadVideo, goToNextStep, setVideoUploaded]);

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  // Render upload success message
  const renderSuccessMessage = () => {
    if (!uploadSuccess) return null;
    
    return (
      <div className="mt-4 p-3 bg-[color-mix(in_srgb,var(--color-success-light)_15%,transparent)] border border-[var(--color-success)] rounded-md text-[var(--color-success)] text-sm flex items-center">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="mr-2"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        Upload successful! Redirecting to subtitle preview...
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6 text-[var(--foreground-primary)]">
        Upload Your Video
      </h1>
      
      <div className="w-full max-w-4xl mx-auto">
        {selectedFile ? (
          <div className="w-full flex flex-col items-center border border-[var(--color-gray-700)] rounded-xl p-8 bg-[color-mix(in_srgb,var(--color-gray-900)_90%,black)] animate-subtle-pulse">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[color-mix(in_srgb,var(--color-gray-800)_90%,black)] mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-[var(--color-primary-400)]"
              >
                <path d="m21 8-5-5H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"></path>
                <polyline points="17 3 17 8 22 8"></polyline>
                <circle cx="12" cy="14" r="4"></circle>
                <path d="m11 13 2 2 1-1"></path>
              </svg>
            </div>
            
            <div className="text-[var(--foreground-primary)] font-medium mb-1 text-lg">
              {selectedFile.name}
            </div>
            
            <div className="text-sm text-[var(--foreground-secondary)] mb-4">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </div>
            
            {/* Show progress bar during upload */}
            {isUploading && progress && (
              <ProgressBar 
                percentage={progress.percentage} 
                bytesUploaded={progress.bytesUploaded} 
                bytesTotal={progress.bytesTotal} 
              />
            )}
            
            {/* Success message */}
            {renderSuccessMessage()}
            
            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 bg-[color-mix(in_srgb,var(--color-error-light)_15%,transparent)] border border-[var(--color-error)] rounded-md text-[var(--color-error)] text-sm">
                {error}
              </div>
            )}
            
            <div className="flex gap-3 mt-6">
              {isUploading ? (
                <button 
                  onClick={cancelUpload}
                  className="button button-secondary text-sm"
                  disabled={uploadSuccess}
                >
                  Cancel Upload
                </button>
              ) : (
                <>
                  <button 
                    onClick={resetState}
                    className="button button-secondary text-sm"
                    disabled={uploadSuccess}
                  >
                    Change File
                  </button>
                  <button 
                    onClick={handleUpload}
                    className="button button-primary text-sm"
                    disabled={uploadSuccess || !selectedFile}
                  >
                    Start Upload
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <DragDrop onFileSelected={handleFileSelected} validateFile={validateFile} />
        )}
      </div>
    </div>
  );
};

export default VideoUpload;