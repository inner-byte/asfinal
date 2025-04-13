"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubtitleGenerationStatus = exports.SubtitleFormat = void 0;
var SubtitleFormat;
(function (SubtitleFormat) {
    SubtitleFormat["VTT"] = "vtt";
    SubtitleFormat["SRT"] = "srt";
    SubtitleFormat["ASS"] = "ass";
})(SubtitleFormat || (exports.SubtitleFormat = SubtitleFormat = {}));
/**
 * Subtitle generation status
 */
var SubtitleGenerationStatus;
(function (SubtitleGenerationStatus) {
    SubtitleGenerationStatus["PENDING"] = "pending";
    SubtitleGenerationStatus["PROCESSING"] = "processing";
    SubtitleGenerationStatus["COMPLETED"] = "completed";
    SubtitleGenerationStatus["FAILED"] = "failed";
})(SubtitleGenerationStatus || (exports.SubtitleGenerationStatus = SubtitleGenerationStatus = {}));
