"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubtitleController = void 0;
const subtitleService_1 = require("../services/subtitleService");
const types_1 = require("../types");
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Controller for handling subtitle-related API requests
 */
class SubtitleController {
    constructor() {
        /**
         * Generate subtitles for a video
         */
        this.generateSubtitles = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { videoId } = req.params;
                const { language = 'en' } = req.body;
                if (!videoId) {
                    throw new errorHandler_1.AppError('Video ID is required', 400);
                }
                const task = yield this.subtitleService.generateSubtitles(videoId, language);
                const response = {
                    status: 'success',
                    data: task,
                    message: 'Subtitle generation task created successfully'
                };
                res.status(202).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        /**
         * Get subtitle generation task status
         */
        this.getGenerationStatus = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { taskId } = req.params;
                if (!taskId) {
                    throw new errorHandler_1.AppError('Task ID is required', 400);
                }
                const task = yield this.subtitleService.getSubtitleGenerationStatus(taskId);
                const response = {
                    status: 'success',
                    data: task,
                    message: `Subtitle generation task status: ${task.status}`
                };
                res.status(200).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        /**
         * Get subtitles for a video
         */
        this.getSubtitles = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { videoId } = req.params;
                const { format = types_1.SubtitleFormat.VTT } = req.query;
                if (!videoId) {
                    throw new errorHandler_1.AppError('Video ID is required', 400);
                }
                // Validate format
                if (!Object.values(types_1.SubtitleFormat).includes(format)) {
                    throw new errorHandler_1.AppError(`Invalid subtitle format: ${format}. Supported formats: ${Object.values(types_1.SubtitleFormat).join(', ')}`, 400);
                }
                const subtitles = yield this.subtitleService.getSubtitles(videoId, format);
                if (!subtitles) {
                    throw new errorHandler_1.AppError(`No subtitles found for video ID: ${videoId} in format: ${format}`, 404);
                }
                const response = {
                    status: 'success',
                    data: subtitles,
                    message: 'Subtitles retrieved successfully'
                };
                res.status(200).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        /**
         * Save subtitles for a video
         */
        this.saveSubtitles = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { videoId } = req.params;
                const { content, format = types_1.SubtitleFormat.VTT, language = 'en' } = req.body;
                if (!videoId) {
                    throw new errorHandler_1.AppError('Video ID is required', 400);
                }
                if (!content) {
                    throw new errorHandler_1.AppError('Subtitle content is required', 400);
                }
                // Validate format
                if (!Object.values(types_1.SubtitleFormat).includes(format)) {
                    throw new errorHandler_1.AppError(`Invalid subtitle format: ${format}. Supported formats: ${Object.values(types_1.SubtitleFormat).join(', ')}`, 400);
                }
                const subtitle = yield this.subtitleService.saveSubtitles(videoId, content, format, language);
                const response = {
                    status: 'success',
                    data: subtitle,
                    message: 'Subtitles saved successfully'
                };
                res.status(201).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        /**
         * Delete subtitles
         */
        this.deleteSubtitles = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                if (!id) {
                    throw new errorHandler_1.AppError('Subtitle ID is required', 400);
                }
                yield this.subtitleService.deleteSubtitles(id);
                const response = {
                    status: 'success',
                    message: 'Subtitles deleted successfully'
                };
                res.status(200).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.subtitleService = new subtitleService_1.SubtitleService();
    }
}
exports.SubtitleController = SubtitleController;
