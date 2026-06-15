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
exports.listWithdrawals = listWithdrawals;
exports.requestWithdrawal = requestWithdrawal;
exports.updateWithdrawalStatus = updateWithdrawalStatus;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
function param(req, key) {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : (val ?? '');
}
const withdrawalService = __importStar(require("../services/withdrawal.service"));
const prisma = new client_1.PrismaClient();
const requestWithdrawalSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    method: zod_1.z.enum(['yape', 'plin', 'bcp', 'interbank', 'bbva', 'scotiabank', 'banbif', 'pichincha', 'mibanco', 'gnb', 'falabella', 'ripley']),
    accountRef: zod_1.z.string().min(4).max(100),
});
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.WithdrawalStatus),
});
const listWithdrawalsSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    status: zod_1.z.nativeEnum(client_1.WithdrawalStatus).optional(),
});
async function listWithdrawals(req, res, next) {
    try {
        const query = listWithdrawalsSchema.parse(req.query);
        const { page, limit, status } = query;
        const skip = (page - 1) * limit;
        const isAdmin = req.user?.role === 'ADMIN';
        const where = {};
        if (!isAdmin) {
            where.userId = req.user.id;
        }
        if (status)
            where.status = status;
        const [withdrawals, total] = await prisma.$transaction([
            prisma.withdrawal.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, username: true, name: true, email: true },
                    },
                },
            }),
            prisma.withdrawal.count({ where }),
        ]);
        res.json({ data: withdrawals, total, page, limit });
    }
    catch (err) {
        next(err);
    }
}
async function requestWithdrawal(req, res, next) {
    try {
        const body = requestWithdrawalSchema.parse(req.body);
        const withdrawal = await withdrawalService.requestWithdrawal(req.user.id, body);
        res.status(201).json({ data: withdrawal });
    }
    catch (err) {
        next(err);
    }
}
async function updateWithdrawalStatus(req, res, next) {
    try {
        const { status } = updateStatusSchema.parse(req.body);
        const withdrawal = await withdrawalService.updateWithdrawalStatus(param(req, 'id'), status);
        res.json({ data: withdrawal });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=withdrawals.controller.js.map