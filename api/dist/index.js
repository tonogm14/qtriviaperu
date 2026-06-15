"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = exports.io = exports.app = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = require("./config");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = __importDefault(require("./routes/auth"));
const games_1 = __importDefault(require("./routes/games"));
const questions_1 = __importDefault(require("./routes/questions"));
const users_1 = __importDefault(require("./routes/users"));
const withdrawals_1 = __importDefault(require("./routes/withdrawals"));
const leaderboard_1 = __importDefault(require("./routes/leaderboard"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const metrics_1 = __importDefault(require("./routes/metrics"));
const shop_1 = __importDefault(require("./routes/shop"));
const activity_1 = __importDefault(require("./routes/activity"));
const config_2 = __importDefault(require("./routes/config"));
const fraud_1 = __importDefault(require("./routes/fraud"));
const badwords_1 = __importDefault(require("./routes/badwords"));
const gameSocket_1 = require("./socket/gameSocket");
const gameScheduler_1 = require("./services/gameScheduler");
// ─── App Setup ───────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
exports.app = app;
const httpServer = http_1.default.createServer(app);
exports.httpServer = httpServer;
// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: config_1.config.cors.origins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});
exports.io = io;
(0, gameSocket_1.initGameSocket)(io);
// ─── Middleware ───────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: config_1.config.cors.origins,
    credentials: true,
}));
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use((0, morgan_1.default)(config_1.config.env === 'production' ? 'combined' : 'dev'));
app.use(express_1.default.json({ limit: '5mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        app: 'qtriviaperu-api',
        timestamp: new Date().toISOString(),
        timezone: config_1.config.timezone,
    });
});
// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', auth_1.default);
app.use('/api/games', games_1.default);
app.use('/api/questions', questions_1.default);
app.use('/api/users', users_1.default);
app.use('/api/withdrawals', withdrawals_1.default);
app.use('/api/leaderboard', leaderboard_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/metrics', metrics_1.default);
app.use('/api/shop', shop_1.default);
app.use('/api/activity', activity_1.default);
app.use('/api/config', config_2.default);
app.use('/api/fraud', fraud_1.default);
app.use('/api/badwords', badwords_1.default);
// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
});
// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler_1.errorHandler);
// ─── Start Server ─────────────────────────────────────────────────────────────
httpServer.listen(config_1.config.port, () => {
    console.log(`\n🎮 QTriviaPeru API running on port ${config_1.config.port}`);
    console.log(`   Environment: ${config_1.config.env}`);
    console.log(`   Timezone:    ${config_1.config.timezone}`);
    console.log(`   Health:      http://localhost:${config_1.config.port}/health\n`);
    (0, gameScheduler_1.startGameScheduler)(io);
});
//# sourceMappingURL=index.js.map