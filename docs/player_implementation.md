# Plyr Video Player Implementation Guide

## Overview

This document provides a step-by-step guide for integrating the Plyr video player with our existing subtitle generation functionality. The implementation will create a seamless user experience for previewing videos with their generated subtitles.

## Table of Contents

1. [Introduction](#introduction)
2. [Plyr Features Overview](#plyr-features-overview)
3. [Implementation Requirements](#implementation-requirements)
4. [Backend Integration](#backend-integration)
5. [Frontend Implementation](#frontend-implementation)
6. [Testing and Validation](#testing-and-validation)
7. [Next Steps](#next-steps)
8. [Troubleshooting](#troubleshooting)

## Introduction

Plyr is a simple, lightweight, accessible, and customizable HTML5, YouTube, and Vimeo media player that supports modern browsers. It provides excellent support for VTT captions and screen readers, making it an ideal choice for our subtitle generation application.

According to our project roadmap, we are currently transitioning from Phase 1 (Project Setup and Initial Development) to Phase 2 (Real-time Subtitle Preview and Synchronization). The integration of Plyr is a critical component of this transition.

**Important Note**: This implementation guide focuses on HTML5 video with VTT captions, which is exactly what our application needs.

## Plyr Features Overview

Plyr offers several features that are particularly relevant to our subtitle generation application:

- **Full VTT Caption Support**: Plyr has built-in support for WebVTT captions, which aligns perfectly with our VTT-based subtitle generation.
- **Accessibility**: Plyr is designed with accessibility in mind, supporting screen readers and keyboard navigation.
- **Customizable UI**: The player's appearance can be customized to match our application's design using CSS variables.
- **API and Events**: Plyr provides a comprehensive API and event system that we can use to enhance the subtitle preview experience.
- **Responsive Design**: The player is fully responsive and works well on all screen sizes.
- **Built-in Controls**: Plyr comes with a complete set of customizable controls that we can use without building our own.
- **Lightweight**: Plyr is designed to be lightweight and performant, with a focus on modern browsers.

### Key Benefits for Our Project

1. **Native VTT Support**: We can directly use our generated VTT files without conversion.
2. **Simple Integration**: Plyr can be initialized with just a few lines of code.
3. **Customizable Appearance**: We can match our application's design without extensive custom CSS.
4. **Event System**: We can easily track and respond to subtitle changes during playback.

## Implementation Requirements

To successfully integrate Plyr with our application, we need to:

1. Install and configure Plyr in our frontend application
2. Create a video player component that uses Plyr
3. Connect the player to our backend API for video streaming and subtitle retrieval
4. Implement subtitle synchronization using Plyr's caption events
5. Add controls for subtitle customization (if needed)

### Prerequisites

Before starting the implementation, make sure you have:

- Node.js and npm installed
- Access to our Next.js frontend project
- Basic understanding of React and TypeScript
- Access to our backend API endpoints for video and subtitle retrieval

## Backend Integration

Our backend already has the necessary endpoints to support the Plyr integration:

### Existing Endpoints

- `GET /api/videos/:id/stream`: Streams a video file
- `GET /api/subtitles/content/:fileId`: Retrieves subtitle content in VTT format
- `GET /api/subtitles/video/:videoId`: Gets subtitle metadata for a specific video

These endpoints provide all the necessary data for the Plyr player. No additional backend changes are required for basic integration.

### Data Flow

1. The frontend requests video metadata using `GET /api/videos/:id`
2. The frontend requests subtitle metadata using `GET /api/subtitles/video/:videoId`
3. The Plyr player loads the video using the streaming endpoint `GET /api/videos/:id/stream`
4. The Plyr player loads the subtitles using the subtitle content endpoint `GET /api/subtitles/content/:fileId`

## Frontend Implementation

### Step 1: Install Plyr

Open your terminal in the frontend project directory and run:

```bash
npm install plyr
```

This will install the Plyr package and add it to your package.json dependencies.

### Step 2: Import Plyr CSS and JS

In your main CSS file or component, import the Plyr CSS:

```javascript
// Import Plyr CSS
import 'plyr/dist/plyr.css';
```

You can also add this to your main layout file or to the specific component where you'll use Plyr.

### Step 3: Create a PlyrPlayer Component

Create a new component at `components/SubtitlePreview/PlyrPlayer.tsx`. This component will handle the Plyr initialization and subtitle integration:

```typescript
import React, { useEffect, useRef, useState } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

// Define the props for our component
interface PlyrPlayerProps {
  videoId: string;                                // ID of the video to play
  subtitleId?: string;                           // ID of the subtitle (optional)
  subtitleFileId?: string;                       // ID of the subtitle file (optional)
  onCueChange?: (cue: TextTrackCue | null) => void; // Callback for subtitle cue changes
}

const PlyrPlayer: React.FC<PlyrPlayerProps> = ({
  videoId,
  subtitleId,
  subtitleFileId,
  onCueChange
}) => {
  // References to the video element and Plyr instance
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize Plyr when the component mounts
  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize Plyr with our configuration
    const player = new Plyr(videoRef.current, {
      // Enable captions by default
      captions: { active: true, language: 'en', update: true },
      // Customize which controls to show
      controls: [
        'play-large',  // The large play button in the center
        'play',        // Play/pause button
        'progress',    // Progress bar
        'current-time', // Current time display
        'mute',        // Mute toggle
        'volume',      // Volume control
        'captions',    // Captions toggle
        'settings',    // Settings menu
        'pip',         // Picture-in-picture toggle
        'fullscreen'   // Fullscreen toggle
      ]
    });

    // Store the player instance for later use
    playerRef.current = player;

    // Set up event listener for subtitle cue changes
    if (onCueChange && videoRef.current.textTracks.length > 0) {
      const track = videoRef.current.textTracks[0];
      track.addEventListener('cuechange', () => {
        const activeCues = track.activeCues;
        if (activeCues && activeCues.length > 0) {
          onCueChange(activeCues[0] as TextTrackCue);
        } else {
          onCueChange(null);
        }
      });
    }

    // Clean up when component unmounts
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoRef, onCueChange]);

  // Update video source when videoId changes
  useEffect(() => {
    if (!videoRef.current || !videoId) return;

    // Set video source using our API endpoint
    videoRef.current.src = `/api/videos/${videoId}/stream`;

    // If player is initialized, update the source using Plyr's API
    if (playerRef.current) {
      playerRef.current.source = {
        type: 'video',
        sources: [
          {
            src: `/api/videos/${videoId}/stream`,
            type: 'video/mp4' // Adjust based on your video type
          }
        ]
      };
    }
  }, [videoId]);

  // Update subtitles when subtitleFileId changes
  useEffect(() => {
    if (!videoRef.current || !subtitleFileId) return;

    // Remove existing tracks
    while (videoRef.current.firstChild) {
      videoRef.current.removeChild(videoRef.current.firstChild);
    }

    // Add new track element for the subtitle
    const track = document.createElement('track');
    track.kind = 'captions';
    track.label = 'English';
    track.srclang = 'en';
    track.src = `/api/subtitles/content/${subtitleFileId}`;
    track.default = true;

    videoRef.current.appendChild(track);

    // If player is initialized, restart to apply the new subtitle
    if (playerRef.current) {
      playerRef.current.restart();
    }
  }, [subtitleFileId]);

  return (
    <div className="plyr-container">
      {/* Show error message if there's an error */}
      {error && <div className="error-message">{error}</div>}

      {/* Video element that Plyr will enhance */}
      <video
        ref={videoRef}
        className="plyr-video"
        controls
        crossOrigin="anonymous" // Required for external subtitle files
        playsInline
      >
        {/* Add subtitle track if we have a subtitle file ID */}
        {subtitleFileId && (
          <track
            kind="captions"
            label="English"
            src={`/api/subtitles/content/${subtitleFileId}`}
            srcLang="en"
            default
          />
        )}
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default PlyrPlayer;
```

**Key Points to Understand:**

1. We're using React refs to access the DOM elements and store the Plyr instance.
2. We initialize Plyr with custom controls and caption settings.
3. We set up an event listener for subtitle cue changes to track the current subtitle.
4. We handle video source and subtitle updates when props change.
5. We properly clean up the Plyr instance when the component unmounts.

### Step 4: Create a SubtitlePreview Page Component

Create or update the page at `app/subtitle-preview/page.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PlyrPlayer from '@/components/SubtitlePreview/PlyrPlayer';
import SubtitleCue from '@/components/SubtitlePreview/SubtitleCue';
import { useNavigation } from '@/hooks/useNavigation'; // Assuming this hook exists for navigation

interface Subtitle {
  id: string;
  videoId: string;
  fileId: string;
  format: string;
  language: string;
  status: string;
}

const SubtitlePreviewPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { goToStep } = useNavigation();

  const videoId = searchParams.get('videoId');
  const [subtitle, setSubtitle] = useState<Subtitle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCue, setActiveCue] = useState<TextTrackCue | null>(null);

  // Fetch subtitle data for the video
  useEffect(() => {
    if (!videoId) {
      setError('No video ID provided');
      setLoading(false);
      return;
    }

    const fetchSubtitle = async () => {
      try {
        const response = await fetch(`/api/subtitles/video/${videoId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch subtitle data');
        }

        const data = await response.json();
        if (data.status === 'success' && data.data && data.data.length > 0) {
          setSubtitle(data.data[0]); // Assuming we get an array of subtitles
        } else {
          setError('No subtitles found for this video');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSubtitle();
  }, [videoId]);

  const handleCueChange = (cue: TextTrackCue | null) => {
    setActiveCue(cue);
  };

  const handleExport = () => {
    if (subtitle) {
      goToStep(3); // Go to export page (assuming step 3 is export)
    }
  };

  if (loading) {
    return <div className="loading">Loading subtitle preview...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="subtitle-preview-container">
      <h1>Subtitle Preview</h1>

      {subtitle && videoId && (
        <>
          <PlyrPlayer
            videoId={videoId}
            subtitleId={subtitle.id}
            subtitleFileId={subtitle.fileId}
            onCueChange={handleCueChange}
          />

          <div className="active-subtitle">
            <h2>Current Subtitle</h2>
            <SubtitleCue cue={activeCue} />
          </div>

          <div className="actions">
            <button onClick={handleExport} className="export-button">
              Export Subtitles
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SubtitlePreviewPage;
```

### Step 5: Create a SubtitleCue Component

Create a new component at `components/SubtitlePreview/SubtitleCue.tsx`:

```typescript
import React from 'react';

interface SubtitleCueProps {
  cue: TextTrackCue | null;
}

const SubtitleCue: React.FC<SubtitleCueProps> = ({ cue }) => {
  if (!cue) {
    return <div className="subtitle-cue empty">No active subtitle</div>;
  }

  return (
    <div className="subtitle-cue">
      <div className="cue-time">
        {formatTime(cue.startTime)} → {formatTime(cue.endTime)}
      </div>
      <div className="cue-text" dangerouslySetInnerHTML={{ __html: cue.text }} />
    </div>
  );
};

// Helper function to format time in MM:SS.mmm format
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
};

export default SubtitleCue;
```

### Step 6: Add Styling

Add the following styles to your CSS (either in a separate file or using TailwindCSS):

```css
/* If using a separate CSS file */
.plyr-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.subtitle-preview-container {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.active-subtitle {
  margin-top: 2rem;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.subtitle-cue {
  padding: 1rem;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.cue-time {
  font-family: monospace;
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.cue-text {
  font-size: 1.25rem;
  line-height: 1.5;
}

.actions {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
}

.export-button {
  background-color: #00b3ff;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.export-button:hover {
  background-color: #0090cc;
}
```

## Testing and Validation

To ensure the Plyr integration works correctly, test the following scenarios:

1. **Basic Playback**: Verify that videos play correctly in the Plyr player.
2. **Subtitle Display**: Confirm that subtitles are displayed correctly during playback.
3. **Subtitle Synchronization**: Check that subtitles are properly synchronized with the video.
4. **Cue Events**: Validate that the `onCueChange` callback is triggered correctly when subtitles change.
5. **Responsive Design**: Test the player on different screen sizes to ensure it's responsive.
6. **Browser Compatibility**: Test in different browsers to ensure cross-browser compatibility.

## Next Steps

After implementing the basic Plyr integration, consider the following enhancements:

1. **Subtitle Styling Options**: Add controls to customize subtitle appearance (font size, color, etc.).
2. **Timestamp Correction**: Implement the ability to adjust subtitle timing if needed.
3. **Multiple Language Support**: Add support for multiple subtitle tracks in different languages.
4. **Keyboard Shortcuts**: Implement keyboard shortcuts for common player actions.
5. **Analytics**: Add tracking for video playback and subtitle usage.

These enhancements align with our project roadmap for Phase 2 (Real-time Subtitle Preview and Synchronization) and will provide a more comprehensive subtitle preview experience.

## API Reference

### Backend Endpoints

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/api/videos/:id` | GET | Get video metadata | Video object |
| `/api/videos/:id/stream` | GET | Stream video file | Video stream |
| `/api/subtitles/video/:videoId` | GET | Get subtitles for a video | Array of subtitle objects |
| `/api/subtitles/content/:fileId` | GET | Get subtitle content | VTT content |

### Plyr API Methods

| Method | Description |
|--------|-------------|
| `player.play()` | Start playback |
| `player.pause()` | Pause playback |
| `player.togglePlay()` | Toggle playback state |
| `player.restart()` | Restart playback |
| `player.rewind(seekTime)` | Rewind by the specified time |
| `player.forward(seekTime)` | Fast forward by the specified time |
| `player.toggleCaptions()` | Toggle captions display |

For a complete list of Plyr API methods, refer to the [official documentation](https://github.com/sampotts/plyr).

### Plyr Events

| Event | Description |
|-------|-------------|
| `ready` | Triggered when the player is ready |
| `play` | Triggered when playback starts |
| `pause` | Triggered when playback is paused |
| `ended` | Triggered when playback ends |
| `timeupdate` | Triggered when the current time updates |
| `captionsenabled` | Triggered when captions are enabled |
| `captionsdisabled` | Triggered when captions are disabled |
| `languagechange` | Triggered when the caption language changes |

For a complete list of Plyr events, refer to the [official documentation](https://github.com/sampotts/plyr).
