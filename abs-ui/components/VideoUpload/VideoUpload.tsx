'use client';

import React, { useState, useCallback } from 'react';
import { useVideoUpload } from '@/hooks';

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
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  // Use our custom hook for handling video uploads
  const {
    selectedFile,
    progress,
    isUploading,
    error,
    uploadVideo,
    selectFile,
    cancelUpload,
    resetState
  } = useVideoUpload();
  
  // Handlers for drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      selectFile(file);
    }
  }, [selectFile]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      selectFile(file);
    }
  }, [selectFile]);
  
  const handleUpload = useCallback(async () => {
    if (selectedFile) {
      await uploadVideo(selectedFile.file);
    }
  }, [selectedFile, uploadVideo]);

  // Render progress bar when uploading
  const renderProgress = () => {
    if (!progress) return null;
    
    return (
      <div className="relative w-full h-2 bg-[var(--color-gray-700)] rounded-full overflow-hidden mt-4">
        <div 
          className="absolute h-full bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)]"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    );
  };
  
  return (
    <div className="w-full flex flex-col items-center">
      <div 
        className={`relative w-full max-w-4xl mx-auto rounded-xl border ${
          isDragging 
            ? 'border-[var(--color-primary-400)] dropzone-active' 
            : error 
              ? 'border-[var(--color-error)]' 
              : isUploading 
                ? 'border-[var(--color-primary-400)]'
                : 'border-[var(--color-gray-700)]'
        } p-12 flex flex-col items-center justify-center text-center hover:border-[var(--color-primary-400)] transition-all duration-300 group animate-subtle-pulse`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="absolute inset-0 bg-[var(--color-gray-900)] rounded-xl opacity-70"></div>
        
        {/* Display selected file info or upload icon */}
        {selectedFile ? (
          <div className="relative z-10 flex flex-col items-center">
            <div className="text-[var(--foreground-primary)] font-medium mb-2">
              {selectedFile.name}
            </div>
            <div className="text-xs text-[var(--foreground-secondary)] mb-4">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </div>
            
            {renderProgress()}
            
            <div className="flex gap-3 mt-6">
              {isUploading ? (
                <button 
                  onClick={cancelUpload}
                  className="button button-secondary text-sm"
                >
                  Cancel
                </button>
              ) : (
                <>
                  <button 
                    onClick={resetState}
                    className="button button-secondary text-sm"
                  >
                    Change File
                  </button>
                  <button 
                    onClick={handleUpload}
                    className="button button-primary text-sm"
                  >
                    Start Upload
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Upload icon with arrow */}
            <div className="relative mb-4 flex flex-col items-center">
              <div className={`w-16 h-16 mb-2 rounded-full flex items-center justify-center border-2 ${
                isDragging || isHovering
                  ? 'border-[var(--color-primary-400)] text-white' 
                  : 'border-[var(--color-gray-600)] text-[var(--color-gray-300)]'
              } group-hover:text-white group-hover:border-[var(--color-primary-400)] transition-all duration-300`}>
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
                  className={isDragging ? 'animate-subtle-bounce' : 'group-hover:animate-subtle-bounce'}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              
              <div className="text-[var(--foreground-primary)] font-medium relative">
                drag and drop to upload
              </div>
              <div className="text-xs text-[var(--foreground-secondary)] mt-1 relative">
                (mp4, webm, and mov file formats accepted, up to 4GB)
              </div>
            </div>
            
            {/* Browse button */}
            <label 
              className={`relative mt-6 button ${
                isDragging || isHovering
                  ? 'bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)] text-white'
                  : 'button-secondary hover:bg-[color-mix(in_srgb,var(--background-secondary)_90%,white)]'
              } group-hover:bg-gradient-to-r group-hover:from-[var(--gradient-primary-start)] group-hover:to-[var(--gradient-primary-end)] group-hover:text-white transition-all duration-300 cursor-pointer`}
            >
              browse
              <input 
                type="file" 
                accept="video/mp4,video/webm,video/quicktime" 
                className="sr-only" 
                onChange={handleFileSelect}
              />
            </label>
          </>
        )}
        
        {/* Error message */}
        {error && (
          <div className="mt-4 text-sm text-[var(--color-error)] relative">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;