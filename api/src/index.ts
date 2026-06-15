import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import gamesRoutes from './routes/games';
import questionsRoutes from './routes/questions';
import usersRoutes from './routes/users';
import withdrawalsRoutes from './routes/withdrawals';
import leaderboardRoutes from './routes/leaderboard';
import notificationsRoutes from './routes/notifications';
import metricsRoutes from './routes/metrics';
import shopRoutes from './routes/shop';
import activityRoutes from './routes/activity';
import configRoutes from './routes/config';
import fraudRoutes from './routes/fraud';
import badwordsRoutes from './routes/badwords';

import { initGameSocket } from './socket/gameSocket';
import { startGameScheduler } from './services/gameScheduler';

// ─── App Setup ───────────────────────────────────────────────────────────────

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────

const io = new SocketServer(httpServer, {
  cors: {
    origin: config.cors.origins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

initGameSocket(io);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'qtriviaperu-api',
    timestamp: new Date().toISOString(),
    timezone: config.timezone,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/config', configRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/badwords', badwordsRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

httpServer.listen(config.port, () => {
  console.log(`\n🎮 QTriviaPeru API running on port ${config.port}`);
  console.log(`   Environment: ${config.env}`);
  console.log(`   Timezone:    ${config.timezone}`);
  console.log(`   Health:      http://localhost:${config.port}/health\n`);
  startGameScheduler(io);
});

export { app, io, httpServer };
