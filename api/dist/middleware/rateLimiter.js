"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLimiter = exports.loginLimiter = void 0;
exports.rateLimit = rateLimit;
const store = new Map();
// Clean stale entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    store.forEach((v, k) => { if (now > v.resetAt)
        store.delete(k); });
}, 10 * 60 * 1000);
function rateLimit(opts) {
    return (req, res, next) => {
        const key = opts.keyFn ? opts.keyFn(req) : (req.ip ?? 'unknown');
        const now = Date.now();
        const entry = store.get(key);
        if (!entry || now > entry.resetAt) {
            store.set(key, { count: 1, resetAt: now + opts.windowMs });
            return next();
        }
        if (entry.count >= opts.max) {
            res.status(429).json({
                error: opts.message ?? 'Demasiados intentos. Intenta más tarde.',
                code: 'RATE_LIMIT',
                retryAfter: Math.ceil((entry.resetAt - now) / 1000),
            });
            return;
        }
        entry.count++;
        next();
    };
}
exports.loginLimiter = rateLimit({
    max: 8,
    windowMs: 15 * 60 * 1000,
    message: 'Demasiados intentos de sesión. Espera 15 minutos.',
});
const registerRateLimitEnabled = process.env.REGISTER_RATE_LIMIT !== 'false';
exports.registerLimiter = registerRateLimitEnabled
    ? rateLimit({
        max: 20,
        windowMs: 60 * 60 * 1000,
        message: 'Demasiados registros desde esta red. Espera una hora.',
    })
    : (_req, _res, next) => next();
//# sourceMappingURL=rateLimiter.js.map