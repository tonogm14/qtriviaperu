"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireAdmin = requireAdmin;
exports.requireUser = requireUser;
exports.requireOwnerOrAdmin = requireOwnerOrAdmin;
exports.requirePermission = requirePermission;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const permissions_1 = require("../config/permissions");
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authorization token required', code: 'MISSING_TOKEN' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            username: decoded.username,
            role: decoded.role,
            permissions: decoded.permissions ?? [],
        };
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    }
}
function requireAdmin(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
        return;
    }
    if (req.user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
        return;
    }
    next();
}
/** Blocks admin accounts — mobile-only endpoints */
function requireUser(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
        return;
    }
    if (req.user.role !== 'USER') {
        res.status(403).json({ error: 'This endpoint is for player accounts only', code: 'FORBIDDEN' });
        return;
    }
    next();
}
/** Allows the resource owner or any admin */
function requireOwnerOrAdmin(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
        return;
    }
    const resourceId = req.params.id;
    if (req.user.role !== 'ADMIN' && req.user.id !== resourceId) {
        res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
        return;
    }
    next();
}
/**
 * Middleware factory — requires an authenticated ADMIN with a specific permission.
 * Superadmins (empty permissions array) pass automatically.
 */
function requirePermission(perm) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
            return;
        }
        if (req.user.role !== 'ADMIN') {
            res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
            return;
        }
        if (!(0, permissions_1.hasPermission)(req.user.permissions, perm)) {
            res.status(403).json({
                error: `Missing permission: ${perm}`,
                code: 'MISSING_PERMISSION',
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map