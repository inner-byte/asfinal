'use client';

import React from 'react';
import { SubtitlePreview, StepNavigation } from '@/components';
import { useNavigation } from '@/contexts/NavigationContext';

/**
 * Subtitle Preview Page
 * 
 * Step 2 in the subtitle generation workflow.
 * Allows users to preview generated subtitles alongside their video.
 * 
 * Follows the "lipsync-2" design aesthetic with dark theme and gradient accents
 * as specified in project_goals.md.
 */
export default function SubtitlePreviewPage() {
  const { subtitlesGenerated } = useNavigation();
  
  return (
    <div className="px-4 py-8">
      <div className="w-full max-w-4xl mx-auto">
        <StepNavigation 
          stepName="Process"
          allowNext={subtitlesGenerated}
        />
        
        {/* Main content */}
        <div className="transition-opacity duration-300">
          <SubtitlePreview />
        </div>
      </div>
    </div>
  );
}