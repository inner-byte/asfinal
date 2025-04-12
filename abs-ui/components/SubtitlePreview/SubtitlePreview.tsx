'use client';

import React, { useState } from 'react';

/**
 * SubtitlePreview Component
 * 
 * Displays a video player with synchronized subtitles.
 * This is a placeholder implementation that will be enhanced 
 * with Plyr video player integration in a future task.
 * 
 * References from project_goals.md:
 * - Integrate Plyr video player to display subtitles in real-time
 * - Use Plyr's `cuechange` event for dynamic monitoring and adjustment
 * - Achieve ±0.1 to ±3 seconds timestamp accuracy
 */
const SubtitlePreview: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Placeholder for the current subtitle text
  const [currentSubtitle, setCurrentSubtitle] = useState("This is a placeholder for subtitles");

  // Toggle play/pause - this is just a placeholder for the Plyr integration
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    // In the actual implementation, we would control the Plyr player here
  };

  // Simulated progress update - will be replaced with actual video progress
  const handleProgressUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgress(Number(e.target.value));
    // In the actual implementation, this would seek the video
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Video player container */}
      <div className="aspect-video rounded-lg bg-[var(--color-gray-800)] relative overflow-hidden mb-4">
        {/* This will be replaced with the actual Plyr player */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Play button overlay */}
          <button
            className="w-16 h-16 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            onClick={togglePlayPause}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {isPlaying ? (
                <rect x="6" y="4" width="4" height="16" />
              ) : (
                <polygon points="10 4 22 12 10 20 10 4" />
              )}
            </svg>
          </button>
        </div>
        
        {/* Subtitle display */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center">
          <div className="bg-black/70 text-white px-4 py-2 rounded-md text-center max-w-md">
            {currentSubtitle}
          </div>
        </div>
        
        {/* Video progress bar */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-white/80 font-mono">00:00</span>
            <div className="flex-1 relative h-1 bg-[var(--color-gray-600)] rounded-full overflow-hidden">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleProgressUpdate}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="h-full bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)]" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-xs text-white/80 font-mono">03:45</span>
          </div>
        </div>
      </div>
      
      {/* Controls and options */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium text-sm mb-1">Video Preview</h3>
          <p className="text-xs text-[var(--foreground-secondary)]">
            Subtitles will be automatically synchronized with the video
          </p>
        </div>
        <div className="flex gap-2">
          <button className="button button-secondary text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Regenerate
          </button>
          <button className="button button-primary text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubtitlePreview;