'use client';

import React, { useState } from "react";
import { VideoUpload, SubtitlePreview, ExportOptions } from "@/components";

/**
 * Main application page
 * 
 * Implements a step-based workflow for the AI-powered subtitle generator:
 * 1. Upload video
 * 2. Process and preview subtitles with video
 * 3. Export subtitles in desired format
 * 
 * Follows the "lipsync-2" design aesthetic with dark theme and gradient accents
 * as specified in project_goals.md.
 */
export default function Home() {
  // Track the current step in the workflow
  const [step, setStep] = useState(0);
  
  // Define the steps in our workflow
  const steps = [
    { name: "Upload", component: <VideoUpload /> },
    { name: "Process", component: <SubtitlePreview /> },
    { name: "Export", component: <ExportOptions /> }
  ];
  
  // Simple step indicator component
  const StepIndicator = () => (
    <div className="flex justify-center mb-10">
      <div className="flex items-center">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div 
              className={`w-2.5 h-2.5 rounded-full ${
                i <= step 
                  ? 'bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)]' 
                  : 'bg-[var(--color-gray-700)]'
              }`}
            />
            {i < steps.length - 1 && (
              <div className={`w-8 h-px ${
                i < step ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-gray-700)]'
              }`}/>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <div className="px-4 py-8">
      <div className="w-full max-w-4xl mx-auto">
        {/* Time display and controls */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-sm font-mono text-[var(--foreground-secondary)]">
            00:00/00:00
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--foreground-secondary)]">
              {steps[step].name}
            </span>
            <div className="flex items-center gap-2">
              <button 
                className={`button button-secondary text-xs px-3 py-1.5 ${step === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setStep(prev => Math.max(0, prev - 1))}
                disabled={step === 0}
              >
                Back
              </button>
              <button 
                className={`button button-primary text-xs px-3 py-1.5 ${step === steps.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setStep(prev => Math.min(steps.length - 1, prev + 1))}
                disabled={step === steps.length - 1}
              >
                Next
              </button>
            </div>
          </div>
        </div>
        
        {/* Step indicator */}
        <StepIndicator />
        
        {/* Current step content */}
        <div className="transition-opacity duration-300">
          {steps[step].component}
        </div>
        
        {/* Feature highlights - shown only on the upload step */}
        {step === 0 && (
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
        )}
      </div>
    </div>
  );
}
