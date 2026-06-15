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
exports.register = register;
exports.login = login;
exports.recover = recover;
exports.getMe = getMe;
exports.updateMe = updateMe;
exports.checkAvailability = checkAvailability;
exports.adminLogin = adminLogin;
const zod_1 = require("zod");
const authService = __importStar(require("../services/auth.service"));
const activity_service_1 = require("../services/activity.service");
const device_service_1 = require("../services/device.service");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    email: zod_1.z.string().email(),
    username: zod_1.z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: zod_1.z.string().min(8),
    phone: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
});
const recoverSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
const updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    phone: zod_1.z.string().optional(),
    password: zod_1.z.string().min(8).optional(),
});
async function register(req, res, next) {
    try {
        const body = registerSchema.parse(req.body);
        const result = await authService.registerUser(body);
        const deviceId = req.headers['x-device-id'];
        const platform = req.headers['x-platform'];
        if (deviceId)
            (0, device_service_1.bindDevice)(result.user.id, deviceId, platform).catch(() => { });
        res.status(201).json({ data: result });
    }
    catch (err) {
        next(err);
    }
}
async function login(req, res, next) {
    try {
        const body = loginSchema.parse(req.body);
        const result = await authService.loginUser(body);
        const deviceId = req.headers['x-device-id'];
        const platform = req.headers['x-platform'];
        if (deviceId)
            (0, device_service_1.bindDevice)(result.user.id, deviceId, platform).catch(() => { });
        res.json({ data: result });
    }
    catch (err) {
        next(err);
    }
}
async function recover(req, res, next) {
    try {
        recoverSchema.parse(req.body);
        // In production, send email with reset link
        // For now return a generic success response to avoid enumeration
        res.json({ data: { message: 'If an account with that email exists, a recovery link has been sent.' } });
    }
    catch (err) {
        next(err);
    }
}
async function getMe(req, res, next) {
    try {
        const user = await authService.getUserById(req.user.id);
        if (!user) {
            res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
            return;
        }
        res.json({ data: user });
    }
    catch (err) {
        next(err);
    }
}
async function updateMe(req, res, next) {
    try {
        const body = updateProfileSchema.parse(req.body);
        const user = await authService.updateUserProfile(req.user.id, body);
        res.json({ data: user });
    }
    catch (err) {
        next(err);
    }
}
async function checkAvailability(req, res, next) {
    try {
        const { email, username } = req.query;
        const result = await authService.checkAvailability({ email, username });
        res.json({ data: result });
    }
    catch (err) {
        next(err);
    }
}
async function adminLogin(req, res, next) {
    try {
        const body = loginSchema.parse(req.body);
        const result = await authService.loginUser(body);
        if (result.user.role !== 'ADMIN') {
            res.status(403).json({ error: 'Esta cuenta no tiene permisos de administrador.', code: 'NOT_ADMIN' });
            return;
        }
        (0, activity_service_1.logActivity)({ userId: result.user.id, type: 'admin_login', action: 'Inicio de sesión en el panel de administración' });
        res.json({ data: result });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=auth.controller.js.map