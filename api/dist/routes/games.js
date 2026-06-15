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
const gamesController = __importStar(require("../controllers/games.controller"));
const streamController = __importStar(require("../controllers/stream.controller"));
const auth_1 = require("../middleware/auth");
const permissions_1 = require("../config/permissions");
const router = (0, express_1.Router)();
// Public routes
router.get('/', gamesController.listGames);
router.get('/:id', gamesController.getGame);
router.get('/:id/leaderboard', gamesController.getGameLeaderboard);
// Admin routes
router.get('/:id/entries', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.GAMES_READ), gamesController.getGameEntries);
router.get('/:id/log', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.GAMES_READ), gamesController.getGameLog);
router.post('/', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.GAMES_WRITE), gamesController.createGame);
router.put('/:id', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.GAMES_WRITE), gamesController.updateGame);
router.put('/:id/questions', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.GAMES_WRITE), gamesController.setGameQuestions);
router.delete('/:id', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.GAMES_WRITE), gamesController.deleteGame);
router.post('/:id/start', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.GAMES_WRITE), gamesController.startGame);
router.get('/:id/stream', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.GAMES_READ), streamController.getStream);
router.post('/:id/stream', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.GAMES_WRITE), streamController.createStream);
router.delete('/:id/stream', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.GAMES_WRITE), streamController.deleteStream);
// Player-only routes (admins cannot join games as players)
router.get('/:id/my-entry', auth_1.authenticate, gamesController.getMyEntry);
router.post('/:id/join', auth_1.authenticate, auth_1.requireUser, gamesController.joinGame);
exports.default = router;
//# sourceMappingURL=games.js.map