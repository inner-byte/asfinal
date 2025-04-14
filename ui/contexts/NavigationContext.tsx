'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Define the workflow steps and their corresponding routes
export const WORKFLOW_STEPS = [
  { name: 'Upload', route: '/video-upload', order: 1 },
  { name: 'Process', route: '/subtitle-preview', order: 2 },
  { name: 'Export', route: '/export', order: 3 },
];

// Define context types
type NavigationContextType = {
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  setVideoUploaded: (uploaded: boolean) => void;
  videoUploaded: boolean;
  setSubtitlesGenerated: (generated: boolean) => void;
  subtitlesGenerated: boolean;
};

// Create the navigation context
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Props for the Navigation Provider
interface NavigationProviderProps {
  children: ReactNode;
}

// Navigation Provider component
export function NavigationProvider({ children }: NavigationProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [subtitlesGenerated, setSubtitlesGenerated] = useState(false);

  // Find the current step based on the current route
  const getCurrentStepOrder = () => {
    const currentStep = WORKFLOW_STEPS.find((step) => step.route === pathname);
    return currentStep?.order || 0; // 0 represents the home page
  };

  const [currentStep, setCurrentStep] = useState(() => getCurrentStepOrder());
  const totalSteps = WORKFLOW_STEPS.length;

  // Update the current step when the pathname changes
  useEffect(() => {
    setCurrentStep(getCurrentStepOrder());
  }, [pathname]);

  // Navigate to a specific step
  const goToStep = (step: number) => {
    if (step >= 0 && step <= totalSteps) {
      // If step is 0, go to home page
      if (step === 0) {
        router.push('/');
        return;
      }

      const targetStep = WORKFLOW_STEPS.find((s) => s.order === step);
      if (targetStep) {
        router.push(targetStep.route);
      }
    }
  };

  // Navigate to the next step
  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      goToStep(currentStep + 1);
    }
  };

  // Navigate to the previous step
  const goToPrevStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    } else {
      // If we're at the first step, go to the home page
      router.push('/');
    }
  };

  // Check if we can go to the next step
  const canGoNext = currentStep < totalSteps;

  // Check if we can go to the previous step
  const canGoPrev = currentStep > 0;

  // Context value
  const value = {
    currentStep,
    totalSteps,
    goToStep,
    goToNextStep,
    goToPrevStep,
    canGoNext,
    canGoPrev,
    setVideoUploaded,
    videoUploaded,
    setSubtitlesGenerated,
    subtitlesGenerated,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

// Custom hook to use the navigation context
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}