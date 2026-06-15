"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBadWords = listBadWords;
exports.addBadWord = addBadWord;
exports.deleteBadWord = deleteBadWord;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
async function listBadWords(req, res, next) {
    try {
        const words = await prisma.badWord.findMany({ orderBy: { word: 'asc' } });
        res.json({ data: words });
    }
    catch (err) {
        next(err);
    }
}
async function addBadWord(req, res, next) {
    try {
        const { word } = zod_1.z.object({ word: zod_1.z.string().min(1).max(100) }).parse(req.body);
        const normalized = word.trim().toLowerCase();
        const created = await prisma.badWord.upsert({
            where: { word: normalized },
            update: {},
            create: { word: normalized },
        });
        res.json({ data: created });
    }
    catch (err) {
        next(err);
    }
}
async function deleteBadWord(req, res, next) {
    try {
        await prisma.badWord.delete({ where: { id: String(req.params['id']) } });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=badwords.controller.js.map