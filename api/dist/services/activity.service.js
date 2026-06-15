"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = logActivity;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function logActivity(opts) {
    try {
        await prisma.activityLog.create({
            data: {
                userId: opts.userId,
                type: opts.type,
                screen: opts.screen ?? null,
                action: opts.action?.slice(0, 120) ?? null,
                meta: opts.meta ? JSON.stringify(opts.meta).slice(0, 500) : null,
                ip: opts.ip ?? null,
            },
        });
    }
    catch {
        // Activity logging should never crash a request
    }
}
//# sourceMappingURL=activity.service.js.map