import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
export declare function getNextOccurrenceUTC(recurringTime: string): Date;
export declare function listGames(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getGame(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function createGame(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateGame(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function deleteGame(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function setGameQuestions(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getMyEntry(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function joinGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function startGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function getGameEntries(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getGameLog(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getGameLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=games.controller.d.ts.map