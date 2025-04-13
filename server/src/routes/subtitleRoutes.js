"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subtitleController_1 = require("../controllers/subtitleController");
const router = (0, express_1.Router)();
const subtitleController = new subtitleController_1.SubtitleController();
/**
 * @route   POST /api/subtitles/generate/:videoId
 * @desc    Generate subtitles for a video
 * @access  Public
 */
router.post('/generate/:videoId', subtitleController.generateSubtitles);
/**
 * @route   GET /api/subtitles/status/:taskId
 * @desc    Get subtitle generation task status
 * @access  Public
 */
router.get('/status/:taskId', subtitleController.getGenerationStatus);
/**
 * @route   GET /api/subtitles/:videoId
 * @desc    Get subtitles for a video
 * @access  Public
 */
router.get('/:videoId', subtitleController.getSubtitles);
/**
 * @route   POST /api/subtitles/:videoId
 * @desc    Save subtitles for a video
 * @access  Public
 */
router.post('/:videoId', subtitleController.saveSubtitles);
/**
 * @route   DELETE /api/subtitles/:id
 * @desc    Delete subtitles
 * @access  Public
 */
router.delete('/:id', subtitleController.deleteSubtitles);
exports.default = router;
