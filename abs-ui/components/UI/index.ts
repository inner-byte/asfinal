/**
 * UI Component Index
 * 
 * This file centralizes exports for all reusable UI components.
 * Using this pattern allows for cleaner imports across the application.
 */

// Export UI components
export { default as StepNavigation } from './StepNavigation';

// Temporarily export a type or constant to make this a proper module
export type UIComponentNames = 'Button' | 'Card' | 'Input' | 'Badge' | 'Alert' | 'StepNavigation';

// Export placeholder for future components
export const UI_VERSION = '0.1.0';

// This file will be expanded as more UI components are developed