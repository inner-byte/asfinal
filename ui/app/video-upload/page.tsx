'use client';

import React from 'react';
import { VideoUpload, StepNavigation } from '@/components';
import { useNavigation } from '@/contexts/NavigationContext';

/**
 * Video Upload Page
 * 
 * Step 1 in the subtitle generation workflow.
 * Allows users to upload video files up to 4GB in size.
 * 
 * Follows the "lipsync-2" design aesthetic with dark theme and gradient accents
 * as specified in project_goals.md.
 */
export default function VideoUploadPage() {
  const { videoUploaded } = useNavigation();
  
  return (
    <div className="px-4 py-8">
      <div className="w-full max-w-4xl mx-auto">
        <StepNavigation 
          stepName="Upload"
          allowNext={videoUploaded}
        />
        
        {/* Main content */}
        <div className="transition-opacity duration-300">
          <VideoUpload />
        </div>
        
        {/* Feature highlights */}
        <div className="mt-16">
          <div className="border-t border-[var(--color-gray-800)] pt-6 mt-6">
            <p className="text-xs text-center text-[var(--foreground-secondary)] mb-2">
              Generate accurate subtitles for your videos with advanced AI technology
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <div className="bg-[var(--background-secondary)] p-3 rounded-lg w-24 text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-br from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)] flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </div>
                <p className="text-xs">Fast</p>
              </div>
              <div className="bg-[var(--background-secondary)] p-3 rounded-lg w-24 text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-br from-[var(--gradient-secondary-start)] to-[var(--gradient-secondary-end)] flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                </div>
                <p className="text-xs">Accurate</p>
              </div>
              <div className="bg-[var(--background-secondary)] p-3 rounded-lg w-24 text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-br from-[var(--gradient-accent-start)] to-[var(--gradient-accent-end)] flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <p className="text-xs">Multiple Formats</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}