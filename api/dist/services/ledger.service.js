"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerEntry = ledgerEntry;
exports.getUserLedger = getUserLedger;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Record a ledger entry within an existing transaction client.
 * Caller must supply the balanceAfter value (computed from the balance update).
 */
function ledgerEntry(tx, userId, opts) {
    return tx.balanceLedger.create({
        data: {
            userId,
            type: opts.type,
            amount: opts.amount,
            balanceAfter: opts.balanceAfter,
            description: opts.description,
            referenceId: opts.referenceId,
            referenceType: opts.referenceType,
        },
    });
}
async function getUserLedger(userId, page, limit) {
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
        prisma.balanceLedger.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.balanceLedger.count({ where: { userId } }),
    ]);
    return { entries, total, page, limit };
}
//# sourceMappingURL=ledger.service.js.map