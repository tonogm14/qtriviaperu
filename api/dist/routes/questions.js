"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const questionsController = __importStar(require("../controllers/questions.controller"));
const auth_1 = require("../middleware/auth");
const permissions_1 = require("../config/permissions");
const router = (0, express_1.Router)();
// Auth required — questions are only for logged-in players/admins
router.get('/', auth_1.authenticate, questionsController.listQuestions);
router.get('/:id', auth_1.authenticate, questionsController.getQuestion);
// Admin routes
router.post('/bulk', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.QUESTIONS_WRITE), questionsController.bulkImportQuestions);
router.post('/', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.QUESTIONS_WRITE), questionsController.createQuestion);
router.put('/:id', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.QUESTIONS_WRITE), questionsController.updateQuestion);
router.delete('/:id', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.QUESTIONS_WRITE), questionsController.deleteQuestion);
exports.default = router;
//# sourceMappingURL=questions.js.map