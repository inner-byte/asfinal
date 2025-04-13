'use client';

import React, { useState, useCallback } from 'react';

interface DragDropProps {
  onFileSelected: (file: File) => void;
  validateFile: (file: File) => { valid: boolean; error?: string };
}

/**
 * DragDrop Component
 * 
 * A reusable component for handling drag and drop file uploads.
 * Features a glowing drop zone when dragging and hover effects.
 * 
 * Following the "lipsync-2" design with dark theme and subtle animations
 * as specified in project_goals.md.
 */
export const DragDrop: React.FC<DragDropProps> = ({ onFileSelected, validateFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Handlers for drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setValidationError(null);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validation = validateFile(file);
      if (validation.valid) {
        onFileSelected(file);
      } else {
        setValidationError(validation.error || 'Invalid file');
      }
    }
  }, [onFileSelected, validateFile]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file);
      if (validation.valid) {
        onFileSelected(file);
      } else {
        setValidationError(validation.error || 'Invalid file');
      }
    }
  }, [onFileSelected, validateFile]);
  
  return (
    <div 
      className={`relative w-full rounded-xl border ${
        isDragging 
          ? 'border-[var(--color-primary-400)] dropzone-active' 
          : validationError 
            ? 'border-[var(--color-error)]' 
            : 'border-[var(--color-gray-700)]'
      } p-12 flex flex-col items-center justify-center text-center transition-all duration-300 group`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Glowing background effect when dragging or hovering */}
      <div className={`absolute inset-0 rounded-xl ${
        isDragging 
          ? 'bg-[color-mix(in_srgb,var(--color-primary-900)_15%,var(--color-gray-900))] glow-primary-subtle' 
          : 'bg-[var(--color-gray-900)]'
      } transition-colors duration-300`}></div>
      
      {/* Upload icon with arrow */}
      <div className="relative mb-4 flex flex-col items-center z-10">
        <div className={`w-16 h-16 mb-2 rounded-full flex items-center justify-center border-2 ${
          isDragging || isHovering
            ? 'border-[var(--color-primary-400)] text-white' 
            : 'border-[var(--color-gray-600)] text-[var(--color-gray-300)]'
        } group-hover:border-[var(--color-primary-400)] transition-colors duration-300`}>
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
            className={`transition-transform duration-300 ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}
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
        className={`relative mt-6 px-6 py-2 rounded-md font-medium transition-all duration-300 text-sm cursor-pointer ${
          isDragging || isHovering
            ? 'bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)] text-white shadow-lg shadow-[var(--color-primary-900)]/20'
            : 'bg-[var(--color-gray-800)] text-[var(--foreground-primary)] hover:bg-[color-mix(in_srgb,var(--color-gray-800)_90%,white)]'
        } group-hover:bg-gradient-to-r group-hover:from-[var(--gradient-primary-start)] group-hover:to-[var(--gradient-primary-end)] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[var(--color-primary-900)]/20 z-10`}
      >
        browse
        <input 
          type="file" 
          accept="video/mp4,video/webm,video/quicktime" 
          className="sr-only" 
          onChange={handleFileSelect}
        />
      </label>
      
      {/* Validation error message */}
      {validationError && (
        <div className="mt-4 text-sm text-[var(--color-error)] relative z-10">
          {validationError}
        </div>
      )}
    </div>
  );
};

export default DragDrop;