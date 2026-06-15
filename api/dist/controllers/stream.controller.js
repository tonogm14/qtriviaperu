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
exports.createStream = createStream;
exports.deleteStream = deleteStream;
exports.getStream = getStream;
const client_1 = require("@prisma/client");
const streamService = __importStar(require("../services/stream.service"));
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
const pid = (req) => Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
const createStreamSchema = zod_1.z.object({
    streamUrl: zod_1.z.string().url('URL de YouTube inválida'),
    streamKey: zod_1.z.string().min(1, 'Stream Key requerida'),
});
function buildResponse(game) {
    return {
        streamUrl: game.streamUrl,
        streamKey: game.muxStreamKey,
        rtmpServer: streamService.YOUTUBE_RTMP_SERVER,
        rtmpUrl: `${streamService.YOUTUBE_RTMP_SERVER}/${game.muxStreamKey}`,
    };
}
async function createStream(req, res, next) {
    try {
        const id = pid(req);
        const game = await prisma.game.findUnique({ where: { id } });
        if (!game) {
            res.status(404).json({ error: 'Juego no encontrado' });
            return;
        }
        const parsed = createStreamSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0].message });
            return;
        }
        const { streamUrl, streamKey } = parsed.data;
        const updated = await streamService.saveStream(id, streamUrl, streamKey);
        res.json({ data: buildResponse(updated) });
    }
    catch (err) {
        next(err);
    }
}
async function deleteStream(req, res, next) {
    try {
        const id = pid(req);
        await streamService.clearStream(id);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        next(err);
    }
}
async function getStream(req, res, next) {
    try {
        const id = pid(req);
        const game = await prisma.game.findUnique({
            where: { id },
            select: { streamUrl: true, muxStreamId: true, muxStreamKey: true },
        });
        if (!game) {
            res.status(404).json({ error: 'Juego no encontrado' });
            return;
        }
        if (!game.streamUrl) {
            res.json({ data: null });
            return;
        }
        res.json({ data: buildResponse(game) });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=stream.controller.js.map