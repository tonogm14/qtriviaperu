"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.getTerms = getTerms;
exports.getPrivacy = getPrivacy;
exports.getWithdrawConfig = getWithdrawConfig;
exports.updateConfig = updateConfig;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const configSchema = zod_1.z.object({
    currency: zod_1.z.string().optional(),
    defaultPrize: zod_1.z.number().optional(),
    defaultQuestions: zod_1.z.number().int().optional(),
    defaultTime: zod_1.z.number().int().optional(),
    pushBefore: zod_1.z.number().int().optional(),
    autoAdvance: zod_1.z.boolean().optional(),
    chatModeration: zod_1.z.boolean().optional(),
    minWithdraw: zod_1.z.number().optional(),
    feeYape: zod_1.z.number().optional(),
    feePlin: zod_1.z.number().optional(),
    feeBCP: zod_1.z.number().optional(),
    feeInterbank: zod_1.z.number().optional(),
    termsAndConditions: zod_1.z.string().optional(),
    privacyPolicy: zod_1.z.string().optional(),
});
async function getConfig(_req, res, next) {
    try {
        const config = await prisma.appConfig.upsert({
            where: { id: 'main' },
            update: {},
            create: { id: 'main' },
        });
        res.json({ data: config });
    }
    catch (err) {
        next(err);
    }
}
async function getTerms(_req, res, next) {
    try {
        const config = await prisma.appConfig.upsert({
            where: { id: 'main' },
            update: {},
            create: { id: 'main' },
        });
        res.json({ data: { termsAndConditions: config.termsAndConditions } });
    }
    catch (err) {
        next(err);
    }
}
async function getPrivacy(_req, res, next) {
    try {
        const config = await prisma.appConfig.upsert({
            where: { id: 'main' },
            update: {},
            create: { id: 'main' },
        });
        res.json({ data: { privacyPolicy: config.privacyPolicy } });
    }
    catch (err) {
        next(err);
    }
}
async function getWithdrawConfig(_req, res, next) {
    try {
        const config = await prisma.appConfig.upsert({
            where: { id: 'main' },
            update: {},
            create: { id: 'main' },
            select: { minWithdraw: true, feeYape: true, feePlin: true, feeBCP: true, feeInterbank: true },
        });
        res.json({ data: config });
    }
    catch (err) {
        next(err);
    }
}
async function updateConfig(req, res, next) {
    try {
        const body = configSchema.parse(req.body);
        const config = await prisma.appConfig.upsert({
            where: { id: 'main' },
            update: body,
            create: { id: 'main', ...body },
        });
        res.json({ data: config });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=config.controller.js.map