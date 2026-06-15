"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listQuestions = listQuestions;
exports.getQuestion = getQuestion;
exports.createQuestion = createQuestion;
exports.updateQuestion = updateQuestion;
exports.deleteQuestion = deleteQuestion;
exports.bulkImportQuestions = bulkImportQuestions;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
function param(req, key) {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : (val ?? '');
}
const prisma = new client_1.PrismaClient();
const questionSchema = zod_1.z.object({
    text: zod_1.z.string().min(5),
    options: zod_1.z.array(zod_1.z.string().min(1)).length(3),
    correctIndex: zod_1.z.number().int().min(0).max(2),
    category: zod_1.z.string().default('General'),
    difficulty: zod_1.z.nativeEnum(client_1.Difficulty).default(client_1.Difficulty.MEDIUM),
});
const listQuestionsSchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    difficulty: zod_1.z.nativeEnum(client_1.Difficulty).optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(500).default(20),
});
async function listQuestions(req, res, next) {
    try {
        const query = listQuestionsSchema.parse(req.query);
        const { page, limit, category, difficulty, search } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (category)
            where.category = category;
        if (difficulty)
            where.difficulty = difficulty;
        if (search)
            where.text = { contains: search, mode: 'insensitive' };
        const [questions, total] = await prisma.$transaction([
            prisma.question.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
            prisma.question.count({ where }),
        ]);
        res.json({ data: questions, total, page, limit });
    }
    catch (err) {
        next(err);
    }
}
async function getQuestion(req, res, next) {
    try {
        const question = await prisma.question.findUnique({ where: { id: param(req, 'id') } });
        if (!question) {
            res.status(404).json({ error: 'Question not found', code: 'NOT_FOUND' });
            return;
        }
        res.json({ data: question });
    }
    catch (err) {
        next(err);
    }
}
async function createQuestion(req, res, next) {
    try {
        const body = questionSchema.parse(req.body);
        const question = await prisma.question.create({ data: body });
        res.status(201).json({ data: question });
    }
    catch (err) {
        next(err);
    }
}
async function updateQuestion(req, res, next) {
    try {
        const body = questionSchema.partial().parse(req.body);
        const question = await prisma.question.update({
            where: { id: param(req, 'id') },
            data: body,
        });
        res.json({ data: question });
    }
    catch (err) {
        next(err);
    }
}
async function deleteQuestion(req, res, next) {
    try {
        await prisma.question.delete({ where: { id: param(req, 'id') } });
        res.json({ data: { message: 'Question deleted successfully' } });
    }
    catch (err) {
        next(err);
    }
}
async function bulkImportQuestions(req, res, next) {
    try {
        const bodySchema = zod_1.z.object({
            questions: zod_1.z.array(questionSchema),
        });
        const { questions } = bodySchema.parse(req.body);
        const created = await prisma.question.createMany({ data: questions });
        res.status(201).json({ data: { created: created.count } });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=questions.controller.js.map