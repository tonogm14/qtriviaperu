import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),

  database: {
    url: requireEnv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/qtriviaperu?schema=public'),
  },

  jwt: {
    secret: requireEnv('JWT_SECRET', 'qtriviaperu-dev-secret-change-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:5173,http://localhost:19006').split(','),
  },

  timezone: process.env.TZ ?? 'America/Lima',

  withdrawal: {
    minAmount: parseFloat(process.env.WITHDRAWAL_MIN_AMOUNT ?? '20'),
    bankFee: parseFloat(process.env.WITHDRAWAL_BANK_FEE ?? '2'),
  },
};
