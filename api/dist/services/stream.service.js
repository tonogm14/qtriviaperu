"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YOUTUBE_RTMP_SERVER = void 0;
exports.saveStream = saveStream;
exports.clearStream = clearStream;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.YOUTUBE_RTMP_SERVER = 'rtmp://a.rtmp.youtube.com/live2';
async function saveStream(gameId, streamUrl, streamKey) {
    return prisma.game.update({
        where: { id: gameId },
        data: { streamUrl, muxStreamKey: streamKey, muxStreamId: 'youtube' },
    });
}
async function clearStream(gameId) {
    return prisma.game.update({
        where: { id: gameId },
        data: { streamUrl: null, muxStreamKey: null, muxStreamId: null },
    });
}
//# sourceMappingURL=stream.service.js.map