'use client';

import React from 'react';
import { ExportOptions, StepNavigation } from '@/components';
import { useNavigation } from '@/contexts/NavigationContext';

/**
 * Export Page
 * 
 * Step 3 in the subtitle generation workflow.
 * Allows users to export their generated subtitles in various formats.
 * 
 * Follows the "lipsync-2" design aesthetic with dark theme and gradient accents
 * as specified in project_goals.md.
 */
export default function ExportPage() {
  const { goToStep } = useNavigation();
  
  // Return to home when finished
  const handleFinish = () => {
    goToStep(0); // Step 0 represents the home page
  };
  
  return (
    <div className="px-4 py-8">
      <div className="w-full max-w-4xl mx-auto">
        <StepNavigation 
          stepName="Export"
          nextButtonText="Finish"
          onNext={handleFinish}
          allowNext={true}
        />
        
        {/* Main content */}
        <div className="transition-opacity duration-300">
          <ExportOptions />
        </div>
      </div>
    </div>
  );
}