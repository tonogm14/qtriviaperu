"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestWithdrawal = requestWithdrawal;
exports.updateWithdrawalStatus = updateWithdrawalStatus;
const client_1 = require("@prisma/client");
const errorHandler_1 = require("../middleware/errorHandler");
const config_1 = require("../config");
const ledger_service_1 = require("./ledger.service");
const activity_service_1 = require("./activity.service");
const prisma = new client_1.PrismaClient();
/**
 * Generate a unique withdrawal code in format QT-XXXX-X
 */
function generateWithdrawalCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `QT${suffix}`;
}
async function generateUniqueCode() {
    let code;
    let exists;
    do {
        code = generateWithdrawalCode();
        const existing = await prisma.withdrawal.findUnique({ where: { code } });
        exists = !!existing;
    } while (exists);
    return code;
}
/**
 * Request a withdrawal.
 */
async function requestWithdrawal(userId, data) {
    const { amount, method, accountRef } = data;
    const validMethods = ['yape', 'plin', 'bcp', 'interbank', 'bbva', 'scotiabank', 'banbif', 'pichincha', 'mibanco', 'gnb', 'falabella', 'ripley'];
    if (!validMethods.includes(method)) {
        throw new errorHandler_1.AppError('Método de retiro inválido', 400, 'INVALID_METHOD');
    }
    // Minimum amount
    if (amount < config_1.config.withdrawal.minAmount) {
        throw new errorHandler_1.AppError(`Minimum withdrawal amount is S/${config_1.config.withdrawal.minAmount}`, 400, 'BELOW_MINIMUM');
    }
    // Get user balance
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404, 'NOT_FOUND');
    const walletMethods = ['yape', 'plin'];
    const fee = walletMethods.includes(method) ? 0 : config_1.config.withdrawal.bankFee;
    const netAmount = amount - fee;
    if (user.balance < amount) {
        throw new errorHandler_1.AppError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE');
    }
    const code = await generateUniqueCode();
    const balanceAfterWithdrawal = user.balance - amount;
    const withdrawal = await prisma.$transaction(async (tx) => {
        const w = await tx.withdrawal.create({
            data: {
                userId,
                amount,
                method,
                accountRef,
                fee,
                netAmount,
                status: client_1.WithdrawalStatus.PENDING,
                code,
            },
        });
        await tx.user.update({
            where: { id: userId },
            data: { balance: { decrement: amount } },
        });
        await tx.notification.create({
            data: {
                userId,
                type: 'bonus',
                title: 'Retiro solicitado',
                body: `Tu retiro de S/${netAmount.toFixed(2)} fue solicitado. Código: ${code}`,
            },
        });
        await (0, ledger_service_1.ledgerEntry)(tx, userId, {
            type: 'WITHDRAWAL_REQUEST',
            amount: -amount,
            balanceAfter: balanceAfterWithdrawal,
            description: `Retiro solicitado por S/${amount.toFixed(2)} vía ${method} (${code})`,
            referenceId: w.id,
            referenceType: 'WITHDRAWAL',
        });
        return w;
    });
    (0, activity_service_1.logActivity)({ userId, type: 'withdrawal_request', action: `Retiro solicitado S/${amount.toFixed(2)} vía ${method}`, meta: { code, amount, method } });
    return withdrawal;
}
/**
 * Update withdrawal status (admin).
 */
async function updateWithdrawalStatus(withdrawalId, status) {
    const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: { user: true },
    });
    if (!withdrawal)
        throw new errorHandler_1.AppError('Withdrawal not found', 404, 'NOT_FOUND');
    await prisma.$transaction(async (tx) => {
        await tx.withdrawal.update({ where: { id: withdrawalId }, data: { status } });
        if (status === client_1.WithdrawalStatus.FAILED && withdrawal.status !== client_1.WithdrawalStatus.FAILED) {
            const balanceAfterRefund = withdrawal.user.balance + withdrawal.amount;
            await tx.user.update({
                where: { id: withdrawal.userId },
                data: { balance: { increment: withdrawal.amount } },
            });
            await tx.notification.create({
                data: {
                    userId: withdrawal.userId,
                    type: 'bonus',
                    title: 'Retiro fallido',
                    body: `Tu retiro de S/${withdrawal.amount.toFixed(2)} (${withdrawal.code}) fue rechazado. El monto fue reintegrado a tu saldo.`,
                },
            });
            await (0, ledger_service_1.ledgerEntry)(tx, withdrawal.userId, {
                type: 'WITHDRAWAL_REFUND',
                amount: withdrawal.amount,
                balanceAfter: balanceAfterRefund,
                description: `Reembolso de retiro fallido S/${withdrawal.amount.toFixed(2)} (${withdrawal.code})`,
                referenceId: withdrawalId,
                referenceType: 'WITHDRAWAL',
            });
        }
        if (status === client_1.WithdrawalStatus.DONE) {
            await tx.notification.create({
                data: {
                    userId: withdrawal.userId,
                    type: 'bonus',
                    title: '¡Retiro completado!',
                    body: `Tu retiro de S/${withdrawal.netAmount.toFixed(2)} fue procesado exitosamente. Código: ${withdrawal.code}`,
                },
            });
        }
    });
    return prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
}
//# sourceMappingURL=withdrawal.service.js.map