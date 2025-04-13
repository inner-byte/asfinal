'use client';

import React from "react";
import Link from 'next/link';

/**
 * Main dashboard page
 * 
 * Provides an introduction to the AI-powered subtitle generator with
 * navigation links to the key features:
 * 1. Video Upload
 * 2. Subtitle Preview
 * 3. Export Options
 * 
 * Follows the "lipsync-2" design aesthetic with dark theme and gradient accents
 * as specified in project_goals.md.
 */
export default function Home() {
  return (
    <div className="px-4 py-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">AI-Powered Subtitle Generator</h1>
          <p className="text-[var(--foreground-secondary)] max-w-lg mx-auto mb-8">
            Generate accurate, synchronized subtitles for your videos using
            advanced AI technology. Upload videos up to 4GB in size.
          </p>
          
          <Link href="/video-upload" className="button button-primary px-6 py-3 inline-flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Start New Project
          </Link>
        </div>
        
        {/* Feature workflow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link href="/video-upload" className="bg-[var(--background-secondary)] p-6 rounded-xl hover:bg-[var(--background-secondary-hover)] transition-colors">
            <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)] flex items-center justify-center text-white">
              <span className="text-lg font-bold">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload</h3>
            <p className="text-sm text-[var(--foreground-secondary)]">
              Upload your video file and prepare it for subtitle generation.
            </p>
          </Link>
          
          <Link href="/subtitle-preview" className="bg-[var(--background-secondary)] p-6 rounded-xl hover:bg-[var(--background-secondary-hover)] transition-colors">
            <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-[var(--gradient-secondary-start)] to-[var(--gradient-secondary-end)] flex items-center justify-center text-white">
              <span className="text-lg font-bold">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Process & Preview</h3>
            <p className="text-sm text-[var(--foreground-secondary)]">
              Generate and preview the subtitles with the video.
            </p>
          </Link>
          
          <Link href="/export" className="bg-[var(--background-secondary)] p-6 rounded-xl hover:bg-[var(--background-secondary-hover)] transition-colors">
            <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-[var(--gradient-accent-start)] to-[var(--gradient-accent-end)] flex items-center justify-center text-white">
              <span className="text-lg font-bold">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Export</h3>
            <p className="text-sm text-[var(--foreground-secondary)]">
              Export your subtitles in various formats (VTT, SRT, ASS).
            </p>
          </Link>
        </div>
        
        {/* Feature highlights */}
        <div className="mt-16">
          <div className="border-t border-[var(--color-gray-800)] pt-6 mt-6">
            <p className="text-xs text-center text-[var(--foreground-secondary)] mb-2">
              Generate accurate subtitles for your videos with advanced technology
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
