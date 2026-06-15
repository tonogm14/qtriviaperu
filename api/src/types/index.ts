import { Request } from 'express';
import { Role } from '@prisma/client';

// Authenticated request extension
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: Role;
    permissions: string[];
  };
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// API response wrappers
export interface SuccessResponse<T> {
  data: T;
}

export interface ErrorResponse {
  error: string;
  code?: string;
}

// Socket.IO event payloads
export interface GameLobbyPayload {
  gameId: string;
  playerCount: number;
  pot: number;
  chatMessages: ChatMessage[];
}

export interface GameCountdownPayload {
  gameId: string;
  seconds: number;
}

export interface GameQuestionPayload {
  gameId: string;
  qIdx: number;
  question: string;
  options: string[];
}

export interface GameRevealPayload {
  gameId: string;
  correctIndex: number;
  counts: number[];
  eliminated: string[];
}

export interface GameFinishPayload {
  gameId: string;
  winner: string | null;
  prize: number;
}

export interface ChatMessage {
  user: string;
  message: string;
  timestamp: string;
}

export interface PotUpdatePayload {
  gameId: string;
  pot: number;
}

// Socket client events
export interface JoinLobbyPayload {
  gameId: string;
  userId: string;
}

export interface SubmitAnswerPayload {
  gameId: string;
  userId: string;
  qIdx: number;
  answerIndex: number;
}

export interface SendChatPayload {
  gameId: string;
  userId: string;
  username?: string;
  message: string;
}
