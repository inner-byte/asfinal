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

// Define video and subtitle info types
export interface VideoInfo {
  id: string;
  name: string;
  isDuplicate?: boolean;
}

export interface SubtitleInfo {
  id: string;
  videoId: string;
  isDuplicate?: boolean;
}

// Define context types
type NavigationContextType = {
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  setVideoUploaded: (info: VideoInfo | boolean) => void;
  videoUploaded: boolean;
  videoInfo: VideoInfo | null;
  setSubtitlesGenerated: (info: SubtitleInfo | boolean) => void;
  subtitlesGenerated: boolean;
  subtitleInfo: SubtitleInfo | null;
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
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [subtitleInfo, setSubtitleInfo] = useState<SubtitleInfo | null>(null);

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

  // Handle setting video uploaded state and info
  const handleSetVideoUploaded = (info: VideoInfo | boolean) => {
    if (typeof info === 'boolean') {
      setVideoUploaded(info);
      if (!info) setVideoInfo(null);
    } else {
      setVideoUploaded(true);
      setVideoInfo(info);
    }
  };

  // Handle setting subtitles generated state and info
  const handleSetSubtitlesGenerated = (info: SubtitleInfo | boolean) => {
    if (typeof info === 'boolean') {
      setSubtitlesGenerated(info);
      if (!info) setSubtitleInfo(null);
    } else {
      setSubtitlesGenerated(true);
      setSubtitleInfo(info);
    }
  };

  // Context value
  const value = {
    currentStep,
    totalSteps,
    goToStep,
    goToNextStep,
    goToPrevStep,
    canGoNext,
    canGoPrev,
    setVideoUploaded: handleSetVideoUploaded,
    videoUploaded,
    videoInfo,
    setSubtitlesGenerated: handleSetSubtitlesGenerated,
    subtitlesGenerated,
    subtitleInfo,
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