'use client';

import React, { useState, useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
// No need for useRouter as we're using the NavigationContext for navigation

/**
 * Interface for subtitle data structure
 */
interface Subtitle {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

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
  // State for video and subtitle management
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false);
  const { setSubtitlesGenerated, goToNextStep } = useNavigation();

  // State for subtitle management
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("This is a placeholder for subtitles");
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);

  // Find and set the current subtitle based on video progress
  useEffect(() => {
    if (subtitles.length > 0 && !isGenerating && !error) {
      // Convert progress percentage to seconds (assuming 3:45 total duration = 225 seconds)
      const currentTimeInSeconds = (progress / 100) * 225;

      // Find the subtitle that corresponds to the current time
      const activeSubtitle = subtitles.find(
        subtitle => currentTimeInSeconds >= subtitle.startTime && currentTimeInSeconds <= subtitle.endTime
      );

      if (activeSubtitle) {
        setCurrentSubtitle(activeSubtitle.text);
      } else {
        // No subtitle at this time
        setCurrentSubtitle("");
      }
    }
  }, [progress, subtitles, isGenerating, error]);

  /**
   * Simulates subtitle generation on component mount
   * In production, this would be replaced with an actual API call
   */
  useEffect(() => {
    const generateSubtitles = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        // Simulate API call to generate subtitles
        // In production, this would call the backend endpoint
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            // Generate dummy subtitles for demonstration
            const generatedSubtitles: Subtitle[] = [
              { id: '1', text: 'Welcome to our video', startTime: 0, endTime: 3 },
              { id: '2', text: 'This is a placeholder for subtitles', startTime: 3, endTime: 6 },
              { id: '3', text: 'Generated with AI technology', startTime: 6, endTime: 9 },
            ];
            setSubtitles(generatedSubtitles);
            setCurrentSubtitle(generatedSubtitles[0].text);

            setIsGenerating(false);
            setIsGenerated(true);
            setIsProcessingComplete(true);
            setSubtitlesGenerated(true); // Update navigation context
            resolve();
          }, 3000); // Simulated 3-second generation time
        });
      } catch (err) {
        setIsGenerating(false);
        setError('Failed to generate subtitles. Please try again.');
        console.error('Subtitle generation error:', err);
      }
    };

    generateSubtitles();

    // Cleanup function
    return () => {
      // Any cleanup needed for the subtitle generation process
    };
  }, [setSubtitlesGenerated]);

  /**
   * Toggles video play/pause state
   * Will be replaced with actual Plyr player controls in future implementation
   */
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    // In the actual implementation, we would control the Plyr player here
  };

  /**
   * Handles progress bar update
   * Will be replaced with actual video progress tracking
   *
   * @param e - Input range change event
   */
  const handleProgressUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgress(Number(e.target.value));
    // In the actual implementation, this would seek the video
  };

  /**
   * Handles subtitle regeneration
   * Resets the subtitle generation process and starts it again
   */
  const handleRegenerate = () => {
    setIsGenerated(false);
    setIsGenerating(true);
    setSubtitlesGenerated(false); // Update navigation context
    setError(null);

    // Simulate API call to regenerate subtitles
    setTimeout(() => {
      try {
        // Generate dummy subtitles for demonstration
        const generatedSubtitles: Subtitle[] = [
          { id: '1', text: 'Regenerated subtitles', startTime: 0, endTime: 3 },
          { id: '2', text: 'With improved accuracy', startTime: 3, endTime: 6 },
          { id: '3', text: 'Using AI processing', startTime: 6, endTime: 9 },
        ];
        setSubtitles(generatedSubtitles);
        setCurrentSubtitle(generatedSubtitles[0].text);

        setIsGenerating(false);
        setIsGenerated(true);
        setIsProcessingComplete(true);
        setSubtitlesGenerated(true); // Update navigation context
      } catch (err) {
        setIsGenerating(false);
        setError('Failed to regenerate subtitles. Please try again.');
        console.error('Subtitle regeneration error:', err);
      }
    }, 3000); // Simulated 3-second generation time
  };

  /**
   * Handles export button click
   * Navigates to the export page
   */
  const handleExport = () => {
    goToNextStep(); // Use the navigation context to move to the next step (export)
  };

  /**
   * Formats time in seconds to MM:SS format
   *
   * @param timeInSeconds - Time in seconds
   * @returns Formatted time string
   */
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Video player container */}
      <div className="aspect-video rounded-lg bg-[var(--color-gray-800)] relative overflow-hidden mb-4">
        {/* This will be replaced with the actual Plyr player */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isGenerating ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-2 border-t-[var(--color-primary-400)] border-r-[var(--color-primary-400)] border-b-transparent border-l-transparent animate-spin mb-4"></div>
              <p className="text-white/80">Generating subtitles...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-center px-6">
              <div className="w-12 h-12 rounded-full bg-[var(--color-error-light)] flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-error)]">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <p className="text-[var(--color-error)]">{error}</p>
              <button
                className="mt-4 px-3 py-1.5 text-sm rounded-md bg-[var(--color-gray-700)] hover:bg-[var(--color-gray-600)] transition-colors"
                onClick={handleRegenerate}
                aria-label="Try again to generate subtitles"
              >
                Try Again
              </button>
            </div>
          ) : (
            /* Play button overlay */
            <button
              className="w-16 h-16 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
              onClick={togglePlayPause}
              aria-label={isPlaying ? "Pause video" : "Play video"}
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
                role="img"
                aria-hidden="true"
              >
                {isPlaying ? (
                  <rect x="6" y="4" width="4" height="16" />
                ) : (
                  <polygon points="10 4 22 12 10 20 10 4" />
                )}
              </svg>
            </button>
          )}
        </div>

        {/* Subtitle display */}
        {isGenerated && !error && (
          <div className="absolute bottom-12 left-0 right-0 flex justify-center">
            <div className="bg-black/70 text-white px-4 py-2 rounded-md text-center max-w-md">
              {currentSubtitle}
            </div>
          </div>
        )}

        {/* Video progress bar */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-white/80 font-mono">{formatTime((progress / 100) * 225)}</span>
            <div className="flex-1 relative h-1 bg-[var(--color-gray-600)] rounded-full overflow-hidden">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleProgressUpdate}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                aria-label="Video progress"
                disabled={isGenerating || !!error}
              />
              <div
                className="h-full bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-xs text-white/80 font-mono">{formatTime(225)}</span>
          </div>
        </div>
      </div>

      {/* Controls and options */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium text-sm mb-1">Video Preview</h3>
          <p className="text-xs text-[var(--foreground-secondary)]">
            {isGenerating
              ? "Generating subtitles for your video..."
              : error
                ? "Error generating subtitles. Please try again."
                : isGenerated
                  ? "Subtitles generated and synchronized with the video"
                  : "Ready to generate subtitles for your video"
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="button button-secondary text-sm"
            onClick={handleRegenerate}
            disabled={isGenerating}
            aria-label="Regenerate subtitles"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1" aria-hidden="true">
              <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Regenerate
          </button>
          <button
            className="button button-primary text-sm"
            disabled={!isGenerated || !!error}
            onClick={handleExport}
            aria-label="Export subtitles"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1" aria-hidden="true">
              <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Processing status */}
      {isProcessingComplete && !error && (
        <div className="mt-6 p-3 bg-[color-mix(in_srgb,var(--color-success-light)_15%,transparent)] border border-[var(--color-success)] rounded-md text-[var(--color-success)] text-sm flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Subtitles successfully generated. You can now export them or make additional adjustments.
        </div>
      )}
    </div>
  );
};

export default SubtitlePreview;