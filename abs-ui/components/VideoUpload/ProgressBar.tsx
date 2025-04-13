'use client';

import React, { useEffect, useState } from 'react';

interface ProgressBarProps {
  percentage: number;
  bytesUploaded: number;
  bytesTotal: number;
}

/**
 * ProgressBar Component
 * 
 * A reusable component for displaying upload progress.
 * Features a gradient progress bar with animated transitions.
 * 
 * Following the "lipsync-2" design with gradient accents
 * as specified in project_goals.md.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  percentage, 
  bytesUploaded, 
  bytesTotal 
}) => {
  const [displayedPercentage, setDisplayedPercentage] = useState(0);
  
  // Smoothly animate the percentage change
  useEffect(() => {
    // If percentage jumped significantly, don't animate
    if (Math.abs(percentage - displayedPercentage) > 10) {
      setDisplayedPercentage(percentage);
      return;
    }
    
    // Otherwise animate smoothly
    const timeout = setTimeout(() => {
      if (displayedPercentage < percentage) {
        setDisplayedPercentage(prev => Math.min(prev + 1, percentage));
      }
    }, 20);
    
    return () => clearTimeout(timeout);
  }, [percentage, displayedPercentage]);

  /**
   * Format bytes to a human-readable string
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* Progress percentage and bytes info */}
      <div className="flex justify-between text-sm mb-1">
        <div className="text-[var(--foreground-primary)]">
          {displayedPercentage}%
        </div>
        <div className="text-[var(--foreground-secondary)]">
          {formatBytes(bytesUploaded)} of {formatBytes(bytesTotal)}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative w-full h-2 bg-[var(--color-gray-800)] rounded-full overflow-hidden">
        {/* Background pulse animation for active uploads */}
        <div 
          className="absolute inset-0 animate-pulse-subtle opacity-30 bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)]"
          style={{ 
            clipPath: percentage < 100 ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)'
          }}
        />
        
        {/* Actual progress indicator */}
        <div 
          className="absolute h-full bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)]"
          style={{ 
            width: `${displayedPercentage}%`,
            transition: 'width 0.3s ease-out'
          }}
        />
      </div>
      
      {/* Status text */}
      <div className="text-xs text-[var(--foreground-secondary)] mt-2">
        {percentage === 100 
          ? 'Upload complete!' 
          : 'Uploading video...'}
      </div>
    </div>
  );
};

export default ProgressBar;