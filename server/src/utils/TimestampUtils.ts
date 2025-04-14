/**
 * Utility class for handling timestamp conversions and manipulations for subtitle generation
 * Extracted from subtitleService.ts to maintain file size under 300 lines (as per coding_standards_style_guides.md)
 */
export class TimestampUtils {
  /**
   * Convert seconds to VTT timestamp format (HH:MM:SS.mmm)
   * @param seconds Total seconds as number
   * @returns Formatted timestamp string in VTT format
   */
  static secondsToVttTimestamp(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) {
      return '00:00:00.000';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':') + '.' + milliseconds.toString().padStart(3, '0');
  }
  
  /**
   * Format timestamp - alias for secondsToVttTimestamp for compatibility with VttFormatter
   * @param seconds Total seconds as number
   * @returns Formatted timestamp string in VTT format
   */
  static formatTimestamp(seconds: number): string {
    return TimestampUtils.secondsToVttTimestamp(seconds);
  }
  
  /**
   * Parse a timestamp string from Gemini output to seconds
   * Handles multiple formats: [MM:SS], [M:SS], [MM:SS.mmm], [HH:MM:SS.mmm], [HHhMMmSSs]
   * @param timestamp Timestamp string from Gemini output
   * @returns Seconds as number
   */
  static parseTimestampToSeconds(timestamp: string): number {
    // Remove brackets and any extra characters
    const cleanTimestamp = timestamp.replace(/[\[\]()]/g, '').trim();
    
    // Handle different formats:

    // Format: HHhMMmSSs format (e.g., "1h2m30s")
    const hourMinSecFormat = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?(?:(\d+)ms)?$/;
    const hourMinSecMatch = cleanTimestamp.match(hourMinSecFormat);
    if (hourMinSecMatch) {
      const hours = parseInt(hourMinSecMatch[1] || '0', 10);
      const minutes = parseInt(hourMinSecMatch[2] || '0', 10);
      const seconds = parseInt(hourMinSecMatch[3] || '0', 10);
      const milliseconds = parseInt(hourMinSecMatch[4] || '0', 10);
      
      return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
    
    // Format: HH:MM:SS.mmm or MM:SS.mmm or M:SS
    const timeFormat = /^(?:(\d+):)?(\d+):(\d+)(?:\.(\d+))?$/;
    const timeMatch = cleanTimestamp.match(timeFormat);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1] || '0', 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = parseInt(timeMatch[3], 10);
      let milliseconds = 0;
      
      // Handle milliseconds if present
      if (timeMatch[4]) {
        milliseconds = parseInt(timeMatch[4].padEnd(3, '0').substring(0, 3), 10);
      }
      
      return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
    
    // If no format matches, return 0
    console.warn(`[TimestampUtils] Could not parse timestamp: ${timestamp}`);
    return 0;
  }
  
  /**
   * Parse a timestamp string to VTT format
   * @param timestamp Timestamp string in various formats
   * @returns Formatted VTT timestamp
   */
  static parseTimestamp(timestamp: string): string {
    const seconds = TimestampUtils.parseTimestampToSeconds(timestamp);
    return TimestampUtils.secondsToVttTimestamp(seconds);
  }
  
  /**
   * Extract timestamps from a raw transcription line
   * @param line The line of text potentially containing timestamps
   * @returns Array of detected timestamp strings
   */
  static extractTimestampsFromLine(line: string): string[] {
    // Match timestamps in various formats:
    // [MM:SS], [MM:SS.mmm], [HH:MM:SS], [HH:MM:SS.mmm], [Mh], [Mm], [Ss], etc.
    const timestampRegex = /\[\s*(?:(?:\d+:)?\d+:\d+(?:\.\d+)?|\d+h\d+m\d+(?:\.\d+)?s|\d+m\d+(?:\.\d+)?s|\d+(?:\.\d+)?s)\s*\]/g;
    
    const matches = line.match(timestampRegex) || [];
    return matches;
  }
  
  /**
   * Parse a time range from a string like "00:01:23.000 --> 00:01:29.000"
   * @param timeRange VTT format time range string
   * @returns Object with start and end times in seconds
   */
  static parseVttTimeRange(timeRange: string): { start: number, end: number } {
    const parts = timeRange.split('-->').map(part => part.trim());
    
    if (parts.length !== 2) {
      return { start: 0, end: 0 };
    }
    
    return {
      start: TimestampUtils.parseVttTimestamp(parts[0]),
      end: TimestampUtils.parseVttTimestamp(parts[1])
    };
  }
  
  /**
   * Parse a VTT format timestamp (HH:MM:SS.mmm) to seconds
   * @param vttTimestamp VTT format timestamp string
   * @returns Seconds as number
   */
  static parseVttTimestamp(vttTimestamp: string): number {
    const parts = vttTimestamp.split(':');
    
    if (parts.length !== 3) {
      return 0;
    }
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  /**
   * Calculate a valid end time based on start time and minimum duration
   * @param startSeconds Start time in seconds
   * @param nextStartSeconds Next start time in seconds (or null if none)
   * @param minDuration Minimum duration for the subtitle in seconds
   * @returns End time in seconds
   */
  static calculateEndTime(
    startSeconds: number, 
    nextStartSeconds: number | null, 
    minDuration: number = 2
  ): number {
    // If we have a valid next start time, use that minus a small buffer
    if (nextStartSeconds !== null && nextStartSeconds > startSeconds) {
      // Add a small buffer (0.2 seconds) to avoid overlapping
      const buffer = 0.2;
      return nextStartSeconds - buffer;
    }
    
    // Otherwise, use the minimum duration
    return startSeconds + minDuration;
  }
  
  /**
   * Add seconds to a timestamp and return a new timestamp
   * @param timestamp Timestamp string in VTT format
   * @param seconds Number of seconds to add
   * @returns New timestamp in VTT format
   */
  static addSecondsToTimestamp(timestamp: string, seconds: number): string {
    // Convert VTT timestamp to seconds
    const parts = timestamp.split(':');
    const lastPart = parts[2].split('.');
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const secs = parseInt(lastPart[0], 10);
    const milliseconds = parseInt(lastPart[1], 10);
    
    // Calculate total seconds
    const totalSeconds = hours * 3600 + minutes * 60 + secs + milliseconds / 1000 + seconds;
    
    // Convert back to VTT format
    return TimestampUtils.secondsToVttTimestamp(totalSeconds);
  }
  
  /**
   * Compare two VTT timestamps
   * @param timestamp1 First timestamp
   * @param timestamp2 Second timestamp
   * @returns -1 if timestamp1 < timestamp2, 0 if equal, 1 if timestamp1 > timestamp2
   */
  static compareTimestamps(timestamp1: string, timestamp2: string): number {
    // Convert both to seconds for easy comparison
    const seconds1 = TimestampUtils.timestampToSeconds(timestamp1);
    const seconds2 = TimestampUtils.timestampToSeconds(timestamp2);
    
    if (seconds1 < seconds2) return -1;
    if (seconds1 > seconds2) return 1;
    return 0;
  }
  
  /**
   * Convert VTT timestamp to seconds
   * @param timestamp VTT format timestamp (HH:MM:SS.mmm)
   * @returns Seconds as number
   */
  static timestampToSeconds(timestamp: string): number {
    const parts = timestamp.split(':');
    const lastPart = parts[2].split('.');
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(lastPart[0], 10);
    const milliseconds = parseInt(lastPart[1], 10);
    
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }
}