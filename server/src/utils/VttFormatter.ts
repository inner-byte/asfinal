import { TimestampUtils } from './TimestampUtils';

/**
 * Utility class for formatting and working with WebVTT subtitles
 */
export class VttFormatter {
  /**
   * Format raw transcription with timestamps into VTT format
   * @param rawTranscription Raw transcription with timestamps from Gemini
   * @returns Formatted VTT content
   */
  static formatRawTranscriptionToVTT(rawTranscription: string): string {
    console.log(`[VttFormatter] Formatting raw transcription to VTT format`);
    
    // Basic VTT header with enhanced metadata
    let vtt = `WEBVTT - Generated using Gemini-flash-2.0 API\n`;
    vtt += `NOTE Generated on ${new Date().toISOString()}\n\n`;
    
    // Regular expression to identify timestamps in various formats that might be returned by Gemini
    // Enhanced regex to handle more timestamp formats from Gemini
    // This handles formats like [00:01.234], [0:01], (00:15), [1m45s], etc.
    const timestampRegex = /[\[\(](?:(\d+):)?(\d+):(\d+)(?:\.(\d+))?[\]\)]|[\[\(](\d+)m(\d+)s(?:(\d+)ms)?[\]\)]/g;
    
    // Split by double newline or if a new timestamp is detected
    const segments = rawTranscription.split(/\n\s*\n|\n(?=[\[\(])/g);
    
    let cueIndex = 1;
    
    // Sometimes Gemini might return a transcription without proper timestamps
    // If no timestamps are detected, create artificial segments
    if (!timestampRegex.test(rawTranscription)) {
      console.log(`[VttFormatter] No timestamps detected in Gemini response, creating artificial segments`);
      
      // Split the content into roughly equal segments (approx. 7-10 words per segment)
      const words = rawTranscription.split(/\s+/);
      const wordsPerSegment = 10; // Increased from 7 to 10 for better readability
      
      // Estimate about 2.5 seconds per segment (average speaking rate)
      const secondsPerSegment = 2.5;
      
      for (let i = 0; i < words.length; i += wordsPerSegment) {
        const segment = words.slice(i, Math.min(i + wordsPerSegment, words.length)).join(' ');
        
        // Calculate start and end times based on segment position
        const startSeconds = i / wordsPerSegment * secondsPerSegment;
        const endSeconds = Math.min((i + wordsPerSegment) / wordsPerSegment * secondsPerSegment, 
                                    words.length / wordsPerSegment * secondsPerSegment);
        
        const startTime = TimestampUtils.formatTimestamp(startSeconds);
        const endTime = TimestampUtils.formatTimestamp(endSeconds);
        
        vtt += `${cueIndex}\n`;
        vtt += `${startTime} --> ${endTime}\n`;
        vtt += `${segment}\n\n`;
        
        cueIndex++;
      }
      
      return vtt;
    }
    
    // Process segments with actual timestamps
    segments.forEach((segment) => {
      // Skip empty segments
      if (!segment.trim()) return;
      
      let matches: RegExpExecArray[] = [];
      let match: RegExpExecArray | null;
      
      // Reset regex state
      timestampRegex.lastIndex = 0;
      
      // Collect all timestamp matches in the segment
      while ((match = timestampRegex.exec(segment)) !== null) {
        matches.push(match);
      }
      
      // Skip segments without timestamps
      if (matches.length === 0) return;
      
      // Extract start and end times
      const startTimeMatch = matches[0];
      const endTimeMatch = matches.length > 1 ? matches[matches.length - 1] : null;
      
      // Parse start time into standardized format
      const startTime = TimestampUtils.parseTimestamp(startTimeMatch[0]);
      
      // If we have multiple timestamps, use the last one as end time
      // Otherwise, estimate the end time by adding an appropriate duration based on content length
      const text = segment.replace(timestampRegex, '').trim();
      const wordCount = text.split(/\s+/).length;
      const defaultDuration = Math.max(3, Math.min(wordCount * 0.5, 7)); // 0.5 seconds per word, min 3s, max 7s
      
      const endTime = endTimeMatch 
        ? TimestampUtils.parseTimestamp(endTimeMatch[0])
        : TimestampUtils.addSecondsToTimestamp(startTime, defaultDuration);
      
      // Check if start time is before end time, fix if needed
      if (TimestampUtils.compareTimestamps(startTime, endTime) >= 0) {
        console.warn(`[VttFormatter] Invalid timestamps: ${startTime} >= ${endTime}, adjusting end time`);
        const fixedEndTime = TimestampUtils.addSecondsToTimestamp(startTime, defaultDuration);
        console.log(`[VttFormatter] Adjusted end time to ${fixedEndTime}`);
      }
      
      // Extract the text content by removing timestamps
      let processedText = text;
      
      // Ensure we have a speaker label if present in the format "Speaker X: "
      const speakerMatch = processedText.match(/^(Speaker \d+|[A-Z][a-z]+ \d+):\s*/);
      if (speakerMatch) {
        const speaker = speakerMatch[1];
        const content = processedText.substring(speakerMatch[0].length);
        processedText = `<v ${speaker}>${content}</v>`;
      }
      
      // Add the cue to VTT
      vtt += `${cueIndex}\n`;
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${processedText}\n\n`;
      
      cueIndex++;
    });
    
    // Validate that we actually generated some cues
    if (cueIndex === 1) {
      console.warn(`[VttFormatter] No valid cues were created from the transcription, using fallback method`);
      return VttFormatter.createFallbackVTT(rawTranscription);
    }
    
    return vtt;
  }

  /**
   * Create fallback VTT content when normal parsing fails
   * @param text Raw text to convert to VTT
   * @returns Basic VTT with artificial timestamps
   */
  static createFallbackVTT(text: string): string {
    console.log(`[VttFormatter] Creating fallback VTT from raw text`);
    
    // Basic VTT header with metadata
    let vtt = `WEBVTT - Fallback Generation\n`;
    vtt += `NOTE Generated on ${new Date().toISOString()}\n\n`;
    
    // Split by sentences for more natural segments
    const sentences = text.replace(/([.!?])\s+/g, '$1\n').split('\n');
    
    let cueIndex = 1;
    let currentTime = 0;
    
    sentences.forEach(sentence => {
      // Skip empty sentences
      if (!sentence.trim()) return;
      
      // Roughly estimate 3 seconds + 0.3 seconds per word
      const words = sentence.trim().split(/\s+/).length;
      const duration = 3 + words * 0.3;
      
      // Format timestamps
      const startTime = TimestampUtils.formatTimestamp(currentTime);
      currentTime += duration;
      const endTime = TimestampUtils.formatTimestamp(currentTime);
      
      // Add cue
      vtt += `${cueIndex}\n`;
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${sentence.trim()}\n\n`;
      
      cueIndex++;
    });
    
    return vtt;
  }
}