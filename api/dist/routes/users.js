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
const usersController = __importStar(require("../controllers/users.controller"));
const auth_1 = require("../middleware/auth");
const permissions_1 = require("../config/permissions");
const router = (0, express_1.Router)();
// Push token (authenticated user saves their own token)
router.post('/push-token', auth_1.authenticate, usersController.savePushToken);
// Admin routes
router.get('/stats', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.USERS_READ), usersController.getUsersStats);
router.get('/', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.USERS_READ), usersController.listUsers);
router.post('/', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.USERS_WRITE), usersController.createUser);
router.put('/:id', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.USERS_WRITE), usersController.updateUser);
router.put('/:id/permissions', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.USERS_WRITE), usersController.updatePermissions);
// Admin — balance ledger
router.get('/:id/ledger', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.USERS_READ), usersController.getUserLedger);
// Owner or admin only
router.get('/:id', auth_1.authenticate, auth_1.requireOwnerOrAdmin, usersController.getUser);
router.get('/:id/stats', auth_1.authenticate, auth_1.requireOwnerOrAdmin, usersController.getUserStats);
exports.default = router;
//# sourceMappingURL=users.js.map