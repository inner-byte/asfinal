import React, { useEffect, useState } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

interface SubtitlePreviewProps {
  // Define props as needed later
}

const SubtitlePreview: React.FC<SubtitlePreviewProps> = (props) => {
  const { videoInfo, subtitleInfo } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading the video and subtitles
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="subtitle-preview-container p-6 border rounded-md bg-[var(--background-secondary)] text-[var(--foreground-primary)]">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-full border-4 border-[var(--color-primary-500)] border-t-transparent animate-spin mb-4"></div>
          <p className="text-[var(--foreground-secondary)]">Loading video and subtitles...</p>
        </div>
      </div>
    );
  }

  // Show error if no video info is available
  if (!videoInfo) {
    return (
      <div className="subtitle-preview-container p-6 border border-[var(--color-error)] rounded-md bg-[var(--background-secondary)] text-[var(--foreground-primary)]">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-full bg-[var(--color-error-light)] flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-error)]">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No Video Available</h3>
          <p className="text-[var(--foreground-secondary)] text-center">Please upload a video first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subtitle-preview-container p-6 border rounded-md bg-[var(--background-secondary)] text-[var(--foreground-primary)]">
      <h2 className="text-xl font-semibold mb-4">Subtitle Preview</h2>

      {/* Video information */}
      <div className="mb-6 p-4 bg-[var(--background-primary)] rounded-md">
        <h3 className="text-lg font-medium mb-2">Video Information</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-[var(--foreground-secondary)]">Name:</div>
          <div>{videoInfo.name}</div>
          <div className="text-[var(--foreground-secondary)]">ID:</div>
          <div>{videoInfo.id}</div>
          {videoInfo.isDuplicate && (
            <>
              <div className="text-[var(--foreground-secondary)]">Status:</div>
              <div className="text-[var(--color-success)]">Duplicate file (reusing existing video)</div>
            </>
          )}
        </div>
      </div>

      {/* Subtitle information */}
      {subtitleInfo ? (
        <div className="mb-6 p-4 bg-[var(--background-primary)] rounded-md">
          <h3 className="text-lg font-medium mb-2">Subtitle Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-[var(--foreground-secondary)]">ID:</div>
            <div>{subtitleInfo.id}</div>
            {subtitleInfo.isDuplicate && (
              <>
                <div className="text-[var(--foreground-secondary)]">Status:</div>
                <div className="text-[var(--color-success)]">Reusing existing subtitles</div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-[var(--background-primary)] rounded-md">
          <h3 className="text-lg font-medium mb-2">Subtitle Information</h3>
          <p className="text-[var(--foreground-secondary)] text-sm">No subtitles available yet.</p>
        </div>
      )}

      {/* Placeholder for video player */}
      <div className="aspect-video bg-black rounded-md flex items-center justify-center mb-4">
        <p className="text-[var(--foreground-secondary)]">Video player will be implemented here</p>
      </div>

      <div className="text-sm text-[var(--foreground-secondary)] italic">
        Note: This is a placeholder for the video player and subtitle display. The actual implementation will include the Plyr video player with synchronized subtitles.
      </div>
    </div>
  );
};

export default SubtitlePreview;
