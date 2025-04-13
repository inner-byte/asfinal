"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const videoRoutes_1 = __importDefault(require("./videoRoutes"));
const subtitleRoutes_1 = __importDefault(require("./subtitleRoutes"));
const router = (0, express_1.Router)();
// Register all API routes
router.use('/videos', videoRoutes_1.default);
router.use('/subtitles', subtitleRoutes_1.default);
exports.default = router;
