'use client';

import React from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

interface StepNavigationProps {
  allowNext?: boolean;
  nextButtonText?: string;
  stepName: string;
  onNext?: () => void;
  onBack?: () => void;
}

/**
 * StepNavigation component
 * 
 * Reusable navigation component for the step-based workflow.
 * Displays the current step number, progress indicators, and navigation buttons.
 * 
 * @param allowNext - Whether the next button should be enabled (default: true)
 * @param nextButtonText - Text to display on the next button (default: "Next")
 * @param stepName - The name of the current step
 * @param onNext - Optional callback for when the next button is clicked
 * @param onBack - Optional callback for when the back button is clicked
 */
export default function StepNavigation({
  allowNext = true,
  nextButtonText = 'Next',
  stepName,
  onNext,
  onBack
}: StepNavigationProps) {
  const { 
    currentStep, 
    totalSteps, 
    goToPrevStep, 
    goToNextStep
  } = useNavigation();

  // Handle next button click
  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      goToNextStep();
    }
  };

  // Handle back button click
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goToPrevStep();
    }
  };

  return (
    <>
      {/* Step indicator */}
      <div className="flex justify-center mb-10">
        <div className="flex items-center">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <React.Fragment key={index}>
              <div 
                className={`w-2.5 h-2.5 rounded-full ${
                  index + 1 <= currentStep 
                    ? 'bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)]' 
                    : 'bg-[var(--color-gray-700)]'
                }`}
              />
              {index < totalSteps - 1 && (
                <div 
                  className={`w-8 h-px ${
                    index + 1 < currentStep 
                      ? 'bg-[var(--color-primary-500)]'
                      : 'bg-[var(--color-gray-700)]'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-sm font-mono text-[var(--foreground-secondary)]">
          Step {currentStep} of {totalSteps}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--foreground-secondary)]">
            {stepName}
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleBack}
              className={`button button-secondary text-xs px-3 py-1.5 ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={currentStep === 1}
            >
              Back
            </button>
            <button 
              onClick={handleNext}
              className={`button button-primary text-xs px-3 py-1.5 ${!allowNext ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!allowNext}
            >
              {nextButtonText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}