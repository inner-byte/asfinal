'use client';

import React, { useState } from 'react';

/**
 * ExportOptions Component
 * 
 * Allows users to select their preferred subtitle format and download
 * the generated subtitle file. This is a placeholder implementation that
 * will be connected to the actual export functionality in a future task.
 * 
 * References from project_goals.md:
 * - Support export in SRT, VTT, and ASS formats
 * - Implement on-demand conversion from the internal VTT format
 * - Enable download functionality for exported subtitles
 */
const ExportOptions: React.FC = () => {
  // Available subtitle formats
  const formats = [
    { id: 'srt', name: 'SRT', description: 'Standard format with good compatibility' },
    { id: 'vtt', name: 'VTT', description: 'Web-optimized format for HTML5 video' },
    { id: 'ass', name: 'ASS', description: 'Advanced SubStation Alpha format with styling' }
  ];
  
  // Current selected format
  const [selected, setSelected] = useState('srt');
  
  // Simulated loading state for the export operation
  const [isExporting, setIsExporting] = useState(false);
  
  // Handle export button click - placeholder for actual export functionality
  const handleExport = async () => {
    setIsExporting(true);
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // This will be replaced with actual export logic in a future task
    console.log(`Exporting subtitles in ${selected} format`);
    
    setIsExporting(false);
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      <h3 className="text-sm font-medium mb-3">Export Format</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {formats.map((format) => (
          <div 
            key={format.id}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              selected === format.id 
                ? 'border-[var(--color-primary-400)] bg-[color-mix(in_srgb,var(--color-primary-900)_15%,transparent)]' 
                : 'border-[var(--color-gray-700)] hover:border-[var(--color-gray-600)]'
            }`}
            onClick={() => setSelected(format.id)}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-sm">.{format.name}</span>
              <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                selected === format.id 
                  ? 'border-[1.5px] border-[var(--color-primary-400)]' 
                  : 'border border-[var(--color-gray-600)]'
              }`}>
                {selected === format.id && (
                  <div className="h-2 w-2 rounded-full bg-[var(--color-primary-400)]"></div>
                )}
              </div>
            </div>
            <p className="text-xs text-[var(--foreground-secondary)]">{format.description}</p>
          </div>
        ))}
      </div>
      
      {/* Additional export options can be added here in future tasks */}
      <div className="border-t border-[var(--color-gray-800)] my-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium mb-1">File Name</h4>
            <p className="text-xs text-[var(--foreground-secondary)]">Default: video_subtitles.{selected}</p>
          </div>
          <input 
            type="text" 
            placeholder="Custom filename (optional)"
            className="input text-sm py-1 px-3 w-64"
          />
        </div>
      </div>
      
      <div className="flex justify-end mt-6">
        <button 
          className={`button button-gradient text-sm flex items-center gap-1.5 ${isExporting ? 'opacity-70 cursor-wait' : ''}`}
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export Subtitles
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ExportOptions;